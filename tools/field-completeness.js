"use strict";
// Field-level completeness: not "does a record exist" but "is every field
// actually filled", per category. This is the stricter check that the
// coverage audit does not perform.
//
// Usage: node tools/field-completeness.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const filled = (v) => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0 && v.some((x) => String(x).trim());
  if (typeof v === "object") return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
};

const rows = [];
const gaps = [];

for (const cat of data.categories) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  const isGame = cat.id === "games";

  const cols = isGame
    ? ["المطور", "الناشر", "النوع", "المنصات", "سنة", "ملخص", "مواصفات", "حد أدنى", "موصى"]
    : ["المخرج", "الأبطال", "سنة", "ملخص", "الملخص عربي"];

  const c = Object.fromEntries(cols.map((k) => [k, 0]));

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;

    const has = {
      المخرج: filled(rec.director) || filled(rec.directors),
      الأبطال: filled(rec.cast),
      المطور: filled(rec.developer) || filled(rec.creators),
      الناشر: filled(rec.publisher),
      النوع: filled(rec.genres),
      المنصات: filled(rec.platforms),
      سنة: filled(rec.releaseDate),
      ملخص: filled(rec.summaryAr) || filled(rec.summaryEn),
      "الملخص العربي": filled(rec.summaryAr),
      مواصفات: filled(rec.requirements),
      "حد أدنى": filled((rec.requirements || {}).minimum),
      موصى: filled((rec.requirements || {}).recommended),
    };

    const missing = [];
    for (const k of cols) {
      if (has[k]) c[k]++;
      else missing.push(k);
    }
    if (missing.length) gaps.push({ cat: cat.id, item: item.title, missing });
  }
  rows.push({ id: cat.id, n: cat.items.length, cols, c });
}

const isGame = (id) => id === "games";
console.log("=".repeat(96));
console.log("  اكتمال الحقول — لكل حقل: كم عنصر ملّاه فعلاً");
console.log("=".repeat(96));
console.log("  " + "category".padEnd(20) + "العناصر " + rows[0].cols.map((k) => k.padStart(11)).join(""));
console.log("  " + "-".repeat(90));
for (const r of rows) {
  console.log(
    "  " + r.id.padEnd(20) + String(r.n).padStart(6) +
      "  " + r.cols.map((k) => String(r.c[k]).padStart(10)).join(""),
  );
}

console.log("\n" + "=".repeat(96));
console.log(`  عناصر فيها حقل ناقص فعلاً: ${gaps.length}`);
console.log("=".repeat(96));
const byField = new Map();
for (const g of gaps) for (const m of g.missing) byField.set(m, (byField.get(m) || 0) + 1);
for (const [f, n] of [...byField.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  ${f.padEnd(16)} ناقص في ${n}`);

const LANG = "الملخص العربي";
const onlyLang = gaps.filter((g) => g.missing.every((m) => m === LANG)).length;
const realGaps = gaps.filter((g) => g.missing.some((m) => m !== LANG));
console.log(`\n  نقصه الملخص العربي فقط: ${onlyLang}`);
console.log(`  فيه نقص حقيقي (غير اللغة): ${realGaps.length}`);
if (realGaps.length) {
  console.log("\n  الحقول الحقيقية الناقصة:");
  for (const g of realGaps.slice(0, 60)) {
    const m = g.missing.filter((x) => x !== LANG);
    console.log(`    ${g.cat} / ${g.item}  → ${m.join("، ")}`);
  }
  if (realGaps.length > 60) console.log(`    … و${realGaps.length - 60} غيرهم`);
}
console.log();
