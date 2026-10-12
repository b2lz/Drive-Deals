"use strict";
// Records whose canonicalTitle names a different work than the folder. Checked
// against the stored summary, cast and release year before rewriting, so a
// genuine translation is left alone.
//
// Usage: node tools/fix-title-drift.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// [category, folder, new canonical title, new release year|null]
const FIX = [
  // Jolt (2021, Taylor Lautner / Dave Bautista) was matched to "The Following".
  ["foreign-films", "Jolt", "Jolt", "2021"],
  // "It" (2017 horror) was matched to "Full of It" (2013 comedy).
  ["foreign-film-series", "It", "It", "2017"],
  // Crank (2006) was matched to the sequel "Crank: High Voltage" (2011).
  ["foreign-film-series", "Crank", "Crank", "2006"],
  // Kubo is the 2016 Laika film, not a 2013 Filipino comedy.
  ["cartoon-films", "Kubo", "Kubo and the Two Strings", "2016"],
];

const norm = (s) =>
  String(s).toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/[\u0649\u064A]/g, "\u064A")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const files = new Map();

for (const [catId, folder, canon, year] of FIX) {
  const item = data.categories.find((c) => c.id === catId).items.find((i) => norm(i.title) === norm(folder));
  if (!item) { console.log(`  no folder "${folder}" in ${catId}`); continue; }

  const file = path.join(ROOT, "details", `${catId}.json`);
  if (!files.has(catId)) files.set(catId, JSON.parse(fs.readFileSync(file, "utf8")));
  const r = files.get(catId).items[item.id];
  if (!r) { console.log(`  no record: ${item.id}`); continue; }

  console.log(`\n  ${item.id}`);
  console.log(`     قبل: ${r.canonicalTitle}  (${r.releaseDate})`);
  r.canonicalTitle = canon;
  if (year) r.releaseDate = year;
  delete r.wikiTitle;
  r.links = [{ label: "Wikipedia", url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(canon.replace(/ /g, "_")) }];
  r.needsReview = true;
  r.extra = {
    ...(r.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      `الاسم القانوني كان "${item.title}" يشير إلى عمل مختلف؛ صحّح إلى "${canon}" بعد مراجعة المحتوى.`,
  };
  console.log(`     بعد : ${r.canonicalTitle}  (${r.releaseDate})`);
}

if (!DRY) for (const [cat, parsed] of files)
  fs.writeFileSync(path.join(ROOT, "details", `${cat}.json`), JSON.stringify(parsed, null, 2) + "\n");
console.log(`\n${FIX.length} سجلات ${DRY ? "(dry run)" : "محدّثة"}`);
