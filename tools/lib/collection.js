"use strict";
// Provider for bundled titles: "Harry Potter collection", "300 1+2",
// "Fast & Furious 1+2 + 3".
//
// These are library shelves that hold several entries of one franchise,
// so a single-film lookup finds the first movie or nothing at all. The
// right page is the franchise's *series* article, which lists the parts
// and describes the run as a whole — exactly what a reader picking
// this shelf wants to know.
//
// The record keeps the parts named in the library title, so "300 1+2"
// shows that it holds the two films rather than implying all of them.

const { getJson } = require("./http");
const { cleanTitle, similarity, coversAllTokens, baseKey } = require("./match");
const wikipedia = require("./wikipedia");

/**
 * Are these two names the same thing spelled differently?
 *
 * Library titles misspell franchise names often enough ("Harry poter",
 * "Poter", "Nemo") that strict token matching rejects the right
 * article. Levenshtein distance catches the case where the candidate
 * has the same words in the same order but a letter differs.
 */
function nearMiss(a, b, tolerance = 2) {
  const x = baseKey(a).replace(/\s/g, "");
  const y = baseKey(b).replace(/\s/g, "");
  if (!x || !y) return false;
  if (Math.abs(x.length - y.length) > tolerance) return false;
  return levenshtein(x, y) <= tolerance;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

const FLOOR = 0.7;

/**
 * Does this library title name a bundle?
 * Kept deliberately broad: false positives cost a slightly richer page,
 * while false negatives leave the item blank.
 */
function isBundle(title) {
  const t = String(title || "");
  return (
    /\d\s*\+\s*\d/.test(t) || // "1+2", "1+2 + 3"
    /\bcollection\b/i.test(t) ||
    /\b(?:trilogy|quadrilogy|saga|series|box\s*set|omnibus|anthology)\b/i.test(t) ||
    /\bcollection_?\d*\b/i.test(t)
  );
}

/**
 * Reduce a bundle title to the franchise name.
 *
 *   "Fantastic Beasts 1+2 + 3" -> "Fantastic Beasts"
 *   "Harry poter collection"    -> "Harry poter"
 *   "Home Alone Collection Bluray" -> "Home Alone"
 */
function baseOf(title) {
  return cleanTitle(
    String(title || "")
      // "1+2", "1+2 + 3", "+3"
      .replace(/(\s*\d)?\s*\+\s*\d(\s*\+\s*\d)*/g, " ")
      // trailing series words
      .replace(/\b(collection|complete\s*collection|trilogy|quadrilogy|box\s*set|omnibus|anthology|bluray|blu-?ray|hd|remastered|the\s+complete\s+series)\b/gi, " ")
      // stray list numbering that is not part of the name
      .replace(/\b(?:part|vol|volume)\s*\d+\b/gi, " "),
  );
}

/**
 * Resolve a bundle to its franchise article.
 * @returns {Promise<object|null>}
 */
async function resolve(title) {
  const base = baseOf(title);
  if (base.length < 2) return null;

  // Ask for the series article first; fall back to the plain name.
  const candidates = [];
  for (const term of [`${base} film series`, `${base} films`, `${base} series`, base]) {
    const hits = await searchWiki(term);
    for (const h of hits) {
      if (/^\s*(List|Index|Outline)\s+of/i.test(h.title)) continue;
      candidates.push({ ...h, term });
    }
    if (candidates.length) break;
  }

  // A misspelled base ("Harry poter") finds nothing, so search again
  // without the extra word and let nearMiss() do the checking.
  if (!candidates.length && base.length > 3) {
    for (const h of await searchWiki(base)) candidates.push({ ...h, term: base });
  }
  if (!candidates.length) return null;

  const scored = candidates
    .map((h) => ({
      ...h,
      score: similarity(base, stripSeriesSuffix(h.title), null, null),
      // Rank what a bundle actually wants: a series/franchise article,
      // and specifically the *film* one. A bare title like "Harry
      // Potter" is usually the novel series, which would describe the
      // wrong medium entirely.
      bonus: /\((?:film series|film franchise|franchise)\)$/i.test(h.title)
        ? 0.12
        : /\((?:series|novel series|literary series)\)$/i.test(h.title)
          ? -0.12
          : 0,
    }))
    .map((h) => ({ ...h, score: h.score + h.bonus }))
    .sort((a, b) => b.score - a.score);

  for (const cand of scored.slice(0, 4)) {
    // Correctness for a bundle comes from the coverage test, not from
    // the similarity score. A misspelled base ("Harry poter") scores
    // ~0.5 against the right article while a near-miss check still
    // recognises it, so gating on the score first would throw away
    // exactly the matches this provider exists to rescue.
    const candBase = stripSeriesSuffix(cand.title);
    if (!coversAllTokens(base, candBase) && !nearMiss(base, candBase)) continue;
    if (cand.score < 0.3) break;

    const page = await leadExtract(cand.title);
    if (!page || !page.extract) continue;
    if (isFilmSeries(page.extract)) return toDetails(page, title, base, cand);

    // The best candidate was not a film series. Wikipedia usually keeps
    // the disambiguated article ("Harry Potter (film series)") out of a
    // misspelled search, so ask for it directly before giving up.
    for (const suffix of ["(film series)", "(franchise)", "(filmography)"]) {
      const alt = await leadExtract(`${candBase} ${suffix}`);
      if (alt && alt.extract && isFilmSeries(alt.extract)) {
        return toDetails(alt, title, base, { ...cand, title: `${candBase} ${suffix}` });
      }
    }
  }

  // No series article exists for this franchise ("300" only has
  // "300 (film)"), and some library titles are misspelled enough that
  // even the search misses. Fall back to the first entry's own article,
  // which still fills the page with something true and useful.
  const single = await wikipedia.resolve(base);
  if (!single) return null;

  const parts = describeParts(title);
  return {
    ...single,
    title,
    // Keep the collection framing the plain lookup would lose.
    series: single.canonicalTitle || base,
    extra: parts ? { note: parts } : single.extra || null,
    source: "wikipedia-collection",
  };
}

async function searchWiki(term) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&list=search" +
    `&srlimit=8&srsearch=${encodeURIComponent(term)}`;
  const json = await getJson(url);
  return ((json && json.query && json.query.search) || []).map((h) => ({ title: h.title, lang: "en" }));
}

