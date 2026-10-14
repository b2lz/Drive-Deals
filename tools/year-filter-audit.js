"use strict";
// Which rendered cards slipped past the year filter? Titles can contain a
// number that looks like a year but is not (a volume, a sequel number, a size).
//
// Usage: node tools/year-filter-audit.js

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(() => document.querySelector("[data-category='games']").click());
  await new Promise((r) => setTimeout(r, 1200));

  const slips = await page.evaluate(async () => {
    const a = document.getElementById("filter-year-min-input");
    a.value = "2020";
    document.getElementById("apply-year-filter-btn").click();
    await new Promise((r) => setTimeout(r, 900));
    return [...document.querySelectorAll(".card")]
      .filter((c) => {
        const m = (c.title || "").match(/(\d{4})/);
        return m && Number(m[1]) < 2020;
      })
      .map((c) => ({ title: c.title, id: c.dataset.id }));
  });

  console.log("كروت عدّت الفلتر وسنواتها الظاهرة < 2020:");
  for (const s of slips) console.log(`  ${s.title}`);

  // Cross-check the real year from data.json.
  const fs = require("fs");
  const path = require("path");
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));
  const byId = new Map();
  for (const c of data.categories) for (const i of c.items) byId.set(i.id, i);
  console.log("\nسنة الحقيقية من data.json:");
  for (const s of slips) console.log(`  ${byId.get(s.id)?.year ?? "?"}   ${s.title}`);

  await browser.close();
})();
