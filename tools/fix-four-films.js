"use strict";
// The last four arabic-films gaps, supplied by hand.
//
// Two of these are not ordinary films: "افلام عربي قديم" is an archive
// spanning four decades, so its cast is a list of classic-era stars rather
// than one film's cast. "صوفيه" is an independent short whose cast the
// supplier could not name. Both are written as given and flagged.
//
// Usage: node tools/fix-four-films.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-films.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const SET = [
  [
    "صوفيه",
    { director: "زين إبراهيم", cast: null,
      note: "فيلم قصير مستقل — لم يُحدد أبطاله" },
  ],
  [
    "فيلا",
    { director: "أيمن مكرم", cast: ["أحمد صيام", "ريم هلال", "إيناس النجار"], note: null },
  ],
  [
    "افلام عربي قديم",
    { director: "كبار مخرجي السينما المصرية الكلاسيكية: هنري بركات، حسن الإمام، بركات، يوسف شاهين",
      cast: ["فاتن حمامة", "عبد الحليم حافظ", "فريد شوقي", "سعاد حسني", "أحمد رمزي", "شادية"],
      date: "1940-1970",
      note:
        "مجلد أرشيف يجمع أفلاماً قديمة من أربعينيات حتى سبعينيات القرن العشرين — " +
        "لا ينطبق عليه تاريخ إصدار واحد ولا مخرج واحد ولا أبطال فيلم واحدون.",
    },
  ],
  [
    "شاغلنتنا ارجنتينه",
    { director: "ممدوح زكي", cast: ["سمير غانم", "لوسي", "ميمي جمال", "أحمد راتب"], date: "1999", note: null },
  ],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

for (const [folder, { director, cast, date, note }] of SET) {
  const rec = parsed.items[`arabic-films/${folder}.jpg`];
  if (!rec) {
    console.log(`  no record: ${folder}`);
    continue;
  }
  if (date && !has(rec.releaseDate)) rec.releaseDate = date;
  if (director && !has(rec.director)) {
    rec.director = director;
    if (!has(rec.directors)) rec.directors = [director.split(":")[0].trim()];
  }
  if (cast && !has(rec.cast)) rec.cast = cast;

  if (note) {
    rec.needsReview = true;
    rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي", reviewNote: note };
  } else {
    rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
    delete rec.needsReview;
  }
  console.log(`  ${folder}: filled`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");