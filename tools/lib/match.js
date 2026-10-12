"use strict";
// Turning messy library titles into searchable queries, and judging
// whether an API hit is really the same title.
//
// The library titles came out of filenames, so they carry a lot of junk:
//   "3 Idiots (2009)  [720p]"      -> year + resolution tags
//   "Bargain 720p_1"               -> resolution + duplicate marker
//   "Baazigar [1993].[1080p]"      -> dotted brackets
//   "Monsters At Work    [ENGLISH]"-> language tags
//   "12 Strong_1"                  -> part suffix from a file name
//
// Bad matches are worse than no match at all: putting "GTA V" details on
// the page for some other game is exactly the kind of error users can't
// see and can't ignore, so anything below the confidence floor is dropped
// and reported for manual review instead.

// Release years are stripped before searching, but we keep them here to
// cross-check an API result that reports its own year.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "for", "with",
  "game", "full", "version", "edition", "complete", "hd", "hq", "bluray",
  "blu", "ray", "dvdrip", "webrip", "web", "rip", "x264", "x265", "hevc",
  "avc", "aac", "ac3", "dts", "multi", "dual", "sub", "dubbed", "it-eng",
  "en", "ar", "eng", "arabic", "english", "french", "german", "spanish",
  "hindi", "turkish", "korean", "japanese", "1080p", "720p", "480p", "2160p",
  "4k", "uhd", "hdts", "cam", "ts", "tc", "r5", "remux", "internal",
  "limited", "unrated", "proper", "repack", "fitgirl", "elamigos", "reloaded",
  "codex", "plaza", "skidrow", "razor1911", "gog", "steam", "epic",
  "collection", "trilogy", "pack", "movies", "film", "series", "season",
  "complete", "dub", "part", "vol", "volume", "hdrip", "blurayrip", "amzn",
  "nf", "netflix", "hulu", "disney", "pc", "ps3", "ps4", "ps5", "xbox",
  "one", "series x", "switch", "mobile", "android", "ios", "pcgame", "v1",
  "plus", "and", "vs",
]);

/**
 * Roman numerals -> Arabic digits.
 *
 * Store listings spell sequels as numerals ("Total War: ROME II",
 * "Final Fantasy VII") while scene file names use digits ("Rome 2",
 * "FF7"). Both name the same entry, so this folds them together.
 */
const ROMAN_MAP = {
  ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8",
  ix: "9", x: "10", xi: "11", xii: "12", xiii: "13", xiv: "14",
  xv: "15", xvi: "16", xvii: "17", xviii: "18", xix: "19", xx: "20",
};

// AniList title noise words.
const ANIME_NOISE = new Set([
  "tv", "ova", "film", "movie", "season", "second", "third", "fourth",
  "1st", "2nd", "3rd", "4th", "5th", "final", "new", "the", "a", "an",
  "of", "and", "to", "in", "on", "for", "with", "season2", "alt",
]);

/**
 * Lowercase, strip punctuation/accents, collapse whitespace.
 *
 * Latin accents are decomposed and removed so "Amélie" == "Amelie".
 * Turkish is special-cased because scene titles are written in ASCII:
 * "Çukur", "Ertuğrul" and "Diriliş: Ertuğrul" all have to match the
 * transliterated "cukur" / "Ertugrul" style used in the library. The
 * Turkish-specific letters decompose to base ASCII under NFKD except
 * for dotless/dotted i, which we fold explicitly.
 */
function baseKey(str) {
  const s = String(str || "").toLowerCase();
  // Arabic must NOT go through NFKD: normalising decomposes Arabic
  // letters into separate codepoints ("المصيد" becomes spaced-out
  // fragments), which destroys both matching and display. Only strip
  // Arabic diacritics/tatweel directly.
  const isArabic = /[\u0600-\u06FF]/.test(s);
  const cleaned = isArabic ? s : s.replace(/ı/g, "i").replace(/ğ/g, "g").normalize("NFKD");
  return cleaned
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // Arabic diacritics + tatweel
    // Arabic orthographic variants that do not change the word:
    // أ/إ/آ -> ا, ة -> ه, ى -> ي. Without this "الازرق" and "الأزرق"
    // are different strings, and half the Arabic library fails to match.
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064A")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .map((w) => (ROMAN_MAP[w] !== undefined ? ROMAN_MAP[w] : w))
    .join(" ");
}

