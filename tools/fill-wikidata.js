"use strict";
// Fill in what the existing providers left blank, using Wikidata.
//
// Two jobs, both against the same source:
//
//   1. ENRICH — records that exist but are thin. Games had no developer
//      or genre at all; 282 Arabic films had no director or cast; series
//      had no release date. Those fields are all in Wikidata, and in
//      Arabic, which is what the page shows.
//
//   2. FILL   — items with no record at all. Wikidata resolves titles
//      that no article does, most usefully Japanese romanisations, which
//      are the single largest remaining gap in the anime shelf.
//
// Nothing is overwritten: a field already present is left alone, and hand
// research is never touched.
//
// Usage:
//   node tools/fill-wikidata.js [--category anime] [--limit 50]
//   node tools/fill-wikidata.js --report
//   node tools/fill-wikidata.js --report-all

const fs = require("fs");
const path = require("path");

const wd = require("./lib/wikidata");
const { cacheFileName } = require("./lib/cachekey");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "wikidata");

const argVal = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const hasFlag = (flag) => process.argv.includes(flag);

const CATEGORY = argVal("--category", null);
const LIMIT = Number(argVal("--limit", 0));
const REPORT_ONLY = hasFlag("--report");
const REPORT_ALL = hasFlag("--report-all");

/** What each shelf expects, so Wikidata's medium can be checked. */
const MEDIUM = {
  anime: "anime",
  "cartoon-films": "film",
  "cartoon-series": "series",
  "arabic-films": "film",
  "arabic-series": "series",
  "foreign-films": "film",
  "foreign-film-series": "film",
  "foreign-series": "series",
  "indian-films": "film",
  "korean-series": "series",
  "turkish-series": "series",
  games: "game",
};

/**
 * The language to search first, where the shelf knows it but the title
 * does not. "122" is an Egyptian film; a title of digits reveals nothing,
 * so without this the lookup searches English and finds a year.
 */
const LANG = {
  "arabic-films": "ar",
  "arabic-series": "ar",
  "turkish-series": "tr",
  "korean-series": "ko",
  anime: "ja",
};

/** Fields Wikidata can supply, per kind of record. */
const FIELDS = {
  game: ["genres", "developer", "releaseDate", "platforms"],
  media: ["genres", "director", "cast", "releaseDate", "creators"],
};

const read = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const write = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

/**
 * The cache file for one item. See lib/cachekey.js for why the readable
 * form is not enough on its own.
 */
function cacheKey(catId, id) {
  return path.join(CACHE, cacheFileName(catId, id));
}

function readCache(catId, id) {
  const rec = read(cacheKey(catId, id), null);
  return rec;
}

function writeCache(catId, id, rec) {
  fs.mkdirSync(CACHE, { recursive: true });
  write(cacheKey(catId, id), rec);
}

