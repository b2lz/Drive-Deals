"use strict";
// What is the renderer actually doing? Counts the elements that force a
// backdrop snapshot (backdrop-filter) and the layers that blur, on a real
// phone-sized viewport.
//
// Usage: node tools/render-cost.js [url]

const PUPPETEER = require("puppeteer-core");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";

(async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  await page.goto(BASE, { waitUntil: "load", timeout: 120000 });
  for (let i = 0; i < 60; i++) {
    if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.evaluate(() => { if (typeof showView === "function") showView("gallery"); });
  await new Promise((r) => setTimeout(r, 2000));

  const r = await page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    const withBackdrop = all.filter((el) => {
      const b = getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter;
      return b && b !== "none";
    });
    const withFilter = all.filter((el) => {
      const f = getComputedStyle(el).filter;
      return f && f !== "none";
    });
    const animated = all.filter((el) => getComputedStyle(el).animationName !== "none");
    // Group by class so the report says which component is expensive.
    const group = (list) => {
      const m = {};
      for (const el of list) {
        const key = el.className && typeof el.className === "string"
          ? el.className.split(/\s+/)[0] || el.tagName.toLowerCase()
          : el.tagName.toLowerCase();
        m[key] = (m[key] || 0) + 1;
      }
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    return {
      total: all.length,
      backdrop: withBackdrop.length,
      backdropBy: group(withBackdrop),
      filter: withFilter.length,
      filterBy: group(withFilter),
      animated: animated.length,
      animatedBy: group(animated),
      dpr: window.devicePixelRatio,
    };
  });

  console.log(`\n  ${BASE}   (390x844 @${r.dpr}x)`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  عناصر في الصفحة        : ${r.total}`);
  console.log(`  backdrop-filter        : ${r.backdrop}   ← كل واحد بيقفل البكجراوند ويسلّمه للمتصفح`);
  for (const [k, n] of r.backdropBy) console.log(`      ${String(n).padStart(4)} × .${k}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  filter (blur)          : ${r.filter}`);
  for (const [k, n] of r.filterBy) console.log(`      ${String(n).padStart(4)} × .${k}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  عناصر متحركة           : ${r.animated}`);
  for (const [k, n] of r.animatedBy) console.log(`      ${String(n).padStart(4)} × .${k}`);

  await browser.close();
})();