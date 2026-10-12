"use strict";
// Wikidata provider.
//
// Wikipedia articles gave us a summary and a title; Wikidata gives the
// structured fields that articles omit, and — the reason it matters here —
// it carries them in Arabic as well as English. "First-person shooter"
// comes back as "تصويب منظور الشخص الأول" and "Rockstar North" as
// "روكستار نورث", which is what the site actually shows.
//
// It also resolves titles that no article does. Wikidata keeps a large set
// of aliases, so a Japanese romanisation like "Ansatsu Kyoushits" or a
// misspelling like "Harry poter" finds the same item an article titled
// "Assassination Classroom" would.
//
// No API key, and every endpoint is a documented public API.

const { getJson } = require("./http");
const {
  cleanTitle,
  similarity,
  coversAllTokens,
  coversAllTokensFuzzy,
  extractYear,
  baseKey,
} = require("./match");

/** Below this, nothing is attached. */
const FLOOR = 0.7;

/** Wikidata properties, and where their value lands in a details record. */
const PROPERTIES = {
  P136: "genres", // genre
  P57: "director", // director
  P161: "cast", // cast member
  P175: "cast", // performer
  P58: "writer", // screenwriter
  P272: "company", // production company
  P449: "network", // original network
  P178: "developer", // developer
  P400: "platforms", // platform
  P577: "releaseDate", // publication date
  P495: "country", // country of origin
  P364: "language", // original language of work
  P2047: "runtime", // duration
  P750: "distributedBy", // distributed by
  P466: "occursIn", // occurs in
  P170: "creator", // creator
  P1431: "basedOn", // based on
  P180: "features", // narrative role
};

/** Genre properties worth keeping; the rest are too abstract to show. */
const GENRE_PROPS = new Set(["P136"]);

/**
 * Wikidata entity ids for game genres, mapped onto the Arabic labels the
 * site already uses elsewhere. Resolved to text at fetch time from the
 * Arabic label, so nothing here needs maintaining when Wikidata changes.
 */
const DATE_PROPS = new Set(["P577"]);

/** Which languages to search, from the script the title is written in. */
const BY_SCRIPT = [
  { lang: "ar", test: /[\u0600-\u06FF]/ },
  { lang: "ru", test: /[\u0400-\u04FF]/ },
  { lang: "ja", test: /[\u3040-\u30FF\u4E00-\u9FFF]/ },
  { lang: "ko", test: /[\uAC00-\uD7AF]/ },
  { lang: "zh", test: /[\u4E00-\u9FFF]/ },
  { lang: "el", test: /[\u0370-\u03FF]/ },
  { lang: "he", test: /[\u0590-\u05FF]/ },
  { lang: "hi", test: /[\u0900-\u097F]/ },
];

/**
 * Latin-script languages cannot be told apart by character class, so they
 * are matched on function words. "El Cuerpo" has to be searched in
 * Spanish or the film is never found. A wrong guess only costs one
 * request.
 */
const BY_HINT = [
  { lang: "es", test: /\b(?:el|la|los|las|un|una|de|del|y|con|para|sin|sobre|su|sus)\b/i },
  { lang: "pt", test: /\b(?:o|os|as|um|uma|do|da|e|com|para|sem|sobre)\b/i },
  { lang: "fr", test: /\b(?:le|la|les|un|une|des|du|et|avec|pour|sans|sur|son|ses)\b/i },
  { lang: "de", test: /\b(?:der|die|das|ein|eine|und|mit|für|ohne|auf|ist)\b/i },
  { lang: "it", test: /\b(?:il|lo|gli|le|un|una|di|e|con|per|senza)\b/i },
  { lang: "tr", test: /\b(?:ve|ile|için|olarak|veya)\b|[ığşçöü]/i },
];

