"use strict";
// Targeted field patch for detail records.
//
// merge-details.js replaces a whole record; this one changes only the fields
// named below and leaves everything else exactly as it is. Used when the owner
// supplies one field for an existing record.
//
// Each patch may carry a `note`, which is written into extra.reviewNote so the
// page shows why a value looks the way it does, and a `flag`, which sets
// needsReview so the record stays on the manual-review list.
//
// Usage: node tools/patch-details.js tools/details-patch-YYYY-MM-DD.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const patchFile = path.resolve(process.argv[2] || "");
if (!fs.existsSync(patchFile)) {
  console.error("الاستخدام: node tools/patch-details.js <patch file>");
  process.exit(1);
}

const patches = require(patchFile);
const target = path.join(ROOT, "details", "games.json");
const doc = JSON.parse(fs.readFileSync(target, "utf8"));

const stamp = new Date().toISOString().slice(0, 10);
const backup = `${target}.backup-${stamp}`;
fs.copyFileSync(target, backup);
console.log(`  نسخة احتياطية: ${path.basename(backup)}`);

let touched = 0;

for (const [id, patch] of Object.entries(patches)) {
  const rec = doc.items[id];
  if (!rec) {
    console.log(`  ✗ ${id} — مفيش سجل (تخطي)`);
    continue;
  }

  const before = JSON.stringify(rec);

  for (const [field, value] of Object.entries(patch)) {
    if (field === "note") continue;
    if (field === "flag") continue;

    if (field === "requirements") {
      rec.requirements = rec.requirements || {};
      for (const [tier, block] of Object.entries(value)) {
        rec.requirements[tier] = { ...(rec.requirements[tier] || {}), ...block };
      }
      continue;
    }
    rec[field] = value;
  }

  if (patch.note) {
    rec.extra = rec.extra || {};
    rec.extra.reviewNote = patch.note;
  }
  if (patch.flag) {
    rec.needsReview = Array.from(
      new Set([...(Array.isArray(rec.needsReview) ? rec.needsReview : []), ...[].concat(patch.flag)])
    );
  }

  if (JSON.stringify(rec) === before) {
    console.log(`  · ${id} — مفيش تغيير`);
    continue;
  }
  touched++;
  console.log(`  ✔ ${rec.title || id}`);
}

fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n");
console.log(`\n  اتعدّل: ${touched} من ${Object.keys(patches).length}`);