"use strict";
// Fill details/games.json from the Steam store.
//
// Usage:
//   node tools/fill-games.js              # resume, only fetch missing
//   node tools/fill-games.js --limit 100  # first 100 items this run
//   node tools/fill-games.js --force      # refetch everything
//   node tools/fill-games.js --report     # print a coverage summary only
//
// Design notes:
//   - Resumable: a per-item cache under .cache/games/ means an
//     interrupted run continues where it stopped without re-hitting
//     Steam. Re-running after a network blip only retries the failures.
//   - Conservative: anything below the match floor is recorded as a
//     "miss" with the reason, never guessed. A wrong game on a page is
//     far worse than a bare page.
//   - Non-destructive: only fills empty entries by default. Hand-written
//     research in details/games.json is preserved unless --force.
//
// Output merges into details/games.json and updates its _meta counts.

const fs = require("fs");
const path = require("path");
const steam = require("./lib/steam");
const wikiGame = require("./lib/wikipedia-game");
const srl = require("./lib/systemrequirementslab");
const pcgw = require("./lib/pcgamingwiki");
const { cacheFileName } = require("./lib/cachekey");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data.json");
const OUT = path.join(ROOT, "details", "games.json");
const CACHE = path.join(ROOT, ".cache", "games");

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const argVal = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};

const LIMIT = argVal("--limit", Infinity);
const FORCE = hasFlag("--force");
const REPORT_ONLY = hasFlag("--report");

/** Records this pipeline wrote; anything else is hand research. */
const AUTO_SOURCES = new Set([
  "steam",
  "wikipedia",
  "systemrequirementslab",
  "pcgamingwiki",
  "wikidata",
  "wikipedia+systemrequirementslab",
  "wikipedia+pcgamingwiki",
  "wikidata+systemrequirementslab",
  "wikidata+pcgamingwiki",
]);
// Retry previously-cached misses without refetching the successes.
// Worth running whenever the matcher in tools/lib/match.js changes:
// a miss is often a cleaning bug rather than a genuinely absent game.
const RETRY_MISSES = hasFlag("--retry-misses");

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * Stable, filesystem-safe cache key for an item id. See
 * lib/cachekey.js: the readable form alone is not enough, because `\w`
 * is ASCII-only and would collapse non-Latin titles onto one file.
 */
function cacheKey(id) {
  return cacheFileName("games", id);
}

function readCache(id) {
  const file = path.join(CACHE, cacheKey(id));
  const rec = loadJson(file, null);
  return rec;
}

function writeCache(id, rec) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, cacheKey(id)), JSON.stringify(rec) + "\n");
}

/**
 * Resolve one game, Steam first and Wikipedia second.
 *
 * A third of the games category is not on Steam: retail exclusives,
 * delisted older titles, Epic/GOG-only releases, collections and
 * film-licensed games. Those render as an empty page otherwise.
 *
 * Steam is still tried first because it is the only source with real
 * minimum/recommended system requirements. A Wikipedia record fills in
 * developer, publisher, platforms, engine, series and the release date,
 * but carries no specs, so `needsRequirements` marks it for a later pass.
 */
/**
 * Fill the gaps in an existing record from SystemRequirementsLab.
 *
 * Two things come from here:
 *
 *   1. The system specifications, which neither Steam nor Wikipedia
 *      could supply for a game they do not carry.
 *   2. The game's proper name. A library folder is called
 *      "God.Of.War1" or "Fifa 2013"; Wikipedia has never heard of
 *      either, but once the specs site has confirmed the game exists and
 *      named it properly, the article is easy to find. That turns a
 *      specs-only page into a full one.
 *
 * The existing record is never thrown away — only enriched.
 *
 * @returns {Promise<object|null>} null when nothing new could be added,
 *   which leaves the caller to keep the record it already had.
 */
