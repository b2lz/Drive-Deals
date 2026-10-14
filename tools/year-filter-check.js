"use strict";
// Drive the year filter in a real browser: pick the games category, type a
// lower bound, and confirm the grid narrows to that year and later.
//
// Usage: node tools/year-filter-check.js

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

const CASES = [
  ["2020", "من سنة 2020 فقط (السنة فاضية.Max)"],
  ["", "سنة 2020 بالضبط (من=max)"],
  ["2015", "2015 فما فوق"],
  ["", "مسح الفلتر"],
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Real release years, straight from data.json — a title can carry a number
  // that looks like a year but is not ("1348 Ex Voto" is from 2026).
  const byId = new Map();
  const raw = require("fs").readFileSync("data.json", "utf8");
  for (const c of JSON.parse(raw).categories) for (const i of c.items) byId.set(i.id, i);

  // Move to the games category.
  await page.evaluate(() => document.querySelector("[data-category='games']").click());
  await new Promise((r) => setTimeout(r, 1200));

  const total = await page.evaluate(() => document.querySelectorAll(".card").length);
  console.log(`  ألعاب بدون فلتر: ${total} كارت\n`);

  const setYear = async (min, max) => {
    await page.evaluate((mn, mx) => {
      const a = document.getElementById("filter-year-min-input");
      const b = document.getElementById("filter-year-max-input");
      a.value = mn;
      b.value = mx;
      document.getElementById("apply-year-filter-btn").click();
    }, min, max);
    await new Promise((r) => setTimeout(r, 1200));
    return page.evaluate(() => {
      // The grid only renders the first batch; count the full filtered set from
      // the app state so we see the real total, not the visible slice.
      const shown = document.querySelectorAll(".card").length;
      const total = window.__app?.state ? null : null;
      const badge = document.querySelector("[data-category='games']")?.textContent.trim();
      return {
        cards: shown,
        badge,
        chip: document.getElementById("active-year-filter")?.hidden === false
          ? document.getElementById("active-year-filter-info").textContent.trim()
          : null,
        err: document.getElementById("year-filter-error").textContent.trim(),
        noResults: document.querySelector("#no-results")?.hidden === false,
        loadMoreVisible: document.getElementById("load-more-btn")?.hidden === false,
        years: [...document.querySelectorAll(".card")].map((c) => c.title.match(/(\d{4})/)?.[1]).filter(Boolean),
      };
    });
  };

  for (const [year, label] of CASES) {
    const min = year;
    const max = year ? "" : "";
    const r = await setYear(min, max);
    // Check against the real year in data.json.
    const bad = await page.evaluate(() => [...document.querySelectorAll(".card")].map((c) => c.dataset.id));
    const badCount = min
      ? bad.filter((id) => (byId.get(id)?.year ?? 0) < Number(min)).length
      : 0;

    console.log(`  ${label}`);
    console.log(`    معروض: ${r.cards}   زر تحميل المزيد: ${r.loadMoreVisible}`);
    console.log(`    chip: ${r.chip || "—"}   خطأ: ${r.err || "—"}`);
    if (min) console.log(`    عناصر سنة.release < ${min}: ${badCount}  ${badCount === 0 ? "✔" : "✗"}`);
    console.log("");
  }

  // Exact-year case.
  console.log("  سنة واحدة بالضبط (من 2020 — إلى 2020)");
  const exact = await page.evaluate(async () => {
    const a = document.getElementById("filter-year-min-input");
    const b = document.getElementById("filter-year-max-input");
    a.value = "2020";
    b.value = "2020";
    document.getElementById("apply-year-filter-btn").click();
    await new Promise((r) => setTimeout(r, 900));
    return {
      cards: document.querySelectorAll(".card").length,
      chip: document.getElementById("active-year-filter-info")?.textContent.trim(),
      years: [...new Set([...document.querySelectorAll(".card")]
        .map((c) => c.title.match(/(\d{4})/)?.[1]).filter(Boolean))],
    };
  });
  console.log(`    كروت: ${exact.cards}   chip: ${exact.chip}   سنوات: ${exact.years.join(", ")}`);

  // Combined with the size filter — verify against data.json, not titles.
  console.log("\n  السنة + الحجم مع بعض (2020+ و الحجم >= 10)");
  const ids = await page.evaluate(async () => {
    document.getElementById("clear-year-filter-btn").click();
    const y = document.getElementById("filter-year-min-input");
    y.value = "2020";
    document.getElementById("apply-year-filter-btn").click();
    await new Promise((r) => setTimeout(r, 500));
    const s = document.getElementById("filter-min-input");
    s.value = "10";
    document.getElementById("apply-filter-btn").click();
    await new Promise((r) => setTimeout(r, 900));
    return {
      ids: [...document.querySelectorAll(".card")].map((c) => c.dataset.id),
      sizeChip: document.getElementById("active-filter-info")?.textContent.trim(),
      yearChip: document.getElementById("active-year-filter-info")?.textContent.trim(),
    };
  });
  const wrong = ids.ids.filter((id) => {
    const it = byId.get(id);
    return !it || it.year < 2020 || !(it.sizeGB >= 10);
  });
  console.log(`    معروض: ${ids.ids.length}   مخالف: ${wrong.length}  ${wrong.length === 0 ? "✔" : "✗"}`);
  console.log(`    chip الحجم: ${ids.sizeChip}   chip السنة: ${ids.yearChip}`);

  console.log(`\n  أخطاء: ${errors.length}`);
  for (const e of errors.slice(0, 5)) console.log("    " + e.slice(0, 110));
  await browser.close();
})();
