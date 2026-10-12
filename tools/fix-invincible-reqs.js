"use strict";
// The last empty field in the games category: the PC requirements for the
// INVINCIBLE folder (Invincible, 2023), supplied by hand.
//
// The same record was marked needsReview earlier because the folder had
// been bound to Invincible VS and the spinoff's summary and specs had to be
// removed. With real requirements supplied, that part of the flag no longer
// applies; what remains unverified is the developer and the year, which are
// kept as-is with their note.
//
// Usage: node tools/fix-invincible-reqs.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["games/INVINCIBLE .jpg"];
if (!rec) {
  console.log("no record for games/INVINCIBLE .jpg");
  process.exit(1);
}

rec.requirements = {
  minimum: {
    os: "Windows 10 (64-bit)",
    cpu: "Intel Core i5-10400F أو AMD Ryzen 5 3600",
    ram: "8 GB",
    gpu: "NVIDIA GeForce GTX 760 (2GB) أو AMD Radeon R7 260X (2GB)",
    storage: "40 GB (يُفضَّل بشدة استخدام قرص SSD)",
    directx: "الإصدار 12",
  },
  recommended: {
    os: "Windows 10 (64-bit)",
    cpu: "Intel Core i7-10700 أو AMD Ryzen 7 5800X",
    ram: "16 GB",
    gpu: "NVIDIA GeForce GTX 1660 Ti (6GB) أو AMD Radeon RX 6600 XT (8GB)",
    storage: "40 GB (على قرص SSD)",
    directx: "الإصدار 12",
  },
};
rec.needsRequirements = false;

// The summary is still missing. An earlier pass removed summaryEn but left
// the spinoff's text in summaryAr, so the wrong game's description was still
// being shown against this title.
rec.summaryAr = null;
rec.summaryEn = null;
rec.needsSummary = true;
rec.needsReview = true;
rec.extra = {
  factsSource: "بحث يدوي",
  reviewNote:
    "اللعبة الأساسية (2023) غير متوفرة للبيع على Steam؛ كان السجل مربوطاً بالخطأ بلعبة Invincible VS. " +
    "المواصفات أُضيفت يدوياً — المطور وسنة الإصدار يحتاجان تأكيداً من مصدر آخر، والملخص ما زال ناقصاً.",
};

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "requirements written");