/** Map standalone roman-numeral tokens onto digits; leave the rest alone. */
function normalizeNumerals(key) {
  if (!key) return key;
  return key
    .split(" ")
    .map((w) => (ROMAN_MAP[w] !== undefined ? ROMAN_MAP[w] : w))
    .join(" ");
}

/**
 * Light singularisation so "guardians" matches "guardian".
 * Deliberately conservative — only the endings that appear in media
 * titles, and never shortens a word below 4 characters.
 */
function singularize(word) {
  if (word.length < 5) return word;
  const rules = [
    [/ies$/, "y"], // movies -> movie
    [/ches$/, "ch"], // beaches -> beach
    [/shes$/, "sh"],
    [/sses$/, "ss"],
    [/xes$/, "x"],
    [/zes$/, "z"],
    [/ses$/, "s"], // series -> serie
    [/ves$/, "f"], // wolves -> wolf
    [/s$/, ""], // guys -> guy
  ];
  for (const [re, rep] of rules) {
    if (re.test(word)) {
      const out = word.replace(re, rep);
      if (out.length >= 4) return out;
    }
  }
  return word;
}

/** Pull the first plausible 4-digit year out of a title. */
function extractYear(title) {
  const m = String(title).match(/(?:^|[\s\[(._-])((?:18|19|20)\d{2})(?:[\s\])._,-]|$)/);
  return m ? Number(m[1]) : null;
}

/**
 * Clean a library title into a search query.
 * Keeps the result readable so the search engines still match.
 */
function cleanTitle(rawTitle) {
  let t = String(rawTitle || "");

  // Steam's trademark and symbol marks: "ACE COMBAT™ 7", "Portal™",
  // "FINAL FANTASY VII®". They break exact-name matching against the
  // library's plain-text titles.
  t = t.replace(/[\u2122\u00AE\u00A9\u203A\u2039\u2117]/g, " ");

  // Drop bracketed quality/language groups: (2021), [720p], [ENGLISH],
  // [1080p][x265] — keep the year out of the query too.
  t = t.replace(/[[(][^\])]*[\])]/g, " ");
  t = t.replace(/\[[^\]]*\]/g, " ");

  // File sizes, before anything can split the digits apart:
  //   "Alfred Hitchcock - Vertigo 2021  12.5GB_1"
  //   "Bayonetta  8.3GB_1"
  // A lookahead rather than `\b` after the unit: the duplicate marker
  // that follows ("_1") starts with an underscore, which counts as a
  // word character, so `\b` there never matches.
  t = t.replace(/\b\d+(?:\.\d+)?\s*(?:gb|tb|mb)(?![a-z])[._\d]*/gi, " ");

  // Scene tags: "Atomic Heart  {HV}".
  t = t.replace(/\{[a-z0-9]{1,6}\}/gi, " ");
  t = t.replace(/\s+[-–—]\s*$/g, " ");

  // Release-group and cracker tags that trail the title, with or without a
  // separator: "Crash Bandicoot N Sane Trilogy-CODEX", "Back.4.Blood-RUNE",
  // "Fallout new vegas ultimate edition.GOG", "GTA Trilogy - DE-BSE".
  t = t.replace(
    /[-_.\s]*(?:fitgirl|reloaded|elamigos|razor1911|codex|plaza|skidrow|3dm|gog|steamrip|kaos|rune|flt|devotion|tenoke|scene|repack|dodi|nox|empire|hoodlump|gamepass)\b/gi,
    " ",
  );

  // Season markers. Scene folders label them inconsistently ("Healer S01",
  // "Taxi Driver S1", "Defendant.S01. [2017]", "Revenge.of. Others.S01"),
  // and the store listings never carry them, so they stop every match.
  //
  // Only the numeric forms are stripped. "Dune Part Two" and
  // "Blade Runner Part II" name a specific release, and dropping the
  // part would turn them into the first film — the same mistake as
  // deleting "2049".
  t = t.replace(/\bs\s*0?\d{1,2}\b/gi, " ");
  t = t.replace(/\bseason\s*0?\d{1,2}\b/gi, " ");

  // Fan-translation / version tails: "Crusader Kings 3 the last Version",
