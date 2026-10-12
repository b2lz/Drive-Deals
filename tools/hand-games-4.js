"use strict";
// Final gap: the PC requirements for "disbatch", supplied by hand.
//
// The folder name is "disbatch" and the data given was for Dispatch, so
// the record is written against that folder. The year and genre already in
// the record were themselves marked unconfirmed, so this only adds the
// requirements and keeps that flag in place.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const REQUIREMENTS = {
  minimum: {
    os: "Windows 10 (64-bit)",
    cpu: "Intel Core i3-4160 / AMD FX-6300 أو ما يعادلهما",
    ram: "8 GB",
    gpu: "NVIDIA GeForce GTX 750 Ti / AMD Radeon R7 360 (بذاكرة VRAM لا تقل عن 2 GB)",
    directx: "الإصدار 11",
    storage: "10 GB",
  },
  recommended: {
    os: "Windows 10 / Windows 11 (64-bit)",
    cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600 أو ما يعادلهما",
    ram: "16 GB",
    gpu: "NVIDIA GeForce GTX 1060 (6GB) / AMD Radeon RX 580 (8GB)",
    directx: "الإصدار 12",
    storage: "10 GB (يُفضَّل استخدام قرص SSD للسرعة)",
  },
};

const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const rec = parsed.items["games/disbatch.jpg"];

if (!rec) {
  console.log("no record for games/disbatch.jpg");
  process.exit(1);
}

rec.requirements = REQUIREMENTS;
rec.needsRequirements = false;
rec.needsReview = true;
rec.extra = {
  ...(rec.extra || {}),
  factsSource: "بحث يدوي",
  reviewNote: "السنة والتصنيف تقديران — العنوان في المجلد «disbatch» والمواصفات أُعطيت للعبة Dispatch",
};

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`requirements written${DRY ? " (dry run)" : ""}`);