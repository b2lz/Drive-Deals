"use strict";
// Tidy release dates.
//
// Two shapes are wrong without being wrong-headed:
//
//   "2017-00-00"  Wikidata knew the year but not the month or day, and
//                 the zeros were written into the record as if they were
//                 a date. The year is sound; "00-00" is not.
//   "1988-00-00"  The year itself is wrong. For "Fifa 26" the lookup
//                 landed on an unrelated item.
//
// So the first is repaired and the second is cleared, leaving the field
// empty rather than confident and wrong. A page that says the date is
// unavailable is better than one that says 1988.
//
// Usage: node tools/fix-dates.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

/**
 * Years a film or game cannot plausibly have been released in, given the
 * medium. Used only to clear an obviously wrong year, never to supply one.
 */
const EARLIEST = 1888; // Roundhay Garden Scene, the earliest surviving film.

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

let repaired = 0;
let cleared = 0;

for (const cat of data.categories) {
  const file = path.join(ROOT, "details", `${cat.id}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

  let changed = 0;

  for (const rec of Object.values(parsed.items)) {
    const d = rec && rec.releaseDate;
    if (typeof d !== "string" || !d) continue;

    const year = Number(d.slice(0, 4));

    if (!/00-00/.test(d)) continue;

    if (Number.isFinite(year) && year >= EARLIEST) {
      // The year is good; the month and day were never known.
      rec.releaseDate = String(year);
      repaired++;
      changed++;
    } else {
      // No usable year in there at all.
      delete rec.releaseDate;
      rec.needsReview = true;
      cleared++;
      changed++;
    }
  }

  if (changed) {
    console.log(`${cat.id.padEnd(22)} ${changed} dates tidied`);
    if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
  }
}

console.log(`\n${repaired} repaired to a year, ${cleared} cleared as unusable. ${DRY ? "(dry run)" : ""}`);