"use strict";
// Two folders from the canonical-title review that are not just spelling
// differences but a different game.
//
// 1. "HULK [2003]" was pointing at Space Hulk (a 2012 strategy game). The
//    2003 platform/action game of that name is not on Steam at all, so
//    there is nothing to re-point to: the borrowed Space Hulk summary,
//    date and specs are removed and the record is flagged.
//
// 2. "HITMAN 2" is genuinely ambiguous - there is a 2004 Hitman 2: Silent
//    Assassin and a 2016 HITMAN 2. The folder does not say which, so the
//    record is flagged rather than guessed.
//
// Usage: node tools/fix-title-mismatches.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// --- 1. HULK: nothing on Steam to point at ---------------------------
const hulk = parsed.items["games/HULK [2003] 1.2GB_1.jpg"];
if (hulk) {
  const was = hulk.canonicalTitle;
  hulk.canonicalTitle = null;
  hulk.releaseDate = "2003";
  hulk.developer = "Radical Entertainment";
  hulk.publisher = "Microsoft Games";
  hulk.needsReview = true;
  hulk.needsSummary = true;
  hulk.needsRequirements = true;
  // Everything below belonged to Space Hulk, a different game.
  delete hulk.summaryAr;
  delete hulk.summaryEn;
  delete hulk.requirements;
  delete hulk.steamAppId;
  delete hulk.source;
  delete hulk.links;
  delete hulk.matchScore;
  delete hulk.genres;
  hulk.extra = {
    factsSource: "بحث يدوي",
    reviewNote:
      `كان السجل مربوطاً بالخطأ بـ«${was}» وهي لعبة مختلفة؛ حُذف ملخصها ومواصفاتها. ` +
      "لعبة 2003 غير متوفرة على Steam — تحتاج مصدراً آخر للملخص والمواصفات.",
  };
  console.log(`  HULK [2003]: removed borrowed "${was}" data`);
}

// --- 2. HITMAN 2: ambiguous between two games ------------------------
const hitman = parsed.items["games/HITMAN 2.jpg"];
if (hitman) {
  const was = hitman.canonicalTitle;
  hitman.needsReview = true;
  hitman.extra = {
    ...(hitman.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote:
      `العنوان «HITMAN 2» غامض: قد يكون Hitman 2: Silent Assassin (2004) وهو السجل الحالي، ` +
      `أو HITMAN 2 (2016). لم يُحسم لأن المجلد لا يحدّد أي جزء.`,
  };
  console.log(`  HITMAN 2: flagged as ambiguous (currently "${was}")`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");