"use strict";
// Wikipedia provider for films and series.
//
// Wikipedia is the one source that reliably covers the whole library,
// including Arabic, Indian and Turkish titles that the structured APIs
// miss. It gives a rich lead paragraph ("X is a 2019 film directed by
// Y, starring A and B") which is exactly what a spoiler-free summary
// needs.
//
// The lead sentence is already a spoiler-free synopsis by convention —
// encyclopedias describe what a work *is* before what happens in it.
//
// Strategy per title:
//   1. Search Wikipedia for the title (both English and Arabic wikis
//      depending on the script of the title).
//   2. Score the hits against the library title, reject low-confidence
//      and disambiguation-ish pages.
//   3. Fetch the lead extract and pull structured facts out of it.

const { getJson } = require("./http");
const { cleanTitle, similarity, extractYear } = require("./match");

// Wikipedia's search is noisy for short and for Arabic titles, where it
// happily returns actor pages and unrelated works. The floor is lower
// than Steam's because the best candidate is often a qualified page
// ("المؤسس عثمان (الموسم الرابع)") that we score against its base
// title — but below this, a wrong summary is worse than none.
const FLOOR = 0.62;

/**
 * Which wikis to search for a given title.
 *
 * The library is international and many entries are only catalogued in
 * the language of the work — "Cien años de perdón" and "El cuerpo" have
 * no usable English article. Order matters: the language the title is
 * written in is tried first, then English, because an English article is
 * usually richer even when the title is foreign.
 */
const WIKIS_BY_LANGUAGE = [
  { lang: "ar", test: /[\u0600-\u06FF]/ },
  { lang: "tr", test: /[ığşçöüİ]|(?:\b(?:ve|ile|için|olarak)\b)/i },
  { lang: "ru", test: /[\u0400-\u04FF]/ },
  { lang: "ja", test: /[\u3040-\u30FF\u4E00-\u9FFF]/ },
  { lang: "ko", test: /[\uAC00-\uD7AF]/ },
  { lang: "zh", test: /[\u4E00-\u9FFF]/ },
  { lang: "el", test: /[\u0370-\u03FF]/ },
  { lang: "he", test: /[\u0590-\u05FF]/ },
  { lang: "hi", test: /[\u0900-\u097F]/ },
];

// Latin-script languages cannot be told apart by character class, so
// they are matched on function words. A miss here only costs one extra
// request.
const WIKIS_BY_HINT = [
  { lang: "es", test: /\b(?:el|la|los|las|un|una|de|del|y|con|para|sin|sobre)\b/i },
  { lang: "fr", test: /\b(?:le|la|les|un|une|des|de|du|et|avec|pour|sans|sur)\b/i },
  { lang: "de", test: /\b(?:der|die|das|ein|eine|und|mit|für|ohne|auf)\b/i },
  { lang: "it", test: /\b(?:il|lo|la|gli|le|un|una|di|e|con|per|senza|su)\b/i },
  { lang: "pt", test: /\b(?:o|a|os|as|um|uma|de|do|da|e|com|para|sem|sobre)\b/i },
  { lang: "pl", test: /\b(?:i|w|na|z|do|nie|nie|jest|się)\b/i },
];

/** Which wikis to try, in order, for a given title. */
function wikisFor(title) {
  const byScript = WIKIS_BY_LANGUAGE.find((w) => w.test.test(title));
  const list = [];

  // The title's own language first, when it is detectable.
  if (byScript) list.push(byScript.lang);
  else {
    const hinted = WIKIS_BY_HINT.find((w) => w.test.test(title));
    if (hinted) list.push(hinted.lang);
  }

  list.push("en");
  return [...new Set(list)];
}

/** Search a wiki for candidate page titles. */
async function searchWiki(term, lang) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&list=search` +
    `&srlimit=8&srsearch=${encodeURIComponent(term)}`;
  const json = await getJson(url);
  const hits = (json && json.query && json.query.search) || [];
  return hits.map((h) => ({ title: h.title, lang }));
}

/** Fetch the lead extract for a page title. */
async function leadExtract(pageTitle, lang) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json` +
    `&prop=extracts&inprop=url&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(pageTitle)}`;
  const json = await getJson(url);
  const pages = json && json.query && json.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.extract) return null;
  return page;
}