async function leadExtract(pageTitle) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&inprop=url" +
    `&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(pageTitle)}`;
  const json = await getJson(url);
  const pages = json && json.query && json.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page && page.extract ? page : null;
}

/** "Harry Potter (film series)" -> "Harry Potter". */
function stripSeriesSuffix(title) {
  return String(title)
    .replace(/\s*\((?:film\s+series|television\s+series|film\s+franchise|franchise|series|filmography)\)\s*$/i, "")
    .trim();
}

/** Build the details record. */
function toDetails(page, libraryTitle, base, hit) {
  const parts = describeParts(libraryTitle);
  const type = /film series|series of films|film franchise/i.test(hit.title) ? "film series" : "series";

  return {
    title: libraryTitle,
    canonicalTitle: stripSeriesSuffix(hit.title),
    type,
    series: base,
    summaryAr: null,
    summaryEn: cleanSummary(page.extract),
    links: [
      {
        label: "Wikipedia",
        url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
      },
    ],
    confidence: hit.score >= 0.85 ? "high" : "medium",
    source: "wikipedia-collection",
    wikiTitle: hit.title,
    extra: parts ? { note: parts } : null,
  };
}

/**
 * Describe which parts the shelf holds, from the title itself:
 * "300 1+2" -> "يحتوي على الجزءين 1 و 2".
 */
function describeParts(title) {
  const t = String(title || "");
  const range = t.match(/(\d)\s*\+\s*(\d)(?:\s*\+\s*(\d))?/);
  if (range) {
    const nums = [range[1], range[2], range[3]].filter(Boolean);
    return `يحتوي على الأجزاء: ${nums.join("، ")}`;
  }
  if (/\bcollection\b/i.test(t)) return "مجموعة كاملة";
  return null;
}

/** Three sentences, cut on a boundary, so the plot stays unspoiled. */
function cleanSummary(text) {
  const sentences = String(text).split(/(?<=[.!?])\s+/).slice(0, 3).join(" ").trim();
  if (sentences.length <= 700) return sentences;
  const window = sentences.slice(0, 700);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  return (lastStop > 120 ? window.slice(0, lastStop + 1) : window).trim() + "…";
}

/**
 * True when a lead describes a run of films rather than one entry.
 *
 * The wording has to name films explicitly. A bare "franchise" is not
 * enough: video-game series articles use it too ("Resident Evil is a
 * media franchise..."), and a film collection must never resolve to a
 * game.
 */
function isFilmSeries(text) {
  return /\b(film series|series of films|film franchise|série de films|serie de pel[ií]culas)\b/i.test(
    String(text || "").slice(0, 400),
  );
}

module.exports = { resolve, isBundle, baseOf, isFilmSeries };