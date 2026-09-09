#!/usr/bin/env node
// ============================================================
// Phase 25 — static hosting deployment checks.
// Usage: npm run test:deploy   (or: node tools/test-deploy.js)
//
// Simulates a static host and verifies the site is deploy-ready:
//   - source audit: no http:// references anywhere, no absolute local
//     paths in index.html / style.css / script.js (every asset must be
//     relative so the site works on any sub-path)
//   - runtime: copies the site into a SUB-FOLDER of a temp root and
//     serves it over plain HTTP — exactly like GitHub Pages project
//     hosting (https://user.github.io/repo/). Then checks that
//     data.json loads, cards render, and every image actually decodes.
//   - Telegram: real cross-origin getMe call from the page to prove
//     api.telegram.org is reachable over HTTPS with CORS enabled and a
//     valid token (skipped automatically when offline — no document is
//     ever sent).
// ============================================================

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer");

const PORT = 3106;
const BASE = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, "..");
const SERVE_BIN = path.join(ROOT, "node_modules", "serve", "build", "main.js");
const SITE_FILES = ["index.html", "style.css", "script.js", "data.json", "logo.svg"];

function assert(condition, message) {
  if (!condition) throw new Error("ASSERTION FAILED: " + message);
  console.log("ok - " + message);
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status > 0) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local server did not start at " + url);
}

/* ---------- Source audit: relative paths + no insecure URLs ---------- */

