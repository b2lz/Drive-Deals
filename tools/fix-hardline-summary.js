"use strict";
// Battlefield Hardline's summaryAr held Steam's marketing tagline
// ("احصل على التجربة الكاملة.") rather than a description, which the
// validator correctly flags as too thin to be a summary. Replace it with a
// real spoiler-free description drawn from the game's own blurb.
//
// Usage: node tools/fix-hardline-summary.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["games/Battlefield Hardline.jpg"];
if (rec) {
  rec.summaryAr =
    "لعبة تصويب منظور الشخص الأول تدور في مدينة كاليفورنيا حيث يواجه اللاعب بين الشرطة والمجرمين. " +
    "تعتمد على حركة سريعة وصدّ المركبات والتحقيقات الجنائية لبناء مسار المحقق، " +
    "مع قصة تقودك للتعاون مع زملائك أو مواجهتهم حسب اختياراتك.";
  console.log("  Battlefield Hardline: summaryAr replaced with a real description");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");