/**
 * Words that mark a Wikidata item as a work rather than a person, a place
 * or a concept. Wikidata's search results carry a short description
 * ("2012 film", "Japanese anime television series") and that is the only
 * thing separating a work from a street or a band of the same name.
 *
 * Two patterns rather than one: `\b` is defined against `[A-Za-z0-9_]`,
 * so there is no word boundary before an Arabic or CJK letter and a
 * single combined pattern silently never matches them. That bug made
 * every Arabic title look like a miss.
 */
const WORK_WORDS_LATIN =
  /\b(?:film|movie|peli|pel[ií]cula|s[eé]rie|series|television|tv|anime|manga|video game|game|juego|jeu|spiele)\b/i;
const WORK_WORDS_OTHER =
  /(?:فيلم|فلم|مسلسل|دراما|أنمي|لعبة|برنامج|وثائقي|映画|ドラマ|アニメ|电视剧)/;

/** True when the description names some kind of work. */
function isWork(description) {
  return WORK_WORDS_LATIN.test(description) || WORK_WORDS_OTHER.test(description);
}

/**
 * Query variants to try, in order.
 *
 * Two shapes stop a plain lookup, and Wikidata has an answer for both:
 *
 *   "AnsatsuKyoushits"  run together. Wikidata indexes the spaced
 *                       romanisation and returns Assassination Classroom.
 *   "Crysis 1"          a sequel number the item does not carry. The
 *                       base game is simply "Crysis".
 */
function queryVariants(title) {
  return variantPlan(title).map((v) => v.text);
}

/**
 * Edition and quality qualifiers, which name a re-release of a game
 * rather than a different game.
 *
 * "Borderlands 2 - Remastered" is Borderlands 2, so the date belongs to
 * the original. Stripping the qualifier recovers it: Wikidata catalogues
 * the base game and knows nothing of the remaster.
 *
 * This is deliberately mechanical. Hand-written alternative names were
 * tried and rejected — "Tomb.Raider 1-2-3 Remastered" mapped by hand to
 * "Tomb Raider", which is the 2013 reboot, not the remasters. A rule
 * derived from the title can only remove a qualifier that is actually
 * there, so it cannot invent that kind of answer. Bundles and
 * trilogies carry no qualifier and so keep missing their date, which is
 * the correct outcome: they have no single release date.
 */
const EDITION_QUALIFIERS =
  /\s*[-–—:]?\s*\b(?:game\s+of\s+the\s+year|goty|remaster(?:ed)?|deluxe|legendary|ultimate|complete|enhanced|definitive|collectors?|directors?\s+cut|special|gold|premium|anniversary|extended|standard|truncated|legacy)\b(?:\s+edition)?\s*/gi;