// "Game v2.3", "Game (v1.04)". The version number itself is noise, but
// the words around it must go too.
  t = t.replace(/\b(?:the\s+)?(?:last\s+|new\s+|final\s+)?version\b\s*\d*/gi, " ");
  t = t.replace(/\bv\d+(?:\.\d+)*\b/gi, " ");

  // Resolution / codec tags even when they are not bracketed, which is
  // common: "Bargain 720p_1", "Dune 1080p x264", "Ghosted.2023.1080p.WEBRip.x264-RARBG".
  t = t.replace(/\d{3,4}[pi](?![a-z0-9])/gi, " ");
  t = t.replace(/\b(?:webrip|web-rip|webdl|web-dl|blurayrip|bdrip|brrip|hdrip|dvdrip|proper|repack)\b/gi, " ");
  t = t.replace(/\b[hx]\.?26[45]\b/gi, " ");
  t = t.replace(/\b(?:aac|ac3|dts|eac3|flac|opus)\b/gi, " ");
  t = t.replace(/[-_.]\s*(?:rarbg|rarbg\.[a-z]+|yts|yts\.ag|sample)$/gi, " ");

  // A "+" sequel/bundle marker becomes a word before anything else, so
  // later steps cannot mistake "300 1+2" for a duplicate marker.
  t = t.replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2");

  // Trailing duplicate markers from file names: "_1", " copy", " part 2".
  // A bare trailing number is NOT touched — "Blade Runner 2049", "1917"
  // and "300 1 plus 2" are real titles. Only a small trailing digit after
  // an explicit underscore/hyphen is treated as a duplicate marker.
  t = t.replace(/(?:[\s_-]+copy|[\s_-]+part\s*\d+|[_-]\d)$/i, " ");

  // Separators used instead of spaces.
  t = t.replace(/[._]+/g, " ");
  t = t.replace(/\\+/g, " ");

  // Digits glued to words are the norm in scene file names:
  // "91Days", "6Underground". Split them so tokens line up.
  //
  // The split is at a change of case, not at a change of character class.
  // Splitting on every digit-letter boundary tears apart the codes and
  // model numbers that titles are built from — "WWE 2K19" became
  // "WWE 2 K 19" and stopped matching the store title of the same name,
  // and "NBA 2K22", "MW2CR" and "F1 22" all failed the same way. A
  // capital followed by lower case is a word starting ("6Underground");
  // anything else is part of a code and is left alone.
  //
  // Ordinal suffixes stay glued: "1st", "22nd" are one token.
  t = t.replace(/(\p{L})(\d)(?=\p{Ll})/gu, "$1 $2");
  t = t.replace(/(\d)(?!(?:st|nd|rd|th)\b)(?=\p{Lu}\p{Ll})/gu, "$1 ");

  // A trailing number glued to the name is a sequel or an installment:
  // "ptototype2", "IGI2", "Doom3", "NHL20". The rule above needs a letter
  // after the digits to fire and so misses all of them.
  //
  // The lookbehind keeps "2K19" whole: a letter that directly follows a
  // digit is part of a model number ("2K19", "F1 22"), not the end of a
  // word, so nothing is split off it.
  t = t.replace(/(?<!\d)(\p{L})(\d{1,2})$/u, "$1 $2");

  // A dangling separator mid-title from a "-" in the name
  // ("A Plague Tale - Innocence") collapses to a space so the query
  // reaches Steam as natural words.
  t = t.replace(/\s+[-–—]\s+/g, " ");

  // Collapse whitespace and tidy punctuation.
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "");

  // Scene names sometimes leave an unbalanced bracket ("Big Stan (2007(")
  // that the well-formed pattern above cannot match. By this point the
  // separators are already normalised, so any bracket left is junk.
  t = t.replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();

  // Note: a trailing year is deliberately NOT stripped here. "Blade Runner
  // 2049", "1917" and "2012" are real titles, and extractYear() already
  // handles the year as separate metadata when scoring a candidate.

  return t || String(rawTitle || "").trim();
}

