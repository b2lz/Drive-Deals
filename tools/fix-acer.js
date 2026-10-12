"use strict";
// "Acer" is the last gap in foreign-series, but it is not a series.
//
// The data supplied names Acer Inc. — the Taiwanese hardware company —
// as its own producer, with a release year described as "2021, or as a
// reference for the devices and specifications". That is a manufacturer's
// identity, not a film credit, so the record is written as given and
// flagged: the page will show the note rather than presenting a company
// as the director of a television series.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "details", "foreign-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["foreign-series/Acer.jpg"];
if (rec) {
  rec.releaseDate = "2021";
  rec.director = "إنتاج وإصدار شركة آيسر العالمية (Acer Inc.) وتوابعها التقنية";
  rec.directors = ["Acer Inc."];
  rec.summaryAr =
    "محتوى عروض تقنية وتوثيقي يتعلق بشركة آيسر العالمية (Acer Inc.) وتقنياتها الرقمية " +
    "وشاشاتها، وليس عملاً درامياً أو مسلسلاً تلفزيونياً.";
  rec.needsReview = true;
  rec.extra = {
    factsSource: "بحث يدوي",
    factsNote: "البيانات كما وردت — اسم الشركة المصنّعة لا إخراج مسلسل.",
    reviewNote:
      "المجلد لا يحمل عملاً درامياً بل محتوى عروض تقنية لشركة Acer Inc. — لا ينطبق عليه " +
      "«مخرج» أو «أبطال» بمعنى المسلسلات، والتاريخ 2021 مذكور بصيغة شرطية.",
  };
  delete rec.needsSummary;
  delete rec.needsRequirements;
  console.log("  Acer: recorded and flagged as a technology showcase, not a series");
}

fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log("done");