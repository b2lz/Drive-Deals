"use strict";
// AniList provider for the anime category.
//
// AniList is the best free structured source for anime: it has native
// titles, start dates, episode counts, studios, genres and a synopsis.
// Its synopsis occasionally spoils late plot beats, so the text is
// trimmed to the opening paragraph and the explicit "spoiler" section
// of the description is dropped — AniList separates it with an
// "SPOILER:" marker that we cut at.
//
// One GraphQL request returns everything, including per-title aliases,
// which doubles as the candidate list for matching.

const { postJson } = require("./http");
const { cleanTitle, similarity, extractYear, ANIME_NOISE } = require("./match");

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME) {
      id
      siteUrl
      title { romaji english native }
      synonyms
      startDate { year month day }
      endDate { year month day }
      format
      status
      episodes
      duration
      genres
      averageScore
      popularity
      isAdult
      description(asHtml: false)
      studios { nodes { name isAnimationStudio } }
      siteUrl
    }
  }
}`;

/** Arabic labels for AniList's genre names. */
const GENRE_AR = {
  Action: "أكشن",
  Adventure: "مغامرة",
  Comedy: "كوميديا",
  Drama: "دراما",
  Ecchi: "إيكشي",
  Fantasy: "فانتازيا",
  Horror: "رعب",
  "Mahou Shoujo": "خيال",
  Mecha: "ميكا",
  Music: "موسيقى",
  Mystery: "غموض",
  Psychological: "نفسي",
  Romance: "رومانسي",
  "Sci-Fi": "خيال علمي",
  "Slice of Life": "شريحة من الحياة",
  Sports: "رياضات",
  Supernatural: "خوارقي",
  Thriller: "إثارة",
};

const STATUS_AR = {
  FINISHED: "مكتمل",
  RELEASING: "يعرض حالياً",
  NOT_YET_RELEASED: "لم يُعرض بعد",
  CANCELLED: "ملغى",
  HIATUS: "متوقف مؤقتاً",
};

const FORMAT_AR = {
  TV: "مسلسل تلفزيوني",
  TV_SHORT: "تلفزيوني قصير",
  MOVIE: "فيلم",
  SPECIAL: "خاص",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "فيديو موسيقي",
};

/**
 * Search AniList and return the best-scoring entry for a library title.
 * @returns {Promise<object|null>}
 */
async function resolve(title) {
  const qYear = extractYear(title);

  // Anime folder names are often run together: "AnsatsuKyoushits",
  // "BlackClover", "ElfenLied", "DeathParade", "FairyTail". AniList
  // indexes the properly spaced titles, so the first query can miss
  // and a spaced retry rescues it.
  const terms = uniqueTerms([cleanTitle(title), splitCamel(cleanTitle(title))]);

  let best = null;
  let bestScore = 0;

  for (const term of terms) {
    const media = await search(term);
    if (!media.length) continue;

    for (const entry of media) {
      // Score against every title AniList knows for this show, plus its
      // synonyms — a library entry may use any of the romanisations.
      const aliases = [entry.title.romaji, entry.title.english, entry.title.native, ...(entry.synonyms || [])]
        .filter(Boolean)
        .map((t) => stripAnimeNoise(t));

      let score = 0;
      for (const alias of aliases) {
        const s = Math.max(
          similarity(title, alias, qYear, entry.startDate && entry.startDate.year),
          animeTokenSimilarity(title, alias),
          animeTokenSimilarity(term, alias),
        );
        if (s > score) score = s;
      }

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    // A confident hit is enough; no need to keep hammering the API.
    if (bestScore >= 0.85) break;
  }

  if (!best || bestScore < 0.7) return null;
  return toDetails(best, title, bestScore);
}

/** Run one GraphQL search, returning the media list. */
async function search(term) {
  const json = await postJson(ENDPOINT, { query: QUERY, variables: { search: term } });
  return (json && json.data && json.data.Page && json.data.Page.media) || [];
}

/**
 * Insert spaces at case boundaries in run-together words.
 *
 * "AnsatsuKyoushits" -> "Ansatsu Kyoushits", "BlackClover" ->
 * "Black Clover". A split is only made at a lower-to-upper transition
 * that is followed by a lowercase letter, which keeps acronyms intact
 * ("ID", "TV", "DNA") instead of shredding them into "I D".
 */
function splitCamel(text) {
  if (!text || !/[a-z][A-Z]/.test(text)) return text;
  const out = text
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])([A-Z][a-z]{2,})/g, "$1 $2");
  return out === text ? text : out;
}

/** De-duplicate a list of query terms, keeping order. */
function uniqueTerms(list) {
  return list.filter((t, i) => t && list.indexOf(t) === i);
}

/** Drop AniList-style suffixes so "Steins;Gate 0" matches "Steins Gate". */
function stripAnimeNoise(name) {
  return String(name)
    .replace(/\s*(?:TV|OVA|OAD|ONA|Movie|Film|Season\s*\d*)\s*$/i, "")
    .replace(/\s*[:：]\s*.*$/, "") // subtitle after a colon
    .trim();
}

/**
 * Token comparison that treats AniList's season suffixes as noise.
 * "Jujutsu Kaisen" vs "Jujutsu Kaisen Season 2" should match.
 */
function animeTokenSimilarity(a, b) {
  const noise = (s) =>
    String(s)
      .toLowerCase()
      .split(/[\s:;!?.\-–—]+/)
      .map((w) => w.trim())
      .filter((w) => w && !ANIME_NOISE.has(w) && !/^\d+$/.test(w));
  const ta = noise(a);
  const tb = noise(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  const hits = ta.filter((w) => setB.has(w)).length;
  return (2 * hits) / (ta.length + tb.length);
}

/** Build the details record. */
function toDetails(entry, libraryTitle, score) {
  const genres = (entry.genres || [])
    .map((g) => GENRE_AR[g])
    .filter(Boolean);

  const studios = (entry.studios && entry.studios.nodes ? entry.studios.nodes : [])
    .map((s) => s.name)
    .filter(Boolean);

  const start = entry.startDate || {};
  const releaseDate =
    start.year ? `${start.year}-${pad(start.month)}-${pad(start.day)}` : start.year ? String(start.year) : null;

  const facts = [];
  if (entry.format && FORMAT_AR[entry.format]) facts.push(FORMAT_AR[entry.format]);
  if (entry.episodes) facts.push(`${entry.episodes} حلقة`);
  if (entry.duration) facts.push(`${entry.duration} دقيقة للحلقة`);
  if (entry.status && STATUS_AR[entry.status]) facts.push(STATUS_AR[entry.status]);
  if (entry.averageScore) facts.push(`تقييم ${Math.round(entry.averageScore / 10)}/100`);

  return {
    title: libraryTitle,
    canonicalTitle: entry.title.english || entry.title.romaji || entry.title.native,
    type: "anime",
    studio: studios[0] || null,
    studios: studios.length ? studios : null,
    releaseDate,
    genres: genres.length ? genres : null,
    episodes: entry.episodes || null,
    duration: entry.duration ? `${entry.duration} دقيقة` : null,
    rating: entry.averageScore ? `${Math.round(entry.averageScore / 10)}/100` : null,
    summaryAr: null,
    summaryEn: trimSpoilers(entry.description),
    status: entry.status || null,
    links: entry.siteUrl ? [{ label: "AniList", url: entry.siteUrl }] : [],
    confidence: score >= 0.85 ? "high" : "medium",
    source: "anilist",
    anilistId: entry.id,
    extra: facts.length ? { note: facts.join(" • ") } : null,
  };
}

/**
 * AniList puts plot spoilers after a "SPOILER:" marker inside the
 * description. Cutting there keeps the visible text spoiler-free.
 *
 * The remainder is also capped: AniList synopses run to several
 * paragraphs, and the detail page shows a summary, not a synopsis.
 * The cap lands on a sentence boundary so the text never stops
 * mid-clause.
 */
function trimSpoilers(desc, maxChars = 420) {
  if (!desc) return null;
  const cut = String(desc).split(/\n\s*SPOILER:/i)[0].trim();
  const clean = cut
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  if (clean.length <= maxChars) return clean;

  // Cut at the last sentence end before the cap.
  const window = clean.slice(0, maxChars);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  const cut2 = lastStop > 80 ? window.slice(0, lastStop + 1) : window;
  return cut2.trim() + "…";
}

function pad(n) {
  return String(n || 1).padStart(2, "0");
}

module.exports = { resolve, trimSpoilers };