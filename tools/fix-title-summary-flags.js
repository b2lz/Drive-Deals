"use strict";
// Two leftovers from the restore pass, both bookkeeping rather than facts:
//
// 1. HULK kept needsSummary even though a summary was restored. The flag
//    makes item.js print "no reliable description found" underneath a
//    summary that is there.
//
// 2. INVINCIBLE's `title` is an empty string, left from clearing the
//    spinoff's text. The page uses this for nothing visible, but an empty
//    title is a broken field; set it from the folder name.
//
// Usage: node tools/fix-title-summary-flags.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const hulk = parsed.items["games/HULK [2003] 1.2GB_1.jpg"];
if (hulk && hulk.needsSummary && (hulk.summaryAr || hulk.summaryEn)) {
  delete hulk.needsSummary;
  console.log("  HULK [2003]: cleared stale needsSummary");
}

const inv = parsed.items["games/INVINCIBLE .jpg"];
// The title was cleared to a blank string and still carries the folder's
// trailing space, so compare against the trimmed form rather than testing
// for emptiness - a whitespace-only title is just as broken as an empty one.
if (inv && inv.title !== inv.title.trim()) {
  inv.title = inv.title.trim();
  console.log(`  INVINCIBLE: title whitespace normalised to ${JSON.stringify(inv.title)}`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");