async function completeWithRequirements(existing, title) {
  // Two sources for the specifications, tried in order.
  //
  // SystemRequirementsLab covers more titles and goes first.
  // PCGamingWiki keeps its requirements in a named template, so the
  // values are read exactly rather than scraped out of page layout, and
  // it reaches a handful of older releases that neither a store nor the
  // specs site lists.
  let hit = null;
  let page = null;
  let sourceName = null;

  const srlHit = await srl.resolve(title);
  if (srlHit) {
    const parsed = await srl.parsePage(srlHit.url);
    if (parsed && (parsed.minimum || parsed.recommended)) {
      hit = srlHit;
      page = parsed;
      sourceName = "SystemRequirementsLab";
    }
  }

  if (!page) {
    const pcgwHit = await pcgw.resolve(title);
    if (pcgwHit) {
      hit = {
        url: `https://www.pcgamingwiki.com/wiki/${encodeURIComponent(pcgwHit.title)}`,
        slug: pcgwHit.title,
      };
      page = pcgwHit.requirements;
      sourceName = "PCGamingWiki";
    }
  }

  if (!page) return null;

  const minimum = page.minimum && Object.keys(page.minimum).length ? page.minimum : null;
  const recommended =
    page.recommended && Object.keys(page.recommended).length ? page.recommended : null;

  const hasSpecs = Boolean(minimum || recommended);
  if (!hasSpecs && existing.summaryAr && existing.summaryEn) return null;

  // The source knows the game's real name; use it to find the article
  // that a mangled library name could never reach.
  const properName = (page && page.title) || (hit.slug || "").replace(/-/g, " ");
  let wiki = null;
  if (!(existing.summaryAr || existing.summaryEn) && properName) {
    wiki = await wikiGame.resolve(properName);
  }

  const specs = hasSpecs
    ? {
        minimum,
        recommended,
        extra: {
          ...(existing.extra || {}),
          requirementsSource: sourceName,
        },
        links: [
          ...(existing.links || []),
          ...(hit.url ? [{ label: "مواصفات التشغيل", url: hit.url }] : []),
        ],
      }
    : {};

  if (wiki) {
    // The article is richer than the bare record, so it becomes the
    // base and the specs are merged on top.
    return {
      ...wiki,
      requirements: hasSpecs ? { minimum, recommended } : null,
      needsRequirements: !hasSpecs,
      needsSummary: false,
      source: hasSpecs
        ? `wikipedia+${slugOf(sourceName)}`
        : "wikipedia",
      extra: {
        ...(wiki.extra || {}),
        ...(hasSpecs ? { requirementsSource: sourceName } : {}),
      },
      links: [
        ...(wiki.links || []),
        ...(hit.url ? [{ label: "مواصفات التشغيل", url: hit.url }] : []),
      ],
    };
  }

  if (!hasSpecs) return null;

  const hasSummary = Boolean(existing.summaryAr || existing.summaryEn || wiki);

  return {
    ...existing,
    requirements: { minimum, recommended },
    // The specs are known now, so the "no reliable specs" note is stale.
    // The missing description is stated rather than left as a gap.
    needsRequirements: false,
    needsSummary: !hasSummary,
    source: `wikipedia+${slugOf(sourceName)}`,
    extra: specs.extra,
    links: specs.links,
  };
}