function auditSources() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");

  // 1. No insecure http:// references anywhere — this is what guarantees a
  //    clean HTTPS deployment (no mixed content can ever be blocked).
  for (const [name, text] of [["index.html", html], ["style.css", css], ["script.js", js]]) {
    assert(!text.includes("http://"), `${name}: no insecure http:// references`);
  }

  // 2. Every external URL present must be https.
  const urls = [...(html + css + js).matchAll(/https?:\/\/[^\s"'`)]+/g)].map((m) => m[0]);
  assert(urls.length > 0, "external URLs found (Google Fonts / Telegram API)");
  for (const url of urls) {
    assert(url.startsWith("https://"), `external URL is https: ${url}`);
  }

  // 3. No absolute local references in HTML (src="/..." or href="//...").
  const absRefs = [...html.matchAll(/(?:src|href)\s*=\s*"\/[^"]*"/g)].map((m) => m[0]);
  assert(absRefs.length === 0, "index.html: no absolute local src/href paths");

  // 4. No absolute url(...) references in CSS.
  const cssAbs = [...css.matchAll(/url\(\s*["']?\/[^)"]*/g)].map((m) => m[0]);
  assert(cssAbs.length === 0, "style.css: no absolute url() paths");

  // 5. script.js loads its data and images through relative paths.
  assert(js.includes('fetch("data.json")'), "script.js: data.json loaded via relative path");
  assert(/image\.src\s*=\s*`assets\//.test(js), "script.js: image src built as relative assets/<category>/... path");
  const tgUrl = js.match(/https:\/\/api\.telegram\.org[^\n]*/);
  assert(!!tgUrl, "script.js: Telegram API endpoint is an absolute https URL (host-independent)");
}

/* ---------- Main ---------- */

async function main() {
  // Copy the site into a sub-folder of a temp root. If any path in the site
  // were absolute, this setup would break — so passing below proves relative
  // paths work under a sub-path like GitHub Pages project hosting.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-test-"));
  let server;
  let browser;

  try {
    const siteDir = path.join(tmpRoot, "app");
    fs.mkdirSync(siteDir);
    for (const file of SITE_FILES) {
      fs.copyFileSync(path.join(ROOT, file), path.join(siteDir, file));
    }
    fs.cpSync(path.join(ROOT, "assets"), path.join(siteDir, "assets"), { recursive: true });

    auditSources();

    server = spawn(process.execPath, [SERVE_BIN, tmpRoot, "-l", String(PORT)], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForServer(`${BASE}/app/data.json`);

    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    // Hermetic run: the Google Fonts stylesheet must never block the page
    // load (sandboxed/CI environments have no external network).
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const responses = [];
    page.on("response", (res) => { try { responses.push(res); } catch (_) {} });
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await page.goto(BASE + "/app/", { waitUntil: "load" });
    await page.waitForSelector("#gallery .card", { timeout: 15000 });

    // data.json loaded from static hosting (no error message shown).
    const statusText = await page.$eval("#status-message", (el) => el.textContent.trim());
    assert(statusText === "", "data.json loads from static hosting (no error message shown)");

    const cardCount = await page.$$eval("#gallery .card", (els) => els.length);
    assert(cardCount === 50, `first batch rendered (${cardCount} cards)`);

    // The site opens on the drive size question; enter the gallery the same
    // way a customer does so the lazy images have a visible layout to load in.
    const optionCount = await page.$$eval("#drive-select option", (els) => els.length);
    if (optionCount < 2) throw new Error("drive options did not render");
    // The last option is the custom-size one; the max FIXED size is the last numeric option.
    const maxSize = await page.$eval(
      "#drive-select",
      (el) => [...el.options].filter((o) => /^\d+$/.test(o.value)).pop().value
    );

    // The custom-size row is hidden (computed style, not just the attribute) until
    // "custom" is picked — display:flex must not override the hidden attribute.
    const customHidden = await page.$eval(
      "#custom-size-row",
      (el) => getComputedStyle(el).display === "none"
    );
    assert(customHidden, "custom size row is hidden until 'custom' is picked");
    await page.select("#drive-select", "custom");
    const customShown = await page.$eval(
      "#custom-size-row",
      (el) => getComputedStyle(el).display !== "none"
    );
    assert(customShown, "picking 'custom' reveals the size input");

    await page.select("#drive-select", maxSize);
    await page.click("#start-selection-btn");
    await page.waitForFunction(() => !document.getElementById("gallery-view").hidden);

    // Every image actually decodes — catches broken paths on static hosting.
    const imgReport = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      // Yield to the event loop between scrolls: headless Chrome only schedules
      // lazy-loaded images at paint time, so a synchronous scroll loop can skip
      // whole rows without this.
      const nextFrame = () =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const imgs = Array.from(document.querySelectorAll("#gallery img"));
      for (const im of imgs) {
        if (!im.complete) {
          im.scrollIntoView();
          await nextFrame();
        }
      }
      await sleep(1000);
      await Promise.race([
        Promise.all(imgs.map((im) => new Promise((resolve) => {
          if (im.complete) return resolve();
          im.addEventListener("load", () => resolve(), { once: true });
          im.addEventListener("error", () => resolve(), { once: true });
        }))),
        sleep(10000),
      ]);
      const broken = imgs.filter((im) => !im.naturalWidth).map((im) => im.getAttribute("src"));
      return { total: imgs.length, pending: imgs.filter((im) => !im.complete).length, broken };
    });
    assert(imgReport.total === 50, "all first-batch images are in the DOM");
    assert(
      imgReport.pending === 0 && imgReport.broken.length === 0,
      `every image loads from static hosting (pending: ${imgReport.pending}, broken: ${imgReport.broken.join(", ") || "none"})`
    );

    // Network-level checks on what the static server actually returned.
    const dataRes = responses.find((r) => r.url().endsWith("/app/data.json"));
    assert(!!dataRes && dataRes.status() === 200, "data.json served with status 200");
    const dataHeaders = await dataRes.headers();
    assert(String(dataHeaders["content-type"] || "").includes("json"), `data.json content type is JSON (${dataHeaders["content-type"]})`);

    const imgResponses = responses.filter((r) => r.url().includes("/app/assets/"));
    const badImgStatuses = imgResponses.filter((r) => r.status() !== 200).map((r) => `${r.status()} ${r.url()}`);
    assert(imgResponses.length >= 50 && badImgStatuses.length === 0, `all ${imgResponses.length} image requests returned 200`);

    // Brand logo (rebrand plan Phase 12 item: "Logo works correctly after
    // Netlify deployment"): the header logo must decode from static hosting.
    const logoReport = await page.evaluate(() => {
      const img = document.querySelector(".brand-logo");
      return img ? { src: img.getAttribute("src"), width: img.naturalWidth } : null;
    });
    assert(
      !!logoReport && logoReport.src === "logo.svg" && logoReport.width > 0,
      `brand logo loads from static hosting (naturalWidth ${logoReport ? logoReport.width : 0})`
    );

    assert(pageErrors.length === 0, "no JavaScript errors on the deployed copy");

    // Telegram API reachability from the page context. A successful
    // cross-origin fetch only happens if HTTPS + CORS + token all work —
    // exactly what sendDocument needs from a deployed site. getMe sends no
    // document, so nothing is spammed.
    const jsSource = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
    const tokenMatch = jsSource.match(/TELEGRAM_BOT_TOKEN\s*=\s*"([^"]+)"/);
    assert(!!tokenMatch && tokenMatch[1].length > 0, "Telegram bot token is configured in script.js");

    const tgResult = await page.evaluate(async (token) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const body = await res.json();
        return { ok: body.ok === true, username: body.result ? body.result.username : null };
      } catch (err) {
        return { offline: true, error: String(err) };
      }
    }, tokenMatch[1]);

    if (tgResult.offline) {
      console.log("skip - Telegram getMe check skipped (no network access): " + tgResult.error);
    } else {
      assert(tgResult.ok && !!tgResult.username, `Telegram API reachable over HTTPS from the page (bot @${tgResult.username})`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main()
  .then(() => {
    console.log("ALL DEPLOYMENT CHECKS PASSED");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
