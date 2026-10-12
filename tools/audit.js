"use strict";
// A full audit of the site's data: what exists, what is missing, and what
// shape each gap has. Reads only local files, so it is safe to run at any
// time.
//
// Usage: node tools/audit.js [--verbose]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const load = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "details", f), "utf8"));
  } catch {
    return { items: {} };
  }
};

/** Which detail fields each category is expected to carry. */
const EXPECT = {
  games: { summary: true, requirements: true },
  anime: { summary: true, episodes: true },
  "turkish-series": { summary: true },
};

/**
 * Classify why an item has no record, from its title alone. This is what
 * tells us which source could still reach it.
 */
function classify(title) {
  const t = String(title);

  if (/\b(?:S|Season)\s*0?\d{1,2}\b/i.test(t)) return "season marker in the folder name";
  if (/\b\d\s*\+\s*\d\b/.test(t)) return "bundle of several entries (1+2)";
  if (/\b(?:collection|trilogy|quadrilogy|box ?set|saga|complete series)\b/i.test(t)) return "bundle / collection";
  if (/\d{4}/.test(t)) return "carries a year";
  if (/(?:19|20)\d{2}/.test(t)) return "carries a year";
  if (/[\u0600-\u06FF]/.test(t)) return "Arabic title";
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(t)) return "Japanese script";
  if (/[\u0400-\u04FF]/.test(t)) return "Cyrillic title";
  if (/\b(?:el|la|los|las|de|del|una|con|para)\b/i.test(t)) return "Romance-language title";
  if (/^[A-Z][a-z]+[A-Z]/.test(t)) return "run-together words (no spaces)";
  if (/^\S+$/.test(t)) return "one word, no spaces";
  if (/^\d+$/.test(t.trim())) return "only digits";
  if (t.length <= 4) return "very short";
  return "looks like an ordinary title";
}

let totalItems = 0;
let totalFilled = 0;
const report = [];

for (const cat of data.categories) {
  const parsed = load(`${cat.id}.json`);
  const ids = Object.keys(parsed.items);
  const missing = cat.items.filter((it) => !parsed.items[it.id]);

  // Field coverage among the records we do have.
  let withSummary = 0;
  let withReq = 0;
  let withAnyDate = 0;
  let withPeople = 0;
  for (const r of ids.map((id) => parsed.items[id])) {
    if (!r || r._miss) continue;
    if (r.summaryAr || r.summaryEn) withSummary++;
    if (r.requirements && (r.requirements.minimum || r.requirements.recommended)) withReq++;
    if (r.releaseDate) withAnyDate++;
    // "People" means whoever is credited on the work. A film has a director
    // and a cast; a game has a developer and a publisher instead, so
    // counting only the film fields reports every game as empty.
    if (r.director || (r.cast && r.cast.length) || r.creators || r.studio || r.developer || r.publisher) {
      withPeople++;
    }
  }

  const shapes = new Map();
  for (const m of missing) {
    const k = classify(m.title);
    shapes.set(k, (shapes.get(k) || 0) + 1);
  }

  report.push({ cat, filled: ids.length, missing, withSummary, withReq, withAnyDate, withPeople, shapes });
  totalItems += cat.items.length;
  totalFilled += ids.length;
}

console.log("=".repeat(78));
console.log("  DATA AUDIT");
console.log("=".repeat(78));
console.log(`\n  ${totalFilled} / ${totalItems} items have a record (${((totalFilled / totalItems) * 100).toFixed(1)}%)\n`);

console.log(
  "  " +
    "category".padEnd(22) +
    "filled".padStart(7) +
    "missing".padStart(8) +
    "summary".padStart(9) +
    "specs".padStart(7) +
    "date".padStart(6) +
    "people".padStart(8),
);
console.log("  " + "-".repeat(74));

for (const r of report) {
  const pct = ((r.filled / r.cat.items.length) * 100).toFixed(0) + "%";
  console.log(
    "  " +
      r.cat.id.padEnd(22) +
      `${r.filled}`.padStart(7) +
      `${r.missing.length}`.padStart(8) +
      `${r.withSummary}`.padStart(9) +
      `${r.withReq}`.padStart(7) +
      `${r.withAnyDate}`.padStart(6) +
      `${r.withPeople}`.padStart(8) +
      `  ${pct}`,
  );
}

console.log("\n" + "=".repeat(78));
console.log("  WHAT THE MISSING TITLES LOOK LIKE");
console.log("=".repeat(78));

for (const r of report) {
  if (!r.missing.length) continue;
  console.log(`\n${r.cat.id} (${r.missing.length})`);
  for (const [shape, n] of [...r.shapes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)}  ${shape}`);
  }
  if (VERBOSE) {
    for (const m of r.missing.slice(0, 40)) console.log(`         ${m.title}`);
  }
}

// Where the fields are thinnest among records that do exist.
console.log("\n" + "=".repeat(78));
console.log("  THIN FIELDS IN RECORDS THAT EXIST");
console.log("=".repeat(78));
for (const r of report) {
  if (!r.filled) continue;
  const gaps = [];
  if (r.withSummary < r.filled) gaps.push(`no summary: ${r.filled - r.withSummary}`);
  if (r.cat.id === "games" && r.withReq < r.filled) gaps.push(`no specs: ${r.filled - r.withReq}`);
  if (r.withAnyDate < r.filled * 0.7) gaps.push(`no release date: ${r.filled - r.withAnyDate}`);
  if (r.withPeople < r.filled * 0.5) gaps.push(`no director/cast: ${r.filled - r.withPeople}`);
  if (gaps.length) console.log(`  ${r.cat.id.padEnd(22)} ${gaps.join("  |  ")}`);
}