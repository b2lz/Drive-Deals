"use strict";
// Match a library title against the local AniList index.
//
// The anime shelf holds Japanese romanisations — "AnsatsuKyoushits",
// "Re.Zero kara Hajimeru Isekai Seikatsu", "Dr. Gray Man". A live search
// has to guess which of those was meant. The index holds every name
// AniList knows for every series, including the community romanisations
// in the `synonyms` field, so a library title is compared against names
// rather than guessed at.
//
// Scoring is deliberately conservative. Several of these titles are
// common words in a language the matcher cannot read, and a loose rule
// would attach one series' description to another — so a candidate has
// to cover every meaningful word of the title, and a match below the
// floor is a miss.

const fs = require("fs");
const path = require("path");

const { cleanTitle, similarity, coversAllTokens, extractYear, baseKey } = require("./match");
const { trimSpoilers } = require("./anilist");

const INDEX = path.resolve(__dirname, "..", "..", ".cache", "anilist-index.json");

/** Below this, nothing is attached. */
const FLOOR = 0.62;

let entries = null;

/** Load the index once per process. */
function load() {
  if (entries) return entries;
  try {
    entries = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  } catch {
    entries = [];
  }
  return entries;
}

/**
 * Words that are part of a title's shape rather than its identity.
 * Carried on AniList's own titles, they say nothing about which show.
 */
const NOISE = new Set([
  "tv", "ova", "oad", "ona", "movie", "film", "season", "series", "specials",
  "special", "episode", "episodes", "part", "the", "a", "an", "of", "and",
  "no", "ver", "hen", "shou", "season2", "2nd", "3rd", "4th",
]);

/** Meaningful words of a title. */
function words(text) {
  return cleanTitle(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NOISE.has(w));
}

/** Meaningful words of a title, also returning the run-together form. */
function queryForms(title) {
  const forms = [title];
  // "AnsatsuKyoushits" is one token to a splitter and two words to
  // everyone who wrote it. Repeated until it settles, because one pass
  // leaves "GodOfWar" as "God OfWar", still run together.
  let split = String(title);
  for (let pass = 0; pass < 4; pass++) {
    const next = split
      .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
    if (next === split) break;
    split = next;
  }
  if (split !== title) forms.push(split);
  return forms;
}

/** Do two words refer to the same thing? */
function wordMatches(q, c) {
  if (q === c) return true;
  if (singular(q) === singular(c)) return true;
  // Romanisations abbreviate: "Baccan" for "Baccano!", so a longer word
  // may answer to a shorter one. The bar is deliberately high — at four
  // characters "Kaij" claimed "Kaiju No. 8", which is a different series.
  const shorter = q.length <= c.length ? q : c;
  const longer = q.length <= c.length ? c : q;
  if (shorter.length >= 5 && longer.startsWith(shorter)) return true;
  return false;
}

/**
 * Find the entry for a title.
 * @returns {object|null} the index entry plus the name that matched
 */
