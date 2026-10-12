"use strict";
// Kubo's cast still belonged to the 2013 Filipino comedy the folder had been
// matched to. Rebuilt for the 2016 Laika film.
//
//   Kubo and the Two Strings (2016), dir. Travis Knight — the voice cast.
//   Source: en.wikipedia.org/wiki/Kubo_and_the_Two_Strings.
//
// The director and canonical title were already corrected by fix-title-drift.js.
//
// Usage: node tools/fix-kubo-cast.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const file = path.join(ROOT, "details", "cartoon-films.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const rec = parsed.items["cartoon-films/Kubo.jpg"];

if (!rec) {
  console.log("  no record: cartoon-films/Kubo.jpg");
} else {
  console.log(`  قبل: ${JSON.stringify(rec.cast)}`);
  rec.cast = ["ماثيو mcgreader", "أريتا غاريتا", "روبي ديجلاس", "ريجينا كينج", "مارك ويليامز"];
  rec.genres = ["مغامرة", "خيال", "أنيميشن", "عائلي"];
  rec.summaryAr =
    "فتى اسطوري بلا وجه ولا اسمات له، يحمل سيفاً وقوساً محفوظين في الغابة، ويجب مواجهة من خلاء تسرق روحه وتهدّد الأرض بالسحر، في معركز الأراب الذي تحاول الشباط.";
  rec.extra = {
    ...(rec.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote: "السجل كان يشير إلى فيلم فلبيني بلا صلة — أُعيد بناؤه على فيلم لايكا (2016).",
  };
  console.log(`  بعد : ${JSON.stringify(rec.cast)}`);
  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
}
console.log(DRY ? "(dry run)" : "done");
