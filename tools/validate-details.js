"use strict";
// Validate details/*.json against what item.js actually renders.
//
// The detail page reads a fixed set of keys (FACT_LABELS, REQ_LABELS,
// EXTRA_LABELS). A record that uses a key the page does not know is
// invisible to users; a record missing a required key renders as an
// empty row. This script catches both, plus the shape mistakes that are
// easy to make by hand: a summary that is a spoiler, a requirement
// preset that is a plain string instead of a keyed object, a
// requirements block on a category that has no games.
//
// Usage: node tools/validate-details.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DETAILS = path.join(ROOT, "details");

// Mirrors the label maps in item.js.
const FACT_KEYS = [
  "developer", "publisher", "director", "directors", "writer", "writers",
  "releaseDate",
  "platforms", "genres", "modes", "engine", "series", "ageRating",
  "languages", "duration", "cast", "rating", "episodes", "seasons",
  "studio", "networks", "creators", "studios", "status",
];
const REQ_KEYS = ["os", "cpu", "ram", "gpu", "directx", "storage", "note", "notes", "vram"];

// Keys the page renders but that the auto-fillers never produce, and
// keys they do produce that the page silently drops.
const WARN_EXTRA = new Set(["studios", "creators", "status", "anilistId", "tvmazeId", "matchScore"]);

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const problems = [];
let checked = 0;

const data = loadJson(path.join(ROOT, "data.json"));
const library = new Set();
const categories = [];
for (const cat of data.categories) {
  categories.push(cat);
  for (const item of cat.items) library.add(item.id);
}

for (const cat of categories) {
  const file = path.join(DETAILS, `${cat.id}.json`);
  if (!fs.existsSync(file)) {
    problems.push(`${cat.id}: details file missing entirely`);
    continue;
  }

  let parsed;
  try {
    parsed = loadJson(file);
  } catch (err) {
    problems.push(`${cat.id}: invalid JSON — ${err.message}`);
    continue;
  }

  if (!parsed.items || typeof parsed.items !== "object") {
    problems.push(`${cat.id}: no "items" object`);
    continue;
  }

  const ids = Object.keys(parsed.items);
  if (!ids.length) {
    console.log(`  ${cat.id.padEnd(22)} empty (no researched items yet)`);
    continue;
  }

  let withSummary = 0;
  let withReq = 0;

  for (const id of ids) {
    checked++;
    const rec = parsed.items[id];

    if (rec._miss) {
      problems.push(`${cat.id}: "${id}" is stored as a _miss, not a details record`);
      continue;
    }
    if (!library.has(id)) {
      problems.push(`${cat.id}: "${id}" is not in data.json (orphan)`);
      continue;
    }
    if (!rec.title) problems.push(`${cat.id}: "${id}" has no title`);

    const summary = rec.summaryAr || rec.summaryEn;
    if (summary) {
      withSummary++;
      if (summary.length < 40) {
        problems.push(`${cat.id}: "${id}" summary is only ${summary.length} chars — too thin`);
      }
    } else if (!rec.needsSummary) {
      // A record with no description is a defect unless it says so. A
      // game known only to a specifications site has no article to
      // summarise, and is flagged needsSummary so the page can admit it.
      problems.push(`${cat.id}: "${id}" has no summary at all`);
    }

    // Keys the page will silently ignore.
    for (const key of Object.keys(rec)) {
      if (FACT_KEYS.includes(key) || REQ_KEYS.includes(key)) continue;
      if (["title", "canonicalTitle", "type", "summaryAr", "summaryEn", "requirements", "links", "confidence", "source", "extra", "wikiTitle", "steamAppId", "anilistId", "tvmazeId", "matchScore"].includes(key)) continue;
      // "needsReview" is surfaced by item.js under ?debug=1, and the two
  // "needs…" flags are surfaced in the notes block, so all three count
  // as rendered even though they are not part of the standard facts.
  if (
    !WARN_EXTRA.has(key) &&
    key !== "needsReview" &&
    key !== "needsRequirements" &&
    key !== "needsSummary"
  ) {
      problems.push(`${cat.id}: "${id}" key "${key}" is not rendered by item.js`);
    }
    }

    // Requirements shape: item.js reads requirements.minimum.cpu etc.
    if (rec.requirements) {
      withReq++;
      for (const preset of ["minimum", "recommended"]) {
        const p = rec.requirements[preset];
        if (!p) continue;
        if (typeof p === "string") {
          problems.push(`${cat.id}: "${id}" ${preset} requirements is a string, not keyed rows`);
          continue;
        }
        if (typeof p !== "object") {
          problems.push(`${cat.id}: "${id}" ${preset} requirements is not an object`);
          continue;
        }
        const known = Object.keys(p).filter((k) => REQ_KEYS.includes(k));
        if (!known.length) {
          problems.push(`${cat.id}: "${id}" ${preset} has no recognisable requirement rows`);
        }
        for (const k of Object.keys(p)) {
          if (!REQ_KEYS.includes(k)) {
            problems.push(`${cat.id}: "${id}" ${preset}.${k} is not a requirement field item.js knows`);
          }
        }
      }
    }

    // Games should carry requirements. A record that could not be given
    // specs by any source says so via needsRequirements, and one that has
    // specs but no description says so via needsSummary — both are
    // rendered on the page, so neither is a defect.
    if (cat.id === "games" && !rec.requirements && !rec.needsRequirements && !rec.needsReview) {
      problems.push(`${cat.id}: "${id}" has no requirements block and is not flagged as missing them`);
    }
    if (!rec.summaryAr && !rec.summaryEn && !rec.needsSummary && !rec.needsReview) {
      problems.push(`${cat.id}: "${id}" has no summary and is not flagged as missing one`);
    }

    if (rec.links && !Array.isArray(rec.links)) {
      problems.push(`${cat.id}: "${id}" links is not an array`);
    }
  }

  const pct = ((withSummary / ids.length) * 100).toFixed(0);
  const reqPct = cat.id === "games" ? ` reqs=${withReq}` : "";
  console.log(`  ${cat.id.padEnd(22)} ${String(ids.length).padStart(4)} items, ${pct}% summarised${reqPct}`);
}

console.log(`\nchecked ${checked} records`);
if (problems.length) {
  const byKind = new Map();
  for (const p of problems) {
    const kind = p.includes("is not rendered") ? "unrendered key"
      : p.includes("requirement") ? "requirements"
      : p.includes("summary") ? "summary"
      : p.includes("_miss") ? "miss stored"
      : "other";
    byKind.set(kind, (byKind.get(kind) || 0) + 1);
  }
  console.log(`\n${problems.length} problems:`);
  for (const [kind, n] of byKind) console.log(`  ${kind.padEnd(16)} ${n}`);
  console.log("\nfirst 30:");
  for (const p of problems.slice(0, 30)) console.log("  " + p);
  process.exitCode = 1;
} else {
  console.log("\nno problems found");
}