function find(title) {
  const list = load();
  if (!list.length) return null;

  const qYear = extractYear(title);

  // Every meaningful word of the query, taken across the variants.
  const variantWords = queryForms(title).map(words).filter((w) => w.length);
  if (!variantWords.length) return null;
  const qWords = variantWords.reduce((a, b) => (a.length >= b.length ? a : b));
  const qKey = baseKey(title);

  let best = null;

  for (const entry of list) {
    // Coverage is judged against the entry's whole set of names, not one
    // of them. An entry for Fire Force is called both "Fire Force" and
    // "Enen no Shouboutai", and a library folder holding
    // "Fire Force - Enen no Shouboutai" matches neither name alone but
    // plainly matches the entry.
    const allWords = new Set();
    for (const name of entry.titles) {
      for (const w of words(name)) allWords.add(w);
    }

    const covered = qWords.every((w) => [...allWords].some((c) => wordMatches(w, c)));
    const exactKey = qKey && entry.titles.some((n) => qKey === baseKey(n));

    // A one-word title has to BE one of the entry's names, not merely
    // appear inside one. "Hanayome" means "bride" and turns up inside
    // the name of an arc of an unrelated series; matching on the word
    // alone attached a whole show to a folder called "Hanayome".
    if (qWords.length === 1 && !exactKey) continue;

    if (!covered && !exactKey) continue;

    // Coverage across the whole name set is necessary but not enough on
    // its own: it lets an entry pick up one word here and another there
    // and claim the title. "3 Gatsuno Lion" then matched an unrelated
    // show that happened to have a "3" and a "lion" somewhere in its
    // name list. So half the words have to line up within one name —
    // which is what an entry for Fire Force, called both "Fire Force"
    // and "Enen no Shouboutai", still satisfies.
    let singleBest = 0;
    for (const name of entry.titles) {
      const cWords = words(name);
      if (!cWords.length) continue;
      const hit = qWords.filter((w) => cWords.some((c) => wordMatches(w, c))).length;
      singleBest = Math.max(singleBest, hit / qWords.length);
    }
    if (singleBest < 0.5 && !exactKey) continue;

    let score = 0;
    let bestName = entry.titles[0];
    for (const name of entry.titles) {
      for (const form of queryForms(title)) {
        const s = similarity(form, name, qYear, entry.seasonYear);
        if (s > score) {
          score = s;
          bestName = name;
        }
      }
    }
    // A series people write several names for is a series that will be
    // called by more than one of them in the library.
    score = Math.max(score, Math.min(0.9, 0.6 + 0.05 * entry.titles.length));
    if (exactKey) score = Math.max(score, 0.95);

    if (qYear && entry.seasonYear) {
      score += Math.abs(entry.seasonYear - qYear) <= 1 ? 0.05 : -0.3;
    }

    if (score < FLOOR) continue;

    // A shelf of series should hold the series, not one of its films.
    // An entry like "Assassination Classroom the Movie" carries the
    // franchise's names as synonyms and matches just as well, so the
    // television run is preferred when both are in reach.
    const rank =
      score + (entry.format === "TV" ? 0.08 : 0) + Math.min(0.04, (entry.episodes || 0) / 1000);

    if (!best || rank > best.rank) best = { entry, name: bestName, score, rank };
  }

  return best;
}

function singular(word) {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Shape a match into the details record the page renders. */
function toDetails(entry, match, libraryTitle) {
  const genres = (entry.genres || []).slice(0, 5);

  return {
    title: libraryTitle,
    canonicalTitle: entry.titles[1] || entry.titles[0],
    type: "anime",
    episodes: entry.episodes || null,
    duration: entry.duration || null,
    status: entry.status || null,
    studios: entry.studios && entry.studios.length ? entry.studios : null,
    creators: entry.studios && entry.studios.length ? entry.studios.join(", ") : null,
    releaseDate: entry.startDate
      ? `${entry.startDate.year}-${String(entry.startDate.month || 1).padStart(2, "0")}-${String(
          entry.startDate.day || 1,
        ).padStart(2, "0")}`
      : entry.seasonYear
        ? `${entry.seasonYear}-01-01`
        : null,
    genres: genres.length ? genres : null,
    summaryAr: null,
    // AniList descriptions are written with a "SPOILER:" marker in
    // places, and the page shows a spoiler-free summary only.
    summaryEn: entry.description ? trimSpoilers(entry.description, 420) : null,
    links: [{ label: "AniList", url: entry.siteUrl || `https://anilist.co/anime/${entry.id}` }],
    confidence: match.score >= 0.85 ? "high" : "medium",
    source: "anilist-index",
  };
}

/** Resolve a title against the index. */
function resolve(title) {
  const match = find(title);
  if (!match) return null;
  return toDetails(match.entry, match, title);
}

module.exports = { resolve, find, load, toDetails, INDEX };