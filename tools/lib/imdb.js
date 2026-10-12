"use strict";
// IMDb provider, over a local index built by tools/build-imdb-index.js.
//
// IMDb publishes its whole catalogue as free TSV files with no key. That
// matters for the shelves nothing else reaches: Turkish historical dramas
// with no Wikipedia article, and films whose only name is an Arabic
// transliteration. The `title.akas` file is the important part — it holds
// every title a work has in every region, so "زمن الخيانة" can be found
// under its Turkish original.
//
// It supplies metadata, not prose: canonical title, year, runtime,
// genres, and alternate titles. There is no plot in the public datasets,
// so the summary still comes from an article where one exists, and where
// none does the page says so rather than inventing one.

const fs = require("fs");
const path = require("path");

const { baseKey, extractYear } = require("./match");

const INDEX = path.resolve(__dirname, "..", "..", ".cache", "imdb-index.json");

/** Below this, nothing is attached. */
const FLOOR = 0.72;

/**
 * Which IMDb title types a shelf will accept.
 *
 * The type check is the main guard here. IMDb lists every episode of a
 * series separately, so a bare title like "Omar" matches a 1968 TV
 * episode as readily as the 2012 series, and half the catalogue is
 * episodes. Without this a shelf of series fills up with single episodes.
 */
const ACCEPTED = {
  film: new Set(["movie", "tvMovie", "video", "short"]),
  series: new Set(["tvSeries", "tvMiniSeries"]),
};

let entries = null;

function load() {
  if (entries) return entries;
  try {
    entries = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  } catch {
    entries = [];
  }
  return entries;
}

/** Words of a title, ignoring punctuation and the file noise around it. */
function words(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Release noise that sits in a folder name but not in a real title. */
const NOISE = /\s*[\[(](?:19|20)\d{2}[\])]|\b(?:19|20)\d{2}\b|\b(?:720|1080|480)[pi]?\b|\[[^\]]*\]/g;

function cleanForCompare(title) {
  return String(title || "")
    .replace(/[._]+/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The script a title is written in, coarse but enough to separate them. */
function scriptOf(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "arabic";
  if (/[\u0400-\u04FF]/.test(text)) return "cyrillic";
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "cjk";
  if (/[\u0900-\u097F]/.test(text)) return "devanagari";
  return "latin";
}

/** Every name IMDb knows for an entry. */
function namesOf(entry) {
  return [entry.primaryTitle, entry.originalTitle, ...(entry.aka || []).map((a) => a.title)].filter(
    Boolean,
  );
}

/**
 * Resolve a library title against the index.
 *
 * @param {string} title   the folder name
 * @param {object} [options]
 * @param {string} [options.medium]  "film" or "series"
 * @returns {object|null} a details fragment, or null
 */
function resolve(title, options = {}) {
  const list = load();
  if (!list.length) return null;

  const query = cleanForCompare(title);
  if (!query) return null;

  const qWords = words(query);
  if (!qWords.length) return null;

  const qYear = extractYear(title);
  const qKey = baseKey(query);
  const allowed = options.medium ? ACCEPTED[options.medium] : null;

  let best = null;
  const exactMatches = [];

  for (const entry of list) {
    if (allowed && !allowed.has(entry.titleType)) continue;
    // An entry kept only because one of its regional titles was seen is a
    // partial record with no catalogue data, and cannot be judged.
    if (entry.partial || !entry.primaryTitle) continue;

    const all = namesOf(entry);

    // The match has to be on a title the work is actually known by — its
    // primary or original name — or on a regional title in the same
    // script as the folder.
    //
    // Matching on any regional title is too loose: IMDb records incidental
    // labels, and a folder called "Carter" then matches an unrelated film
    // that happens to carry "Carter" as one of its regional titles, which
    // is how "Carter" came to resolve to "Kateo" (2022). The same
    // constraint is what lets a folder named in Arabic reach a work filed
    // in Turkish, because those two really are the same work's titles.
    const onRealTitle = [entry.primaryTitle, entry.originalTitle]
      .filter(Boolean)
      .some((n) => baseKey(cleanForCompare(n)) === qKey);
    const onSameScriptAka = (entry.aka || []).some(
      (a) =>
        baseKey(cleanForCompare(a.title)) === qKey &&
        scriptOf(a.title) === scriptOf(query),
    );

    if (!onRealTitle && !onSameScriptAka) continue;

    // A one-word folder name is the hardest case, and IMDb's own data
    // shows it cannot be settled by popularity: ranking "Carter" by votes
    // picks a 2022 film whose original title is "Kateo" over the English
    // one, and picks the 1971 Hungarian "Szindbád" over "Sinbad". The
    // signal that separates them is the original title. A work known by a
    // different name in its own language is not what a bare English folder
    // name is referring to, so it is refused.
    //
    // "Klaus", "Hop" and "Us" survive this, because their original title
    // is the word in the folder.
    if (qWords.length === 1 && entry.originalTitle) {
      if (baseKey(cleanForCompare(entry.originalTitle)) !== qKey) continue;
    }

    // Years. A folder carrying a year must not land on a different year's
    // work, even when the names are identical.
    if (qYear && entry.startYear && Math.abs(entry.startYear - qYear) > 1) continue;

    exactMatches.push(entry);
  }

  if (!exactMatches.length) return null;

  // Several works carry the same name. IMDb holds a film called "Sing"
  // (1989), "Leo" (2000), "Sinbad" (1936) and "Us" (1991); a shelf folder
  // named "Sing" holds the 2016 musical. Matching on the name alone picks
  // whichever the file happened to list first, which is a coin toss, so
  // the better-known work wins on vote count.
  //
  // Where even that is too close to call, the folder name is genuinely
  // ambiguous and nothing is attached. A wrong film is worse than no
  // film.
  exactMatches.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const top = exactMatches[0];
  const runnerUp = exactMatches[1];

  if (runnerUp && top.votes && runnerUp.votes) {
    // A clear leader: at least five times the votes of the next candidate.
    if (top.votes < runnerUp.votes * 5) {
      if (qWords.length <= 2) return null; // a short name carries no more signal
    }
  }

  best = { entry: top, score: 0.9 };

  const entry = best.entry;
  const aka = entry.aka || [];

  return {
    canonicalTitle: entry.originalTitle || entry.primaryTitle,
    releaseDate: entry.startYear ? String(entry.startYear) : null,
    duration: entry.runtimeMinutes ? `${entry.runtimeMinutes} دقيقة` : null,
    genres: entry.genres && entry.genres.length ? entry.genres : null,
    type: entry.titleType === "tvSeries" || entry.titleType === "tvMiniSeries" ? "series" : "film",
    runtimeMinutes: entry.runtimeMinutes || null,
    imdbId: entry.tconst,
    // The Turkish original and any Arabic listing are what justify the
    // folder-to-title mapping, so they are kept for the page to show.
    alternateTitles: aka
      .filter((a) => a.region === "TR" || a.language === "ar")
      .slice(0, 6)
      .map((a) => a.title),
    confidence: best.score >= 0.95 ? "high" : "medium",
  };
}

module.exports = { resolve, load, cleanForCompare, ACCEPTED, INDEX };