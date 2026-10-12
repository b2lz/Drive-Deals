"use strict";
// Wikipedia provider for games that are not on Steam.
//
// The games category has more than a thousand entries and a good third
// of them are not Steam titles: retail exclusives, older releases
// delisted from the store, Epic/GOG-only releases and collections.
// Steam returns nothing for those, so their pages render empty.
//
// Wikipedia cannot supply system requirements, but its video-game
// infobox is structured and carries exactly the rest of the record:
// developer, publisher, director, platforms, engine, series and release
// date. That turns a blank page into a useful one.
//
// Used only as a fallback — a page with Steam's real requirements is
// always better than one assembled from an infobox, so the orchestrator
// tries Steam first.

const { getJson } = require("./http");
const { cleanTitle, similarity, extractYear, coversAllTokens } = require("./match");

const FLOOR = 0.72;

/**
 * Query variants to try, in order.
 *
 * The games shelf is the messiest in the library. Three shapes stop a
 * plain lookup:
 *
 *   "bioshock 1"                 a sequel number the article drops
 *   "CallOfDutyModernWarfare"    run together, no spaces at all
 *   "Assassins.Creed.Valhalla"   dots for spaces, which cleaning fixes
 *
 * A relaxed retry rescues the first two without loosening the match
 * rules: the candidate still has to cover every word in the title.
 */
function queryVariants(title) {
  const full = cleanTitle(title);
  const out = [full];

  // Run-together words: "CallOfDutyModernWarfareRemastered".
  const split = splitCamel(full);
  if (split !== full) out.push(split);

  // All-caps runs: "BEAMNG" -> "BEAM NG".
  const uncapped = splitCaps(full);
  if (uncapped !== full && !out.includes(uncapped)) out.push(uncapped);

  // A trailing sequel number the article never carries: "bioshock 1".
  const noNumber = full.replace(/\s+\d+$/, "").trim();
  if (noNumber && noNumber !== full) out.push(noNumber);

  return [...new Set(out.filter(Boolean))];
}

/**
 * Fragments that are words on their own but look like part of a
 * run-together name: "CallOfDuty" has to become "Call Of Duty", and a
 * case-boundary split alone leaves "OfDuty".
 *
 * Only these are inserted. Splitting on every capital would shred real
 * names like "Diablo" or "McGee".
 */
const WORD_FRAGMENTS = ["Of", "The", "A", "An", "And", "In", "On", "To", "For", "With", "At", "By"];

/** "CallOfDutyModernWarfare" -> "Call Of Duty Modern Warfare". */
function splitCamel(text) {
  if (!/[a-z][A-Z]/.test(text)) return text;
  let out = text
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  // Now peel off the known word fragments that are still glued on.
  // After the case-boundary pass a fragment can sit at the start of a
  // word ("Call OfDuty") or glued inside one ("LordOfTheRings"), so
  // both positions have to be handled.
  const frag = new RegExp(`(^|\\s|[a-z])(${WORD_FRAGMENTS.join("|")})(?=[A-Z])`, "g");
  out = out.replace(frag, "$1$2 ");

  return out.replace(/\s{2,}/g, " ").trim();
}

/** "BEAMNG" -> "BEAM NG", "XBOXONE" -> "XBOX ONE". */
function splitCaps(text) {
  return text.replace(/\b([A-Z]{2,})\b(?=[A-Z])/g, "$1 ").replace(/([A-Z])([A-Z]{2,})\b/g, "$1 $2");
}

/** Which wikis to search, given the script of the title. */
function wikisFor(title) {
  const isArabic = /[\u0600-\u06FF]/.test(title);
  return isArabic ? ["ar", "en"] : ["en"];
}

