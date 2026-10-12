"use strict";
// Fill details/*.json for the film / series / anime categories.
//
// Usage:
//   node tools/fill-media.js                     # every unfilled media item
//   node tools/fill-media.js --category anime    # just one category
//   node tools/fill-media.js --limit 50
//   node tools/fill-media.js --retry-misses
//   node tools/fill-media.js --report
//
// Source routing per category:
//   anime            -> AniList   (structured: episodes, studio, genres)
//   *-series         -> TVMaze, falling back to Wikipedia
//   *-films          -> Wikipedia (covers Arabic, Indian, Turkish titles
//                       that the structured APIs do not index)
//
// Same guarantees as fill-games.js: resumable via .cache/media, never
// guesses, and never overwrites hand-researched entries.

const fs = require("fs");
const path = require("path");
const anilist = require("./lib/anilist");
const anilistIndex = require("./lib/anilist-index");
const tvmaze = require("./lib/tvmaze");
const wikipedia = require("./lib/wikipedia");
const collection = require("./lib/collection");
const { cacheFileName } = require("./lib/cachekey");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data.json");
const DETAILS = path.join(ROOT, "details");
const CACHE = path.join(ROOT, ".cache", "media");

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const argVal = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

// Per-category limit, so `--limit 12` means "12 from each category" and
// is a usable smoke test across every provider path.
const LIMIT = argVal("--limit", null) === null ? Infinity : Number(argVal("--limit", 0));
const CATEGORY = argVal("--category", null);
const FORCE = hasFlag("--force");
const RETRY_MISSES = hasFlag("--retry-misses");
const REPORT_ONLY = hasFlag("--report");

// How many times to retry an item whose lookup failed for a transient
// reason (rate limit, 5xx, network) rather than because nothing matched.
const TRANSIENT_TRIES = Number(argVal("--tries", 3));

/** Entries this pipeline wrote; anything else is treated as hand research. */
const AUTO_SOURCES = new Set([
  "anilist",
  "anilist-index",
  "tvmaze",
  "wikipedia",
  "wikipedia-collection",
]);

/**
 * Is a cached Wikipedia record still fit to publish?
 *
 * The medium-check ("is this page actually about a film or a series?")
 * was added after the first cache was written, so older entries can
 * point at a numerology article or a "may refer to:" page. Replaying
 * them would publish a confidently wrong summary, so they are refetched
 * rather than trusted.
 */
function isUsableWikiRecord(rec) {
  const summary = rec.summaryEn || rec.summaryAr || "";
  if (summary.length < 40) return false;
  return wikipedia.isMediaPage(summary) && !wikipedia.isDisambiguationText(summary);
}

/**
 * Is a cached record worth replaying?
 *
 * Two ways a cached record can be unfit: it predates the medium-check
 * (so it may point at a numerology article), or it simply has no
 * summary and would render as an empty box.
 */
function isUsableRecord(rec) {
  if (!rec || rec._miss) return false;
  const summary = rec.summaryAr || rec.summaryEn || "";
  if (!summary) return false;
  if (rec.source === "wikipedia") return isUsableWikiRecord(rec);
  return true;
}

/**
 * Which providers to try, in order, for each category.
 *
 * Anime has the richest structured source, so it leads. Television
 * series get TVMaze for episode/network data with Wikipedia behind it.
 * Everything else — including "foreign-film-series", which despite the
 * name is a collection of films rather than a TV show — goes straight
 * to Wikipedia, which indexes Arabic, Indian and Turkish titles that
 * the structured APIs do not carry.
 */
function planFor(categoryId) {
  if (categoryId === "anime") return ["anilist", "wikipedia"];
  // "foreign-film-series" holds films despite its name, so it has to be
  // matched before the generic television check below — otherwise TVMaze
  // answers with a TV series for a shelf of films.
  if (categoryId.endsWith("film-series")) return ["wikipedia"];
  if (categoryId.endsWith("-series")) return ["tvmaze", "wikipedia"];
  return ["wikipedia"];
}

/**
 * Does this record belong in this category?
 *
 * Category names are the only statement we have about what the library
 * intends a shelf to hold, and Wikipedia will happily answer a search
 * for a TV series with a film of a similar name — "البخت" resolving to
 * "قليل البخت" (a film) on the arabic-series shelf is the case that
 * motivated this check. Rejecting the mismatch is better than
 * publishing a film summary on a series page.
 */