/** Wikipedia disambiguation and list pages are never the work itself. */
function isDisambiguation(title) {
  return /\((disambiguation|list of)\)|\bdisambiguation\b|توضيح/i.test(title);
}

/**
 * Words that mark a lead sentence as describing a film or a series.
 *
 * The library is international and the provider searches several
 * wikis, so the guard has to recognise the medium in each of them —
 * otherwise "El cuerpo" (a Spanish film) is rejected because its lead
 * says "película" and not "film".
 */
const MEDIA_MARKERS = [
  // English
  /\b(film|movie|television series|tv series|web series|miniseries|telenovela|anime|sitcom|documentary|drama series|show)\b/i,
  // Arabic
  /(?:فيلم|مسلسل|دراما|برنامج|وثائقي|أنمي)/,
  // Spanish / Portuguese ("filme" is Portuguese for film)
  /\b(pel[ií]cula|filme|serie de televisión|telenovela|miniserie|anime|cine)\b/i,
  // French
  /\b(série télévisée|téléfilm|feuilleton|animation)\b/i,
  // German / Dutch
  /\b(fernsehserie|mehrteiler|kinofilm)\b/i,
  // Italian
  /\b(serie televisiva|telefilm|animazione)\b/i,
  // Russian / Ukrainian
  /(?:фильм|сериал|телесериал|анимационный фильм|мультфильм)/,
  // Turkish
  /(?:film|dizi|televizyon dizisi|animasyon)/,
  // East Asian
  /(?:映画|ドラマ|アニメ|电视剧|電影|影集|アニメ)/,
];

// These words are identical across several of the languages above and
// are ambiguous on their own ("film" is a genre in English but also the
// medium in French), so they only count when the lead looks like a work
// description rather than a mention in passing.
const SHARED_MEDIA_WORDS =
  /^\s*(?:\w+[\s,]+){0,3}?\s*(?:is|was|est|es|èst|sont|ist|wer|son|é|jest|son)\s+(?:a|an|un|una|une|ein|eine|o)?\s*/i;

/**
 * True when the lead describes an actual film or series.
 *
 * Only the opening sentences are inspected: that is where Wikipedia
 * states what the subject is, and later paragraphs discuss plot. This
 * is what stops "11.11" resolving to a numerology article and "122" to
 * a page about the integer — both title-match a numeric filename but
 * are not a film.
 */
function isMediaPage(extract) {
  if (!extract) return false;
  const head = extract.slice(0, 400);
  if (MEDIA_MARKERS.some((re) => re.test(head))) return true;
  // Fall back to a lead-shaped phrase plus a shared medium word.
  return SHARED_MEDIA_WORDS.test(head) && /\b(film|serie|series|movie|pel[ií]cula|dizi)\b/i.test(head);
}

/**
 * True when a lead extract is a disambiguation stub rather than an
 * article about the work.
 *
 * These pages still score well on title similarity — "The Brothers"
 * is an exact match for a library entry called "Brothers" — so the
 * only reliable signal is the text itself: "X may refer to:" is the
 * first line of every disambiguation page, in every language.
 */
function isDisambiguationText(text) {
  if (!text) return true;
  const head = text.slice(0, 140).toLowerCase();

  return (
    /\bmay refer to\b/.test(head) ||
    // Arabic
    /(?:\u064a\u0634\u064a\u0631|\u062a\u0634\u064a\u0631|\u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0634\u064a\u0631)/.test(text.slice(0, 80)) ||
    /\u062a\u0648\u0636\u064a\u062d/.test(text.slice(0, 60)) ||
    // Spanish / Portuguese / French / German
    /\b(?:puede referirse|se refiere a|pode referir|pourrait designer|bezieht sich)\b/.test(head) ||
    /^\s*(?:see also|members of the|list of|v\u00e9ase tambi\u00e9n|voir aussi|siehe auch)\b/i.test(head)
  );
}

