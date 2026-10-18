"use strict";
// ============================================================
// Merge a record file into a details/<category>.json, keyed by item id.
//
// Keeps a timestamped backup of the file it touches and reports, per record,
// which fields it wrote and which it left alone when a value already exists.
// Refuses to invent data: a record missing developer / releaseDate / summaryAr
// is reported and skipped rather than written half-empty.
//
// Usage:
//   node tools/merge-details.js details/games.json tools/details-new-games.js
// ============================================================

const fs = require("fs");
const path = require("path");

const [target, source] = process.argv.slice(2);
if (!target || !source) {
  console.error("الاستخدام: node tools/merge-details.js <details file> <records file>");
  process.exit(1);
}

const targetPath = path.resolve(target);
const sourcePath = path.resolve(source);

// A record is only worth writing if the reader would see something real.
const REQUIRED = ["title", "developer", "releaseDate", "summaryAr"];

const records = require(sourcePath);
const doc = JSON.parse(fs.readFileSync(targetPath, "utf8"));
if (!doc.items) {
  console.error(`${target} ليس ملف تفاصيل (لا يحتوي items)`);
  process.exit(1);
}

// Keep the previous contents recoverable.
const stamp = new Date().toISOString().slice(0, 10);
const backup = `${targetPath}.backup-${stamp}`;
fs.copyFileSync(targetPath, backup);
console.log(`  نسخة احتياطية: ${path.basename(backup)}`);

let added = 0;
let replaced = 0;
const skipped = [];

for (const [id, rec] of Object.entries(records)) {
  const missing = REQUIRED.filter((k) => !rec[k] || String(rec[k]).trim() === "");
  if (missing.length) {
    skipped.push({ id, reason: "حقول ناقصة: " + missing.join(", ") });
    continue;
  }
  // A PC title with no specs must say so explicitly, not fall through silently.
  const isPc = Array.isArray(rec.platforms) && rec.platforms.includes("PC");
  if (isPc && !rec.requirements && !rec.needsRequirements) {
    skipped.push({ id, reason: "لعبة PC بلا مواصفات وبلا needsRequirements" });
    continue;
  }
  if (!isPc && !rec.needsRequirements) {
    skipped.push({ id, reason: "ليست لعبة PC ولم تُعلّم needsRequirements" });
    continue;
  }

  const existed = Boolean(doc.items[id]);
  doc.items[id] = rec;
  if (existed) replaced++;
  else added++;
  console.log(`  ${existed ? "~" : "+"} ${rec.title}`);
}

if (skipped.length) {
  console.log(`\n  متخطّى:`);
  for (const s of skipped) console.log(`    ✗ ${s.id} — ${s.reason}`);
  if (skipped.length === Object.keys(records).length) {
    console.log("\n  مفيش حاجة اتكتبت — الملف الأصلي سيب زي ما هو.");
    process.exit(1);
  }
}

fs.writeFileSync(targetPath, JSON.stringify(doc, null, 2) + "\n");
console.log(`\n  جديد: ${added}   مُستبدل: ${replaced}   متخطّى: ${skipped.length}`);
console.log(`  إجمالي السجلات الآن: ${Object.keys(doc.items).length}`);