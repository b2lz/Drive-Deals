"use strict";
// Save the two screenshots visual-diff compares, so a big diff can be checked
// by eye before blaming the CSS.
//
// Usage: node tools/visual-frames.js <beforeUrl> <afterUrl>

const fs = require("fs");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const OUT = "C:/Users/bo2lz/AppData/Local/Temp/drive-deals-shots";
const BEFORE_URL = process.argv[2];
const AFTER_URL = process.argv[3];

(async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });

  for (const [tag, url] of [["before", BEFORE_URL], ["after", AFTER_URL]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    for (let i = 0; i < 60; i++) {
      if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.evaluate(() => { if (typeof showView === "function") showView("gallery"); });
    await new Promise((r) => setTimeout(r, 2200));
    await page.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused !important}" });
    await new Promise((r) => setTimeout(r, 500));
    const p = `${OUT}/diff-${tag}.png`;
    await page.screenshot({ path: p });
    console.log("  " + p);
    await page.close();
  }

  await browser.close();
})();