/**
 * Qualifiers Wikipedia appends to a base title in parentheses.
 *
 *   "المؤسس عثمان (الموسم الرابع)"  -> base "المؤسس عثمان"
 *   "A Quiet Place (film)"          -> base "A Quiet Place"
 *   "Se7en"                         -> unchanged
 *
 * Comparing the base rather than the qualified title is what lets a
 * season page or a "(film)" disambiguator still match the bare library
 * entry. Season numbers are dropped only when the library title has no
 * season number of its own — otherwise "الموسم الرابع" is a genuinely
 * different item.
 */
function baseWikiTitle(title) {
  return String(title)
    .replace(/\s*\((?:[^()]*)\)\s*$/, "")
    .trim();
}

/**
 * Search variants to try, in order.
 *
 * Foreign-language titles are the problem case: scene names drop the
 * accents ("Cien Anos De Perdon"), and Wikipedia's search then matches
 * unrelated articles, because it ranks on the accented form. Retrying
 * without the function words ("Cien Anos Perdon") often lands on the
 * right page, since the distinctive part is what is left.
 */
function queryVariants(title) {
  const full = cleanTitle(title);
  const withoutStopwords = full
    .split(/\s+/)
    .filter((w) => !FOREIGN_STOPWORDS.test(w))
    .join(" ")
    .trim();
  return [new Set([full, withoutStopwords])].size > 1 || withoutStopwords
    ? [...new Set([full, withoutStopwords])].filter(Boolean)
    : [full];
}

/** Function words that carry no identifying information. */
const FOREIGN_STOPWORDS =
  /^(?:de|del|la|el|los|las|un|una|le|les|des|du|et|der|die|das|ein|eine|und|il|lo|di|do|da|os|as|y|o|u|with|for|from)$/i;

/**
 * Resolve a library title to a Wikipedia page and return its details.
 * @returns {Promise<object|null>}
 */
async function resolve(title) {
  const langs = wikisFor(title);
  let best = null;
  let allScored = [];

  for (const lang of langs) {
    let hits = [];
    for (const term of queryVariants(title)) {
      hits = await searchWiki(term, lang);
      if (hits.length) break;
    }
    if (!hits.length) continue;

    const scored = hits
      .filter((h) => !isDisambiguation(h.title))
      .map((h) => ({
        ...h,
        // Score against the base title so "(الموسم الرابع)",
        // "(film)" and similar qualifiers do not sink an exact match.
        score: Math.max(
          similarity(title, h.title, extractYear(title), null),
          similarity(title, baseWikiTitle(h.title), extractYear(title), null),
        ),
      }))
      .sort((a, b) => b.score - a.score);

    allScored = allScored.concat(scored);
    if (scored.length && (!best || scored[0].score > best.score)) {
      best = scored[0];
    }
    // A confident hit in the first wiki is good enough; do not keep
    // hitting other languages for marginal gains (and rate limits).
    if (best && best.score >= 0.85) break;
  }

  if (!best || best.score < FLOOR) return null;

  // Try the best candidate, then its runners-up. A disambiguation stub
  // ("X may refer to:") titles well but carries no usable detail, so a
  // near-identical second choice beats returning nothing.
  const ordered = [best, ...allScored.filter((s) => s !== best)].sort(
    (a, b) => b.score - a.score,
  );

  const qYear = extractYear(title);
  for (const cand of ordered.slice(0, 4)) {
    if (cand.score < FLOOR) break;
    const page = await leadExtract(cand.title, cand.lang);
    if (!page) continue;
    if (isDisambiguationText(page.extract)) {
      // The page lists the works sharing this name. Following it
      // recovers titles like "El Cuerpo", where the bare name covers an
      // American film, a Spanish film and a novel at once.
      const followed = await followDisambiguation(cand.title, title, cand.lang);
      if (followed) return followed;
      continue;
    }

    // A page whose lead names a year, when the library title carries a
    // different one, is a different work — "Brothers (2015)" must not
    // resolve to the dictionary article "A brother". An undated lead is
    // allowed through, because plenty of short stubs have no year.
    const leadYear = extractYear(page.extract.slice(0, 200));
    if (qYear && leadYear && Math.abs(leadYear - qYear) > 1) continue;

    // The page must actually be about a film or a series. Titles like
    // "11.11" and "122" are numbers that collide with a numerology
    // article, a year list and a plain integer page; all of those title
    // well against a numeric filename but describe something else.
    if (!isMediaPage(page.extract)) continue;

    return toDetails(page, title, cand, langs[0]);
  }

  return null;
}

