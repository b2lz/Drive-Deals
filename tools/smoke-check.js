"use strict";
// Functional smoke test: does the library actually render after the recent
// head changes? Waits properly instead of relying on networkidle2, and reports
// any console error that explains a blank grid.
//
// Usage: node tools/smoke-check.js [url]

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText}  ${r.url().split("/").slice(-1)[0]}`));

  await page.goto(BASE, { waitUntil: "load", timeout: 120000 });

  // Poll for up to 25s rather than trusting networkidle2.
  let cards = 0;
  for (let i = 0; i < 50; i++) {
    cards = await page.evaluate(() => document.querySelectorAll(".card").length);
    if (cards > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const cats = await page.evaluate(() => document.querySelectorAll("[data-category]").length);

  console.log(`\n  ${BASE}`);
  console.log(`    categories : ${cats}`);
  console.log(`    cards      : ${cards}`);
  console.log(`    errors     : ${errors.length}`);
  for (const e of errors.slice(0, 8)) console.log("      " + e.slice(0, 160));
  if (failed.length) {
    console.log(`    failed requests : ${failed.length}`);
    for (const f of failed.slice(0, 8)) console.log("      " + f);
  }
  console.log(`\n    ${cats > 0 && cards > 0 && errors.length === 0 ? "✔ الصفحة شغالة" : "✗ في مشكلة"}`);

  await browser.close();
})();