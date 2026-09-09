#!/usr/bin/env node
// ============================================================
// Phase 18 — mobile viewport tests (headless Chrome via puppeteer).
// Usage: npm run test:mobile   (or: node tools/test-mobile.js)
//
// Boots the real site on a local server and checks, at each viewport:
//   - no horizontal overflow (layout fits the screen width)
//   - buttons are tall enough to tap comfortably (>= 48px)
//   - cards are not too small (width >= 130px)
//   - the fixed summary bar never covers content when scrolled to bottom
//   - search input font-size is 16px (prevents iOS auto-zoom on focus)
// Plus: long file names wrap without breaking cards, and the customer
// form / review views fit narrow screens.
// ============================================================

"use strict";

const { spawn } = require("child_process");
const puppeteer = require("puppeteer");

const PORT = 3105;
const BASE = `http://localhost:${PORT}`;

const VIEWPORTS = [
  { name: "small Android phone", width: 360, height: 740 },
  { name: "large Android phone", width: 412, height: 915 },
  { name: "iPhone viewport", width: 390, height: 844 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "landscape mode", width: 1024, height: 768 },
];

const LONG_NAME =
  "010thisisaverylongimagenamefilethatshouldwrapnicelyinrtlcardsfortestingpurposesonly.jpg";

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

// The app now opens on the drive size question. Pick the biggest drive so
// capacity never interferes with layout tests, then enter the gallery.
async function enterGallery(page) {
  const optionCount = await page.$$eval("#drive-select option", (els) => els.length);
  if (optionCount < 2) throw new Error("drive options did not render");
  // The last option is the custom-size one; the max FIXED size is the last numeric option.
  const maxSize = await page.$eval(
    "#drive-select",
    (el) => [...el.options].filter((o) => /^\d+$/.test(o.value)).pop().value
  );
  await page.select("#drive-select", maxSize);
  await page.click("#start-selection-btn");
  await page.waitForFunction(() => !document.getElementById("gallery-view").hidden);
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 301) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Local server did not start in time.");
}

/** Layout checks shared by every viewport. Returns nothing; throws on failure. */
async function checkLayout(page, label) {
  const result = await page.evaluate(() => {
    const docEl = document.documentElement;
    const summaryBar = document.querySelector(".summary-bar");
    const sumTop = summaryBar.getBoundingClientRect().top;

    // When scrolled all the way down, where does the last content sit?
    const maxScroll = docEl.scrollHeight - window.innerHeight;
    const galleryBottomAtMaxScroll =
      document.getElementById("gallery").getBoundingClientRect().bottom - maxScroll;

    const buttons = [...document.querySelectorAll(".btn")].filter(
      (b) => !b.closest("[hidden]") && b.offsetParent !== null
    );
    const minBtnHeight = Math.min(...buttons.map((b) => b.getBoundingClientRect().height));

    const cards = [...document.querySelectorAll("#gallery .card")];
    const minCardWidth = Math.min(...cards.map((c) => c.getBoundingClientRect().width));

    return {
      scrollWidth: docEl.scrollWidth,
      innerWidth: window.innerWidth,
      galleryBottomAtMaxScroll,
      sumTop,
      minBtnHeight,
      minCardWidth,
      searchFontSize: getComputedStyle(document.getElementById("search-input")).fontSize,
    };
  });

  assert(
    result.scrollWidth <= result.innerWidth + 1,
    `${label}: no horizontal overflow (${result.scrollWidth}px content in ${result.innerWidth}px)`
  );
  assert(result.minBtnHeight >= 47, `${label}: buttons are tap-friendly (min height ${Math.round(result.minBtnHeight)}px)`);
  assert(result.minCardWidth >= 130, `${label}: cards not too small (min width ${Math.round(result.minCardWidth)}px)`);
  assert(
    result.galleryBottomAtMaxScroll <= result.sumTop + 2,
    `${label}: summary bar never covers content when scrolled to bottom`
  );
  assert(
    result.searchFontSize === "16px",
    `${label}: search input is 16px (no iOS focus zoom)`
  );
}

(async () => {
  // Serve the real site.
  const server = spawn(process.execPath, ["node_modules/serve/build/main.js", ".", "-l", String(PORT)], {
    stdio: "ignore",
    windowsHide: true,
  });
  let browser;
  try {
    await waitForServer(`${BASE}/data.json`);

    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    // Replace one entry with a very long file name to test wrapping.
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      const url = req.url();
      if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
        req.abort(); // offline-safe: the font stylesheet must not block the page load
        return;
      }
      if (url.endsWith("/data.json")) {
        const res = await fetch(`${BASE}/data.json`);
        const data = await res.json();
        const cat = data.categories[0];
        cat.items[9] = {
          id: `${cat.id}/${LONG_NAME}`,
          title: LONG_NAME,
          image: LONG_NAME,
          sizeGB: 7,
        };
        req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
      } else {
        req.continue();
      }
    });

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(BASE + "/", { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelectorAll("#drive-select option").length > 1, { timeout: 10000 });
      await enterGallery(page);
      console.log(`\n[${vp.name} — ${vp.width}x${vp.height}]`);
      await checkLayout(page, vp.name);
    }

    // Long file name must wrap inside its card without breaking the layout.
    const longNameOk = await page.evaluate((long) => {
      const el = [...document.querySelectorAll(".card-name")].find((n) => n.textContent.includes(long.slice(0, 20)));
      if (!el) return false;
      return el.scrollWidth <= el.clientWidth + 1;
    }, LONG_NAME);
    assert(longNameOk, "long image names wrap instead of breaking cards");

    /* ---------- Form + review views on a narrow phone (390px) ---------- */

    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("#drive-select option").length > 1);
    await enterGallery(page);

    // Select two cards and continue to the form.
    // Scroll each card to the viewport center before tapping: the fixed summary bar
    // covers the bottom ~150px, so a minimal scrollIntoView can leave the card
    // center underneath it and the tap lands on the bar instead of the card.
    const cards = await page.$$("#gallery .card");
    for (const card of [cards[0], cards[1]]) {
      await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await card.click();
    }
    await page.click("#continue-btn");
    await page.waitForSelector("#customer-form", { visible: true });

    // Long values must not overflow the form.
    await page.evaluate(() => {
      document.getElementById("name-input").value = "محمد أحمد إبراهيم السيد عبد الرحمن";
      document.getElementById("phone-input").value = "01012345678";
      document.getElementById("address-input").value =
        "15 شارع النيل، الحي الثالث، مدينة نصر، القاهرة الجديدة، جمهورية مصر العربية";
    });
    const formOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    assert(formOverflow, "form view fits a narrow phone with long values");

    // Submit → review view must also fit.
    // The submit button is below the fold; scroll it into view first because
    // puppeteer's auto-scroll (CDP DOM.scrollIntoViewIfNeeded) is unreliable here.
    await page.evaluate(() => {
      document.querySelector("#customer-form button[type=submit]").scrollIntoView({ block: "center" });
    });
    await page.click("#customer-form button[type=submit]");
    await page.waitForSelector("#review-view", { visible: true });
    const reviewOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    assert(reviewOverflow, "review view fits a narrow phone");

    console.log("\nALL MOBILE VIEWPORT TESTS PASSED");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