function fitsCategory(categoryId, rec) {
  if (!rec || !rec.type) return true; // unknown type: let it through

  const isSeries = rec.type === "series" || rec.type === "anime";
  const isFilm = rec.type === "film" || rec.type === "film series";

  // Anime shelves also legitimately hold movies ( theatrical films are
  // catalogued there too), so only series shelves are strict.
  if (categoryId === "anime") return true;
  // "foreign-film-series" holds films despite its name, and it ends with
  // "-series" — so it must be matched before the generic television
  // check, or every film on that shelf is rejected as the wrong medium.
  if (categoryId.endsWith("film-series")) return isFilm;
  if (categoryId.endsWith("-series")) return isSeries;
  if (categoryId.endsWith("-films")) return isFilm;
  return true;
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * The cache file for one item. See lib/cachekey.js: the readable form
 * alone is not enough on an Arabic shelf, because `\w` is ASCII-only and
 * every Arabic title would collapse onto the same file.
 */
function cacheKey(cat, id) {
  return cacheFileName(cat, `${cat}__${id}`);
}

function readCache(cat, id) {
  return loadJson(path.join(CACHE, cacheKey(cat, id)), null);
}

function writeCache(cat, id, rec) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, cacheKey(cat, id)), JSON.stringify(rec) + "\n");
}

/** Run the planned providers until one returns a usable record. */
async function resolveWith(categoryId, title) {
  const tried = [];

  // The anime shelf holds Japanese romanisations, which a live search
  // guesses at badly. The local index holds every name AniList knows for
  // every series — including the community romanisations in its synonyms
  // field — so the title is compared against known names instead.
  if (categoryId === "anime") {
    try {
      const indexed = anilistIndex.resolve(title);
      if (indexed) return { rec: indexed, provider: "anilist-index" };
      tried.push("anilist-index: no match");
    } catch (err) {
      if (err.transient) throw err;
      tried.push(`anilist-index: ${err.message}`);
    }
  }

  // A bundled shelf ("Harry Potter collection", "300 1+2") describes a
  // franchise, not a single film, so the single-title providers find
  // either the first entry or nothing. The franchise's own article is
  // the right answer, so it is tried first for these.
  if (collection.isBundle(title)) {
    try {
      const bundled = await collection.resolve(title);
      if (bundled) return { rec: bundled, provider: "collection" };
      tried.push("collection: no match");
    } catch (err) {
      if (err.transient) throw err;
      tried.push(`collection: error ${err.message}`);
    }
  }

  for (const provider of planFor(categoryId)) {
    let rec = null;
    try {
      rec =
        provider === "anilist"
          ? await anilist.resolve(title)
          : provider === "tvmaze"
            ? await tvmaze.resolve(title)
            : await wikipedia.resolve(title);
    } catch (err) {
      // A rate limit or network fault is not "no match". Letting it
      // through stops the run before the item is filed as a miss it
      // never actually looked up.
      if (err.transient) throw err;
      tried.push(`${provider}: error ${err.message}`);
      continue;
    }
    if (rec) return { rec, provider };
    tried.push(`${provider}: no match`);
  }
  return { rec: null, tried };
}

