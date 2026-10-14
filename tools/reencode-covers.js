"use strict";
// ============================================================
// Re-encode every cover to a sane JPEG.
//
// Why: the library holds 3377 covers that are all 384 px wide but weigh
// 88-236 KB each — they were saved with a very high JPEG quality, so they
// carry bytes nobody can see. Re-encoding at the SAME dimensions with an
// efficient encoder cuts 70-80% of the weight with no visible difference.
//
// The grid card is ~190 px wide, so a 384 px cover is already 2x oversampled
// there; the item page shows the same file. Nothing is ever enlarged.
//
// Rules:
//   - never upscale (withoutEnlargement), so small covers are left alone
//   - .rotate() bakes in any EXIF orientation first, because sharp strips
//     the metadata — without this, rotated photos would end up sideways
//   - a result larger than the original is skipped (small/palette images)
//   - --dry writes nothing and only reports
//
// Usage:
//   node tools/reencode-covers.js --dry      report what would change
//   node tools/reencode-covers.js            rewrite assets/
// ============================================================

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");

const MAX_WIDTH = 512; // above this we do downscale; below it we only re-encode
// 85 was picked by eye: q80 and q90 are indistinguishable on these covers,
// and 85 keeps a visible margin over the lossy pass for the item page, which
// upscales the 384 px file.
const QUALITY = 85;

// The banner is a different shape: 1100x320 shown full width, so it must NOT
// be shrunk the way a grid cover can. It only gets re-encoded.
const BANNER_MAX_WIDTH = 1200;

const DRY = process.argv.includes("--dry");
// --limit N processes only the first N files, for a safe trial run.
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg === -1 ? Infinity : Number(process.argv[limitArg + 1]);

// Re-encoding an already-re-encoded JPEG shrinks it a little more every time,
// which quietly stacks generation loss. The manifest makes the pass run once
// per file; delete it (or run with --force) to redo everything from scratch.
const FORCE = process.argv.includes("--force");
const MANIFEST = path.join(ROOT, ".reencode-manifest.json");
const done = FORCE || !fs.existsSync(MANIFEST)
  ? new Set()
  : new Set(JSON.parse(fs.readFileSync(MANIFEST, "utf8")).files || []);

const ROOTS = [ASSETS];
const BANNER_ASSETS = path.join(ROOT, "banner", "assets");
if (fs.existsSync(BANNER_ASSETS)) ROOTS.push(BANNER_ASSETS);

/** Grid covers get shrunk past 512 px; banner art never is. */
function maxWidthFor(file) {
  return file.startsWith(BANNER_ASSETS) ? BANNER_MAX_WIDTH : MAX_WIDTH;
}

async function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.jpe?g$/i.test(entry.name)) yield full;
  }
}

(async () => {
  const files = [];
  for (const root of ROOTS) {
    for await (const f of walk(root)) {
      if (files.length >= LIMIT) break;
      files.push(f);
    }
  }

  let before = 0;
  let after = 0;
  let changed = 0;
  let skipped = 0;
  let upscaled = 0;
  let errors = 0;
  let already = 0;

  const biggest = [];
  const processed = new Set(done);

  for (let n = 0; n < files.length; n++) {
    const file = files[n];
    const rel = path.relative(ROOT, file);
    if (done.has(rel)) {
      already++;
      before += fs.statSync(file).size;
      after += fs.statSync(file).size;
      continue;
    }
    const original = fs.statSync(file).size;
    before += original;
    try {
      // Read the file ONCE into a buffer and hand that to sharp for both
      // metadata and encoding. Opening the same path twice makes sharp's
      // input cache close the first instance's descriptor, which surfaces as
      // "UNKNOWN: unknown error, open …".
      const input = fs.readFileSync(file);
      const meta = await sharp(input).metadata();
      const pipeline = sharp(input).rotate(); // honour EXIF orientation
      const limit = maxWidthFor(file);
      if (meta.width > limit) pipeline.resize({ width: limit, withoutEnlargement: true });
      else upscaled++;

      const buf = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

      if (buf.length >= original) {
        // Re-encoding made it bigger — keep the original file untouched.
        after += original;
        skipped++;
        processed.add(rel);
        continue;
      }

      after += buf.length;
      changed++;
      biggest.push({ saved: original - buf.length, name: rel });
      if (!DRY) fs.writeFileSync(file, buf);
      processed.add(rel);
    } catch (err) {
      errors++;
      after += original;
      console.error("  ! " + path.relative(ROOT, file) + ": " + err.message);
    }

    if ((n + 1) % 250 === 0) {
      process.stdout.write(`  … ${n + 1}/${files.length}\n`);
    }
  }

  biggest.sort((a, b) => b.saved - a.saved);
  const kb = (n) => (n / 1024).toFixed(1) + " KB";
  const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";

  console.log(`\n  ${DRY ? "DRY RUN — " : ""}${files.length} صورة`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  قبل          : ${mb(before)}`);
  console.log(`  بعد          : ${mb(after)}`);
  console.log(`  توفير        : ${mb(before - after)}  (${Math.round((1 - after / before) * 100)}%)`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  أُعيد ترميزها : ${changed}`);
  console.log(`  تُركت كما هي  : ${skipped}  (الأفضل أبقى)`);
  console.log(`  اتعالجت قبل كده: ${already}  (اتخطّت — مانيفست)`);
  console.log(`  أصلها ≤ الحد : ${upscaled}  (بلا تصغير)`);
  if (errors) console.log(`  أخطاء        : ${errors}`);

  console.log(`\n  أكبر 10 توفير:`);
  for (const b of biggest.slice(0, 10)) {
    console.log(`    ${kb(b.saved).padStart(8)}   ${b.name}`);
  }

  if (DRY) {
    console.log("\n  (مفيش ملفات اتغيرت — شغّل من غير --dry للتطبيق)");
  } else {
    // Record what this pass touched so a second run cannot re-compress it.
    const all = [...processed].sort();
    fs.writeFileSync(MANIFEST, JSON.stringify({ files: all }, null, 0) + "\n");
    console.log(`\n  اتسجّل ${all.length} ملف في .reencode-manifest.json (مانع للضغط المزدوج)`);
  }
})();