"use strict";
// Resolve library titles to SystemRequirementsLab pages.
//
// The site has no usable search, but its sitemap lists ~19,000 game
// pages whose slugs are readable ("grand-theft-auto-v"). Matching is
// therefore done against the slug, with two allowances the slugs need:
//
//   1. Abbreviations expanded — scene titles write "FF7" and "MW2"
//      where the store writes the full words.
//   2. Edition/booster words ignored — the library says
//      "Dying Light The Following EE" and the site says
//      "dying-light-the-following-enhanced-edition".
//
// Anything below the confidence floor is reported, never guessed.

const { cleanTitle, similarity, nearMiss } = require("./match");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const SITEMAP = "https://www.systemrequirementslab.com/sitemap.xml";

// A low sanity floor, not the main guard. Coverage (every title word
// present) plus numeral agreement is what proves the match; a strict
// similarity score would instead reject the correct page, because
// "the-witcher-3-wild-hunt" is a longer name than "witcher 3" and
// length-sensitive scoring punishes that.
const FLOOR = 0.15;

/** Abbreviations scene releases use for words in the name. */
/**
 * The title's words before any abbreviation is expanded.
 *
 * Used as a second spelling to accept against the site's slugs, since a
 * series may be catalogued under its abbreviated name or its full one.
 */
function rawSlugWords(title) {
  const ordinal = String(title || "").match(/\bpart\s*([0-9ivx]{1,4})\b/i);
  let s = cleanTitle(
    String(title || "").replace(/\bpart\s*[0-9ivx]{1,4}\b/i, " "),
  ).toLowerCase();
  if (ordinal) s += ` part ${ordinal[1].toLowerCase()}`;
  s = s.replace(EDITION_NOISE, " ");
  return s
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .filter(Boolean);
}

const ABBREVIATIONS = [
  // PES is the standard abbreviation of the series' full name, which is
  // how the specs site catalogues it. The numbering is deliberately left
  // alone: "PES 10" is the 2011 edition by community convention, and
  // translating that would be a guess rather than a name.
  [/\bpes\b/gi, "pro evolution soccer"],
  [/\bff\s*(\d{1,2})\b/gi, "final fantasy $1"],
  [/\bfi\b/gi, "fantasy islands"],
  [/\bwow\b/gi, "world of warcraft"],
  [/\bmw\s*(\d)\b/gi, "modern warfare $1"],
  [/\bbfs\b/gi, "battlefield"],
  [/\bghost\s+of\s+ts\b/gi, "ghost recon"],
  [/\bts\s*\d\b/gi, "tribes"],
  [/\bcc\b/gi, "crosshair"],
  [/\bnf\b/gi, "need for speed"],
  [/\bavp\b/gi, "alien versus predator"],
  [/\bdmc\b/gi, "devil may cry"],
  [/\bgo\b/gi, "gravity rush"],
  [/\bsot\b/gi, "shadow of the"],
  [/\bkt\b/gi, "killzone trilogy"],
  [/\bsackboy\b/gi, "sackboy"],
];

