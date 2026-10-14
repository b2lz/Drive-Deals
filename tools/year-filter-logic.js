"use strict";
// Verify the year filter's own logic against data.json, without the browser
// batching. Re-implements the filter rules exactly as script.js applies them.
//
// Usage: node tools/year-filter-logic.js

const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));

const matchesYear = (item, min, max) => {
  if (min === null && max === null) return true;
  if (item.year === null || item.year === undefined) return false;
  if (min !== null && item.year < min) return false;
  if (max !== null && item.year > max) return false;
  return true;
};

const games = data.categories.find((c) => c.id === "games").items;

const cases = [
  ["بدون فلتر", null, null],
  ["من 2020", 2020, null],
  ["من 2015", 2015, null],
  ["حتى 2010", null, 2010],
  ["2020 بالظبط", 2020, 2020],
  ["2010 - 2020", 2010, 2020],
];

for (const [label, min, max] of cases) {
  const hits = games.filter((i) => matchesYear(i, min, max));
  const years = [...new Set(hits.map((i) => i.year))].sort((a, b) => a - b);
  console.log(`  ${label.padEnd(16)} ${String(hits.length).padStart(4)} من ${games.length}   سنوات: ${years[0] ?? "—"}..${years[years.length - 1] ?? "—"}`);
}

console.log("\n  sanity: كل عنصر في 'من 2020' لازم year >= 2020");
const check = games.filter((i) => matchesYear(i, 2020, null)).every((i) => i.year >= 2020);
console.log(`    ${check ? "✔ صح" : "✗ غلط"}`);
