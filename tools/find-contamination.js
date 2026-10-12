"use strict";
// Hunt for records whose stored facts describe a *different* work than the
// folder they sit in.
//
// Two signals are cheap and reliable here:
//
//   1. `wikiTitle` / `summaryEn` that reads like a Wikipedia disambiguation
//      list — several "X (سنة): ..." blocks stitched into one summary.
//   2. A canonicalTitle or cast name that also appears inside the English
//      summary, which means the summary is about the canonical title rather
//      than the folder (the "ليل داخلي" → "ليلى" case).
//
// Usage: node tools/find-contamination.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const hits = [];

for (const cat of data.categories) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    const folder = item.title;
    const canon = (rec.canonicalTitle || "").trim();
    const en = (rec.summaryEn || "").trim();
    const notes = [];

    // A disambiguation summary lists several films under one title.
    if (/(?:^|\s)\([^)]*(?:فيلم|مسلسل)\s*\d{4}\s*\):/.test(en)) notes.push("ملخص تجميعي (Several works)");
    if (/في \d{4}:|في \d{4}\)/.test(en) && (en.match(/\d{4}\)/g) || []).length >= 2)
      notes.push("ملخص تجميعي (Several works)");

    // The canonical title is a different, unrelated work.
    if (canon && canon !== folder && canon.length > 2 && canon.length < 40) {
      const shares = (list) =>
        (list || []).some((n) => canon.includes(n) || String(n).includes(canon));
      if (shares(rec.cast) || shares(rec.directors)) notes.push(`اسم قانوني مختلف: ${canon}`);
    }

    if (notes.length) hits.push({ cat: cat.id, id: item.id, folder, canon, wiki: rec.wikiTitle || "", notes });
  }
}

console.log("=".repeat(78));
console.log(`  سجلّات يشتبه أن بياناتها تخص عملاً آخر: ${hits.length}`);
console.log("=".repeat(78));
for (const h of hits) {
  console.log(`\n  ${h.cat} / ${h.folder}`);
  console.log(`     الاسم القانوني : ${h.canon || "—"}`);
  if (h.wiki) console.log(`     صفحة ويكيبيديا  : ${h.wiki}`);
  for (const n of h.notes) console.log(`     ⚠ ${n}`);
}
console.log();
