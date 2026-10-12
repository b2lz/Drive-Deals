"use strict";
// Steam provider: game facts + PC system requirements.
//
// Steam is the only free source that actually publishes minimum and
// recommended specs, so it is the backbone for the games category.
// Two calls per game:
//   1. /api/storesearch  -> candidate app ids for a cleaned title
//   2. /api/appdetails   -> full record for the chosen app id
//
// appdetails is requested twice, once with l=english and once with
// l=arabic, because Steam localises the *requirement labels* ("Minimum:"
// -> "الحد الأدنى:") but only sometimes localises the description. The
// merge prefers Arabic where it exists and falls back to English.

const { getJson } = require("./http");
const { cleanTitle, similarity, extractYear, isDlc } = require("./match");
const { parseRequirements } = require("./requirements");

/** Minimum similarity before we attach details to a library item. */
const FLOOR = 0.72;

const SEARCH = "https://store.steampowered.com/api/storesearch/";
const DETAILS = "https://store.steampowered.com/api/appdetails/";

/** Candidate app ids for a title, best guess first. */
async function search(title, limit = 10) {
  const term = cleanTitle(title);
  const url = `${SEARCH}?term=${encodeURIComponent(term)}&l=english&cc=US&count=${limit}`;
  const json = await getJson(url);
  const items = (json && json.items) || [];
  return items.map((it) => ({
    id: it.id,
    title: it.name,
  }));
}

/**
 * Resolve a library title to a Steam app id.
 *
 * Cost matters here: the games category has ~1100 entries and Steam
 * throttles hard. So this does NOT pull details for every search hit.
 * It ranks the hits on the title alone (free), then pays for at most
 * `VERIFY` detail fetches to learn the real release year and re-score.
 *
 * @returns {{appId:number, title:string, score:number}|null}
 */
const VERIFY = 3;

