"use strict";
// Lists every media item (everything except games) that is missing data,
// with the missing field beside the title.
//
// Usage:
//   node tools/media-gaps-list.js                  all categories
//   node tools/media-gaps-list.js arabic-series    one category
//   node tools/media-gaps-list.js --no-record      only items with no record
//   node tools/media-gaps-list.js --named          only items that have a record

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const NO_RECORD = process.argv.includes("--no-record");
const NAMED = process.argv.includes("--named");
// argv[0] is the node binary and argv[1] is this script's path; neither is
// a category name, so they have to be dropped or `only` never matches.
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const LABEL = {
  "arabic-films": "أفلام عربية",
  "foreign-films": "أفلام أجنبية",
  "foreign-film-series": "مسلسلات أفلام أجنبية",
  "indian-films": "أفلام هندية",
  "arabic-series": "مسلسلات عربية",
  "foreign-series": "مسلسلات أجنبية",
  "korean-series": "مسلسلات كورية",
  "cartoon-films": "أفلام كرتون",
  "cartoon-series": "مسلسلات كرتون",
  anime: "أنمي",
  "turkish-series": "مسلسلات تركية",
};

let grandTotal = 0;
const grandCounts = new Map();

for (const cat of data.categories) {
  if (cat.id === "games") continue;
  // With no category named, print every media category.
  if (only.length && !only.includes(cat.id)) continue;

  const file = path.join(ROOT, "details", `${cat.id}.json`);
  const details = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { items: {} };

  const rows = [];
  for (const item of cat.items) {
    const r = details.items?.[item.id];
    const isNoRecord = !r || r._miss;
    if (NO_RECORD && !isNoRecord) continue;
    if (NAMED && isNoRecord) continue;

    const gaps = [];
    if (isNoRecord) gaps.push("كل الحقول");
    else {
      if (!(r.summaryAr || r.summaryEn)) gaps.push("ملخص");
      if (!has(r.releaseDate)) gaps.push("سنة إصدار");
      // Only real credit fields count here. `networks` and `studio` are
      // separate facts about a show and must not be read as "has people",
      // otherwise a record with only a broadcaster looks complete.
      const people =
        has(r.director) || has(r.directors) || has(r.cast) || has(r.creator) ||
        has(r.creators) || has(r.studio) || has(r.studios);
      if (!people) gaps.push("مخرج/أبطال");
    }
    if (gaps.length) rows.push([item.title, gaps]);
  }

  if (!rows.length) continue;

  rows.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const width = Math.max(...rows.map((r) => r[0].length));

  console.log(`\n${"=".repeat(90)}`);
  console.log(`  ${LABEL[cat.id] || cat.id}  (${rows.length} ناقص من ${cat.items.length})`);
  console.log("=".repeat(90));
  for (const [title, gaps] of rows) {
    console.log(title.padEnd(width + 2, ".") + "  " + gaps.join(" + "));
  }

  grandTotal += rows.length;
  for (const [, gaps] of rows) for (const g of gaps) grandCounts.set(g, (grandCounts.get(g) || 0) + 1);
}

console.log(`\n${"=".repeat(90)}`);
console.log("  الإجمالي");
console.log("=".repeat(90));
for (const [g, n] of [...grandCounts].sort((a, b) => b[1] - a[1])) console.log(`  ${g.padEnd(14)} ${n}`);
console.log(`  ${"المجموع".padEnd(14)} ${grandTotal}`);