/**
 * Follow a disambiguation page to the work it points at.
 *
 * The page's own outbound links are the candidate list — far more
 * reliable than parsing its prose, because the prose says
 * "El cuerpo, película española de 2012." without naming the article
 * ("El cuerpo (película de 2012)") that holds the detail.
 *
 * Each linked article is fetched and the one that is actually a film or
 * series, and best matches the library title, wins. Returns null when
 * nothing in the list is usable.
 */
async function followDisambiguation(disambiguationTitle, libraryTitle, lang) {
  const links = await outlinks(disambiguationTitle, lang);
  if (!links.length) return null;

  const qYear = extractYear(libraryTitle);
  let best = null;

  for (const name of links.slice(0, 8)) {
    // A bare name usually redirects straight back here, and the year in
    // the library title has to agree with the article's own.
    const score = similarity(libraryTitle, baseWikiTitle(name), qYear, null);
    if (score < 0.5) continue;

    const page = await leadExtract(name, lang);
    if (!page || !page.extract) continue;
    if (isDisambiguationText(page.extract)) continue;
    if (!isMediaPage(page.extract)) continue;

    const leadYear = extractYear(page.extract.slice(0, 200));
    if (qYear && leadYear && Math.abs(leadYear - qYear) > 1) continue;

    if (!best || score > best.score) best = { page, name, score };
  }

  if (!best) return null;
  return toDetails(best.page, libraryTitle, { title: best.name, lang, score: best.score }, lang);
}

/** Outbound article links from a page, excluding navigation ones. */
async function outlinks(pageTitle, lang) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=links` +
    `&plnamespace=0&pllimit=30&redirects=1&titles=${encodeURIComponent(pageTitle)}`;
  const json = await getJson(url);
  const pages = json && json.query && json.query.pages;
  if (!pages) return [];
  const page = Object.values(pages)[0];
  const links = (page && page.links) || [];
  return links
    .map((l) => l.title)
    .filter((t) => !/^(?:List|Index|Outline|Template|Wikipedia|Portal|Category|Main Page|Special):/i.test(t))
    .slice(0, 12);
}

/** Build the details record from a Wikipedia lead extract. */
function toDetails(page, libraryTitle, hit) {
  const text = page.extract;
  const facts = parseLead(text);
  const title = baseWikiTitle(facts.title || hit.title);

  return {
    title: libraryTitle,
    canonicalTitle: title,
    type: facts.kind,
    director: facts.director,
    directors: facts.directors,
    creators: facts.creators,
    releaseDate: facts.year ? String(facts.year) : null,
    studio: facts.studio || null,
    networks: facts.networks,
    cast: facts.cast,
    genres: facts.genres,
    summaryAr: null,
    summaryEn: cleanSummary(text),
    links: [
      {
        label: "Wikipedia",
        // The API omits fullurl unless inprop=url is set; fall back to
        // the canonical path so the link is never rendered empty.
        url: page.fullurl || `https://${hit.lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
      },
    ],
    confidence: hit.score >= 0.85 ? "high" : "medium",
    source: "wikipedia",
    wikiTitle: hit.title,
  };
}

