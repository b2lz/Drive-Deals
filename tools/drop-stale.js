"use strict";
// Remove records whose source does not belong to their category.
//
// The fill scripts only ever add or overwrite a record, so a provider
// that was routed wrongly in an earlier version leaves its records
// behind. "foreign-film-series" is the case that bit: it ends with
// "-series", so it was once sent to TVMaze and answered with television
// series for a shelf of films.
//
// Usage: node tools/drop-stale.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

/**
 * Which providers each category is allowed to use.
 *
 * This list has to stay in step with the sources the fill scripts write,
 * including the combined ones — "wikipedia+systemrequirementslab" is a
 * record that two sources both contributed to, and dropping it because
 * the exact string is not listed would delete a thousand good records.
 */
const ALLOWED = {
  anime: new Set([
    "anilist",
    "anilist-index",
    "wikipedia",
    "wikipedia-collection",
    "wikidata",
  ]),
  games: new Set([
    "steam",
    "wikipedia",
    "wikidata",
    "systemrequirementslab",
    "pcgamingwiki",
  ]),
  "foreign-film-series": new Set(["wikipedia", "wikipedia-collection", "wikidata"]),
};

// Everything else may use any of the media providers.
const MEDIA_OK = new Set([
  "wikipedia",
  "tvmaze",
  "anilist",
  "anilist-index",
  "wikidata",
  "wikipedia-collection",
]);

/**
 * A record's source may be several of these joined by "+", as in
 * "wikipedia+systemrequirementslab". Such a record is legitimate when
 * every one of its parts is allowed.
 */
function sourceAllowed(source, allowed) {
  return String(source)
    .split("+")
    .every((part) => allowed.has(part));
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
let total = 0;

for (const cat of data.categories) {
  const file = path.join(ROOT, "details", `${cat.id}.json`);
  if (!fs.existsSync(file)) continue;

  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed.items) continue;

  const allowed = ALLOWED[cat.id] || MEDIA_OK;
  const dropped = [];
  for (const [id, rec] of Object.entries(parsed.items)) {
    if (rec._miss) continue;
    // A record with no source tag was written by hand and is kept.
    if (!rec.source) continue;
    if (sourceAllowed(rec.source, allowed)) continue;
    dropped.push(`${id} (source: ${rec.source}, type: ${rec.type})`);
    delete parsed.items[id];
  }

  if (!dropped.length) continue;
  console.log(`${cat.id}: dropping ${dropped.length}`);
  for (const line of dropped.slice(0, 5)) console.log(`    ${line}`);
  if (dropped.length > 5) console.log(`    ... and ${dropped.length - 5} more`);
  total += dropped.length;

  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
}

console.log(total ? `\n${total} stale records ${DRY ? "would be" : "were"} dropped` : "no stale records");