(async () => {
  const data = loadJson(DATA, null);
  if (!data) {
    console.error("data.json not found");
    process.exit(1);
  }

  const categories = data.categories.filter(
    (c) => c.id !== "games" && (!CATEGORY || c.id === CATEGORY),
  );
  const totalItems = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`categories: ${categories.map((c) => `${c.id}(${c.items.length})`).join(", ")}`);
  console.log(`items to consider: ${totalItems}\n`);

  if (REPORT_ONLY) {
    for (const cat of categories) reportCategory(cat);
    return;
  }

  let done = 0;
  const stats = { filled: 0, cached: 0, preserved: 0, missed: 0 };
  let transient = 0;
  const t0 = Date.now();

  for (const category of categories) {
    const file = path.join(DETAILS, `${category.id}.json`);
    const current = loadJson(file, { _meta: {}, items: {} });
    if (!current.items) current.items = {};

    const catStats = { filled: 0, cached: 0, preserved: 0, missed: 0 };
    const misses = [];
    let catDone = 0;

    for (const item of category.items) {
      if (catDone >= LIMIT) break;
      catDone++;
      done++;
      const id = item.id;

      // Preserve anything that was not written by this pipeline
      // (i.e. hand-researched entries from a previous manual pass).
      if (!FORCE && current.items[id] && !AUTO_SOURCES.has(current.items[id].source)) {
        catStats.preserved++;
        continue;
      }
      if (!FORCE && current.items[id]) {
        catStats.cached++;
        continue;
      }

      let rec = FORCE ? null : readCache(category.id, id);
      if (rec && rec._miss && !FORCE && !RETRY_MISSES) {
        catStats.missed++;
        misses.push(item.title);
        continue;
      }
      if (rec && rec._miss) rec = null;

      // Re-validate a cached record before replaying it: one written before
      // the guards existed can point at a numerology article, and one
      // with no summary renders as an empty box. Both are refetched.
      if (rec && !FORCE && !isUsableRecord(rec)) {
        rec = null;
      }

      if (!rec) {
        let found = null;
        let provider = null;
        let tried = null;

        // Retry a rate-limited or failed lookup rather than recording a
        // miss for an item that was never actually checked. Giving up
        // entirely after a few attempts is better than silently filing
        // hundreds of titles as "not found".
        for (let attempt = 1; attempt <= TRANSIENT_TRIES; attempt++) {
          try {
            ({ rec: found, provider, tried } = await resolveWith(category.id, item.title));
            break;
          } catch (err) {
            if (!err.transient || attempt === TRANSIENT_TRIES) throw err;
            transient++;
            console.warn(
              `  ${category.id}/${item.title}: ${err.message} — retry ${attempt}/${TRANSIENT_TRIES}`,
            );
            await new Promise((r) => setTimeout(r, 10000 * attempt));
          }
        }

        // A record with no summary renders as an empty box, which is
        // worse than no record: the page looks filled in but says
        // nothing. Treat it as a miss so the next provider or a later
        // run can try again.
        rec =
          found && !(found.summaryAr || found.summaryEn)
            ? {
                _miss: true,
                title: item.title,
                reason: `${found.source || "provider"} returned no summary`,
              }
            : found || { _miss: true, title: item.title, tried };
        if (found && !found.source) rec.source = provider;
        // A series shelf must not end up with a film, or vice versa.
        if (rec && !rec._miss && !fitsCategory(category.id, rec)) {
          rec = {
            _miss: true,
            title: item.title,
            reason: `category mismatch: ${category.id} got a ${rec.type}`,
          };
        }
        writeCache(category.id, id, rec);
      }

      if (rec._miss) {
        catStats.missed++;
        misses.push(item.title);
        continue;
      }

      current.items[id] = rec;
      catStats.filled++;
    }

    stats.filled += catStats.filled;
    stats.cached += catStats.cached;
    stats.preserved += catStats.preserved;
    stats.missed += catStats.missed;

    current._meta = {
      version: 1,
      collection: category.id,
      method: planFor(category.id).join("+"),
      note:
        "Auto-filled from " + planFor(category.id).join(" / ") + ". " +
        "Summaries are spoiler-free by construction (encyclopaedic leads / " +
        "catalogue synopses). Fields the source does not publish are null.",
      updatedAt: new Date().toISOString().slice(0, 10),
      counts: coverage(current.items, category.items),
    };
    fs.mkdirSync(DETAILS, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(current, null, 2) + "\n");

    console.log(
      `${category.id.padEnd(22)} filled=${catStats.filled} cached=${catStats.cached} ` +
        `preserved=${catStats.preserved} missed=${catStats.missed}`,
    );
    if (misses.length) {
      fs.writeFileSync(path.join(CACHE, `${category.id}-misses.txt`), misses.join("\n") + "\n");
    }
  }

  console.log(
    `\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s: ` +
      `${stats.filled} filled, ${stats.cached} cached, ${stats.preserved} preserved, ${stats.missed} missed` +
      (transient ? ` (${transient} transient retries)` : "") +
      ".",
  );
  for (const cat of categories) reportCategory(cat);
})();

function coverage(items, list) {
  let withSummary = 0;
  for (const it of list) {
    const d = items[it.id];
    if (d && !d._miss && (d.summaryAr || d.summaryEn)) withSummary++;
  }
  return { total: list.length, researched: withSummary };
}

function reportCategory(category) {
  const file = path.join(DETAILS, `${category.id}.json`);
  const current = loadJson(file, { items: {} });
  const c = coverage(current.items || {}, category.items);
  const pct = c.total ? ((c.researched / c.total) * 100).toFixed(1) : "0.0";
  console.log(
    `  ${category.id.padEnd(22)} ${String(c.researched).padStart(4)}/${String(c.total).padEnd(4)} (${pct}%)`,
  );
}