async function searchWiki(term, lang) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&list=search` +
    `&srlimit=8&srsearch=${encodeURIComponent(term)}`;
  const json = await getJson(url);
  return ((json && json.query && json.query.search) || []).map((h) => ({
    title: h.title,
    lang,
  }));
}

/** Raw wikitext, which is where the infobox lives. */
async function wikitext(pageTitle) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions" +
    `&rvprop=content&rvslots=main&redirects=1&titles=${encodeURIComponent(pageTitle)}`;
  const json = await getJson(url);
  const pages = json && json.query && json.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const rev = page && page.revisions && page.revisions[0];
  return (rev && rev.slots && rev.slots.main && rev.slots.main["*"]) || null;
}

/** The lead paragraph as plain text. */
async function leadExtract(pageTitle, lang) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&inprop=url` +
    `&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(pageTitle)}`;
  const json = await getJson(url);
  const pages = json && json.query && json.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page && page.extract ? page : null;
}

/** Only a video-game article is acceptable here. */
function isGamePage(wikitext, extract) {
  if (wikitext && /\{\{\s*Infobox\s+(?:video\s?game|game)/i.test(wikitext)) return true;
  if (extract && /\b(video game|game developed by|is a \d{4} .*game)\b/i.test(extract.slice(0, 300))) {
    return true;
  }
  return false;
}

/**
 * Resolve a library title to a Wikipedia game article.
 * @returns {Promise<object|null>}
 */
async function resolve(title) {
  let best = null;
  const allScored = [];
  // True when the search used a rewritten query rather than the cleaned
  // title. The coverage guard below is enforced either way — a relaxed
  // query only widens the search, never the set of acceptable answers.
  let relaxed = false;

  for (const lang of wikisFor(title)) {
    let hits = [];
    let term = null;
    for (const candidate of queryVariants(title)) {
      hits = await searchWiki(candidate, lang);
      if (hits.length) {
        term = candidate;
        break;
      }
    }
    if (!hits.length) continue;
    relaxed = term !== cleanTitle(title);

    const scored = hits
      .filter((h) => !/^\s*(List|Index|Outline)\s+of/i.test(h.title))
      .map((h) => ({
        ...h,
        score: similarity(title, baseTitle(h.title), extractYear(title), null),
      }))
      .sort((a, b) => b.score - a.score);

    allScored.push(...scored);
    if (scored.length && (!best || scored[0].score > best.score)) best = scored[0];
    if (best && best.score >= 0.95) break;
  }

  if (!best || best.score < FLOOR) return null;

  // Full-coverage guard. A franchise article shares its name with every
  // entry in the franchise, so on similarity alone "Assassins.Creed.Valhalla"
  // would happily accept the article "Assassin's Creed" — wrong game,
  // wrong developer, wrong plot. Only an article that accounts for every
  // word in the library title may be used.
  const ordered = [best, ...allScored.filter((s) => s !== best)].sort(
    (a, b) => b.score - a.score,
  );

  for (const cand of ordered.slice(0, 3)) {
    if (cand.score < FLOOR) break;
    if (!coversAllTokens(title, baseTitle(cand.title))) continue;

    const page = await leadExtract(cand.title, cand.lang);
    if (!page || !page.extract) continue;

    const text = await wikitext(cand.title);
    if (!isGamePage(text, page.extract)) continue;

    return toDetails(page, text, title, cand, cand.score);
  }

  return null;
}

/** Strip the "(video game)" qualifier Wikipedia puts on game articles. */
function baseTitle(title) {
  return String(title).replace(/\s*\(\s*(?:video\s?game|game|console game|PC game)\s*\)\s*$/i, "").trim();
}

/** Build the details record. */
function toDetails(page, wikitext, libraryTitle, hit, score) {
  const facts = parseInfobox(wikitext || "");
  const text = page.extract;

  const releaseDate =
    facts.released && /^\d{4}-\d{2}/.test(facts.released)
      ? facts.released.slice(0, 10)
      : facts.released && /^\d{4}$/.test(facts.released)
        ? facts.released
        : facts.year || null;

  return {
    title: libraryTitle,
    canonicalTitle: baseTitle(facts.title || hit.title),
    type: "game",
    developer: facts.developer,
    publisher: facts.publisher,
    releaseDate,
    platforms: facts.platforms,
    genres: facts.genres,
    engine: facts.engine,
    series: facts.series,
    summaryAr: null,
    summaryEn: cleanSummary(text),
    // Wikipedia does not publish minimum/recommended specs in a form we
    // can parse, so this stays null and the requirements tab is hidden
    // rather than faked.
    requirements: null,
    links: [
      {
        label: "Wikipedia",
        url: page.fullurl || `https://${hit.lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
      },
    ],
    confidence: score >= 0.85 ? "high" : "medium",
    source: "wikipedia",
    wikiTitle: hit.title,
    needsRequirements: true,
  };
}

const PLATFORM_AR = {
  "Microsoft Windows": "PC",
  Windows: "PC",
  "Xbox 360": "Xbox 360",
  "Xbox One": "Xbox One",
  "Xbox Series X/S": "Xbox Series X|S",
  "PlayStation 2": "PlayStation 2",
  "PlayStation 3": "PlayStation 3",
  "PlayStation 4": "PlayStation 4",
  "PlayStation 5": "PlayStation 5",
  "Nintendo 64": "Nintendo 64",
  "Game Boy": "Game Boy",
  "Game Boy Advance": "Game Boy Advance",
  "Nintendo Switch": "Nintendo Switch",
  macOS: "macOS",
  Linux: "Linux",
  iOS: "iOS",
  Android: "Android",
  "Google Stadia": "Stadia",
  "Ouya": "Ouya",
  "PlayStation Vita": "PlayStation Vita",
};

const GENRE_AR = {
  "First-person shooter": "إطلاق نار من منظور أول",
  "Third-person shooter": "إطلاق نار من منظور ثالث",
  "Action-adventure": "أكشن ومغامرة",
  "Action role-playing": "أكشن وتقمص أدوار",
  "role-playing": "تقمص أدوار",
  Adventure: "مغامرة",
  Action: "أكشن",
  Platform: "منصات",
  Puzzle: "ألغاز",
  Fighting: "قتال",
  Racing: "سباق",
  Sports: "رياضات",
  Simulation: "محاكاة",
  Strategy: "استراتيجية",
  "Real-time strategy": "استراتيجية لحظية",
  "Turn-based strategy": "استراتيجية بالأدوار",
  "Massively multiplayer online": "MMO",
  Shooter: "إطلاق نار",
  Stealth: "تسلل",
  Survival: "بقاء",
  Rhythm: "إيقاع",
  Roguelike: "روغلايك",
  "Battle royale": "باتل رويال",
  "Hack and slash": "قطع وتقطيع",
  "Metroidvania": "ميترويدفانيا",
  Sandbox: "عالم مفتوح حر",
  "Open world": "عالم مفتوح",
  Horror: "رعب",
  "Sci-fi": "خيال علمي",
  "Science fiction": "خيال علمي",
  Fantasy: "فانتازيا",
  Comedy: "كوميديا",
  Drama: "دراما",
  Thriller: "إثارة",
  Mystery: "غموض",
  Crime: "جريمة",
  Romance: "رومانسي",
  Adventure_game: "مغامرة",
  Educational: "تعليمي",
  "Music video": "فيديو موسيقي",
  "Visual novel": "رواية بصرية",
  "Interactive fiction": "رواية تفاعلية",
  "God game": "لعبة إله",
  Roguelike_game: "روغلايك",
  "Auto battler": "قتال آلي",
  "Tower defense": "دفاع عن الأبراج",
  "Massively multiplayer": "MMO",
  "Multiplayer online battle arena": "MOBA",
};

/**
 * Read the {{Infobox video game}} parameters.
 *
 * Only plain `key = value` pairs are handled; the nested `{{ubl}}`
 * lists and `<ref>` tags are reduced to their readable text. That is
 * enough for the fields the detail page shows.
 */
/**
 * Walk an infobox block and return its top-level [key, rawValue] pairs.
 *
 * Three kinds of nesting have to be understood, or the scan goes wrong:
 *   {{template}}          braces contain pipes       {{cite web|title=Y}}
 *   [[link|label]]        links contain pipes        [[Valve|Valve]]
 *   <ref ...>...</ref>    tags span lines and carry templates
 *
 * A regular expression cannot tell a real `| title =` from one inside a
 * citation, and cannot tell where a piped link's value ends, so this
 * walks the string once instead.
 */
function scanInfoboxFields(block) {
  const out = [];
  let i = 0;

  while (i < block.length) {
    const two = block.slice(i, i + 2);

    // Skip whole nested regions wherever they appear.
    if (two === "{{") {
      i = skipBraces(block, i);
      continue;
    }
    if (two === "[[") {
      i = skipBraces(block, i, "[[", "]]");
      continue;
    }
    if (block[i] === "<") {
      // A tag. Some are containers — <ref>...</ref>, <small>...</small> —
      // so the closing tag has to be consumed too, otherwise the "</ref>"
      // remainder is scanned as content and its trailing pipe starts a
      // phantom field.
      const close = block.indexOf(">", i);
      if (close === -1) {
        i = block.length;
        continue;
      }
      const tag = block.slice(i, close + 1);
      const nameMatch = /^<\s*\/?\s*([A-Za-z][A-Za-z0-9]*)/.exec(tag);
      const name = nameMatch ? nameMatch[1].toLowerCase() : "";
      const selfClosing = tag.endsWith("/>") || name === "br" || name === "hr";

      if (!selfClosing && !tag.startsWith("</")) {
        const endTag = "</" + name;
        const endAt = block.toLowerCase().indexOf(endTag, close);
        if (endAt !== -1) {
          const gt = block.indexOf(">", endAt);
          i = gt === -1 ? block.length : gt + 1;
          continue;
        }
      }
      i = close + 1;
      continue;
    }

    if (block[i] !== "|") {
      i++;
      continue;
    }

    // "| key =" at the top level?
    const head = /^\|\s*([A-Za-z_][A-Za-z0-9 _'-]*?)\s*=/.exec(block.slice(i, i + 80));
    if (!head) {
      i++;
      continue;
    }

    const key = head[1].trim().toLowerCase().replace(/\s+/g, "_");
    const valueStart = i + head[0].length;

    // The value ends at the next top-level pipe or newline.
    let j = valueStart;
    while (j < block.length) {
      const ch = block[j];
      const pair = block.slice(j, j + 2);
      if (pair === "{{") { j = skipBraces(block, j); continue; }
      if (pair === "[[") { j = skipBraces(block, j, "[[", "]]"); continue; }
      if (ch === "<") {
        // Consume a whole container tag so its body cannot end the value.
        const close = block.indexOf(">", j);
        if (close === -1) { j = block.length; break; }
        const tag = block.slice(j, close + 1);
        const nameMatch = /^<\s*\/?\s*([A-Za-z][A-Za-z0-9]*)/.exec(tag);
        const name = nameMatch ? nameMatch[1].toLowerCase() : "";
        const selfClosing = tag.endsWith("/>") || name === "br" || name === "hr";
        if (!selfClosing && !tag.startsWith("</")) {
          const endAt = block.toLowerCase().indexOf("</" + name, close);
          if (endAt !== -1) {
            const gt = block.indexOf(">", endAt);
            j = gt === -1 ? block.length : gt + 1;
            continue;
          }
        }
        j = close + 1;
        continue;
      }
      if (ch === "|" || ch === "\n" || pair === "}}") break;
      j++;
    }

    out.push([key, block.slice(valueStart, j).trim()]);
    i = j;
  }

  return out;
}

/** Advance past a balanced open/close pair starting at `start`. */
function skipBraces(text, start, open = "{{", close = "}}") {
  let depth = 0;
  let i = start;
  while (i < text.length - 1) {
    const pair = text.slice(i, i + 2);
    if (pair === open) {
      depth++;
      i += 2;
    } else if (pair === close) {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else {
      i++;
    }
  }
  return text.length;
}

function parseInfobox(src) {
  const start = src.search(/\{\{\s*Infobox\s+(?:video\s?game|game)/i);
  if (start === -1) return {};

  // Find where the infobox template ends. A naive "two closing braces
  // ends it" rule truncates the block mid-template; walking the braces
  // handles nesting. If the source is truncated mid-template (which
  // happens on some pages), fall back to the end of the input rather
  // than discarding the fields we already found.
  const closeAt = skipBraces(src, start);
  const end = closeAt >= src.length ? src.length : closeAt;

  const block = src.slice(start, end);
  // Skip the template's own name so it is not scanned as a region.
  const body = block.slice(block.indexOf("\n") + 1);
  const out = {};

  // The key scanner walks the block once, tracking nesting, instead of
  // running a regex over it. A regex cannot tell "| title = Y" inside
  // "{{cite web|title=Y}}" from a real infobox field, and would
  // invent a `title` field from a citation — or truncate a piped wiki
  // link's value. Walking makes both impossible.
  const fields = scanInfoboxFields(body);
  for (const [key, value] of fields) {
    if (!out[key]) out[key] = value;
  }

  return {
    title: stripLink(out.title),
    developer: firstName(out.developer),
    publisher: firstName(out.publisher),
    director: firstName(out.director),
    platforms: platformList(out.platforms),
    // The field is "genre" on some articles and "genres" on others.
    genres: genreList(out.genre || out.genres),
    engine: firstName(out.engine),
    series: firstName(out.series),
    released: cleanValue(out.released) || null,
  };
}

/** Strip wiki markup from an infobox value. */
function cleanValue(value) {
  let v = String(value).trim();

  // 1. Footnotes and citations. They contain pipes and braces that
  //    confuse every later step, so they go first.
  v = v.replace(/<ref[^>]*\/>/gi, "");
  v = v.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  v = v.replace(/\{\{\s*(?:efn|cite|citation|sfn)\b[\s\S]*?\}\}/gi, "");

  // 2. Explicit breaks become separators before the list templates are
  //    expanded, so "{{ubl|A<br />{{ubl|B}}}}" yields "A, B" and not "AB".
  v = v.replace(/<br\s*\/?>/gi, " | ");

  // 2b. {{vgrelease|JP|Publisher}} marks a regional publisher. The
  //     region tag is dropped but a separator is kept, so
  //     "[[Bandai Namco]]{{vgrelease|JP|[[FromSoftware]]}}" reads as
  //     "Bandai Namco, FromSoftware" instead of running the two names
  //     together.
  v = v.replace(
    /\{\{\s*(?:vgrelease|vref)\s*\|\s*[A-Za-z]{2,3}\s*\|([\s\S]*?)\}\}/gi,
    ", $1",
  );
  v = v.replace(
    /\{\{\s*(?:release|videogamerelease)\s*\|\s*([\s\S]*?)\}\}/gi,
    "$1",
  );

  // 3. List templates, which are what carry multiple values.
  v = v.replace(
    /\[\[\s*(?:ubl|flatlist|plainlist|hlist|unbulleted list|cfv|columns-list)\s*:?\s*([\s\S]*?)\]\]/gi,
    "",
  );
  v = v.replace(
    /\{\{\s*(?:ubl|flatlist|plainlist|hlist|unbulleted list|cfv|columns-list)\s*\|([\s\S]*?)\}\}/gi,
    (_, inner) =>
      inner
        .split("|")
        .map((s) => cleanValue(s))
        .filter(Boolean)
        .join(", "),
  );

  // 4. Any remaining template: keep its last non-empty positional
  //    argument, which is normally the readable label.
  v = v.replace(/\{\{([^{}|]*)\}\}/g, (_m, body) => {
    const parts = body.split("|");
    const named = parts.find((p) => /^[\w-]+\s*=/.test(p));
    if (named) {
      const eq = named.indexOf("=");
      return cleanValue(named.slice(eq + 1));
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const v2 = cleanValue(parts[i]);
      if (v2) return v2;
    }
    return "";
  });

  // 5. Links. A piped link keeps the *display* text, which is the part
  //    after the pipe: "[[Valve Corporation|Valve]]" reads as "Valve".
  //    Nested links ([[a|[[b]] c]]) need repeating, since one pass
  //    would leave "[[b" behind.
  for (let i = 0; i < 5 && v.includes("[["); i++) {
    v = v
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
      .replace(/\[\[([^\]]*)\]\]/g, "$1");
  }
  v = v.replace(/\[\[|\]\]/g, "");

  // 6. Formatting and leftover separators.
  v = v.replace(/'''?/g, "");
  v = v.replace(/''[a-z]*\d*''/gi, "");
  v = v.replace(/<!--[\s\S]*?-->/g, "");

  // 7. A template truncated by the infobox boundary can be left open,
  //    e.g. "{{vgrelease". Nothing useful follows the name, so the
  //    remnant is dropped rather than printed.
  v = v.replace(/\{\{[^{}]*$/, "");
  v = v.replace(/\}\}/g, "");
  v = v.replace(/\{\{/g, "");
  // ...and the name of an already-expanded template can survive as bare
  // text when its body was empty ("Bandai Namco Entertainmentvgrelease").
  v = v.replace(
    /\b(?:vgrelease|vref|video game release|videogamerelease|sort|nowrap|small|big|start date|end date|released)\b\s*$/i,
    "",
  );

  v = v.replace(/\|/g, ", ");
  v = v.replace(/,(\s*,)*\s*$/, "").replace(/^\s*,\s*/, "");
  v = v.replace(/\s{2,}/g, " ").trim();
  return v;
}

/** "Crytek (Remastered)" -> "Crytek". */
function firstName(value) {
  if (!value) return null;
  const first = cleanValue(value).split(/,\s*|\s+and\s+|\s+–\s*/)[0];
  return stripLink(first) || null;
}

function stripLink(value) {
  if (!value) return null;
  let v = cleanValue(value);
  // Link targets often carry a disambiguator the reader does not need:
  // "Battlefield (video game series)" -> "Battlefield".
  v = v.replace(/\s*\([^)]*\)\s*$/, "").trim();
  // An all-empty value is "no value", not the string "undefined".
  if (!v || v === "''" || v === "undefined") return null;
  return v;
}

/** Map infobox platform names onto the labels the page uses. */
function platformList(value) {
  if (!value) return null;
  const parts = cleanValue(value)
    .split(/,|;|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  for (const raw of parts) {
    // Remastered/port notes ride along with the platform name.
    const clean = raw.replace(/\(?\b(?:remastered|remaster|enhanced|port|collection)\b\)?/gi, "").trim();
    const ar = PLATFORM_AR[clean];
    if (ar && !out.includes(ar)) out.push(ar);
  }
  return out.length ? out : null;
}

function genreList(value) {
  if (!value) return null;
  const parts = cleanValue(value)
    .split(/,|\||\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    const ar = GENRE_AR[p] || GENRE_MAP_LOOSE[p.toLowerCase()];
    if (ar && !out.includes(ar)) out.push(ar);
  }
  return out.length ? out.slice(0, 5) : null;
}

/** Genres spelled differently from Steam's labels. */
const GENRE_MAP_LOOSE = {
  "first person shooter": "إطلاق نار من منظور أول",
  "third person shooter": "إطلاق نار من منظور ثالث",
  "action adventure": "أكشن ومغامرة",
  "action role playing": "أكشن وتقمص أدوار",
  "role playing game": "تقمص أدوار",
  "real time strategy": "استراتيجية لحظية",
  "massively multiplayer": "MMO",
  "hack and slash": "قطع وتقطيع",
  "battle royale": "باتل رويال",
  "open world": "عالم مفتوح",
  "city building": "بناء مدن",
  "tower defense": "دفاع عن الأبراج",
  "god game": "لعبة إله",
  "life simulation": "محاكاة حياة",
  "dating sim": "محاكاة مواعدة",
  "rhythm game": "إيقاع",
  "puzzle game": "ألغاز",
  "sports game": "رياضات",
  "vehicle simulation": "محاكاة مركبات",
  "flight simulation": "محاكاة طيران",
  "first person": "منظور أول",
  "third person": "منظور ثالث",
};

/** Three sentences, cut on a sentence boundary, so no plot leaks in. */
function cleanSummary(text) {
  const sentences = String(text).split(/(?<=[.!?])\s+/).slice(0, 3).join(" ").trim();
  if (sentences.length <= 700) return sentences;
  const window = sentences.slice(0, 700);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  return (lastStop > 120 ? window.slice(0, lastStop + 1) : window).trim() + "…";
}

module.exports = {
  resolve,
  parseInfobox,
  isGamePage,
  scanInfoboxFields,
  cleanValue,
  queryVariants,
};