/** Pull year, kind, director, cast and networks out of a lead paragraph. */
function parseLead(text) {
  const out = { directors: null, cast: null, networks: null, genres: null };

  // Year: "is a 2019 American ...", "es una película española de 2012".
  //
  // Only a year in a release position counts. Grabbing the first
  // four-digit number in the lead is tempting but wrong: leads often
  // cite other years ("a sequel to the 2011 original"), and a wrong
  // release year makes the caller reject an otherwise correct match.
  const year =
    text.match(/\b(?:is|was|es|son|est)\s+(?:a|an|una|un)\s+[^.]{0,30}?\b((?:19|20)\d{2})\b/) ||
    text.match(/\b((?:19|20)\d{2})\s+(?:American|British|French|Indian|Japanese|Korean|Turkish|Arabic|Egyptian|Spanish|Italian|German|española|americana|française|inglesa)/i) ||
    // "película española de 2012", "film allemand de 1998"
    text.match(/\bde\s+((?:19|20)\d{2})\b/) ||
    text.match(/(?:سنة|عام)\s*((?:19|20)\d{2})/);
  if (year) out.year = Number(year[1]);

  // Kind. The medium is stated in the opening sentence, so only the head
  // of the extract is inspected. Scanning the whole article reads
  // derived works into the medium: Aladdin's page ends with "an
  // animated television series (1994-1995)", which filed a film as a
  // television series.
  const head = text.slice(0, 250);

  // The lead names the medium in the work's own language, so all the
  // languages the provider searches have to be recognised here.
  //
  // A bare "series" is deliberately NOT a signal: film leads end with
  // phrases like "based on Kishiro's science fiction manga series".
  if (/\b(?:television series|tv series|web series|miniseries|telenovela|sitcom)\b/i.test(head)) {
    out.kind = "series";
  } else if (/(?:مسلسل|سلسلة تلفزيونية)/.test(head)) {
    out.kind = "series";
  } else if (
    /\b(?:serie|serie televisiva|dizi|série)\b/i.test(head) &&
    !/\b(?:pel[ií]cula|film|movie|anime)\b/i.test(head)
  ) {
    out.kind = "series";
  } else if (/\b(?:animated series|anime series)\b/i.test(head)) {
    out.kind = "anime";
  } else if (
    /\b(?:film|films|franchise)\b/i.test(head) ||
    /(?:فيلم|فيلم متحرك)/.test(head) ||
    /\b(?:pel[ií]cula|filme|cine)\b/i.test(head) ||
    /(?:фильм|映画|電影|영화)/.test(head)
  ) {
    out.kind = "film";
  }

  // The subject is what comes before "is a/was a". Wikipedia leads often
  // append an alias clause ("Resident Evil, also known as Biohazard in
  // Japan, is a series..."), so the subject is cut at the first comma or
  // parenthesis as well as at the verb.
  const subject = text.match(/^([^,()]{1,120}?)\s+(?:is|was)\s+(?:a|an)\b/);
  if (subject) out.title = subject[1].replace(/\s*\(.*?\)\s*$/, "").trim();

  // Director(s): "directed by X", "directed by X and Y".
  // The capture runs to the next credit keyword, so "directed by
  // Abbas-Mustan and produced by Venus Movies" does not turn the
  // production company into a co-director.
  //
  // The verbs differ per language, because the provider searches more
  // than one wiki and the lead names its own credits.
  const dir =
    text.match(/\b(?:directed|dirigida|dirigido|dirigée|regie|oynetmen|yönetmen)\s+(?:by\s+|por\s+)?([^.;]{2,160})/i) ||
    text.match(/(?:إخراج|اخراج|توجيه)\s+([^.،؛]{2,160})/);
  if (dir) {
    // A lead often trails a clause onto the credit: "directed by Rob
    // Schneider in his directorial debut". A name is a person, so stop
    // at the first preposition that starts a new phrase.
    const names = splitNames(dir[1]);
    out.directors = names;
    out.director = names[0];
  }
  if (dir) {
    const names = splitNames(dir[1]);
    out.directors = names;
    out.director = names[0];
  }

  // Series: "created, written, and directed by X" / "created by X".
  const created =
    text.match(/\bcreated(?:,| and|,\s*written,| and written,)(?: written)?(?: and)?(?: directed)? by ([^.;]{2,160})/i) ||
    text.match(/\bcreated by ([^.;]{2,160})/i);
  if (created) {
    const names = splitNames(created[1]);
    if (!out.director && names.length) {
      out.directors = names;
      out.director = names[0];
    } else if (names.length) {
      out.creators = names;
    }
  }

  // Cast: "starring X", "starring X and Y", "starring X, Y and Z",
  // "It stars X, Y". Wikipedia stops the list at the first verb or
  // clause, so the capture is bounded and then trimmed below.
  const starring =
    text.match(/\b(?:starring|stars|protagonizada|protagonizados|interpretada|interpretado|con)\s+([^.,;،؛]{2,180})/i) ||
    text.match(/(?:بطولة|تمثيل|نجوم)\s+([^.،؛]{2,180})/);
  if (starring) out.cast = splitNames(starring[1]);

  // Networks: "for AMC", "on Netflix", "for the BBC".
  const net = text.match(/\b(?:for|on)\s+(?:the\s+)?(BBC(?:\s+(?:One|Two|Three|Four))?|AMC|Netflix|HBO(?:\s+Max)?|Hulu|Disney\+|Apple TV\+|FX|CNN|Showtime|NBC|ABC|CBS|Channel \d|Viki|SonY ?Liv|Amazon Prime Video)\b/i);
  if (net) out.networks = [net[1]];

  out.genres = parseGenres(text);

  return out;
}

