"use strict";
// Prove a CSS change is visually a no-op: screenshot the gallery with the
// current styles, screenshot it again with a candidate override injected, then
// compare the two images pixel by pixel. Reports the share of pixels that
// differ, which is the number that decides "safe to ship".
//
// Usage: node tools/visual-diff.js "<css to inject>" [url]

const fs = require("fs");
const sharp = require("sharp");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[3] || "http://localhost:4321/";
// Optional 4th arg: the URL to shoot as "before". Point it at the deployed
// site to compare the working tree against what users have right now.
const BEFORE_URL = process.argv[4] || BASE;
const OUT = "C:/Users/bo2lz/AppData/Local/Temp/drive-deals-shots";

const SHOTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1400, height: 950, mobile: false },
];

async function shoot(page, file) {
  return sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
}

(async () => {
  const puppeteer = require("puppeteer-core");
  const override = process.argv[2] || "";
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });

  const results = [];

  for (const vp of SHOTS) {
    const shots = {};
    for (const mode of ["before", "after"]) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile,
      });
      const url = mode === "before" ? BEFORE_URL : BASE;
      await page.goto(url, { waitUntil: "load", timeout: 120000 });
      for (let i = 0; i < 60; i++) {
        if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      await page.evaluate(() => { if (typeof showView === "function") showView("gallery"); });
      await new Promise((r) => setTimeout(r, 2200));
      // Freeze the ambient animation, otherwise the background orbs make every
      // frame differ and the comparison measures noise instead of the change.
      await page.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused !important}" });
      await new Promise((r) => setTimeout(r, 300));

      if (mode === "after" && override) await page.addStyleTag({ content: override });
      await new Promise((r) => setTimeout(r, 700));

      shots[mode] = await shoot(page, mode);
      await page.close();
    }

    const a = shots.before;
    const b = shots.after;
    let diff = 0;
    let maxDelta = 0;
    const total = a.info.width * a.info.height;
    for (let i = 0; i < a.data.length; i += a.info.channels) {
      const d = Math.max(
        Math.abs(a.data[i] - b.data[i]),
        Math.abs(a.data[i + 1] - b.data[i + 1]),
        Math.abs(a.data[i + 2] - b.data[i + 2])
      );
      if (d > 2) diff++;
      if (d > maxDelta) maxDelta = d;
    }
    results.push({ vp: vp.name, pct: (diff / total) * 100, diff, total, maxDelta });
  }

  console.log(`\n  قبل : ${BEFORE_URL}`);
  console.log(`  بعد : ${BASE}`);
  if (override) console.log(`  تعديل إضافي:\n    ${override.replace(/\n/g, "\n    ")}`);
  console.log(`  ─────────────────────────────────────────────`);
  for (const r of results) {
    console.log(
      `  ${r.vp.padEnd(8)} ${r.pct.toFixed(2)}% من البكسل مختلف  (${r.diff}/${r.total})  أقصى فرق قناة: ${r.maxDelta}`
    );
  }
  const worst = Math.max(...results.map((r) => r.pct));
  console.log(`\n  ${worst < 0.5 ? "✔ غير مرئي — نفس الشكل" : worst < 2 ? "△ فرق بسيء" : "✗ فرق واضح"}`);
  void OUT;

  await browser.close();
})();