/** The source tag recorded on a record, e.g. "SystemRequirementsLab" -> "systemrequirementslab". */
function slugOf(sourceName) {
  return String(sourceName || "specs")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Resolve one game, best source first.
 *
 * Steam leads because it publishes requirements in Arabic and covers
 * most of the shelf. Wikipedia covers the games Steam does not carry
 * but cannot supply specs, so those get a third look at
 * SystemRequirementsLab before the record is called finished.
 */
async function resolveGame(item) {
  const hit = await steam.resolve(item.title);
  if (hit) {
    const raw = await steam.appDetails(hit.appId);
    const details = raw && steam.toDetails(raw, item.id, item.title);
    if (details) {
      details.matchScore = Number(hit.score.toFixed(3));
      return details;
    }
  }

  // Steam had nothing usable — try the article instead of leaving the
  // page blank.
  const wiki = await wikiGame.resolve(item.title);
  if (wiki) {
    const completed = await completeWithRequirements(wiki, item.title);
    return completed || wiki;
  }

  // Neither structured source knew this game, and neither did Wikipedia.
// The two specifications sources may still have it: between them they
  // cover old retail releases that are on no store at all.
  const srlHit = await srl.resolve(item.title);
  if (srlHit) {
    const page = await srl.parsePage(srlHit.url);
    const minimum = page && page.minimum && Object.keys(page.minimum).length ? page.minimum : null;
    const recommended =
      page && page.recommended && Object.keys(page.recommended).length ? page.recommended : null;
    if (minimum || recommended) {
      return {
        title: item.title,
        canonicalTitle: (page && page.title) || srlHit.slug.replace(/-/g, " "),
        type: "game",
        developer: null,
        publisher: null,
        releaseDate: null,
        platforms: ["PC"],
        genres: null,
        summaryAr: null,
        summaryEn: null,
        requirements: { minimum, recommended },
        extra: { requirementsSource: "SystemRequirementsLab" },
        links: [{ label: "مواصفات التشغيل", url: srlHit.url }],
        confidence: "medium",
        source: "systemrequirementslab",
        needsSummary: true,
      };
    }
  }

  const pcgwHit = await pcgw.resolve(item.title);
  if (pcgwHit) {
    return {
      title: item.title,
      canonicalTitle: pcgwHit.title,
      type: "game",
      developer: null,
      publisher: null,
      releaseDate: null,
      platforms: ["PC"],
      genres: null,
      summaryAr: null,
      summaryEn: null,
      requirements: pcgwHit.requirements,
      extra: { requirementsSource: "PCGamingWiki" },
      links: [
        {
          label: "مواصفات التشغيل",
          url: `https://www.pcgamingwiki.com/wiki/${encodeURIComponent(pcgwHit.title)}`,
        },
      ],
      confidence: "medium",
      source: "pcgamingwiki",
      needsSummary: true,
    };
  }

  return {
    _miss: true,
    title: item.title,
    reason: hit
      ? "Steam matched but produced no usable record"
      : "no match on Steam, Wikipedia, SystemRequirementsLab or PCGamingWiki",
  };
}

/**
 * resolveGame with retries for transient failures.
 *
 * A rate limit or a dropped connection is not evidence that a game does
 * not exist. Returning a miss here would file the item permanently, so
 * the lookup is retried and only a clean "nothing matched" counts.
 */
async function resolveGameRetry(item, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await resolveGame(item);
    } catch (err) {
      if (!err.transient || attempt >= attempts) throw err;
      console.warn(`  ${item.title}: ${err.message} — retry ${attempt}/${attempts}`);
      await new Promise((r) => setTimeout(r, 10000 * attempt));
    }
  }
}

