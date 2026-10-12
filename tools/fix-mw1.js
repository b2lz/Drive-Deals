"use strict";
// "Call Of Duty Modern Warfare 1" means the 2007 game, but the repoint pass
// had bound it to app 2000950 - the 2019 reboot, dated 2023, which is how
// the record came to show a 2023 release date for a 2007 title.
//
// The 2007 original is not sold on Steam, and the near-miss candidate
// app 10180 is Modern Warfare 2 (2009), not 1. So there is nothing to
// repoint to: the reboot's body comes off and the record is flagged.
//
// Usage: node tools/fix-mw1.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["games/Call Of Duty Modern Warfare 1.jpg"];
if (rec) {
  const was = rec.canonicalTitle;
  rec.canonicalTitle = null;
  rec.releaseDate = "2007-11-06";
  rec.developer = "Infinity Ward";
  rec.publisher = "Activision";
  rec.needsReview = true;
  rec.needsSummary = true;
  rec.needsRequirements = true;
  delete rec.summaryAr;
  delete rec.summaryEn;
  delete rec.requirements;
  delete rec.steamAppId;
  delete rec.source;
  delete rec.links;
  delete rec.matchScore;
  rec.extra = {
    factsSource: "بحث يدوي",
    reviewNote:
      `كان السجل مربوطاً بالخطأ بـ«${was}» وهي لعبة 2019؛ حُذف ملخصها ومواصفاتها. ` +
      "لعبة 2007 غير متاحة على Steam — تحتاج مصدراً آخر.",
  };
  console.log(`  Call Of Duty Modern Warfare 1: removed borrowed "${was}" (2019) data`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");