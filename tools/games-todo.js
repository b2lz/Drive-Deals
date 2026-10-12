"use strict";
// List every game whose details are incomplete, grouped by how complete
// they are, so the remaining work can be read off one page.
//
// Usage: node tools/games-todo.js [--no-specs-only]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SPECS_ONLY = process.argv.includes("--no-specs-only");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");
const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));

const has = (r, f) => {
  const v = r[f];
  if (v === null || v === undefined || v === "") return false;
  return !(Array.isArray(v) && !v.length);
};

const noRecord = [];
const noSpecs = [];
const thin = [];

for (const item of cat.items) {
  const r = parsed.items[item.id];
  if (!r || r._miss) {
    noRecord.push(item);
    continue;
  }
  const specs = r.requirements && (r.requirements.minimum || r.requirements.recommended);
  if (!specs) noSpecs.push(item);
  const gaps = [];
  if (!(r.summaryAr || r.summaryEn)) gaps.push("ملخص");
  if (!has(r, "releaseDate")) gaps.push("سنة");
  if (!(r.developer || r.publisher || r.creators)) gaps.push("مطور");
  if (!specs) gaps.push("مواصفات");
  if (gaps.length >= 2) thin.push({ item, gaps });
}

const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s).padEnd(n);

console.log("=".repeat(78));
console.log(`  ألعاب مالها أي تفاصيل خالص: ${noRecord.length}`);
console.log("=".repeat(78));
for (const item of noRecord) console.log(`  ${pad(item.title, 52)} ${String(item.sizeGB ?? "").padStart(7)} GB`);

if (!SPECS_ONLY) {
  console.log(`\n${"=".repeat(78)}`);
  console.log(`  عندها تفاصيل بس من غير مواصفات تشغيل: ${noSpecs.length}`);
  console.log("=".repeat(78));
  for (const item of noSpecs) console.log(`  ${pad(item.title, 52)} ${String(item.sizeGB ?? "").padStart(7)} GB`);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`  ناقصها أكتر من حقل واحد: ${thin.length}`);
  console.log("=".repeat(78));
  for (const { item, gaps } of thin) {
    console.log(`  ${pad(item.title, 50)} ${gaps.join("، ")}`);
  }
}