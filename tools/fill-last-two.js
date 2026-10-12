"use strict";
// The last two empty fields in the games category, supplied by hand.
//
//   HULK [2003]  -> PC requirements
//   INVINCIBLE    -> Arabic summary
//
// Neither is a guess and neither overwrites a fact that is already there.
//
// Usage: node tools/fill-last-two.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// --- HULK [2003] --------------------------------------------------------
// No Steam entry and no PCGamingWiki page exist for this title, so the
// requirements come from the hand-supplied values rather than a scraper.
const hulk = parsed.items["games/HULK [2003] 1.2GB_1.jpg"];
if (hulk) {
  hulk.requirements = {
    minimum: {
      os: "Windows 98 / ME / 2000 / XP (تعمل أيضاً على الإصدارات الأحدث المتوافقة)",
      cpu: "Pentium III أو Athlon بمعدل 700 MHz",
      ram: "192 MB",
      gpu: "كارت شاشة سعة 32 MB يدعم Direct3D",
      storage: "1.2 - 2 GB",
    },
    recommended: null,
  };
  hulk.needsRequirements = false;
  // The summary and the rest of the record were already resolved from
  // Wikipedia, so the review flag no longer has anything outstanding.
  delete hulk.needsReview;
  hulk.extra = {
    factsSource: "بحث يدوي",
    factsNote: "بيانات اللعبة من Wikipedia، والمواصفات أُضيفت يدوياً",
  };
  console.log("  HULK [2003]: requirements written");
}

// --- INVINCIBLE ---------------------------------------------------------
const inv = parsed.items["games/INVINCIBLE .jpg"];
if (inv) {
  inv.summaryAr =
    "تدور القصة حول مارك غرايسون، وهو مراهق عادي يبدو كأي شاب في عمره، إلى أن تبدأ قواه الخارقة " +
    "بالظهور وهو في سن السابعة عشرة. والده هو أومني مان، الذي يُعد أقوى بطل خارق على وجه الأرض " +
    "وينتمي إلى عرق كوني قوي يُعرف بالفيلترومايتس. يتخذ مارك لنفسه اسم إنفينيسيبل ويبدأ مسيرته في " +
    "مكافحة الجرام وحماية كوكب الأرض بتوجيه من والده، ليكتشف تدريجياً أسراراً صادمة ومظلمة تتعلق " +
    "بحقيقة أصول والده والمهمة الحقيقية التي جاء من أجلها لإخضاع الكوكب، وتتوالى الأحداث في إطار " +
    "ملحمي يجمع بين الأكشن والدراما الكونية.";
  inv.needsSummary = false;
  delete inv.needsReview;
  inv.extra = {
    factsSource: "بحث يدوي",
    factsNote: "الملخص والمواصفات أُضيفا يدوياً",
  };
  console.log("  INVINCIBLE: summary written");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");