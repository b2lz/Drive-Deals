"use strict";
// Two leftovers from the Arabic-series batch:
//
// 1. `العراف` exists as two folders. The hand data filled the one whose
//    title is exactly "العراف"; the other, "العراف " (trailing space),
//    keeps its older record with the release year still missing. Copy the
//    resolved facts across so both folders agree.
//
// 2. `8الكبير` is the "الكبير أوي" series; the folder name is a typo. It
//    carries a combined director string and no year. Mark it the same way
//    the other uncertain titles in this batch are marked.
//
// Usage: node tools/fix-arabic-series-leftovers.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

// 1. The duplicate العراف folder.
const source = parsed.items["arabic-series/العراف.jpg"];
const duplicate = parsed.items["arabic-series/العراف .jpg"];
if (source && duplicate) {
  if (!has(duplicate.releaseDate) && has(source.releaseDate)) {
    duplicate.releaseDate = source.releaseDate;
    console.log(`  العراف (duplicate folder): releaseDate -> ${duplicate.releaseDate}`);
  }
  if (!has(duplicate.cast) && has(source.cast)) {
    duplicate.cast = source.cast;
    console.log(`  العراف (duplicate folder): cast copied (${source.cast.length})`);
  }
  if (!has(duplicate.summaryAr) && has(source.summaryAr)) {
    duplicate.summaryAr = source.summaryAr;
    console.log("  العراف (duplicate folder): summary copied");
  }
  if (has(duplicate.summaryAr)) delete duplicate.needsSummary;
}

// 2. 8الكبير - the year of a long-running series cannot be one value.
const alb = parsed.items["arabic-series/8الكبير.jpg"];
if (alb) {
  alb.needsReview = true;
  alb.extra = {
    ...(alb.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      "سلسلة الكبير أوي — أجزاؤها تمتد من 2010 حتى الآن، فلا ينطبق عليها سنة إصدار واحدة. " +
      "اسم المجلد «8الكبير» خطأ مطبعي.",
  };
  console.log("  8الكبير: marked as a series with no single release year");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");