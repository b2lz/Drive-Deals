"use strict";
// The `INVINCIBLE` folder is the 2023 base game, which is not sold on
// Steam - only the 2024 `Invincible VS` spinoff is (app 2353060). The
// matcher had bound the base-game folder to the VS entry, so the page
// showed the spinoff's title, date and description.
//
// Rather than leave the spinoff's data on the base game, mark the record as
// needing review with an honest note. The series/developer facts that are
// right stay; the borrowed Steam body does not.
//
// Usage: node tools/fix-invincible.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["games/INVINCIBLE .jpg"];
if (rec) {
  rec.canonicalTitle = "Invincible (2023)";
  rec.releaseDate = "2023-10-31";
  rec.developer = rec.developer === "Invincible VS" ? "Funcom" : rec.developer;
  rec.publisher = rec.publisher === "Invincible VS" ? "Funcom" : rec.publisher;
  rec.needsReview = true;
  rec.extra = {
    ...(rec.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      "اللعبة الأساسية (2023) غير متوفرة للبيع على Steam؛ كان السجل مربوطاً بالخطأ بلعبة Invincible VS. " +
      "الملخص والمواصفات كانا للعبة الأخرى وتم حذفهما — يحتاجان مصدراً آخر.",
  };
  // The summary and specs belonged to the spinoff; do not display them here.
  delete rec.summaryEn;
  delete rec.requirements;
  rec.needsRequirements = true;
  delete rec.steamAppId;
  delete rec.source;
  delete rec.links;
  delete rec.matchScore;
  rec.confidence = "low";
  console.log('  marked INVINCIBLE (2023) as needing review, removed borrowed spinoff data');
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");