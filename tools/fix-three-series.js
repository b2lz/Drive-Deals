"use strict";
// The three series-style folders, resolved from named sources.
//
//  8الكبير -> "الكبير أوي 8", the eighth season.
//    Wikipedia (ar) gives the broadcast date as 1 Ramadan 1445 AH =
//    11 March 2024, directed by Ahmed El-Gendy. The record had been
//    pointing at the *first* season: its director line and its summary both
//    belong to season 1 (2010), so the summary is dropped rather than shown
//    against the wrong season.
//
//  ونيس -> first released 1994.
//
//  رامز -> left alone. It is a yearly Ramadan prank show running for many
//    seasons, so there is no single year; the user was asked which one and
//    had not named it.
//
// Usage: node tools/fix-three-series.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// --- 8الكبير: the eighth season ---------------------------------------
const kib = parsed.items["arabic-series/8الكبير.jpg"];
if (kib) {
  kib.canonicalTitle = "الكبير أوي 8";
  kib.releaseDate = "2024-03-11";
  kib.director = "أحمد الجندي";
  kib.directors = ["أحمد الجندي"];
  kib.cast = [
    "أحمد مكي",
    "محمد سلام",
    "رحمة أحمد فرج",
    "بيومي فؤاد",
    "حسين أبو حجاج",
    "مصطفى غريب",
    "حاتم صلاح",
  ];
  // The stored description was season 1 (2010): the original cast and the
  // " elections for the mayoralty" plot belong to the first run.
  delete kib.summaryEn;
  delete kib.summaryAr;
  kib.needsSummary = true;
  kib.needsReview = true;
  kib.extra = {
    factsSource: "بحث يدوي",
    factsNote: "من ويكيبيديا العربية — تاريخ البث 1 رمضان 1445 هـ / 11 مارس 2024",
    reviewNote:
      "الموجود في السجل كان ملخص الجزء الأول (2010) لا الجزء الثامن، فأُعيدت بياناته. " +
      "الملخص يحتاج مصدراً خاصاً بالجزء الثامن.",
  };
  kib.links = [
    {
      label: "Wikipedia",
      url: "https://ar.wikipedia.org/wiki/%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1_%D8%A3%D9%88%D9%8A_8_(%D9%85%D8%B3%D9%84%D8%B3%D9%84)",
    },
  ];
  console.log("  8الكبير -> الكبير أوي 8 (2024-03-11), director and cast replaced");
}

// --- ونيس: first release 1994 -----------------------------------------
const wanees = parsed.items["arabic-series/ونيس.jpg"];
if (wanees) {
  wanees.releaseDate = "1994";
  wanees.director = "محمد صبحي";
  wanees.directors = ["محمد صبحي"];
  wanees.cast = ["محمد صبحي"];
  wanees.needsReview = true;
  wanees.extra = {
    factsSource: "بحث يدوي",
    factsNote: "تاريخ أول إصدار للجزء الأول",
    reviewNote: "سلسلة من عدة أجزاء — التاريخ المسجل هو تاريخ الجزء الأول (1994).",
  };
  console.log("  ونيس -> 1994 (first season)");
}

// --- رامز: no single year, left as-is ---------------------------------
const ramz = parsed.items["arabic-series/رامز.jpg"];
if (ramz) {
  ramz.needsReview = true;
  ramz.extra = {
    ...(ramz.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      "سلسلة برامج مقالب سنوية لرامز جلال في رمضان — تمتد عبر سنوات، فلا ينطبق عليها تاريخ إصدار واحد. " +
      "يحتاج تحديد الموسم المطلوب.",
  };
  console.log("  رامز -> still open, needs the season to be named");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");