/** The title with any edition qualifier removed. */
function stripEditionQualifiers(title) {
  const stripped = String(title)
    .replace(EDITION_QUALIFIERS, " ")
    .replace(/\s*edition\b/gi, " ")
    .replace(/\s+[-–—:]+\s*$/, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return stripped && stripped !== String(title).trim() ? stripped : null;
}

/**
 * The variants to search, each marked for whether it asks the same
 * question or a different one.
 *
 *   lossy: false — respelling. "GodOfWar" becomes "God Of War", the same
 *                   game written the way anyone would search for it.
 *   lossy: true  — a different question. Dropping a trailing numeral
 *                   turns "How to Train Your Dragon 3" into "How to
 *                   Train Your Dragon", which is the first film.
 *
 * The distinction decides two things: whether a retry may run after an
 * exact search already found something, and whether a weak
 * romanisation match is allowed at all. A numeral-dropping retry may do
 * neither, because it is looking for something else.
 */
function variantPlan(title) {
  const full = cleanTitle(title);
  const plan = [{ text: full, lossy: false }];

  // Split words that run together at a case boundary, repeatedly until the
  // title stops changing. One pass is not enough: "GodOfWar" becomes
  // "God OfWar", which still runs together, and a second pass is what
  // finally yields "God Of War".
  let split = full;
  for (let pass = 0; pass < 4; pass++) {
    const next = split
      .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
    if (next === split) break;
    split = next;
  }
  if (split !== full) plan.push({ text: split, lossy: false });

  const noNumber = full.replace(/\s+\d+$/, "").trim();
  if (noNumber && noNumber !== full) plan.push({ text: noNumber, lossy: true });

  // The base game behind a remaster or an edition.
  const base = stripEditionQualifiers(full);
  if (base) plan.push({ text: base, lossy: false });

  // Duplicates removed, keeping the first (least lossy) occurrence.
  const seen = new Set();
  return plan.filter((v) => v.text && !seen.has(v.text) && seen.add(v.text));
}

/** Which languages to search, given the title. */
function languagesFor(title, prefer) {
  // The shelf knows the language even when the title does not. "122" is
  // an Egyptian film, but a title of digits says nothing about that, and
  // searching English for it returns years and numbers.
  if (prefer) return [...new Set([prefer, "en"])];

  const byScript = BY_SCRIPT.find((w) => w.test.test(title));
  const langs = [];
  if (byScript) langs.push(byScript.lang);
  else {
    const hinted = BY_HINT.find((w) => w.test.test(title));
    if (hinted) langs.push(hinted.lang);
  }
  langs.push("en");
  return [...new Set(langs)];
}

/**
 * Search Wikidata for an entity.
 *
 * @param {string} title       the library title
 * @param {object} [options]
 * @param {string} [options.medium]  what the shelf expects, e.g. "anime".
 *   Used only to accept a romanisation: Wikidata resolving a Japanese
 *   romanisation to exactly one anime item is strong evidence, because
 *   no spelling comparison can make that match.
 * @returns {Promise<{id,label,description,lang,score}|null>}
 */
async function search(title, options = {}) {
  if (!cleanTitle(title)) return null;

  let best = null;
  const qYear = extractYear(title);
  const langs = languagesFor(title, options.lang);
  // Tracks which mediums have already spent their one romanisation
  // allowance, so a single title cannot claim several weak matches.
  const romanisationTaken = {};

  outer: for (const lang of langs) {
    const plan = variantPlan(title);
    for (let vi = 0; vi < plan.length; vi++) {
      const { text: term, lossy } = plan[vi];
      const relaxed = vi > 0;
      let hadHits = false;
      const json = await getJson(
        "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json" +
          `&language=${lang}&uselang=${lang}&type=item&limit=8&search=${encodeURIComponent(term)}`,
      );
      const hits = (json && json.search) || [];
      if (!hits.length) continue;

      // The exact query returned results, so the answer is here — even if
      // none of them pass the guards. Falling through to a variant that
      // asks a different question would search for something else and
      // then present that as the answer: "How to Train Your Dragon 3"
      // finds the third film here, the guards decline it because "3" is
      // not in its title, and the retry that drops the "3" then returns
      // the 2010 original. A missed detail beats the wrong film.
      //
      // Only the numeral-dropping retry is barred. Splitting run-together
      // words asks the same question in a readable spelling, so it still
      // runs — otherwise "GodOfWar" would never reach "God Of War".
      const onlyLossyLeft = plan.slice(vi + 1).every((v) => v.lossy);
      if (onlyLossyLeft) hadHits = true;

      for (const hit of hits) {
        const description = hit.description || "";

        // Only works are usable on an item page; a person or a place
        // with the same name is not this library entry.
        if (description && !isWork(description)) continue;

        // The shelf states what it expects, and Wikidata states it too.
        // A film shelf must not take a television programme, and an anime
        // shelf must not take the manga the anime was adapted from.
        if (!isMedium(description, options.medium)) continue;

        // A shelf of games holds individual releases, never a franchise.
        // Wikidata keeps series as their own items, and a series item
        // will happily answer a title whose number it does not carry:
        // "Fifa 26" found no FIFA 26, fell back to the bare "FIFA" entry,
        // and that item is the series, first published in 1988. The
        // record then claimed the 2026 game was from 1988.
        if (options.medium === "game" && /\b(?:series|franchise|saga)\b/i.test(description)) {
          continue;
        }

        // Arabic titles are matched on their folded form, because the same film
        // is spelled differently by different people: the library says
        // "200 جنية" and Wikidata says "200 جنيه". Folding alone is not
        // enough though — "المصيد" (2024) and "المصيدة" (1980) are
        // different films that fold close together, so the folded form
        // of the whole title has to be identical, not merely similar.
        if (ARABIC.test(term) && ARABIC.test(hit.label)) {
          if (baseKey(term) !== baseKey(hit.label)) continue;
        }

        // Exact token coverage first. If that fails, the title may still be
        // findable with one misspelled word — "silient hill f" is Silent
        // Hill f, "MAXPYNE 2" is Max Payne 2. The fuzzy pass is only
        // consulted when the exact one failed, and it is capped at a
        // single word so it stays a typo tolerance rather than a general
        // fuzzy search.
        let covered = coversAllTokens(term, hit.label);
        let typoTolerated = false;
        // A year/season pair is a naming difference, not a similarity
        // problem, and the rule already insists every other word matches
        // exactly. So it settles the question on its own and is not
        // second-guessed by the score, which would otherwise punish the
        // very thing it recognises.
        //
        // Computed independently of `covered`: the plain token test
        // already accepts "2017" for "17", so folding this into `covered`
        // left the flag false and the score floor rejected the match all
        // over again.
        const yearSeason = yearSeasonCovers(term, hit.label);
        if (yearSeason) covered = true;
        if (!covered && !lossy) {
          if (coversAllTokensFuzzy(term, hit.label)) {
            covered = true;
            typoTolerated = true;
          }
        }

        // Digits identify a work exactly, so their count has to agree.
        // "11.11" is two numbers and "11-11-11" is three — matching them
        // would put a 2011 American horror film on an Egyptian one.
        const qDigits = (term.match(/\d+/g) || []).length;
        const cDigits = (hit.label.match(/\d+/g) || []).length;
        if (qDigits && cDigits > qDigits) continue;

        // Score against the term that was actually searched, so a
        // relaxed variant is not judged by the original title it no
        // longer resembles.
        let score = Math.min(1, similarity(term, hit.label, qYear, null));

        if (qYear) {
          const hitYear = extractYear(description);
          if (hitYear) score += Math.abs(hitYear - qYear) <= 1 ? 0.15 : -0.35;
        }

        if (!covered || (score < FLOOR && !yearSeason)) {
          // A romanisation ("AnsatsuKyoushits") cannot be matched against
          // "Assassination Classroom" by spelling at all — no character
          // or token comparison bridges a Japanese romanisation, which
          // is why these titles never resolved before. Wikidata placing
          // that item first among results of the expected medium is the
          // evidence instead.
          //
          // It is allowed once per medium, so one title cannot claim
          // several weak matches, and only when the shelf stated what it
          // expects, so an anime shelf cannot take a manga item.
          // A weak match is only forgivable when the variant asked the
          // same question in another spelling. Allowing it after a numeral
          // was dropped let "11.11" reach "For ages 11 and up", because
          // the "11" variant matches an age rating, not a title.
          const romanisation =
            !lossy && relaxed && options.medium && !romanisationTaken[options.medium];
          if (!romanisation) continue;
          romanisationTaken[options.medium] = true;
          score = 0.72;
        }

        if (!best || score > best.score) {
          best = {
            typoTolerated,
            id: hit.id,
            label: hit.label,
            description,
            lang,
            score,
          };
        }
      }
      // Stop at the first acceptable match, and stop for good once any
      // variant has returned results at all. The variants run from most
      // to least faithful, so a later one must never displace an earlier
      // one.
      if (best || hadHits) break;
      hadHits = false;
    }
  }

  return best;
}

/**
 * Do the two titles name the same work with the year and season spelled
 * differently?
 *
 * A sports title is sold under the year it comes out ("FIFA 2017") and
 * catalogued under the season it succeeds ("FIFA 17"). Both name one
 * game, and Wikidata's search already returns the right item for the
 * first spelling — but a literal token comparison reads "2017" and "17"
 * as two different words and throws the match away. That is why FIFA
 * 2017 and FIFA 2018 ended up with no release date while FIFA 13, whose
 * season and year happen to coincide, matched first time.
 *
 * Only the year/season pair is forgiven, and only when every other word
 * lines up, so this stays a naming rule rather than a looser match.
 */
function yearSeasonCovers(term, label) {
  const qWords = String(term).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const cWords = new Set(String(label).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  if (!qWords.length || !cWords.size) return false;

  let swapped = 0;

  for (const t of qWords) {
    if (cWords.has(t)) continue;

    const full = /^(?:19|20)(\d{2})$/.exec(t);
    if (full && cWords.has(full[1])) {
      swapped++;
      continue;
    }

    const short = /^(\d{2})$/.exec(t);
    if (short && (cWords.has(`19${short[1]}`) || cWords.has(`20${short[1]}`))) {
      swapped++;
      continue;
    }

    return false;
  }

  return swapped > 0;
}

/**
 * The medium each shelf expects, as it is worded in Wikidata descriptions.
 *
 * Wikidata writes the description in the item's own language, so the
 * Arabic and Japanese spellings have to be recognised — "122 [فلم مصري]"
 * is an Egyptian film, and without "فلم" here it was thrown out as a
 * number. As above, `\b` cannot bound non-Latin text, so the two scripts
 * are kept in separate patterns.
 */
const MEDIUM_WORDS = {
  anime: [/\b(?:anime)\b/i, /(?:أنمي|アニメ)/],
  film: [/\b(?:film|movie|pel[ií]cula|peli)\b/i, /(?:فيلم|فلم|映画)/],
  series: [/\b(?:television series|tv series|series|telenovela|miniseries)\b/i, /(?:مسلسل|دراما)/],
  game: [/\b(?:video game|game)\b/i, /(?:لعبة|ゲーム)/],
};

/** True when the description names the medium the shelf expects. */
function isMedium(description, medium) {
  const patterns = MEDIUM_WORDS[medium];
  if (!patterns) return true;
  return patterns.some((re) => re.test(description));
}

/**
 * Do the two titles contain the same words, spelled the same way?
 *
 * The shared matcher folds Arabic orthography (ة and ه are the same
 * letter) and tolerates plurals, which is right for comparing a library
 * folder to a database entry but wrong for telling two films apart:
 * "المصيد" (2024) and "المصيدة" (1980) fold together and are not the
 * same film.
 */
const ARABIC = /[\u0600-\u06FF]/;

function coversLiterally(query, candidate) {
  const split = (s) =>
    String(s || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  const q = split(query);
  if (!q.length) return false;
  const c = new Set(split(candidate));
  return q.every((w) => c.has(w));
}

/** Fetch the labels for a batch of entity ids, in every language asked for. */
async function labelsFor(ids, languages = ["en", "ar"]) {
  const unique = [...new Set(ids.filter((id) => /^Q\d+$/.test(id)))];
  if (!unique.length) return new Map();

  const out = new Map();
  // The API takes at most 50 ids per call.
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const json = await getJson(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels" +
        `&languages=${languages.join("|")}&ids=${batch.join("|")}`,
    );
    if (!json || !json.entities) continue;

    for (const id of batch) {
      const entity = json.entities[id];
      if (!entity) continue;
      const labels = entity.labels || {};
      out.set(id, {
        en: (labels.en && labels.en.value) || null,
        ar: (labels.ar && labels.ar.value) || null,
      });
    }
  }
  return out;
}

/**
 * Fetch and shape the properties of an entity.
 *
 * Only one entry per property is kept where several exist — a film's five
 * publication dates are the same film released in five places, and the
 * page has room for one. Genres and cast are the exceptions.
 *
 * @returns {Promise<object|null>} a details fragment, or null
 */
async function facts(entityId) {
  const json = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${entityId}&props=claims`,
  );
  const claims = json && json.entities && json.entities[entityId] && json.entities[entityId].claims;
  if (!claims) return null;

  // Collect every entity id we will need a label for.
  const needed = new Set();
  for (const [pid, list] of Object.entries(claims)) {
    if (!PROPERTIES[pid]) continue;
    for (const c of list) {
      const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
      if (v && typeof v === "object" && v.id) needed.add(v.id);
    }
  }
  const names = await labelsFor([...needed]);

  /** The Arabic label when there is one, otherwise the English. */
  const nameOf = (id) => {
    const n = names.get(id);
    if (!n) return null;
    return n.ar || n.en || null;
  };

  const out = { genres: null, director: null, cast: null, releaseDate: null, platforms: null, creators: null };

  const firstOf = (pid) => {
    const list = claims[pid];
    if (!list || !list.length) return null;
    for (const c of list) {
      const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
      const label = v && typeof v === "object" && v.id ? nameOf(v.id) : null;
      if (label) return label;
    }
    return null;
  };

  const allOf = (pid) => {
    const list = claims[pid] || [];
    const vals = [];
    for (const c of list) {
      const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
      const label = v && typeof v === "object" && v.id ? nameOf(v.id) : null;
      if (label && !vals.includes(label)) vals.push(label);
    }
    return vals;
  };

  // Genres: prefer the Arabic label, keep at most five.
  const genreIds = [];
  for (const pid of Object.keys(PROPERTIES)) {
    if (!GENRE_PROPS.has(pid)) continue;
    for (const c of claims[pid] || []) {
      const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
      if (v && typeof v === "object" && v.id) genreIds.push(v.id);
    }
  }
  const genres = [];
  for (const id of genreIds) {
    const label = nameOf(id);
    if (label && !genres.includes(label)) genres.push(label);
  }
  if (genres.length) out.genres = genres.slice(0, 5);

  out.director = firstOf("P57");
  out.creators = allOf("P170").slice(0, 3).join(", ") || null;
  out.developer = firstOf("P178");

  const cast = [...allOf("P161"), ...allOf("P175")];
  if (cast.length) out.cast = cast.slice(0, 6);

  // Publication date: the earliest, which is the first release.
  const dates = (claims.P577 || [])
    .map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value)
    .filter((v) => v && typeof v === "object" && v.time)
    .map((v) => String(v.time).replace(/^\+/, "").slice(0, 10))
    .sort();
  if (dates.length) out.releaseDate = dates[0];

  const platforms = allOf("P400");
  if (platforms.length) out.platforms = platforms.slice(0, 6);

  return out;
}

/**
 * Resolve a title to a Wikidata entity.
 * @returns {Promise<{entity:object, facts:object}|null>}
 */
async function resolve(title, options = {}) {
  const hit = await search(title, options);
  if (!hit) return null;

  const shaped = await facts(hit.id);
  if (!shaped) return null;

  // An item with none of the showable fields is still a confirmed
  // match, and dropping it here loses real titles. Plenty of anime
  // items carry only a label and an external identifier — the Black
  // Clover series, for instance — and the identity plus the link is
  // worth more than an empty page.
  //
  // What keeps a person, a street or a band of the same name out is
  // decided earlier: search() requires a description naming a work, and
  // requires the medium to match the shelf.
  return { entity: hit, facts: shaped };
}

module.exports = {
  resolve,
  search,
  facts,
  labelsFor,
  queryVariants,
  languagesFor,
  yearSeasonCovers,
};