/**
 * Words that may legitimately appear in a candidate title without the
 * library title mentioning them: re-releases and edition markers. These
 * are exempted from the "candidate has extra content words" penalty.
 */
const EDITION_WORDS = new Set([
  "remastered", "remaster", "definitive", "complete", "gold", "goty",
  "edition", "version", "ultimate", "final", "anniversary", "collection",
  "deluxe", "premium", "extended", "cut", "directors", "trilogy", "redux",
  "reloaded", "classic", "legacy", "hd", "4k", "ultra", "plus",
  // Store re-releases and award/definitive suffixes that carry the
  // base game unchanged ("Batman Arkham Asylum GOTY Edition").
  "enhanced", "improved", "updated", "nextgen", "new", "switch",
  "goty", "game", "of", "the", "year", "edition", "awards", "definitive",
  // Foreign-series lead words: a Turkish show "Ertugrul" is billed as
  // "Dirilis: Ertugrul". These are franchise prefixes, not spinoffs.
  "dirilis", "diriliş", "kurt", "majus", "can", "ve", "ile",
]);

/**
 * Words that mark a store entry as add-on content rather than the game
 * itself. Steam buries the base game under these, so candidates
 * containing them are skipped before scoring.
 */
const DLC_MARKERS = [
  /\bdlc\b/i,
  /\bseason pass\b/i,
  /\bcampaign pack\b/i,
  /\bculture pack\b/i,
  /\bcharacter pack\b/i,
  /\bpack\b/i,
  /\bset\b/i,
  /\bdemo\b/i,
  /\bsoundtrack\b/i,
  /\bartbook\b/i,
  /\bexpansion\b/i,
  /\bupgrade\b/i,
  /\bbattle pass\b/i,
  /\badventure pass\b/i,
  /\bbattlepack\b/i,
];

/** True when the store listing is add-on content rather than a full game. */
function isDlc(title) {
  return DLC_MARKERS.some((re) => re.test(title));
}

/**
 * Ordinal words that mark a sequel/chapter subtitle.
 * baseKey() has already lowercased and de-punctuated them.
 */
const ORDINAL_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "first", "second", "third",
  "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "sequel", "prequel",
]);

/**
 * A subtitle after a colon names the same work. An en/em dash does
 * NOT: stores routinely write DLC as "Game - Campaign Pack", so only
 * the colon counts here.
 */
function hasSubtitle(title) {
  return /:/.test(String(title || ""));
}

/** The tokens that appear after the subtitle separator. */
function colonWords(title) {
  const after = String(title || "").split(":").slice(1).join(" ");
  return new Set(baseKey(after).split(" ").filter(Boolean));
}

/**
 * Significant tokens of a title, minus noise words.
 *
 * Single digits are kept even though they are short: numbers carry real
 * meaning in media titles ("7 Seeds", "8 Mile", "3 Idiots", "91 Days",
 * "300 1+2"). Single *letters* are still noise.
 */
function tokens(str) {
  return baseKey(str)
    .split(" ")
    .filter((w) => w.length > 1 || /^\d$/.test(w))
    .filter((w) => !STOPWORDS.has(w));
}

/**
 * Arabic morphology prefixes. Arabic attaches definiteness and
 * possessives as clitics, and the same root appears with a ta-marbuta
 * or a short suffix ("المصيد" the hunt / "مصيدة" a trap). Stripping
 * "ال" and one final short suffix makes the common case match without
 * any real stemming.
 */
const AR_PREFIX = /^(?:وال|بال|كال|فال|لل|ال|و|ف|ب|ك|ل)/;

/** Fold Arabic orthographic variants that never change the word's identity. */
function foldArabicSpelling(word) {
  return word
    // أ إ آ ٱ -> ا   (الازرق = الأزرق)
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    // ة -> ه, and ى -> ي
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064A");
}