async function resolve(title) {
  // Steam's relevance is thrown off by a leading article the store
  // title does not carry: "A Total War Rome 2" returns only Total War
  // campaign packs, while "Total War Rome 2" returns the base game.
  // So try the full title, then progressively drop leading articles.
  const attempts = [cleanTitle(title)];
  const withoutArticle = cleanTitle(title).replace(/^(?:a|an|the)\s+/i, "");
  if (withoutArticle && withoutArticle !== attempts[0]) attempts.push(withoutArticle);

  let candidates = [];
  for (const term of attempts) {
    const found = (await search(term)).filter((c) => !isDlc(c.title));
    if (found.length) {
      candidates = found;
      break;
    }
  }
  if (!candidates.length) return null;

  const qYear = extractYear(title);

  // An exact name match wins outright — no need to spend detail
  // requests confirming it. This is the common case for a well-named
  // library, and it saves two API calls per game.
  const exactKey = cleanTitle(title).toLowerCase();
  const exact = candidates.find((c) => cleanTitle(c.title).toLowerCase() === exactKey);
  if (exact) return { appId: exact.id, title: exact.title, score: 1 };

  // Cheap first pass, on titles only.
  const prelim = candidates
    .map((c) => ({ ...c, score: similarity(title, c.title, qYear, null) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, VERIFY);

  if (!prelim.length || prelim[0].score < 0.4) return null;

  // Second pass: the release year can flip a decision ("Blade Runner
  // 2049" vs the 1982 original), so confirm the leaders only.
  let best = null;
  let bestScore = 0;
  for (const cand of prelim) {
    const rec = await appDetails(cand.id);
    if (!rec) continue;
    const en = rec.en || {};
    const year = en.release_date ? parseInt(en.release_date.date.slice(0, 4), 10) : null;
    const score = similarity(title, cand.title, qYear, Number.isNaN(year) ? null : year);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  if (!best || bestScore < FLOOR) return null;
  return { appId: best.id, title: best.title, score: bestScore };
}

/** Full app record for an app id, merged across English and Arabic. */
async function appDetails(appId) {
  const [en, ar] = await Promise.all([
    getJson(`${DETAILS}?appids=${appId}&l=english&cc=US`),
    getJson(`${DETAILS}?appids=${appId}&l=arabic&cc=US`),
  ]);
  const enData = en && en[appId] && en[appId].data ? en[appId].data : null;
  const arData = ar && ar[appId] && ar[appId].data ? ar[appId].data : null;
  if (!enData && !arData) return null;
  return { en: enData, ar: arData };
}

/**
 * Turn an app record into the shape details/*.json expects.
 * Returns null when the record has nothing usable.
 */
function toDetails(record, id, libraryTitle) {
  const en = record.en || record;
  const ar = record.ar || null;

  const name = en.name || (ar && ar.name) || null;
  if (!name) return null;

  const developers = (en.developers || []).filter(Boolean);
  const publishers = (en.publishers || []).filter(Boolean);

  // Fall back to the Arabic record's genres when the English one is
  // missing or untranslated.
  const rawGenres = (en.genres && en.genres.length ? en.genres : (ar && ar.genres) || [])
    .map((g) => (typeof g === "string" ? g : g && g.description))
    .filter(Boolean);
  const genres = rawGenres.map((g) => genreAr(g)).filter(Boolean);

  const platforms = [];
  const plats = en.platforms || {};
  if (plats.windows) platforms.push("PC");
  if (plats.mac) platforms.push("macOS");
  if (plats.linux) platforms.push("Linux");

  const modes = [];
  const catIds = new Set((en.categories || []).map((c) => c.id));
  // Steam category ids: 1 = multi-player, 2 = single-player.
  // (Steam's own labels read "Multi-player" and "Single-player".)
  if (catIds.has(2)) modes.push("لاعب واحد");
  if (catIds.has(1)) modes.push("لاعب متعدد");
  // Category 36 = VR.
  if (catIds.has(36)) modes.push("واقع افتراضي");

  const descAr = (ar && ar.short_description) || "";
  const descEn = en.short_description || "";
  const aboutAr = ar && ar.about_the_game ? String(ar.about_the_game).replace(/<[^>]+>/g, " ") : "";
  const aboutEn = en.about_the_game ? String(en.about_the_game).replace(/<[^>]+>/g, " ") : "";

  // Steam's short_description is often a bare marketing tag
  // ("Relive Half-Life."). When it is too thin to be a useful summary,
  // fall back to the opening of the longer "About This Game" text, which
  // is written as prose and describes the game without spoiling it.
  const needsMore = (s) => !s || s.length < 60;
  const summaryAr = needsMore(cleanHtml(descAr))
    ? firstSentence(cleanHtml(aboutAr))
    : cleanHtml(descAr);
  const summaryEnSource = needsMore(cleanHtml(descEn))
    ? cleanHtml(aboutEn)
    : cleanHtml(descEn);

  const requirements = buildRequirements(en, ar);

  return {
    title: libraryTitle,
    canonicalTitle: name,
    type: "game",
    developer: developers[0] || null,
    publisher: publishers[0] || null,
    releaseDate: toIsoDate(en.release_date && en.release_date.date),
    platforms: platforms.length ? platforms : null,
    genres: genres.length ? genres : null,
    modes: modes.length ? modes : null,
    engine: null,
    summaryAr: summaryAr || null,
    summaryEn: firstSentence(summaryEnSource) || null,
    requirements,
    // item.js renders Metacritic only from the "extra" block, so it has
    // to be nested there to be visible. The key is omitted entirely
    // rather than set to null: an empty key is still a key, and the
    // record validator flags keys the page does not read.
    extra: en.metacritic && en.metacritic.score != null
      ? { metacritic: `Metacritic ${en.metacritic.score}/100` }
      : null,
    links: [
      en.steam_appid ? { label: "Steam", url: `https://store.steampowered.com/app/${en.steam_appid}/` } : null,
      en.website || null,
    ].filter(Boolean),
    confidence: "high",
    source: "steam",
    steamAppId: en.steam_appid || null,
  };
}

/** Prefer Steam's own Arabic requirement text; fall back to English. */
function buildRequirements(en, ar) {
  const enPc = en.pc_requirements || {};
  const arPc = (ar && ar.pc_requirements) || {};
  return parseRequirements(enPc.minimum, enPc.recommended, arPc.minimum, arPc.recommended);
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Normalise a Steam release date to ISO (YYYY-MM-DD), which is what
 * item.js parses for its Arabic month names.
 *
 * Steam uses three shapes:
 *   "26 May, 2026"     (day first)
 *   "May 26, 2026"     (month first)
 *   "2026" / "Coming soon" / ""  (no usable date)
 */
function toIsoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || /coming soon/i.test(s)) return null;

  // Bare year.
  const yearOnly = s.match(/^(19|20)\d{2}$/);
  if (yearOnly) return s;

  const m = s.match(/([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s*((?:19|20)\d{2})/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month) return `${m[3]}-${pad(month)}-${pad(m[2])}`;
  }

  const d = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s*((?:19|20)\d{2})/);
  if (d) {
    const month = MONTHS[d[2].slice(0, 3).toLowerCase()];
    if (month) return `${d[3]}-${pad(month)}-${pad(d[1])}`;
  }

  // Already ISO-ish.
  const iso = s.match(/^((?:19|20)\d{2})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) return iso[1] + "-" + pad(iso[2]) + (iso[3] ? "-" + pad(iso[3]) : "");

  return null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function cleanHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Take the first one or two sentences of a long description. */
function firstSentence(text) {
  if (!text) return "";
  const parts = text.split(/(?<=[.!؟])\s+/);
  return parts.slice(0, 2).join(" ").trim();
}

/** Arabic genre labels for Steam's English genre ids. */
const GENRE_AR = {
  Action: "أكشن",
  Adventure: "مغامرة",
  "Role Playing": "تقمص أدوار",
  Simulation: "محاكاة",
  Strategy: "استراتيجية",
  "Massively Multiplayer": "MMO",
  Indie: "مستقلة",
  Casual: "كاجوال",
  Sports: "رياضات",
  Racing: "سباق",
  Fighting: "قتال",
  Puzzle: "ألغاز",
  Educational: "تعليمي",
  Music: "موسيقى",
  "Free to Play": "مجانية",
  "Early Access": "وصول مبكر",
  Party: "حفلات",
  "Board Game": "ألعاب الطاولة",
  Cards: "بطاقات",
  "First Person Shooter": "إطلاق نار من منظور أول",
  "Third Person Shooter": "إطلاق نار من منظور ثالث",
  "Massively Multiplayer Online": "MMO",
  "Roguelike": "روغلايك",
  "Auto Battler": "قتال آلي",
  "Tower Defense": "دفاع عن الأبراج",
  "Rhythm": "إيقاع",
  "Grand Strategy": "استراتيجية كبرى",
  "Turn-Based Strategy": "استراتيجية بالأدوار",
  "Roguelike and Roguelite": "روغلايك",
  "Adventure Racing": "سباق ومغامرة",
  "Card Game": "ألعاب بطاقات",
  "Character Creation": "خلق شخصيات",
};

// Steam sometimes abbreviates instead of spelling out ("RPG").
const GENRE_ABBREV = {
  RPG: "تقمص أدوار",
  RTS: "استراتيجية لحظية",
  FPS: "إطلاق نار من منظور أول",
  TPS: "إطلاق نار من منظور ثالث",
  MMO: "MMO",
  MOBA: "MOBA",
  Stealth: "تسلل",
  Sandbox: "عالم مفتوح حر",
  Survival: "بقاء",
  Horror: "رعب",
  Cyberpunk: "سايبربانك",
  Noir: "نوار",
};

function genreAr(desc) {
  if (!desc) return null;
  const key = String(desc).trim();
  return GENRE_AR[key] || GENRE_ABBREV[key] || null;
}

module.exports = { search, resolve, appDetails, toDetails };