(async () => {
  const data = loadJson(DATA, null);
  if (!data) {
    console.error("data.json not found");
    process.exit(1);
  }
  const games = (data.categories.find((c) => c.id === "games") || { items: [] }).items;
  console.log(`games in library: ${games.length}\n`);

  const current = loadJson(OUT, { _meta: {}, items: {} });
  if (!current.items) current.items = {};

  if (REPORT_ONLY) {
    printReport(current.items, games);
    return;
  }

  let done = 0;
  let filled = 0;
  let preserved = 0;
  let missed = 0;
  let cached = 0;
  const misses = [];
  const t0 = Date.now();

  for (const item of games) {
    if (done >= LIMIT) break;
    done++;

    const id = item.id;
    // A record kept from a previous run, held back while the specs are
    // looked up from another source.
    let existing = null;

    // Hand-researched entries are never overwritten. Anything this
    // pipeline wrote is fair game to revisit.
    if (!FORCE && current.items[id] && !AUTO_SOURCES.has(current.items[id].source)) {
      preserved++;
      continue;
    }

    // Steam records are final — they carry the real requirements.
    if (!FORCE && current.items[id] && current.items[id].source === "steam") {
      cached++;
      continue;
    }

    // A record is provisional when something about it is still missing: no
    // system specs, or no description. Either can be filled later, so
    // the entry is worth revisiting.
    if (!FORCE && current.items[id]) {
      const d = current.items[id];
      const gap = !d.requirements || !(d.summaryAr || d.summaryEn);
      if (!gap) {
        cached++;
        continue;
      }
      existing = d;
    }

    let rec = FORCE ? null : readCache(id);

    // A cached record is only reusable while it still matches what the
    // page can render. Steam entries need a keyed requirements object;
    // Wikipedia entries are kept unless they are flagged as needing
    // requirements we could not source.
    if (rec && !rec._miss && rec.source === "steam") {
      const min = rec.requirements && rec.requirements.minimum;
      const rec2 = rec.requirements && rec.requirements.recommended;
      const keyed = (p) => p && typeof p === "object" && Object.keys(p).length > 0;
      if (rec.requirements && !keyed(min) && !keyed(rec2)) rec = null;
    }

    // A cached miss is retried when asked; a miss is usually a matcher
    // limitation, not a blip.
    if (rec && rec._miss && !FORCE && !RETRY_MISSES) {
      missed++;
      misses.push(rec);
      continue;
    }
    if (rec && rec._miss) rec = null;

    if (existing && !rec) {
      // A record we already have, missing only its system specs.
      const completed = await completeWithRequirements(existing, item.title);
      if (completed) {
        writeCache(id, completed);
        current.items[id] = completed;
        filled++;
        continue;
      }
      // No specs found: keep what we have rather than losing it.
      current.items[id] = existing;
      cached++;
      continue;
    }

    if (!rec) {
      rec = await resolveGameRetry(item);
      writeCache(id, rec);
    }

    if (rec && rec._miss) {
      missed++;
      misses.push(rec);
      continue;
    }

    current.items[id] = rec;
    filled++;
    if (done % 25 === 0 || done === games.length) {
      process.stdout.write(
        `  ${done}/${games.length}  filled=${filled} cached=${cached} missed=${missed}\n`,
      );
    }
  }

  current._meta = {
    version: 1,
    collection: "games",
    method: "steam-store-api+wikipedia-game+systemrequirementslab",
    note:
      "Auto-filled from the Steam store API where the game is sold there " +
      "(the only source that publishes requirements in Arabic), from the " +
      "Wikipedia video-game infobox for titles Steam does not carry, and " +
      "from SystemRequirementsLab for the system specifications those " +
      "first two cannot supply. A record flagged needsRequirements " +
      "means no source could state the specs, and the page says so " +
      "rather than showing an empty tab. Hand-researched entries keep " +
      "their original source tag and are not overwritten.",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  current._meta.counts = coverage(current.items, games);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(current, null, 2) + "\n");

  console.log(
    `\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s: ` +
      `${filled} filled, ${cached} cached, ${preserved} preserved, ${missed} missed.`,
  );
  printReport(current.items, games);
  if (misses.length) {
    fs.writeFileSync(path.join(ROOT, ".cache", "games-misses.txt"), misses.map((m) => m.title).join("\n") + "\n");
    console.log(`\nMisses listed in .cache/games-misses.txt (${misses.length})`);
  }
})();

function coverage(items, games) {
  let withReq = 0;
  let withSummary = 0;
  let fromSteam = 0;
  let fromWiki = 0;
  let fromSpecs = 0;
  for (const g of games) {
    const d = items[g.id];
    if (!d || d._miss) continue;
    if (d.source === "steam") fromSteam++;
    else if (d.source === "wikipedia") fromWiki++;
    else if (String(d.source || "").includes("systemrequirementslab")) fromSpecs++;
    if (d.requirements && (d.requirements.minimum || d.requirements.recommended)) withReq++;
    if (d.summaryAr || d.summaryEn) withSummary++;
  }
  return {
    total: games.length,
    researched: withSummary,
    withRequirements: withReq,
    fromSteam,
    fromWikipedia: fromWiki,
    fromSpecsSites: fromSpecs,
  };
}

function printReport(items, games) {
  const c = coverage(items, games);
  const pct = (n) => ((n / c.total) * 100).toFixed(1) + "%";
  console.log("\nCoverage for details/games.json");
  console.log("  library items      :", c.total);
  console.log("  have a summary     :", c.researched, `(${pct(c.researched)})`);
  console.log("  have requirements  :", c.withRequirements, `(${pct(c.withRequirements)})`);
  console.log("  from Steam         :", c.fromSteam);
  console.log("  from Wikipedia     :", c.fromWikipedia, "(no system specs)");
  console.log("  from specs sites   :", c.fromSpecsSites);
}