/** Light Arabic normalisation: drop the article, ta-marbuta, short suffix. */
function arabicStem(word) {
  if (!/[\u0600-\u06FF]/.test(word)) return word;
  let w = foldArabicSpelling(word);
  if (w.length > 4) w = w.replace(AR_PREFIX, "");
  // A single trailing short suffix: "مصيدة" -> "مصيد".
  if (w.length > 3) w = w.replace(/[\u064A\u0627\u0648]$/, "");
  return w;
}

/**
 * Do these two tokens refer to the same word, allowing for simple
 * plural/singular differences on either side?
 */
function tokenMatch(a, b) {
  if (a === b) return true;
  if (singularize(a) === singularize(b)) return true;

  const arA = arabicStem(a);
  const arB = arabicStem(b);
  if (arA === arB) return true;
  if (arA !== a && arA === b) return true;
  if (arB !== b && a === arB) return true;

  // Arabic adjectives agree in gender: "حرة" (free, fem) vs "حر"
  // (masc), "سوق حرة" vs "سوق حر". After the ta-marbuta folding they
  // differ by a single trailing ه, so compare with that dropped from
  // the longer stem.
  if (/[\u0600-\u06FF]/.test(a) && /[\u0600-\u06FF]/.test(b)) {
    const dropFinalH = (s) => (/[\u0647]$/.test(s) && s.length >= 3 ? s.slice(0, -1) : s);
    if (dropFinalH(arA) === dropFinalH(arB)) return true;
    if (arA === dropFinalH(arB) || arB === dropFinalH(arA)) return true;
  }
  return false;
}

/**
 * Similarity between a library title and an API candidate title.
 * Returns 0..1. Token-overlap based (Dice coefficient), with a bonus for
 * an exact base-key match and a penalty when the query carried a year
 * that the candidate contradicts.
 */
