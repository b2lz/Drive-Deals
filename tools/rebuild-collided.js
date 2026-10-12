"use strict";
// Rebuild the shelves whose records may have been poisoned by the
// colliding cache key.
//
// The old key built its readable part with /[^\w.-]+/g, and `\w` is
// ASCII-only in JavaScript. Every Arabic title therefore produced the
// same row of underscores as any other title of the same shape, and the
// cached record of whichever item was looked up last was served to all of
// them. 640 items across four shelves were exposed.
//
// Rather than try to patch the damage, the auto-filled records on those
// shelves are dropped and re-resolved from scratch with the fixed key.
// Hand-researched records carry no `source` tag and are never touched.
//
// Usage: node tools/rebuild-collided.js [--dry]

const fs = require("fs");
const path = require("path");

const { cacheFileName } = require("./lib/cachekey");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

/** The shelves whose titles contain non-Latin characters. */
const AFFECTED = ["arabic-films", "arabic-series", "cartoon-series", "turkish-series"];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

let droppedRecords = 0;
let droppedCache = 0;

for (const id of AFFECTED) {
  const cat = data.categories.find((c) => c.id === id);
  if (!cat) continue;

  const file = path.join(ROOT, "details", `${id}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

  const removed = [];
  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    // A record with no source tag was written by hand and is kept.
    if (!rec.source) continue;
    removed.push(item.id);
    delete parsed.items[item.id];
  }

  if (removed.length) {
    console.log(`${id.padEnd(22)} dropping ${removed.length} auto-filled records`);
    droppedRecords += removed.length;
    if (!DRY) {
      fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
    }
  }

  // The cache for this shelf is the other half of the problem: entries
  // written under the old key cannot be told apart from one another.
  const cacheDir = path.join(ROOT, ".cache", "media");
  let removedCache = 0;
  if (fs.existsSync(cacheDir)) {
    for (const f of fs.readdirSync(cacheDir)) {
      if (!f.startsWith(`${id}__`) || !f.endsWith(".json")) continue;
      if (!DRY) fs.unlinkSync(path.join(cacheDir, f));
      removedCache++;
    }
  }
  if (removedCache) {
    console.log(`${" ".repeat(22)} clearing ${removedCache} stale cache files`);
    droppedCache += removedCache;
  }
}

console.log(
  `\n${droppedRecords} records and ${droppedCache} cache files ` +
    `${DRY ? "would be" : "were"} cleared.`,
);
console.log(
  "\nNext: node tools/fill-media.js --retry-misses\n" +
    "      node tools/fill-wikidata.js",
);