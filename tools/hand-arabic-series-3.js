"use strict";
// The last two Arabic-series summaries.
//
//  8الكبير -> a description of the eighth season specifically, not the
//             first (the earlier stored text described season 1).
//  ونيس    -> the premise of the daily series.
//
// Usage: node tools/hand-arabic-series-3.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const DATA = [
  [
    "arabic-series/8الكبير.jpg",
    "كوميديا ساخرة تدور في قرية المزاريطة حول مغامرات الكبير ومشكلاته مع زوجته مربوحة، " +
      "وتورط حزلقوم وهجرس في مواقف عبثية ومضحكة.",
  ],
  [
    "arabic-series/ونيس.jpg",
    "دراما اجتماعية عائلية ترصد رحلة الأب ونيس وزوجته مايسة في تربية أبنائهما الأربعة " +
      "على الأخلاق والقيم الفاضلة وسط مواقف كوميدية ومؤثرة.",
  ],
];

let written = 0;
for (const [id, summary] of DATA) {
  const rec = parsed.items[id];
  if (!rec) {
    console.log(`  no record: ${id}`);
    continue;
  }
  rec.summaryAr = summary;
  delete rec.needsSummary;
  rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
  written++;
  console.log(`  ${id.split("/")[1]} -> summary written`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`\n${written} written. ${DRY ? "(dry run)" : ""}`);