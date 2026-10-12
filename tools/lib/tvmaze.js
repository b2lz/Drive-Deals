"use strict";
// TVMaze provider for television series.
//
// TVMaze gives structured series data — premiered date, status, genre,
// network, and crucially the episode run — that Wikipedia's prose lead
// does not. Its synopsis is written for a catalogue and is
// spoiler-free. Used as the primary source for the *-series
// categories, with Wikipedia as the fallback for films.

const { getJson } = require("./http");
const { cleanTitle, similarity, extractYear } = require("./match");

/** Search TVMaze for a show. */
async function searchShow(title) {
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanTitle(title))}`;
  const json = await getJson(url);
  return (json || []).map((r) => r.show);
}

/** Fetch a full show record (TVMaze's search result is already full). */
async function getShow(id) {
  const json = await getJson(`https://api.tvmaze.com/shows/${id}`);
  return json || null;
}

const STATUS_AR = {
  running: "يعرض حالياً",
  ended: "انتهى",
  "in production": "قيد الإنتاج",
  planned: "مخطط له",
  unknown: "غير معروف",
};

const TYPE_AR = {
  Scripted: "درامي",
  Reality: "واقعي",
  Documentary: "وثائقي",
  Miniseries: "مصغّرة",
  "Talk Show": "حواري",
};

/**
 * Resolve a library title to a TVMaze show.
 * @returns {Promise<object|null>}
 */
async function resolve(title) {
  const shows = await searchShow(title);
  if (!shows.length) return null;

  const qYear = extractYear(title);
  let best = null;

  for (const show of shows) {
    const year = show.premiered ? parseInt(String(show.premiered).slice(0, 4), 10) : null;
    let score = similarity(title, show.name, qYear, Number.isNaN(year) ? null : year);
    // TVMaze's own relevance is a useful tiebreak: when several titles
    // score identically (a show and its remake/adaptation), the one the
    // API ranked highest for this exact query is the intended one.
    const rank = shows.indexOf(show);
    score -= rank * 0.005;
    if (!best || score > best.score) best = { show, score };
  }

  if (!best || best.score < 0.72) return null;

  // Search hits can be a character/spinoff stub; a real show record has
  // either a network or episodes.
  return toDetails(best.show, title, best.score);
}

/** Build the details record. */
function toDetails(show, libraryTitle, score) {
  const genres = (show.genres || []).map((g) => g.toLowerCase()).map(genreAr).filter(Boolean);

  const facts = [];
  if (show.type && TYPE_AR[show.type]) facts.push(TYPE_AR[show.type]);
  if (show.status && STATUS_AR[String(show.status).toLowerCase()]) {
    facts.push(STATUS_AR[String(show.status).toLowerCase()]);
  }
  if (show.averageRuntime) facts.push(`${show.averageRuntime} دقيقة للحلقة`);
  if (show.officialSite) facts.push("موقع رسمي متاح");

  const links = [];
  if (show.officialSite) links.push({ label: "الموقع الرسمي", url: show.officialSite });
  if (show.url) links.push({ label: "TVMaze", url: show.url });

  const network =
    (show.network && show.network.name) ||
    (show.webChannel && show.webChannel.name) ||
    null;

  return {
    title: libraryTitle,
    canonicalTitle: show.name,
    type: "series",
    releaseDate: show.premiered ? String(show.premiered).slice(0, 10) : null,
    genres: genres.length ? genres : null,
    networks: network ? [network] : null,
    studio: show.network && show.network.name ? show.network.name : null,
    duration: show.averageRuntime ? `${show.averageRuntime} دقيقة للحلقة` : null,
    summaryAr: null,
    summaryEn: cleanSummary(show.summary),
    links,
    confidence: score >= 0.85 ? "high" : "medium",
    source: "tvmaze",
    tvmazeId: show.id,
    extra: facts.length ? { note: facts.join(" • ") } : null,
  };
}

const GENRE_AR = {
  drama: "دراما",
  comedy: "كوميديا",
  mystery: "غموض",
  crime: "جريمة",
  "action & adventure": "أكشن ومغامرة",
  action: "أكشن",
  adventure: "مغامرة",
  "sci-fi & fantasy": "خيال علمي وفانتازيا",
  fantasy: "فانتازيا",
  "science-fiction": "خيال علمي",
  romance: "رومانسي",
  thriller: "إثارة",
  horror: "رعب",
  animation: "رسوم متحركة",
  kids: "أطفال",
  documentary: "وثائقي",
  war: "حرب",
  western: "ويسترن",
  family: "عائلي",
  reality: "واقعي",
  news: "أخبار",
  sports: "رياضات",
  soap: "soap",
  talk: "حواري",
};

function genreAr(g) {
  return GENRE_AR[g] || null;
}

/**
 * TVMaze summaries come from the network and occasionally leak an
 * outcome. Trimming to the opening sentences and dropping a trailing
 * "…" keeps it to the premise.
 */
function cleanSummary(text) {
  if (!text) return null;
  let s = String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Cut anything after an explicit spoiler marker, if any.
  s = s.split(/\b(?:spoiler| spoilers)\b\s*[:—-]/i)[0].trim();
  const sentences = s.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ").trim();
  return sentences || null;
}

module.exports = { resolve, searchShow };