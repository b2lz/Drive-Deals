"use strict";
// Move `factsSource` from a top-level key into `extra`.
//
// It was written as a top-level key, which the page does not render — so
// the provenance of every enriched fact was recorded and never shown.
// Anything under "extra" is rendered, so the note becomes visible.
//
// Usage: node tools/migrate-facts-source.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

let moved = 0;

for (const cat of data.categories) {
  const file = path.join(ROOT, "details", `${cat.id}.json`);
  if (!fs.existsSync(file)) continue;

  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed.items) continue;

  let changed = 0;
  for (const rec of Object.values(parsed.items)) {
    if (!rec || !rec.factsSource) continue;
    rec.extra = { ...(rec.extra || {}), factsSource: rec.factsSource };
    delete rec.factsSource;
    changed++;
  }

  if (changed) {
    console.log(`${cat.id.padEnd(22)} moved ${changed}`);
    moved += changed;
    if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
  }
}

console.log(`\n${moved} records ${DRY ? "would be" : "were"} migrated`);