/** Nationalities and language adjectives that are not genres. */
const NON_GENRES = new Set([
  "american", "british", "indian", "japanese", "korean", "turkish",
  "arabic", "egyptian", "french", "spanish", "italian", "german",
  "canadian", "australian", "irish", "scottish", "welsh", "hong",
  "kong", "chinese", "taiwanese", "dutch", "swedish", "russian",
  "polish", "mexican", "brazilian", "iranian", "pakistani", "saudi",
  "emirati", "qatari", "kuwaiti", "lebanese", "syrian", "sudanese",
  "nigerian", "ghanaian", "kenyan", "south", "north", "african",
  "european", "asian", "latin", "soviet", "serbian", "croatian",
  "hungarian", "czech", "greek", "brazilian", "filipino",
  "hindi", "language", "urdu", "telugu", "tamil", "hindi-language",
  "malayalam", "bengali", "marathi", "punjabi",
]);

/** Genre words we recognise, so we can normalise them to Arabic. */
const GENRE_MAP = {
  action: "أكشن",
  adventure: "مغامرة",
  comedy: "كوميديا",
  drama: "دراما",
  thriller: "إثارة",
  horror: "رعب",
  "science fiction": "خيال علمي",
  "sci-fi": "خيال علمي",
  fantasy: "فانتازيا",
  crime: "جريمة",
  mystery: "غموض",
  romance: "رومانسي",
  western: "ويسترن",
  war: "حرب",
  historical: "تاريخي",
  documentary: "وثائقي",
  animation: "رسوم متحركة",
  animated: "رسوم متحركة",
  biographical: "سيرة ذاتية",
  musical: "موسيقي",
  mystery: "غموض",
  survival: "بقاء",
  dystopian: "ديستوبي",
  superhero: "أبطال خارقون",
  psychological: "نفسي",
  political: "سياسي",
  medical: "طبي",
  legal: "قانوني",
  coming: "نشأة",
  "science": "علمي",
  spy: "تجسس",
  heist: "سطو",
  martial: "قتال",
  sports: "رياضي",
};

/**
 * Pull the genre list out of a lead sentence.
 *
 * The genre words sit between the nationality and the word "film" /
 * "series": "a 2009 Indian Hindi-language coming-of-age comedy-drama
 * film". Splitting on hyphens and commas alone produces junk like
 * "language coming" / "age comedy", so instead we scan for the longest
 * run of words that are known genres and keep those.
 */
function parseGenres(text) {
  const head = text.slice(0, 260);
  const found = [];
  // Hyphen- and comma-joined compounds first: "comedy-drama",
  // "action, adventure".
  const compounds = head.match(/\b([a-z]+(?:-(?:[a-z]+)){1,3})\b(?=[^a-z-]{0,20}(?:film|series|telenovela|anime))/gi) || [];
  for (const c of compounds) {
    const parts = c.split("-");
    for (const p of parts) {
      const g = GENRE_MAP[p.toLowerCase()];
      if (g && !found.includes(g)) found.push(g);
    }
  }
  // Then standalone genre words.
  const words = head.match(/\b([a-z]{4,})\b/g) || [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (NON_GENRES.has(key)) continue;
    const g = GENRE_MAP[key];
    if (g && !found.includes(g)) found.push(g);
  }
  return found.length ? found.slice(0, 4) : null;
}