function similarity(query, candidate, queryYear, candidateYear) {
  const q = baseKey(cleanTitle(query));
  // Clean the candidate the same way as the query, so trailing
  // qualifiers ("(مسلسل)", "(film)", "(الموسم الرابع)", "[1080p]")
  // never count as words the titles disagree about.
  const c = baseKey(cleanTitle(candidate));
  if (!q || !c) return 0;
  if (q === c) return 1;

  const qt = tokens(q);
  const ct = tokens(c);
  if (!qt.length || !ct.length) return 0;

  const ctSet = new Set(ct);
  const uniqQ = new Set(qt);
  let hits = 0;
  for (const t of uniqQ) {
    if (ctSet.has(t)) {
      hits++;
      continue;
    }
    // Allow one side to be a plural of the other.
    if ([...ctSet].some((c) => tokenMatch(t, c))) hits++;
  }

  let score = (2 * hits) / (uniqQ.size + ctSet.size);

  // Numbers matter a lot in titles ("300", "12 Strong", "91 Days"), but
  // the query's release year is metadata — exclude it from the comparison
  // so "6Underground 2019" is not penalised against "6 Underground".
  // Treat the query's year as release metadata (and therefore ignorable)
  // only when the candidate's own release year agrees with it. If the
  // candidate is from a different year, the number in the title is part
  // of the name: "Blade Runner 2049" is not the 1982 "Blade Runner".
  const yearIsMetadata =
    queryYear != null &&
    (candidateYear == null || Math.abs(candidateYear - queryYear) <= 1);
  const yearTok = yearIsMetadata ? String(queryYear) : null;
  const qNum = qt
    .filter((t) => /^\d+$/.test(t) && t !== yearTok)
    .sort()
    .join(",");
  const cNum = ct.filter((t) => /^\d+$/.test(t)).sort().join(",");
  if (qNum && cNum && qNum === cNum) score += 0.15;
  else if (qNum && cNum && qNum !== cNum) score -= 0.35;
  else if (qNum && !cNum) score -= 0.1;

  // A number the query has and the candidate lacks means a different
  // entry in a series: "Blade Runner 2049" is not "Blade Runner", and
  // "300 1+2" is not "300". This applies even to a number that looks
  // like a year, because in a title position it is part of the name.
  const queryNumbers = qt.filter((t) => /^\d+$/.test(t) && t !== yearTok);
  const lostNumbers = queryNumbers.filter((t) => !ctSet.has(t)).length;
  if (lostNumbers > 0) score -= 0.35 * Math.min(lostNumbers, 2);

  // A release year the candidate does not repeat is not a missing word
  // when the candidate's own year agrees with it: "Aragami 2016" and
  // the store title "Aragami" are the same game, the year just is not
  // printed on the box. Only a year that *contradicts* the candidate's
  // release year (handled above) counts against the match.
  if (yearIsMetadata && yearTok && !ctSet.has(yearTok)) {
    const withoutYear = qt.filter((t) => t !== yearTok);
    const wc = withoutYear.filter((t) => ctSet.has(t)).length;
    if (withoutYear.length && wc === withoutYear.length && ctSet.size <= withoutYear.length) {
      score = Math.max(score, 0.9);
    }
  }
  // The lost-number penalty above is applied once. It used to appear a
  // second time here, so a single unmatched number cost 0.7 instead of
  // 0.35 and "FIFA 2017" scored zero against "FIFA 17".

  // A candidate that is a bundle / DLC / soundtrack / expansion rather
  // than the title itself must not win: "Total War: ROME II" vs its
  // "Hannibal at the Gates Campaign Pack".
  if (/\b(soundtrack|dlc|artbook|ost|bonus|campaign pack|expansion)\b/i.test(candidate)) {
    score -= 0.2;
  }

  // Superset containment, candidate side only. A candidate that contains
  // every significant token of the query is very likely the same title
  // with extra words ("Total War: ROME II" -> "Total War: ROME II Remastered").
  //
  // The reverse — the query containing the candidate — is NOT boosted:
  // "Blade Runner 2049" is not "Blade Runner", and "300 1+2" is not
  // "300". Those are different releases and must fall below the floor.
  const missingFromCandidate = [...uniqQ].filter(
    (t) => !ctSet.has(t) && ![...ctSet].some((c2) => tokenMatch(t, c2)),
  );
  if (missingFromCandidate.length === 0 && ctSet.size > 0) {
    score = Math.max(score, 0.8);
    // Superset, but how much extra is there? "Minecraft" vs
    // "Minecraft Dungeons II" is a different game, whereas
    // "Total War ROME II" vs "Total War: ROME II Remastered" is the
    // same one. Only allow a couple of extra words before penalising.
    const extra = ct.filter(
      (t) => !uniqQ.has(t) && !STOPWORDS.has(t) && !EDITION_WORDS.has(t),
    );
    // Extra content words mean the candidate is a spin-off or a sequel:
    // "Minecraft" is not "Minecraft Dungeons". Only edition/quality
    // suffixes (Remastered, Director's Cut, GOTY) are harmless, and
    // those are already excluded above.
    //
    // A subtitle after a colon is the same work, not a spin-off:
    // "Ace Combat 7" == "ACE COMBAT 7: SKIES UNKNOWN". So when the
    // words the candidate adds sit after a colon, they are forgiven.
    const extraAfterColon = hasSubtitle(candidate) ? colonWords(candidate) : new Set();
    const costlyExtras = extra.filter((t) => !extraAfterColon.has(t));
    if (costlyExtras.length) score -= 0.3 * Math.min(costlyExtras.length, 3);

    // A subtitle that carries a sequel/edition number is a DIFFERENT
    // release: "Dune" is not "Dune: Part Two", and the digits after the
    // colon are exactly what tells them apart.
    if (hasSubtitle(candidate)) {
      const seq = colonWords(candidate);
      // Digits ("Part 2"), or ordinal words ("Part Two", "Chapter 3").
      const numbers = [...seq].filter((w) => /^\d+$/.test(w));
      const ordinals = [...seq].filter((w) => ORDINAL_WORDS.has(w));
      if (numbers.length || ordinals.length) {
        // If the query already names a number, it is the same entry.
        const alreadyNumbered = [...uniqQ].some((w) => /^\d+$/.test(w));
        if (!alreadyNumbered) score -= 0.5;
      }
    }
  }

  // Year contradiction (only when the candidate actually states a year).
  if (queryYear) {
    const candYear = extractYear(candidate);
    if (candYear && Math.abs(candYear - queryYear) > 1) score -= 0.45;
  }

  // Arabic titles are compared on characters as well as tokens. Token
  // overlap alone caps "السوق الحرة" vs "سوق حر" at 0.5 even though
  // they are the same series, because the article and the feminine
  // ending leave no shared tokens beyond one word.
  if (/[\u0600-\u06FF]/.test(q) && /[\u0600-\u06FF]/.test(c)) {
    const charScore = charSimilarity(q, c);
    const lifted = charScore * 0.95;
    // Character overlap alone is not enough to claim a match: two Arabic
    // titles can share most of their letters and still be different
    // works ("الحب الاعمى" / Love Blind vs "حب أعمى" / Love Deeper
    // differ by a single letter). Require one whole shared word before
    // trusting the character score.
    const hasSharedToken = [...uniqQ].some(
      (t) => ctSet.has(t) || [...ctSet].some((c2) => tokenMatch(t, c2)),
    );
    score = Math.max(score, hasSharedToken ? lifted : lifted * 0.85);
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Character-overlap similarity, used only as a safety net for Arabic.
 *
 * Arabic inflection (ال article, ـة feminine, ـا/ـو suffixes) can leave
 * two spellings of the same title with almost no shared tokens
 * ("السوق الحرة" vs "سوق حر"). Token overlap scores that 0.5, but the
 * two titles are clearly the same show. Comparing the letter multisets
 * catches these cases, and is deliberately not applied to Latin where
 * token overlap is both cheaper and more precise.
 */
function charSimilarity(a, b) {
  const s1 = baseKey(a).replace(/\s/g, "");
  const s2 = baseKey(b).replace(/\s/g, "");
  if (!s1 || !s2) return 0;

  const counts = new Map();
  for (const ch of s1) counts.set(ch, (counts.get(ch) || 0) + 1);
  let shared = 0;
  for (const ch of s2) {
    const n = counts.get(ch) || 0;
    if (n > 0) {
      counts.set(ch, n - 1);
      shared++;
    }
  }
  // Dice over characters.
  return (2 * shared) / (s1.length + s2.length);
}

/** Arabic-ish transliteration-free comparison: ignores article prefixes. */
function stripArabicArticles(str) {
  return String(str || "")
    .replace(/^(ال|أل|أل|و|ف)/, "")
    .trim();
}

/**
 * Pick the best candidate from a list.
 * @returns {{best: object|null, score: number, accepted: boolean}}
 */
function pickBest(query, candidates, { floor = 0.72 } = {}) {
  const year = extractYear(query);
  let best = null;
  let score = 0;

  for (const cand of candidates) {
    if (!cand || !cand.title) continue;
    let s = similarity(query, cand.title, year);
    // Second chance for Arabic "ال" prefixed titles.
    if (s < floor && /[\u0600-\u06FF]/.test(query)) {
      s = Math.max(
        s,
        similarity(stripArabicArticles(query), stripArabicArticles(cand.title), year),
      );
    }
    if (s > score) {
      score = s;
      best = cand;
    }
  }

  return { best, score, accepted: Boolean(best) && score >= floor };
}

/**
 * Does the candidate account for every content word in the query?
 *
 * Similarity alone is not enough for lookups where a franchise article
 * and a single game share a title: "Assassins.Creed.Valhalla" against
 * the article "Assassin's Creed" scores 0.80 on shared words and would
 * be accepted, publishing the wrong game's developer, engine and plot.
 *
 * Requiring full coverage means a candidate is only accepted when every
 * meaningful query word is present, which rejects the franchise root
 * while still allowing the reverse ("Assassin's Creed" -> "Assassin's
 * Creed Brotherhood").
 *
 * @param {string} query    library title
 * @param {string} candidate store/article title
 * @returns {boolean}
 */
function coversAllTokens(query, candidate) {
  const qTokens = tokens(cleanTitle(query));
  const cTokens = tokens(cleanTitle(candidate));
  if (!qTokens.length) return true;

  const cSet = new Set(cTokens);
  return qTokens.every((t) => {
    if (cSet.has(t)) return true;
    if (EDITION_WORDS.has(t)) return true;
    if ([...cSet].some((c) => tokenMatch(t, c))) return true;
    // A year in the query is release metadata, not part of the name.
    if (String(extractYear(query)) === t) return true;
    return false;
  });
}

/** Levenshtein distance, bailing out once it is known to be too large. */
function editDistance(a, b, limit) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  // Two rows rather than one updated in place: an in-place version has to
  // save the diagonal by hand, and forgetting it makes the first column
  // NaN, which then compares as "not close" for every pair.
  let prevRow = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prevRow[j] = j;

  for (let i = 1; i <= a.length; i++) {
    const row = new Array(b.length + 1);
    row[0] = i;
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prevRow[j] + 1, prevRow[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > limit) return limit + 1;
    prevRow = row;
  }
  return prevRow[b.length];
}

/**
 * Are two words the same word, typed slightly wrong?
 *
 * Scene folder names are full of typos, and each one costs a title that
 * is otherwise perfectly findable: "silient hill f" for Silent Hill f,
 * "MAXPYNE 2" for Max Payne 2, "oblivian" for Oblivion, "Enhanched"
 * for Enhanced. Fixing them by hand is a list that never ends; measuring
 * the distance between words is the general answer.
 *
 * The budget scales with length, because a loose limit on short words
 * makes almost everything match: one edit is too generous at three
 * letters and about right at ten.
 */
function nearMiss(queryWord, candidateWord) {
  const a = queryWord;
  const b = candidateWord;
  if (a === b) return 0;
  if (a.length < 3 || b.length < 3) return 99;
  // The budget scales with length: one edit is generous at four letters
  // and about right at eight. "oblivian"/"oblivion" and "enhanched"/
  // "enhanced" are both a single slip of the keyboard.
  const limit = a.length >= 7 ? 2 : 1;
  // editDistance bails out with `limit + 1` once it knows the answer is
  // too large. That value is indistinguishable from a real distance of
  // two, so it is flattened here — otherwise a caller testing `<= 2`
  // reads a rejection as a match.
  const distance = editDistance(a, b, limit);
  return distance > limit ? 99 : distance;
}

/**
 * Like coversAllTokens, but tolerating one misspelled word.
 *
 * At most one query word may be a near miss. Allowing more turns the
 * test into a general fuzzy search, which on a shelf of one-word titles
 * like "Sing" or "Leo" will happily return an unrelated film.
 */
function coversAllTokensFuzzy(query, candidate) {
  if (coversAllTokens(query, candidate)) return true;

  const qTokens = tokens(cleanTitle(query));
  const cTokens = tokens(cleanTitle(candidate));
  if (!qTokens.length || !cTokens.length) return false;

  let fuzzyUsed = 0;

  for (const t of qTokens) {
    const exact = cTokens.some(
      (c) => c === t || EDITION_WORDS.has(t) || tokenMatch(t, c),
    );
    if (exact) continue;

    // At least one other word must line up exactly. That is what keeps a
    // loose edit distance safe: "call of duty black obs 6" may forgive
    // "obs"/"ops" only because five other words match outright, while a
    // lone "Leo" may not become "Lee".
    if (qTokens.length < 2) return false;

    if (fuzzyUsed >= 1) return false;
    if (!cTokens.some((c) => nearMiss(t, c) <= 2)) return false;
    fuzzyUsed++;
  }

  return fuzzyUsed === 1;
}

module.exports = {
  cleanTitle,
  extractYear,
  similarity,
  pickBest,
  tokens,
  baseKey,
  isDlc,
  coversAllTokens,
  coversAllTokensFuzzy,
  nearMiss,
  ANIME_NOISE,
};