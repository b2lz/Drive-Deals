"use strict";
// Screenshot the library at phone and desktop widths, so a perf change can be
// eyeballed against the previous look.
//
// Usage: node tools/shot.js [url]

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";
const OUT = "C:/Users/bo2lz/AppData/Local/Temp/drive-deals-shots";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1400, height: 950, mobile: false },
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile,
    });
    await page.goto(BASE, { waitUntil: "load", timeout: 120000 });
    for (let i = 0; i < 60; i++) {
      if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.evaluate(() => { if (typeof showView === "function") showView("gallery"); });
    await new Promise((r) => setTimeout(r, 2500));
    const p = `${OUT}/${vp.name}.png`;
    await page.screenshot({ path: p });
    console.log("  " + p);
    await page.close();
  }

  await browser.close();
})();