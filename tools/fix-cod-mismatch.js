"use strict";
// Two folders the repoint pass sent to the wrong Steam entry, and one
// ambiguous title found in the same review.
//
// 1. "Call Of Duty 1" means the original 2003 game. It was repointed to
//    app 42700 (Call of Duty: Black Ops, 2010) because that was the closest
//    app id found by name search. The 2003 original is not sold on Steam,
//    so the Black Ops body has to come off.
//
// 2. "Call Of Duty Modern Warfare 1" means the 2007 game, but it was
//    repointed to app 2000950 (the 2019 reboot). The 2007 entry is app
//    10180. Also note the stored record dated it 2023, which is the
//    reboot's date - so this folder was already wrong before the repoint.
//
// 3. "HITMAN 2" stays as Silent Assassin but is flagged: the folder could
//    equally mean the 2016 HITMAN 2, and the page should say so rather than
//    present one reading as settled.
//
// Usage: node tools/fix-cod-mismatch.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// --- 1. Call Of Duty 1 -> the 2003 original, not on Steam --------------
const cod1 = parsed.items["games/Call Of Duty 1.jpg"];
if (cod1) {
  const was = cod1.canonicalTitle;
  cod1.canonicalTitle = null;
  cod1.releaseDate = "2003-10-29";
  cod1.developer = "Infinity Ward";
  cod1.publisher = "Activision";
  cod1.needsReview = true;
  cod1.needsSummary = true;
  cod1.needsRequirements = true;
  // This body belonged to Call of Duty: Black Ops (2010).
  delete cod1.summaryAr;
  delete cod1.summaryEn;
  delete cod1.requirements;
  delete cod1.steamAppId;
  delete cod1.source;
  delete cod1.links;
  delete cod1.matchScore;
  cod1.extra = {
    factsSource: "بحث يدوي",
    reviewNote:
      `كان السجل مربوطاً بالخطأ بـ«${was}» وهي لعبة 2010 مختلفة؛ حُذف ملخصها ومواصفاتها. ` +
      "لعبة 2003 الأصلية غير متاحة على Steam — تحتاج مصدراً آخر.",
  };
  console.log(`  Call Of Duty 1: removed borrowed "${was}" (2010) data`);
}

// --- 2. Call Of Duty Modern Warfare 1 -> the 2007 entry ---------------
const mw1 = parsed.items["games/Call Of Duty Modern Warfare 1.jpg"];
if (mw1) {
  console.log(
    `  Call Of Duty Modern Warfare 1: currently app ${mw1.steamAppId} ` +
      `("${mw1.canonicalTitle}", ${mw1.releaseDate}) - 2007 original is app 10180, ` +
      "which must be fetched before switching",
  );
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");