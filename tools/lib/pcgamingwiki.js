"use strict";
// PCGamingWiki provider.
//
// A community-maintained wiki of PC games with a public API and no key.
// Two things make it worth using alongside Steam and SystemRequirementsLab:
//
//   1. Its system requirements live in a `{{System requirements}}`
//      template with named min/rec fields, so they can be read exactly
//      rather than scraped out of page layout.
//   2. It covers older and niche releases that no store lists, and it
//      names games the way players do — "American McGee's Alice" is
//      reachable here and is not on Steam at all.
//
// The wiki is PC-only, which is fine: this shelf is PC releases.

const { getJson } = require("./http");
const { cleanTitle, similarity, coversAllTokens, extractYear } = require("./match");

const FLOOR = 0.75;

/** The fields the requirements template uses, and where they land. */
const FIELD_MAP = {
  minOS: ["os", "minimum"],
  recOS: ["os", "recommended"],
  minCPU: ["cpu", "minimum"],
  recCPU: ["cpu", "recommended"],
  recCPU2: ["cpu", "recommended"],
  minRAM: ["ram", "minimum"],
  recRAM: ["ram", "recommended"],
  minGPU: ["gpu", "minimum"],
  recGPU: ["gpu", "recommended"],
  recGPU2: ["gpu", "recommended"],
  minVRAM: ["vram", "minimum"],
  recVRAM: ["vram", "recommended"],
  minHD: ["storage", "minimum"],
  recHD: ["storage", "recommended"],
  minDX: ["directx", "minimum"],
  recDX: ["directx", "recommended"],
};

async function search(term) {
  const json = await getJson(
    "https://www.pcgamingwiki.com/w/api.php?action=query&format=json&list=search" +
      `&srlimit=10&srsearch=${encodeURIComponent(term)}`,
  );
  const hits = (json && json.query && json.query.search) || [];
  return hits.map((h) => h.title);
}

async function wikitext(title) {
  const json = await getJson(
    "https://www.pcgamingwiki.com/w/api.php?action=parse&format=json&prop=wikitext" +
      `&page=${encodeURIComponent(title)}`,
  );
  return json && json.parse ? json.parse.wikitext["*"] : null;
}

/**
 * Read the `{{System requirements}}` template.
 *
 * The template is line-oriented — `|minOS   = XP` — and is read one line
 * at a time until it closes with `|}}`. Brace matching cannot be used
 * because the values contain nested templates such as `{{ii}}`.
 */
function parseRequirements(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^\s*\|\s*OSfamily\s*=/i.test(l));
  if (start === -1) return null;

  const minimum = {};
  const recommended = {};

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    // The template ends here; anything after belongs to the article.
    if (/^\s*\|\}\s*$/.test(line)) break;

    const m = /^\s*\|\s*(\w+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;

    const target = FIELD_MAP[m[1]];
    if (!target) continue;

    const value = cleanValue(m[2]);
    if (!value) continue;

    const [field, preset] = target;
    const bucket = preset === "minimum" ? minimum : recommended;

    // A second value per field (recCPU2, recGPU2) lists an alternative
    // part, so it is joined rather than replacing the first.
    bucket[field] = bucket[field] ? `${bucket[field]} / ${value}` : value;
  }

  if (!Object.keys(minimum).length && !Object.keys(recommended).length) return null;

  // A block carrying only an operating system tells a reader nothing they
  // did not already know. Some pages have `|minOS = 10` and nothing
  // else, and publishing that as "requirements" would be a worse empty
  // than an honest gap.
  const fieldCount = Object.keys(minimum).length + Object.keys(recommended).length;
  if (fieldCount < 2) return null;

  return { minimum, recommended };
}

/** Reduce a template value to readable text. */
function cleanValue(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/\{\{ii\}\}/gi, "")
    // Drop the trailing editorial notes the wiki puts in every field.
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * How many of each side's words are shared, ignoring order and extras.
 *
 * The library and the wiki name the same game differently often enough
 * that an order-sensitive comparison is the wrong tool: a title is right
 * when it says the same words, however they are arranged.
 */
function tokenSetSimilarity(query, candidate, queryYear) {
  const split = (s) =>
    cleanTitle(s)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !/^\d{4}$/.test(w));

  const q = split(query);
  const c = new Set(split(candidate));
  if (!q.length) return 0;

  // A year in the library title must not be counted as a missing word.
  const words = queryYear ? q.filter((w) => w !== String(queryYear)) : q;
  const hits = words.filter((w) => c.has(w) || c.has(w.replace(/s$/, ""))).length;
  return words.length ? (2 * hits) / (words.length + Math.max(words.length, c.size)) : 0;
}

/**
 * Resolve a title to a PCGamingWiki page.
 * @returns {Promise<{title:string, requirements:object}|null>}
 */
async function resolve(title) {
  const term = cleanTitle(title);
  if (!term) return null;

  const qYear = extractYear(title);
  const candidates = await search(term);
  if (!candidates.length) return null;

  let best = null;
  for (const candidate of candidates) {
    // Token coverage first: "Crysis" must not be answered by
    // "Crysis: Wars", and "Dead Space" must not take "Dead Space 2".
    if (!coversAllTokens(term, candidate)) continue;

    // Score on the set of words, not their order. Scene folders and wiki
    // titles routinely disagree — the library says "Alice American
    // McGees" and the wiki says "American McGee's Alice" — and an
    // order-sensitive score calls that a miss.
    let score = tokenSetSimilarity(term, candidate, qYear);
    if (qYear) {
      const m = /\((\d{4})\)/.exec(candidate);
      if (m) score += Number(m[1]) === qYear ? 0.1 : -0.3;
    }
    // An exact title is the target; a longer one is an edition.
    if (candidate.toLowerCase() === term.toLowerCase()) score += 0.2;

    if (score < FLOOR) continue;
    if (!best || score > best.score) best = { title: candidate, score };
  }

  if (!best) return null;

  const text = await wikitext(best.title);
  const requirements = parseRequirements(text);
  if (!requirements) return null;

  return { title: best.title, requirements, score: best.score };
}

module.exports = { resolve, search, wikitext, parseRequirements };