/**
 * Credit keywords that end a name list. Wikipedia leads pack several
 * credits into one clause ("directed by A and B, produced by C, and
 * written by D"); only the names before the next credit belong to the
 * field we are parsing.
 */
const CREDIT_WORDS =
  /\b(?:produced|written|screenplay|created|co-written|adapted|starring|stars|edited|produced by|from a|from an|based on|distributed|released|composed|cinematograph\w*)\b/i;

/** "A, B and C" -> ["A", "B", "C"], stopping at the next credit keyword. */
function splitNames(text) {
  const cut = String(text).split(CREDIT_WORDS)[0];
  return cut
    // Arabic writes "and" as a prefix joined to the next word ("وبطولة
    // X"), so it has to split too or "كريم أبو زيد وبطولة ..." becomes
    // one long name.
    .split(/,|\band\b|،|؛|و(?=بطولة| ROBERT)|\sو\s/i)
    .map((s) =>
      s
        .replace(/\s*\([^)]*\)\s*/g, "")
        // A dangling "and" or hyphen left by the split.
        .replace(/^[\s\-–—&]+|[\s\-–—&]+$/g, "")
        .trim(),
    )
    .map(stripNamePrefix)
    .filter((s) => s.length > 1 && s.length < 60 && !CREDIT_WORDS.test(s))
    .filter(isPlausibleName)
    .slice(0, 6);
}

/**
 * Cut a name at the first word that starts a new phrase.
 *
 * Leads append clauses to credits: "directed by Rob Schneider in his
 * directorial debut", "Hwang Dong-hyuk for Netflix", "written by Jane
 * Doe and directed by...". A person's name ends where the next phrase
 * begins, so the capture is trimmed here rather than showing the whole
 * clause on the page.
 */
const PHRASE_BREAK =
  /\s+(?:in|for|on|at|with|from|under|as|his|her|their|its|and|who|which|while|when|de|del|en|von|zu|para|por|con|à|au)\s+/i;

function stripNamePrefix(name) {
  let out = String(name);
  const cut = out.split(PHRASE_BREAK)[0];
  // Only accept the cut if what remains still looks like a name.
  if (cut.length >= 3 && isPlausibleName(cut)) out = cut;
  return out.replace(/[.,;]$/, "").trim();
}

/**
 * A person's name starts with a capital and is not a bare role word.
 * "as Oppenheimer" and "and B" are sentence fragments, not names.
 *
 * The capital test only applies to scripts that have case. Arabic,
 * CJK and Devanagari have none, so requiring one would reject every
 * non-Latin name — which is most of this library.
 */
function isPlausibleName(name) {
  if (/^(?:as|the|a|an|its|his|her|their|who|which|when|while|starring|co)\b/i.test(name)) {
    return false;
  }
  if (/^\p{Lu}/u.test(name)) return true;
  // Caseless scripts: accept any Arabic or East Asian letter.
  return /^[\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/u.test(name);
}

/**
 * Reduce the lead to a spoiler-free summary.
 *
 * Wikipedia leads describe the work, not its resolution, so the opening
 * sentences are safe. Three sentences is usually enough to say what the
 * thing is, who made it and where it sits; anything past that starts
 * reading like plot, and the detail page wants a summary, not an
 * article.
 */
function cleanSummary(text) {
  const sentences = text.split(/(?<=[.!؟])\s+/).slice(0, 3).join(" ").trim();
  if (sentences.length <= 700) return sentences;

  // Still long: cut on a sentence boundary inside the budget.
  const window = sentences.slice(0, 700);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  return (lastStop > 120 ? window.slice(0, lastStop + 1) : window).trim() + "…";
}

module.exports = { resolve, searchWiki, parseLead, isMediaPage, isDisambiguationText };