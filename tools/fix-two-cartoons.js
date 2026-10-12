"use strict";
// The last two cartoon-series gaps.
//
//  SHE-RA — supplied by hand. Noelle Stevenson developed and directed the
//    series; the three names given are its lead voice cast.
//
//  ديزني كلاسيك — an archive of Disney features rather than one work.
//    The year supplied (1937, Snow White) is the start of the classic era,
//    so it is written with a note saying the archive spans decades rather
//    than one release.
//
// Usage: node tools/fix-two-cartoons.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "cartoon-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const s1 = parsed.items["cartoon-series/SHE-RA Tha Princesses OF Power.jpg"];
if (s1) {
  s1.director = "نويل ستيفنسون";
  s1.directors = ["نويل ستيفنسون"];
  s1.cast = ["إيمي كاريرو", "مارين إيرل", "إيه جي ميشالكا"];
  delete s1.needsReview;
  s1.extra = { ...(s1.extra || {}), factsSource: "بحث يدوي" };
  console.log("  SHE-RA: director and voice cast written");
}

const s2 = parsed.items["cartoon-series/ديزني كلاسيك.jpg"];
if (s2) {
  s2.releaseDate = "1937";
  s2.needsReview = true;
  s2.extra = {
    ...(s2.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      "أرشيف أعمال ديزني الكلاسيكية — التاريخ 1937 هو بداية عصر ديزني الكلاسيكي " +
      "(فيلم سنو وايت والأقزام السبعة)، والأرشيف نفسه يمتد لعقود تالية.",
  };
  console.log("  ديزني كلاسيك: year written as the start of the classic era");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");