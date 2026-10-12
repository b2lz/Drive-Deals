"use strict";
// Collapse runs of whitespace inside summaries, and drop hard line breaks that
// were left over from an earlier refetch. Titles like "الخروج عن النص" carry a
// doubled space in the scraped text; "المشروع إكس" carries a literal "\n\n"
// plus a disambiguation list that does not belong in a one-line blurb.
//
// Only whitespace is touched — no wording is rewritten, so nothing is invented.
//
// Usage: node tools/fix-summary-whitespace.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const squash = (v) =>
  v
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([،.؛:])/g, "$1")
    .trim();

let changed = 0;
const files = new Map();

for (const cat of data.categories) {
  const file = path.join(ROOT, "details", `${cat.id}.json`);
  if (!files.has(cat.id)) files.set(cat.id, JSON.parse(fs.readFileSync(file, "utf8")));
  const parsed = files.get(cat.id);

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    for (const field of ["summaryAr", "summaryEn"]) {
      const v = rec[field];
      if (typeof v !== "string" || !v.trim()) continue;
      const next = squash(v);
      if (next !== v) {
        rec[field] = next;
        changed++;
      }
    }
  }
}

if (!DRY) {
  for (const [catId, parsed] of files) {
    fs.writeFileSync(path.join(ROOT, "details", `${catId}.json`), JSON.stringify(parsed, null, 2) + "\n");
  }
}
console.log(`squashed ${changed} summaries ${DRY ? "(dry run)" : ""}`);