(async () => {
  const data = read(path.join(ROOT, "data.json"), null);
  if (!data) throw new Error("data.json not found");

  const cats = data.categories.filter((c) => !CATEGORY || c.id === CATEGORY);

  if (REPORT_ONLY || REPORT_ALL) {
    console.log("\nWikidata fill report");
    console.log("-".repeat(70));
    let totalEnrich = 0;
    let totalFill = 0;

    for (const cat of cats) {
      const file = path.join(ROOT, "details", `${cat.id}.json`);
      const parsed = read(file, null);
      if (!parsed) continue;

      const want = FIELDS[MEDIUM[cat.id] === "game" ? "game" : "media"];
      const missingRecords = [];
      const thinRecords = [];

      for (const item of cat.items) {
        const rec = parsed.items[item.id];
        if (!rec) {
          missingRecords.push(item);
          continue;
        }
        if (!rec.source) continue; // hand research
        const gaps = want.filter((f) => {
          const v = rec[f];
          return v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);
        });
        if (gaps.length) thinRecords.push({ item, gaps });
      }

      if (REPORT_ALL || missingRecords.length || thinRecords.length) {
        console.log(
          `${cat.id.padEnd(22)} no record: ${String(missingRecords.length).padStart(4)}   ` +
            `thin: ${String(thinRecords.length).padStart(4)}`,
        );
      }
      totalEnrich += thinRecords.length;
      totalFill += missingRecords.length;
    }

    console.log("-".repeat(70));
    console.log(`  would fill ${totalFill}, would enrich ${totalEnrich}`);
    return;
  }

  let filled = 0;
  let enriched = 0;
  let done = 0;
  const t0 = Date.now();

  for (const cat of cats) {
    const medium = MEDIUM[cat.id];
    if (!medium) continue;

    const file = path.join(ROOT, "details", `${cat.id}.json`);
    const parsed = read(file, null);
    if (!parsed || !parsed.items) continue;

    const want = FIELDS[medium === "game" ? "game" : "media"];
    let changed = false;

    for (const item of cat.items) {
      if (LIMIT && done >= LIMIT) break;
      done++;

      const existing = parsed.items[item.id];

      // Hand research is never touched.
      if (existing && !existing.source) continue;

      const gaps = existing
        ? want.filter((f) => {
            const v = existing[f];
            return v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);
          })
        : want;

      if (existing && !gaps.length) continue;

      let rec = readCache(cat.id, item.id);
      if (!rec) {
        const found = await wd.resolve(item.title, { medium, lang: LANG[cat.id] });
        rec = found
          ? {
              facts: found.facts,
              label: found.entity.label,
              description: found.entity.description,
              entityId: found.entity.id,
            }
          : { _miss: true };
        writeCache(cat.id, item.id, rec);
      }

      if (rec._miss) continue;

      const facts = rec.facts || {};

      if (!existing) {
        // A record built only from Wikidata: title and a link, no
        // invented summary.
        parsed.items[item.id] = {
          title: item.title,
          canonicalTitle: rec.label || item.title,
          type: medium === "game" ? "game" : "film",
          genres: facts.genres || null,
          director: facts.director || null,
          cast: facts.cast || null,
          releaseDate: facts.releaseDate || null,
          platforms: facts.platforms || null,
          creators: facts.creators || null,
          summaryAr: null,
          summaryEn: null,
          requirements: null,
          links: [
            {
              label: "Wikidata",
              url: `https://www.wikidata.org/wiki/${rec.entityId}`,
            },
          ],
          confidence: rec.entityId ? "medium" : "low",
          source: "wikidata",
          needsSummary: true,
          // Wikidata has no system specifications. A game record without
          // them says so, rather than showing an empty tab with no
          // explanation.
          needsRequirements: medium === "game" ? true : undefined,
        };
        filled++;
        changed = true;
        continue;
      }

      // Enrich: only the fields that are actually blank.
      let touched = false;
      for (const f of gaps) {
        const value = facts[f];
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && !value.length) continue;
        existing[f] = value;
        touched = true;
      }
      if (!touched) continue;

      // Record where the new facts came from. It goes under "extra" rather
      // than as a top-level key so the page actually shows it — a field
      // the renderer ignores is a field nobody reads.
      existing.extra = { ...(existing.extra || {}), factsSource: "Wikidata" };
      existing.source = joinSources(existing.source, "wikidata");
      enriched++;
      changed = true;
    }

    if (changed) {
      parsed._meta = parsed._meta || {};
      parsed._meta.method = [parsed._meta.method, "wikidata"].filter(Boolean).join("+");
      parsed._meta.updatedAt = new Date().toISOString().slice(0, 10);
      write(file, parsed);
    }

    process.stdout.write(
      `${cat.id.padEnd(22)} filled=${filled} enriched=${enriched} processed=${done}\n`,
    );
  }

  console.log(
    `\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s: ` +
      `${filled} new records, ${enriched} enriched, ${done} examined.`,
  );
})();

/** Keep a record's source list in step with the sources that fed it. */
function joinSources(current, added) {
  const parts = String(current || "").split("+").filter(Boolean);
  if (!parts.includes(added)) parts.push(added);
  return parts.join("+");
}