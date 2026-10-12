"use strict";
// Find records whose canonicalTitle names an unrelated work — the "ليل
// داخلي" -> "ليلى" contamination pattern, applied across every category.
//
// Usage: node tools/find-title-drift.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const norm = (s) =>
  String(s).toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/[\u0649\u064A]/g, "\u064A")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "");

const rows = [];
for (const cat of data.categories) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  for (const item of cat.items) {
    const r = parsed.items[item.id];
    if (!r) continue;
    const canon = (r.canonicalTitle || "").trim();
    if (!canon) continue;
    const folder = norm(item.title);
    const c = norm(canon);
    if (!folder || !c) continue;
    if (folder === c) continue;

    // Similar enough to be a spelling variant?
    const overlap = [...new Set(c)].filter((ch) => folder.includes(ch)).length / new Set(c).size;
    if (overlap >= 0.6) continue;

    rows.push({ cat: cat.id, folder: item.title, canon, overlap: overlap.toFixed(2) });
  }
}

console.log("=".repeat(76));
console.log(`  عنوان قانوني مختلف عن المجلد — ${rows.length}`);
console.log("=".repeat(76));
for (const r of rows) {
  console.log(`\n  ${r.cat}`);
  console.log(`     المجلد  : ${r.folder}`);
  console.log(`     القانوني: ${r.canon}      (تشابه ${r.overlap})`);
}
console.log();
