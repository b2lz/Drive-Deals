"use strict";
// Build a local index of AniList so anime titles can be matched offline.
//
// The anime shelf is the largest remaining gap, and the reason is that
// its titles are Japanese romanisations: "AnsatsuKyoushits",
// "Re.Zero kara Hajimeru Isekai Seikatsu", "Dr. Gray Man". A search
// API has to guess which of those the caller meant, and guesses badly.
//
// AniList carries the answer. Every entry lists its romaji, English and
// native titles plus a `synonyms` array that includes the community
// romanisations — so the alternative spellings are already indexed there.
// Pulling them all down once turns the problem into a local lookup over
// known names instead of a guess per request.
//
// Usage: node tools/build-anilist-index.js [--refresh]

const fs = require("fs");
const path = require("path");

const { postJson } = require("./lib/http");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, ".cache", "anilist-index.json");
const REFRESH = process.argv.includes("--refresh");
const PER_PAGE = 50;

/** The catalogue is walked one season year at a time, for the reason in fetchAll. */
const FIRST_YEAR = 1960;
const LAST_YEAR = new Date().getFullYear() + 1;

/** The pause between year queries. Raising it costs minutes; lowering it costs data. */
const PAUSE_MS = 3000;

const QUERY = `
query ($page: Int, $perPage: Int, $year: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, seasonYear: $year, sort: ID) {
      id
      title { romaji english native }
      synonyms
      format
      episodes
      duration
      status
      seasonYear
      startDate { year month day }
      genres
      description(asHtml: false)
      studios(isMain: true) { nodes { name } }
      siteUrl
    }
  }
}`;

/**
 * Download the catalogue, one season year at a time.
 *
 * AniList refuses a page offset past 5000, and offers no `id_greater`
 * argument to walk past it, so plain paging dead-ends at 5000 titles
 * however large the catalogue is. Filtering by `seasonYear` sidesteps the
 * limit entirely: no single year comes close to 5000 entries, so each
 * year pages freely and the whole catalogue is covered.
 */
async function fetchAll(from) {
  const all = from.slice();
  const seen = new Set(all.map((e) => e.id));
  let misses = 0;

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    let page = 1;

    for (;;) {
      const json = await postJson("https://graphql.anilist.co", {
        query: QUERY,
        variables: { page, perPage: PER_PAGE, year },
      });
      const data = json && json.data && json.data.Page;

      if (!data || !Array.isArray(data.media)) {
        // Throttled or dropped. Waiting beats losing the year, because a
        // partly-downloaded year is a silently incomplete index.
        await new Promise((r) => setTimeout(r, 5000));
        if (++misses > 4) break;
        continue;
      }
      if (!data.media.length) break;

      for (const m of data.media) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        all.push(toEntry(m));
      }

      if (!data.pageInfo || !data.pageInfo.hasNextPage) break;
      page++;
      if (page > 40) break; // safety stop; no year is this large
    }

    // AniList refuses bursts, and a year-per-request loop is close to
    // one. The pause is what makes the catalogue come out whole.
    await new Promise((r) => setTimeout(r, PAUSE_MS));

    if (year % 5 === 0 || year === LAST_YEAR) {
      process.stdout.write(`  through ${year}: ${all.length} titles\r`);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, JSON.stringify(all));
    }
  }

  return all;
}

function toEntry(m) {
  return {
    id: m.id,
    titles: [m.title.romaji, m.title.english, m.title.native, ...(m.synonyms || [])].filter(
      Boolean,
    ),
    format: m.format,
    episodes: m.episodes,
    duration: m.duration,
    status: m.status,
    seasonYear: m.seasonYear,
    startDate: m.startDate,
    genres: m.genres,
    description: m.description,
    studios: (m.studios && m.studios.nodes ? m.studios.nodes : []).map((s) => s.name),
    siteUrl: m.siteUrl,
  };
}

(async () => {
  // Resume rather than restart: a partial catalogue is still useful, and
  // the run takes a while.
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];

  if (!REFRESH && existing.length >= 5000) {
    console.log(`index already has ${existing.length} entries — pass --refresh to rebuild`);
    return;
  }

  console.log(
    existing.length
      ? `resuming the AniList catalogue from ${existing.length} titles...`
      : "downloading the AniList catalogue...",
  );
  const t0 = Date.now();
  const entries = await fetchAll(REFRESH ? [] : existing);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(entries));

  const withSynonyms = entries.filter((e) => e.titles.length > 3).length;
  console.log(`\n${entries.length} anime indexed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`${withSynonyms} of them carry community synonyms`);
  console.log(`written to .cache/anilist-index.json`);
})();