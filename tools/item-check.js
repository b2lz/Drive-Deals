// Checks the item details page (item.html) across viewports.
// Usage: node tools/item-check.js [baseUrl] [outDir]
const path = require("path");
const fs = require("fs");

const puppeteer = require(
  path.resolve("C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer")
);

const BASE = process.argv[2] || "http://localhost:4321";
const OUT =
  process.argv[3] || path.join(process.env.TEMP || ".", "drive-deals-item-check");

const ITEM = "games/007 First Light.jpg"; // has a full details entry
const BARE = "games/Mortal Shell II.jpg"; // no details entry -> graceful degradation

const BROWSERS = [
  process.env.DRIVE_DEALS_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);
const executablePath = BROWSERS.find((p) => fs.existsSync(p));

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, dsf: 2 },
  { name: "desktop", width: 1440, height: 1000, dsf: 1 },
];

(async () => {
  if (!executablePath) { console.error("No browser found"); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", executablePath });
  const problems = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf });
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // --- item WITH researched details ---
    await page.goto(`${BASE}/item.html#id=${encodeURIComponent(ITEM)}`, { waitUntil: "networkidle2" });
    await wait(900);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-full.png`), fullPage: false });

    // click through the tabs
    const tabs = await page.$$(".item-tab");
    for (const t of tabs) { await t.click(); await wait(200); }
    await page.screenshot({ path: path.join(OUT, `${vp.name}-tab-last.png`) });

    const full = await page.evaluate(() => {
      const doc = document.documentElement;
      const isClipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX !== "visible" || o.overflowY !== "visible" || o.position === "fixed") return true;
        }
        return false;
      };
      return {
        overflow: doc.scrollWidth - doc.clientWidth,
        overflowing: [...document.querySelectorAll("body *")].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2) && !isClipped(el);
        }).map((el) => (el.className || el.tagName) + "").slice(0, 6),
        // tokens resolved from the Liquid Glass stylesheet?
        tokenCheck: {
          cyan: getComputedStyle(document.documentElement).getPropertyValue("--brand-cyan").trim(),
          radius: getComputedStyle(document.documentElement).getPropertyValue("--radius-lg").trim(),
        },
        oldPixelTokens: getComputedStyle(document.documentElement).getPropertyValue("--px-bg").trim() || "(none - good)",
        title: document.getElementById("item-title").textContent,
        tabs: [...document.querySelectorAll(".item-tab")].map((t) => t.textContent),
        // every dt must sit directly above its own dd, same column
        dlPairing: (() => {
          const bad = [];
          for (const sel of ["#item-quickfacts", "#item-facts", "#item-extra"]) {
            const dl = document.querySelector(sel);
            if (!dl) continue;
            const kids = [...dl.children];
            for (let i = 0; i < kids.length; i++) {
              const el = kids[i];
              if (!el.tagName || el.tagName !== "DT") continue;
              const next = kids[i + 1];
              const r1 = el.getBoundingClientRect();
              if (!next || next.tagName !== "DD") { bad.push(sel + ": dt without dd"); continue; }
              const r2 = next.getBoundingClientRect();
              if (Math.abs(r1.left - r2.left) > 2) bad.push(sel + ': ' + el.textContent + ' not aligned with its value');
              if (!r2 || !(r2.top >= r1.bottom - 2)) bad.push(sel + ': ' + el.textContent + ' value is not below it');
            }
          }
          return bad.length ? bad : "all dt/dd pairs correct";
        })(),
      };
    });
    if (full.overflow > 1) problems.push(`${vp.name}: item page overflows ${full.overflow}px`);
    if (full.overflowing.length) problems.push(`${vp.name}: ${full.overflowing.join(", ")}`);
    if (full.oldPixelTokens !== "(none - good)") problems.push(`${vp.name}: old --px-* token leaked`);
    if (full.dlPairing !== "all dt/dd pairs correct") {
      problems.push(`${vp.name}: dt/dd pairing broken -> ${JSON.stringify(full.dlPairing)}`);
    }

    // --- item WITHOUT details -> must degrade, not break ---
    // A hash-only goto does not reload, so open a fresh page.
    const page2 = await browser.newPage();
    await page2.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf });
    const errs2 = [];
    page2.on("pageerror", (e) => errs2.push("pageerror: " + e.message));
    await page2.goto(`${BASE}/item.html#id=${encodeURIComponent(BARE)}`, { waitUntil: "networkidle2" });
    await wait(800);
    await page2.screenshot({ path: path.join(OUT, `${vp.name}-bare.png`) });
    const bare = await page2.evaluate(() => ({
      title: document.getElementById("item-title").textContent,
      size: document.getElementById("item-size").textContent,
      detailVisible: !document.getElementById("item-detail").hidden,
      statusShown: !document.getElementById("item-status").hidden,
      statusText: document.getElementById("item-status").textContent,
      tabs: [...document.querySelectorAll(".item-tab")].map((t) => t.textContent),
    }));
    if (bare.title === full.title) problems.push(`${vp.name}: bare case rendered the wrong item (${bare.title})`);
    if (!bare.detailVisible) problems.push(`${vp.name}: bare item hid the detail block (should degrade gracefully)`);
    if (errs2.length) { console.log("bare page errors:", errs2.slice(0, 4)); problems.push(`${vp.name}: bare page errors`); }
    await page2.close();

    console.log(`\n=== ${vp.name} ===`);
    console.log(JSON.stringify({ full, bare }, null, 2));
    if (errs.length) { console.log("console errors:", errs.slice(0, 4)); problems.push(`${vp.name}: console errors`); }
    await page.close();
  }

  await browser.close();
  console.log("\nScreenshots ->", OUT);
  if (problems.length) { console.log("\nPROBLEMS:"); problems.forEach((p) => console.log(" - " + p)); process.exitCode = 1; }
  else console.log("\nItem page OK at every viewport.");
})();