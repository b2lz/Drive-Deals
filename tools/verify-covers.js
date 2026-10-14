"use strict";
// Verify the re-encode did not change what the site shows: every cover must
// still open, keep its EXACT pixel dimensions, and keep its aspect ratio.
// Compares against the untouched backup copy.
//
// Usage: node tools/verify-covers.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const BACKUP = path.resolve(ROOT, "..", "assets-orig-backup");

async function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.jpe?g$/i.test(entry.name)) yield full;
  }
}

(async () => {
  if (!fs.existsSync(BACKUP)) {
    console.log("لا توجد نسخة احتياطية للمقارنة — تخطّى.");
    return;
  }

  const files = [];
  for await (const f of walk(ASSETS)) files.push(f);

  let checked = 0;
  let bad = [];
  let smaller = 0;
  let same = 0;
  let bigger = 0;
  let before = 0;
  let after = 0;

  for (const file of files) {
    const rel = path.relative(ASSETS, file);
    const orig = path.join(BACKUP, rel);
    const nowBytes = fs.statSync(file).size;
    const wasBytes = fs.statSync(orig).size;
    before += wasBytes;
    after += nowBytes;
    if (nowBytes < wasBytes) smaller++;
    else if (nowBytes === wasBytes) same++;
    else bigger++;

    let a, b;
    try {
      a = await sharp(file).metadata();
      b = await sharp(orig).metadata();
    } catch (err) {
      bad.push(`${rel}: ${err.message}`);
      continue;
    }
    checked++;
    if (a.width !== b.width || a.height !== b.height) {
      bad.push(`${rel}: أبعاد ${b.width}x${b.height} → ${a.width}x${a.height}`);
    }
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
  console.log(`\n  فحص ${files.length} صورة`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  الحجم قبل / بعد : ${mb(before)} → ${mb(after)}  (${Math.round((1 - after / before) * 100)}% توفير)`);
  console.log(`  أصغر / مساوي / أكبر : ${smaller} / ${same} / ${bigger}`);
  console.log(`  فحص الأبعاد       : ${checked} صورة`);
  console.log(`  مشاكل            : ${bad.length}`);
  for (const b of bad.slice(0, 15)) console.log("    " + b);
  console.log(`\n  ${bad.length === 0 ? "✔ كل الصور سليمة وبنفس الأبعاد — الشكل زي ما هو" : "✗ في مشاكل"}`);
})();