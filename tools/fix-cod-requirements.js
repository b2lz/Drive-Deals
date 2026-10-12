"use strict";
// The two Call of Duty records were repointed to their correct Steam apps
// but came back with an incomplete requirements block: Steam's HTML lists
// the graphics card on its own line, and the repoint script keyed on
// "Video Card" while these say "Graphics". Restore the full values.
//
// Usage: node tools/fix-cod-requirements.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

parsed.items["games/Call Of Duty 1.jpg"].requirements = {
  minimum: {
    os: "Windows Vista / XP / 7",
    cpu: "Intel Core 2 Duo E6600 أو AMD Phenom X3 8750 أو أفضل",
    ram: "2 GB",
    gpu: "Shader 3.0 — NVIDIA GeForce 8600GT / ATI Radeon X1950Pro بذاكرة 256 MB أو أفضل",
    directx: "الإصدار 9.0c",
    storage: "12 GB",
    note:
      "تحتاج مساحة أولية تقارب 24 GB للتحميل والتثبيت (8 GB مضغوطة + 8 GB بعد فك الضغط + 8 GB بعد التثبيت)",
  },
  recommended: null,
};

parsed.items["games/Call Of Duty Modern Warfare 1.jpg"].requirements = {
  minimum: {
    os: "Windows 10 64-bit",
    cpu: "Intel Core i3-4340 أو AMD FX-6300",
    ram: "8 GB",
    gpu: "NVIDIA GeForce GTX 670 / GTX 1650 أو AMD Radeon HD 7950",
    directx: "الإصدار 12",
    storage: "175 GB",
    note: "يتطلب معالج ونظام تشغيل 64-بت واتصال إنترنت واسع النطاق",
  },
  recommended: {
    os: "Windows 10 64-bit (أحدث تحديث)",
    cpu: "Intel Core i5-2500K أو AMD Ryzen R5 1600X",
    ram: "12 GB",
    gpu: "NVIDIA GeForce GTX 970 / GTX 1660 أو AMD Radeon R9 390 / RX 580",
    directx: "الإصدار 12",
    storage: "175 GB",
  },
};

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "2 requirement blocks restored");