/** Words that identify a re-release rather than a different game. */
const EDITION_NOISE =
  /\b(ee|eevee|goty|game of the year|definitive|remastered?|enhanced|ultimate|complete|collection|deluxe|gold|premium|anniversary|classic|legacy|redux|hd|4k|remake|rebuilt|next gen|nextgen|final cut|director'?s cut|fe|se|standard|expanded|director|dlc|edition|version|update|patched|uber|extreme|final|definitive edition)\b/g;

/** Turn a library title into a comparable slug. */
function toSlug(title) {
  // A trailing "Part 2" identifies the entry, but cleanTitle drops it as
  // a file-name artefact ("12 Strong_1"). Save it and put it back.
  // The word is restored as two tokens so it normalises to "part-2" and
  // lines up with the site's slug.
  const ordinal = String(title || "").match(/\bpart\s*([0-9ivx]{1,4})\b/i);
  const ordinalToken = ordinal ? ` part ${ordinal[1].toLowerCase()}` : "";

  let s = cleanTitle(String(title || "").replace(/\bpart\s*[0-9ivx]{1,4}\b/i, " ")).toLowerCase();
  s += ordinalToken;

  for (const [re, rep] of ABBREVIATIONS) s = s.replace(re, rep);
  s = s.replace(EDITION_NOISE, " ");
  return s
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

/** The sitemap index, fetched once per process and cached on disk. */
let indexPromise = null;

async function buildIndex() {
  const bySlug = new Map();
  const slugs = [];

  const xml = await fetchText(SITEMAP);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => /\/requirements\//.test(u));

  for (const u of urls) {
    const tail = u.split("/requirements/")[1];
    if (!tail) continue;
    const slug = tail.replace(/\/\d+$/, "");
    if (!bySlug.has(slug)) bySlug.set(slug, u);
    slugs.push(slug);
  }
  return { bySlug, slugs };
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(90000),
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

async function getIndex() {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

/**
 * Words in a title that identify *which* entry it is.
 *
 * Numbers and roman numerals are included on purpose: "Witcher 3" and
 * "Metal Gear Solid V" are different games from their predecessors, and
 * dropping the numeral would let the first game answer for the third.
 */
const IDENTIFIER_WORDS = /^(?:\d+|[ivxlcdm]+)$/i;

/** A four-digit year. Never ignorable: FIFA 2013 is not FIFA 23. */
const YEAR_WORD = /^(?:19|20)\d{2}$/;

/** Words that make the numeral after them an ordinal, not a year. */
const ORDINAL_BEFORE = /^(?:part|volume|vol|chapter|episode|book|season|act|game|no)$/;

/**
 * What a year in the title may look like in the site's slug.
 *
 * Sports titles are catalogued by season, not by calendar year: "FIFA
 * 2013" is "fifa-13". Accepting either form lets the right page be found
 * while still refusing every other season.
 */
function yearForms(year) {
  return [year, year.slice(2)];
}

/**
 * Find the page for a library title.
 * @returns {Promise<{url:string, slug:string, score:number}|null>}
 */
async function resolve(title) {
  const { bySlug } = await getIndex();
  if (!bySlug.size) return null;

  const want = toSlug(title);
  if (!want) return null;

  // 1. Exact slug after normalisation — the common case.
  if (bySlug.has(want)) return { url: bySlug.get(want), slug: want, score: 1 };

  const wantWords = want.split("-").filter(Boolean);
  const idents = wantWords.filter((w) => IDENTIFIER_WORDS.test(w));

  // A year always identifies the entry. It may be spelled out ("fifa-2013")
  // or given as the season ("fifa-13"), so either form is accepted —
  // but no other season will do.
  // A year identifies the entry. It may be spelled out ("fifa-2013") or
  // given as the season the release was marketed under ("fifa-13"), so
  // hasNumeral() accepts either form.
  const yearIdents = idents.filter((w) => YEAR_WORD.test(w));

  // A numeral introduced by "part"/"episode"/... is an ordinal and is
  // always meaningful: "Deathly Hallows Part 1" is not Part 2.
  const ordinals = wantWords.filter(
    (w, i) => i > 0 && ORDINAL_BEFORE.test(wantWords[i - 1]) && IDENTIFIER_WORDS.test(w),
  );

  // A bare numeral is meaningful only if the site actually numbers that
  // series. Crysis is "crysis", "crysis-2", "crysis-3", so "Crysis 1"
  // means the base game and the "1" should be ignored. The Witcher is
  // "the-witcher", "the-witcher-2", "the-witcher-3", so "Witcher 3" must
  // not fall back to "the-witcher".
  // A bare numeral matters when it actually distinguishes entries of the
  // series, and is noise when the base entry already covers it.
  //
  //   Crysis 1  -> crysis, crysis-2, crysis-3. "1" names the base, so it
  //                is ignored and the plain "crysis" page is used.
  //   Witcher 3 -> the-witcher, the-witcher-2, the-witcher-3. Here the
  //                numerals do the distinguishing, so "3" is required.
  //   Fifa 26   -> fifa-13 … fifa-23, no bare "fifa". Two-digit numbering
  //                with no numeral-less base means "26" is the identity,
  //                so a site with no fifa-26 must refuse rather than
  //                answer with fifa-23.
  const bareIdents = idents.filter((w) => !YEAR_WORD.test(w) && !ordinals.includes(w));
  const meaningfulBare = bareIdents.filter((ident) =>
    seriesHasSlug(bySlug, wantWords, ident),
  );

  /**
   * Does the slug carry this numeral in an accepted form?
   *
   * A year may appear in full ("fifa-2013") or as the season the release
   * was marketed under ("fifa-13"), and a number may be written in
   * roman numerals ("Final Fantasy VII" is "ff7" in the library title).
   * The site uses each of these, so a numeral is matched by its value
   * rather than by its spelling.
   */
  const hasNumeral = (slug, numeral) => {
    const set = new Set(slug.split("-"));
    if (set.has(numeral)) return true;
    if (YEAR_WORD.test(numeral)) {
      return yearForms(numeral).some((f) => set.has(f));
    }
    const value = romanValue(numeral);
    if (value === null) return false;
    return [...set].some((w) => romanValue(w) === value);
  };

  // The site may spell a name either way: "PES 2021" is catalogued under
  // its old name ("pro-evolution-soccer-2021") and its new one
  // ("efootball-pes-2021"). Either form of the title is acceptable, so a
  // slug that covers one of them counts.
  const altWords = rawSlugWords(title);

  /** Does the slug contain every word of this spelling of the title? */
  const coveredBy = (candidate, slugWords) =>
    (candidate.length ? candidate : wantWords)
      .filter((w) => !IDENTIFIER_WORDS.test(w))
      .every((w) => slugWords.includes(w) || slugWords.some((c) => singular(w) === singular(c)));

  /**
   * The same test, tolerating exactly one misspelled word.
   *
   * Scene folder names carry typos that stop the lookup dead:
   * "silient hill f" never reaches silent-hill-f, and "mechwarior 5" never
   * reaches mechwarrior-5. Spelling them out one by one is a list with no
   * end; comparing words settles the whole class at once.
   *
   * Three limits keep it a typo tolerance rather than a fuzzy search:
   * one word may be wrong, the title must have another word to hold it in
   * place, and a match earned this way is ranked below every exact one.
   * Numerals are excluded from the test exactly as above — a wrong year
   * or season is never forgiven here, which is what keeps "FIFA 2013"
   * away from fifa-23 and "pes 10" away from a substitution.
   */
  const coveredByWithTypo = (candidate, slugWords) => {
    const words = (candidate.length ? candidate : wantWords).filter(
      (w) => !IDENTIFIER_WORDS.test(w),
    );
    if (words.length < 2) return false;

    let forgiven = 0;
    for (const w of words) {
      if (slugWords.includes(w) || slugWords.some((c) => singular(w) === singular(c))) continue;
      if (forgiven >= 1) return false;
      if (!slugWords.some((c) => nearMiss(w, c) <= 2)) return false;
      forgiven++;
    }
    return forgiven === 1;
  };

  let best = null;
  for (const slug of bySlug.keys()) {
    const words = slug.split("-");

    // Coverage: every non-numeral word of the title must appear in the
    // slug. Similarity alone is not enough — "gears-5" shares only a
    // generic word with "metal-gear-solid-v" and would otherwise win.
    const exactCoverage = coveredBy(wantWords, words) || coveredBy(altWords, words);
    const typoCoverage =
      !exactCoverage &&
      (coveredByWithTypo(wantWords, words) || coveredByWithTypo(altWords, words));
    if (!exactCoverage && !typoCoverage) continue;

    // Every numeral that identifies the entry must be present, in
    // whatever form the site uses.
    const required = [...yearIdents, ...ordinals, ...meaningfulBare];

    // A numeral above 1 that the site has no entry for is not noise, even
    // though the series has a numeral-less base. "Crysis 1" names the
    // first game, which is the base entry, so there the numeral really is
    // noise. But "Little Nightmares 3" is a different game from Little
    // Nightmares, and answering with the base page would publish another
    // game's requirements. Nothing here can tell 3 from a sequel marker,
    // so it refuses instead.
    for (const n of bareIdents) {
      if (meaningfulBare.includes(n)) continue;
      const value = Number(n);
      if (Number.isFinite(value) && value > 1 && !seriesHasSlug(bySlug, wantWords, n)) {
        required.push(n);
      }
    }

    if (required.length && !required.every((n) => hasNumeral(slug, n))) continue;

    // When the series is numbered and has no numeral-less base, a bare
    // numeral is part of the identity even if the site has no page for
    // it. "Fifa 26" belongs to fifa-13 … fifa-23; answering with fifa-23
    // would publish another game's requirements.
    if (
      bareIdents.length &&
      !hasNumeralLessBase(bySlug, wantWords) &&
      seriesNumbersLikeThis(bySlug, wantWords) &&
      !bareIdents.every((n) => hasNumeral(slug, n))
    ) {
      continue;
    }

    // The base game is named plainly; expansions carry "-dlc",
    // "-edition", "-soundtrack". A library entry for the game itself
    // wants the game, not its soundtrack pack.
    if (EXPANSION_WORDS.test(slug)) continue;

    // Coverage above already proved the slug is this game. The score
    // only ranks the survivors, so the floor is low: the correct slug is
    // often longer than the title ("the-witcher-3-wild-hunt-the-devils-
    // pit" for "Witcher 3") and a length-sensitive score punishes that.
    // Numerals are a filter, not a discriminator: the guards above have
    // already decided which entries are eligible, so they are left out
    // of the score. Including them compares "fifa 2013" with the slug
    // "fifa 13" and sinks the only correct answer.
    const keep = (list) =>
      list.filter((w) => !IDENTIFIER_WORDS.test(w) || ordinals.includes(w) || meaningfulBare.includes(w));
    const scoreWords = keep(wantWords).length ? keep(wantWords) : keep(altWords);
    const score = Math.max(
      similarity(scoreWords.join(" "), slug.replace(/-/g, " "), null, null),
      similarity(keep(altWords).join(" "), slug.replace(/-/g, " "), null, null),
    );
    if (score < FLOOR) continue;

    // Among survivors prefer the shortest slug: it names the game itself,
    // while its siblings carry the subtitle and the edition suffix.
    // A slug that matched only by forgiving a typo ranks below every
    // exact match, so it is used when nothing exact is on offer and never
    // in preference to a real match.
    const rank = score * 10 - words.length * 0.5 - (typoCoverage ? 4 : 0);
    if (!best || rank > best.rank) {
      best = { url: bySlug.get(slug), slug, score, rank };
    }
  }

  return best;
}

/**
 * Does any slug pair these title words with this numeral?
 *
 * The word test tolerates one misspelling, and it has to. This function
 * decides whether a bare numeral is part of the game's identity or just
 * noise, so if a typo stops it recognising the series, it answers "not a
 * numbered series", the numeral is then discarded as meaningless, and
 * the wrong entry is published: "Sniper Ghost Warior 3" reached
 * "sniper-ghost-warrior" and "call of duty black obs 6" reached
 * "call-of-duty-black-ops". A typo in a name must not be allowed to
 * delete the very number that distinguishes one game from another.
 */
function seriesHasSlug(bySlug, wantWords, ident) {
  const words = wantWords.filter((w) => !IDENTIFIER_WORDS.test(w));
  if (!words.length) return false;

  for (const slug of bySlug.keys()) {
    const parts = slug.split("-");
    const set = new Set(parts);

    const exact = words.every((w) => set.has(w));
    let ok = exact;
    if (!ok && words.length >= 2) {
      let forgiven = 0;
      ok = words.every((w) => {
        if (set.has(w)) return true;
        if (forgiven >= 1) return false;
        if (!parts.some((c) => nearMiss(w, c) <= 2)) return false;
        forgiven++;
        return true;
      });
      ok = ok && forgiven === 1;
    }
    if (!ok) continue;

    if (set.has(ident) || slugHasRoman(slug, ident)) return true;
  }
  return false;
}

/**
 * Is the series catalogued with a numeral-less base entry?
 *
 * Crysis is "crysis", "crysis-2", "crysis-3", so "Crysis 1" names the
 * base game and the "1" carries nothing. FIFA has no bare "fifa" page,
 * only fifa-13 … fifa-23.
 */
function hasNumeralLessBase(bySlug, wantWords) {
  const words = wantWords.filter((w) => !IDENTIFIER_WORDS.test(w));
  if (!words.length) return false;
  return [...bySlug.keys()].some((slug) => {
    const set = new Set(slug.split("-"));
    // Exactly the title's own words, no more. "fifa-world" is a spin-off,
    // not the unnumbered FIFA, and treating it as one would let "Fifa 26"
    // fall through to any fifa page.
    if (set.size !== words.length) return false;
    if (!words.every((w) => set.has(w))) return false;
    return ![...set].some((w) => IDENTIFIER_WORDS.test(w));
  });
}

/**
 * Does the series number its entries at all?
 *
 * FIFA is fifa-13 … fifa-23 and PES is pro-evolution-soccer-2011 …
 * 2019: neither has an unnumbered base, so the numeral in the title is
 * the only thing identifying the entry. When that numeral is not on the
 * site, answering with a neighbouring one would publish another game's
 * requirements — "pes 10" must not become "eFootball PES 2021".
 *
 * The numeral's shape is deliberately not compared: these series number
 * by year ("10" against "2011", "2019"), so a two-digit numeral must
 * still count.
 */
function seriesNumbersLikeThis(bySlug, wantWords) {
  const words = wantWords.filter((w) => !IDENTIFIER_WORDS.test(w));
  if (!words.length) return false;
  return [...bySlug.keys()].some((slug) => {
    const set = new Set(slug.split("-"));
    if (!words.every((w) => set.has(w))) return false;
    return [...set].some((w) => IDENTIFIER_WORDS.test(w));
  });
}

/** Suffixes that mark something other than the game itself. */
const EXPANSION_WORDS =
  /-(?:dlc|soundtrack|ost|theme|wallpaper|skin|avatar|pack|kit|mod|cheat|trainer|save|editor|bundle-compilation|playstation-?plus|xbox-?pass|game-?pass|season-?\d|episode-?\d|part-?\d)-|-(?:dlc|ost|soundtrack)$/;

/** Does the slug contain this numeral written as a roman numeral? */
function slugHasRoman(slug, ident) {
  if (!/^[ivxlcdm]+$/i.test(ident)) return false;
  return slug.split("-").some((w) => w.toLowerCase() === ident.toLowerCase());
}

const ROMAN_VALUES = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

/**
 * The value of a numeral, however it is written.
 *
 * "7" and "vii" are the same number, and the library and the site each
 * use their own form — "CRISIS CORE - FF7 - REUNION" is catalogued as
 * "crisis-core-final-fantasy-vii-reunion". Comparing by spelling would
 * refuse the correct page.
 *
 * @returns {number|null} null when the text is not a numeral
 */
function romanValue(text) {
  const raw = String(text || "").toLowerCase();
  if (/^\d+$/.test(raw)) return Number(raw);
  if (!/^[ivxlcdm]+$/.test(raw)) return null;

  let total = 0;
  for (let i = 0; i < raw.length; i++) {
    const value = ROMAN_VALUES[raw[i]];
    const next = i + 1 < raw.length ? ROMAN_VALUES[raw[i + 1]] : 0;
    // A smaller value before a larger one is subtracted: "iv" is 4.
    total += value < next ? -value : value;
  }
  return total || null;
}

/** Crude singular so "cops" and "cop" compare equal. */
function singular(word) {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * Map the site's own labels onto the fields item.js renders.
 *
 * The site uses several labels for the same thing ("CPU", "PROCESSOR",
 * "CPU SPEED") and adds hardware notes of its own ("PIXEL SHADER") that
 * have nowhere to go on the page. Unmapped labels are dropped rather
 * than shown under a wrong heading.
 */
const LABEL_MAP = {
  cpu: "cpu",
  processor: "cpu",
  "cpu speed": "cpu",
  ram: "ram",
  memory: "ram",
  "video card": "gpu",
  gpu: "gpu",
  graphics: "gpu",
  "video card(s)": "gpu",
  "dedicated video ram": "vram",
  vram: "vram",
  os: "os",
  "operating system": "os",
  "supported os": "os",
  "free disk space": "storage",
  storage: "storage",
  "disk space": "storage",
  directx: "directx",
  "sound card": null,
};

/**
 * Parse the requirements out of a page.
 *
 * The markup is regular: each preset is a heading followed by a
 * <ul> of "<li><strong>LABEL</strong>: value</li>". Reading the list
 * items directly is far more reliable than flattening the whole page to
 * text, where a stray "Minimum" elsewhere would split it wrongly.
 *
 * @returns {Promise<object|null>} { minimum, recommended, title, sourceUrl }
 */
async function parsePage(url) {
  const html = await fetchText(url);
  if (!html || html.length < 500) return null;

  // Each preset's block runs from its heading to the next heading of
  // the same kind, or to the end of the analysis section.
  const section = html.slice(html.search(/id="cyri-original-analysis"/) >= 0 ? html.search(/id="cyri-original-analysis"/) : 0);

  const blocks = splitPresets(section);
  const minimum = rowsFrom(blocks.minimum);
  const recommended = rowsFrom(blocks.recommended);

  if (!Object.keys(minimum).length && !Object.keys(recommended).length) return null;

  const titleMatch =
    /<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i.exec(html) ||
    /<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(html);
  const title = titleMatch
    ? // Strip the site's own suffix: "X System Requirements".
      titleMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s*(?:System Requirements|Can I Run.*|)\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
    : null;

  return { minimum, recommended, title, sourceUrl: url };
}

/** Slice the analysis section into its minimum and recommended blocks. */
function splitPresets(section) {
  const minRe = /System Requirements\s*\(Minimum\)|>\s*Minimum\s*Requirements/i;
  const recRe = /Recommended\s*(?:Computer\s*)?Requirements/i;

  const minAt = section.search(minRe);
  const recAt = section.search(recRe);
  const endAt = section.search(/Latest Graphic Cards|Online games|id="cyri-related/i);

  const out = { minimum: "", recommended: "" };

  if (minAt >= 0) {
    // The minimum block ends where the recommended heading starts.
    const to = recAt > minAt ? recAt : endAt > minAt ? endAt : section.length;
    out.minimum = section.slice(minAt, to);
  }
  if (recAt >= 0) {
    const to = endAt > recAt ? endAt : section.length;
    out.recommended = section.slice(recAt, to);
  }
  return out;
}

/** Pull "<strong>LABEL</strong>: value" pairs out of a block. */
function rowsFrom(block) {
  const out = {};
  if (!block) return out;

  const re = /<li>\s*(?:<[^>]+>\s*)*<strong>([^<]{2,40})<\/strong>\s*:\s*([\s\S]{1,300}?)(?=<li>|<\/ul>)/gi;
  let m;
  while ((m = re.exec(block))) {
    const rawLabel = m[1].trim().toLowerCase();
    if (!(rawLabel in LABEL_MAP)) continue;
    const field = LABEL_MAP[rawLabel];
    if (!field) continue; // deliberately dropped

    const value = clean(m[2]);
    if (!value) continue;
    // The site publishes a "CPU SPEED: Info" row as a placeholder.
    // It carries no information and would read as a second processor.
    if (/^info$/i.test(value)) continue;
    out[field] = out[field] ? `${out[field]} / ${value}` : value;
  }
  return out;
}

function clean(text) {
  return decodeEntities(
    String(text)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * Decode the HTML entities the site leaves in its text.
 *
 * The page heading comes back as "Assassin&#x27;s Creed Valhalla", which
 * no title lookup will ever match, so the entities have to be resolved
 * before the name is handed to another source.
 */
function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    hellip: "…",
    trade: "™",
    reg: "®",
  };

  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : m;
    });
}

function safeFromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

module.exports = {
  resolve,
  parsePage,
  toSlug,
  getIndex,
  fetchText,
  decodeEntities,
  romanValue,
};