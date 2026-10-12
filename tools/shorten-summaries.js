"use strict";
// Shorten summaries that are already stored but were written before the
// providers capped their length.
//
// Wikipedia leads and AniList synopses can run to several paragraphs;
// the detail page shows a summary. This trims the stored strings to the
// same budget the providers now use, cutting on a sentence boundary.
//
// Usage: node tools/shorten-summaries.js [maxChars]

const fs = require("fs");
const path = require("path");

const DETAILS = path.resolve(__dirname, "..", "details");
const MAX = Number(process.argv[2]) || 420;

/** Cut at the last sentence end inside the budget, else hard-cut. */
function shorten(text, max) {
  if (!text || text.length <= max) return text;
  const window = text.slice(0, max);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("…"),
  );
  return (lastStop > 80 ? window.slice(0, lastStop) : window).trim() + "…";
}

let changed = 0;
for (const file of fs.readdirSync(DETAILS).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DETAILS, file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    continue;
  }
  if (!parsed.items) continue;

  let n = 0;
  for (const rec of Object.values(parsed.items)) {
    if (rec._miss) continue;
    for (const key of ["summaryEn", "summaryAr"]) {
      const shorter = shorten(rec[key], MAX);
      if (shorter && shorter !== rec[key]) {
        rec[key] = shorter;
        n++;
      }
    }
  }

  if (n) {
    fs.writeFileSync(full, JSON.stringify(parsed, null, 2) + "\n");
    console.log(`${file}: shortened ${n}`);
    changed += n;
  }
}

console.log(`\n${changed} summaries shortened to at most ${MAX} characters`);