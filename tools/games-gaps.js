"use strict";
// Every game that still lacks something, with the specific gaps named.
//
// Usage: node tools/games-gaps.js [--missing-only] [--no-specs-only]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MISSING_ONLY = process.argv.includes("--missing-only");
const SPECS_ONLY = process.argv.includes("--no-specs-only");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");
const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));

const has = (v) => {
  if (v === null || v === undefined || v === "") return false;
  return !(Array.isArray(v) && !v.length);
};

/** The fields the page actually shows, in the order it shows them. */
const CHECKS = [
  ["مواصفات التشغيل", (r) => r.requirements && (r.requirements.minimum || r.requirements.recommended)],
  ["ملخص", (r) => r.summaryAr || r.summaryEn],
  ["مطور", (r) => has(r.developer) || has(r.publisher)],
  ["سنة إصدار", (r) => has(r.releaseDate)],
  ["تصنيف", (r) => has(r.genres)],
];

const rows = [];

for (const item of cat.items) {
  const r = parsed.items[item.id];
  const gaps = [];

  if (!r || r._miss) {
    // Nothing at all: every field is missing, and naming them all would
    // just be noise repeated 86 times.
    rows.push({ item, gaps: ["كل الحقول"], empty: true });
    continue;
  }

  for (const [label, test] of CHECKS) {
    if (!test(r)) gaps.push(label);
  }
  if (gaps.length) rows.push({ item, gaps, empty: false });
}

const show = (r) => (MISSING_ONLY ? r.empty : SPECS_ONLY ? r.gaps.includes("مواصفات التشغيل") : true);

const shown = rows.filter(show);

console.log("=".repeat(84));
console.log(`  ألعاب ناقصها بيانات: ${shown.length}`);
console.log("=".repeat(84));
console.log();

for (const { item, gaps, empty } of shown) {
  const size = item.sizeGB === undefined || item.sizeGB === null ? "" : `${item.sizeGB} GB`;
  const title = item.title.length > 44 ? item.title.slice(0, 43) + "…" : item.title;
  console.log(`${title.padEnd(45)} ${String(size).padStart(9)}   ${gaps.join("، ")}`);
}

// A count per kind of gap, so the shape of the remaining work is clear.
console.log(`\n${"=".repeat(84)}`);
console.log("  ملخص");
console.log("=".repeat(84));

const counts = new Map();
for (const r of rows) {
  for (const g of r.gaps) counts.set(g, (counts.get(g) || 0) + 1);
}
for (const [label, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${label.padEnd(22)} ${String(n).padStart(5)}`);
}
console.log(`  ${"كل الحقول (فارغة)".padEnd(22)} ${String(rows.filter((r) => r.empty).length).padStart(5)}`);