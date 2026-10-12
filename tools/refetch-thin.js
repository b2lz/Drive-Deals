"use strict";
// Refetch records whose summary came out too thin.
//
// Steam's short_description is frequently a one-line marketing tag
// ("Relive Half-Life.") rather than a description. The provider now
// falls back to the "About This Game" text, but records fetched before
// that change still hold the tag. This finds them and refetches just
// those app records, leaving the rest of the file untouched.
//
// Usage: node tools/refetch-thin.js

const fs = require("fs");
const path = require("path");
const steam = require("./lib/steam");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "details", "games.json");
const CACHE = path.join(ROOT, ".cache", "games");

/** Below this a summary is a tagline, not a description. */
const MIN = 60;

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const games = data.categories.find((c) => c.id === "games").items;
const details = JSON.parse(fs.readFileSync(OUT, "utf8"));

const thin = games.filter((g) => {
  const rec = details.items[g.id];
  if (!rec || rec._miss) return false;
  const s = rec.summaryAr || rec.summaryEn || "";
  return s.length < MIN;
});

console.log(`${thin.length} records with a summary under ${MIN} chars`);

let fixed = 0;
let stillThin = 0;

(async () => {
  for (const item of thin) {
    const rec = details.items[item.id];
    // We need the app id to refetch; it is recorded on the record.
    const appId = rec.steamAppId;
    if (!appId) {
      stillThin++;
      continue;
    }

    const raw = await steam.appDetails(appId);
    const fresh = raw && steam.toDetails(raw, item.id, item.title);
    if (!fresh) {
      stillThin++;
      continue;
    }

    // Keep the original match evidence; only the descriptive fields are
    // refreshed.
    const merged = { ...rec };
    for (const key of ["summaryAr", "summaryEn", "requirements", "genres", "modes", "releaseDate", "platforms"]) {
      if (fresh[key] != null) merged[key] = fresh[key];
    }
    if (fresh.extra && Object.keys(fresh.extra).length) merged.extra = fresh.extra;

    const s = merged.summaryAr || merged.summaryEn || "";
    if (s.length >= MIN) {
      details.items[item.id] = merged;
      fixed++;
      console.log(`  fixed   ${item.title} (${s.length} chars)`);
    } else {
      stillThin++;
      console.log(`  still   ${item.title} (${s.length} chars)`);
    }

    // Keep the cache in step so a later rebuild does not undo this.
    const key = item.id.replace(/[^\w.-]+/g, "_") + ".json";
    fs.writeFileSync(path.join(CACHE, key), JSON.stringify(merged) + "\n");
  }

  fs.writeFileSync(OUT, JSON.stringify(details, null, 2) + "\n");
  console.log(`\n${fixed} fixed, ${stillThin} still thin`);
})();