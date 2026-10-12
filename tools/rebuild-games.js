"use strict";
// Rebuild details/games.json from the per-item cache.
//
// Useful after a schema change (a field moved into `extra`, a parser
// rewrite): the cache holds the freshly-fetched records in the current
// shape, while details/*.json may still hold the older one, and the
// fill scripts skip items that already have an entry.
//
// Hand-researched records (source !== "steam") are carried over
// untouched.
//
// Usage: node tools/rebuild-games.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "games");
const OUT = path.join(ROOT, "details", "games.json");

/** Must match cacheKey() in fill-games.js. */
const cacheKey = (id) => id.replace(/[^\w.-]+/g, "_") + ".json";

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const games = data.categories.find((c) => c.id === "games").items;

const existing = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, "utf8"))
  : { items: {} };

const items = {};
let fromCache = 0;
let fromDetails = 0;
let missing = 0;

for (const game of games) {
  const id = game.id;

  const cached = readJson(path.join(CACHE, cacheKey(id)));
  if (cached && !cached._miss) {
    items[id] = cached;
    fromCache++;
    continue;
  }

  // No cache entry: keep whatever details/*.json already had, as long
  // as it is not one of our own stale auto records.
  const prev = existing.items && existing.items[id];
  if (prev && prev.source !== "steam") {
    items[id] = prev;
    fromDetails++;
    continue;
  }

  missing++;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const out = {
  _meta: {
    version: 1,
    collection: "games",
    method: "steam-store-api",
    note:
      "Auto-filled from the Steam store API (search + appdetails). " +
      "Fields Steam does not publish (engine, some genres) are null " +
      "rather than guessed. Hand-researched entries keep their original " +
      "source tag and are not overwritten.",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  items,
};

const withReq = Object.values(items).filter(
  (r) => r.requirements && (r.requirements.minimum || r.requirements.recommended),
).length;
const withSummary = Object.values(items).filter((r) => r.summaryAr || r.summaryEn).length;

out._meta.counts = {
  total: games.length,
  researched: withSummary,
  withRequirements: withReq,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

console.log(`rebuilt ${OUT}`);
console.log(`  from cache      : ${fromCache}`);
console.log(`  kept by hand    : ${fromDetails}`);
console.log(`  still missing   : ${missing}`);
console.log(
  `  coverage        : ${withSummary}/${games.length} summarised, ${withReq} with requirements`,
);