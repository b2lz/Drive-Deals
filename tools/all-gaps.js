"use strict";
// One list of every item with something actually missing, with the missing
// fields written beside the title. Groups by category.
//
// Usage: node tools/all-gaps.js [category] [--lang-only|--fields-only]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const FIELDS_ONLY = process.argv.includes("--fields-only");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const filled = (v) =>
  Array.isArray(v) ? v.length > 0 && v.some((x) => String(x).trim())
  : v != null && (typeof v === "object" ? Object.keys(v).length > 0 : String(v).trim().length > 0);

const GAPS = {
  "مخرج": (r) => !filled(r.director) && !filled(r.directors),
  "أبطال": (r) => !filled(r.cast),
  "حد أدنى": (r) => !filled((r.requirements || {}).minimum),
  "موصى به": (r) => !filled((r.requirements || {}).recommended),
};

// The summary is reported only on request — by default this list is about the
// credits and the PC requirements, which are the fields that are simply empty.
const WITH_SUMMARY = process.argv.includes("--with-summary");
if (WITH_SUMMARY) {
  GAPS["الملخص العربي"] = (r) => !filled(r.summaryAr) && filled(r.summaryEn);
}

const W = 86;
const line = (l = "") => console.log("║ " + l.padEnd(W - 2) + " ║");
const top = () => console.log("╔" + "═".repeat(W) + "╗");
const bot = () => console.log("╚" + "═".repeat(W) + "╝");
const div = () => console.log("╟" + "─".repeat(W) + "╢");

const CATN = {
  "arabic-films": "أفلام عربية", "foreign-films": "أفلام أجنبية",
  "foreign-film-series": "أفلام أجنبية (سلاسل)", "indian-films": "أفلام هندية",
  "arabic-series": "مسلسلات عربية", "foreign-series": "مسلسلات أجنبية",
  "korean-series": "مسلسلات كورية", "cartoon-films": "أفلام كرتون",
  "cartoon-series": "مسلسلات كرتون", anime: "أنمي",
  "turkish-series": "مسلسلات تركية", games: "ألعاب",
};

const tally = {};
let grand = 0;
let printed = 0;

for (const cat of data.categories) {
  if (only && cat.id !== only) continue;

  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  const isGame = cat.id === "games";
  const rows = [];

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    const miss = [];
    for (const [label, test] of Object.entries(GAPS)) {
      // Anime shows studios/creators rather than a director, by design.
      if (label === "مخرج" && cat.id === "anime") continue;
      // Games credit a developer/publisher, never a director or a cast list,
      // and only they carry system requirements.
      if (isGame && (label === "مخرج" || label === "أبطال")) continue;
      if (!isGame && (label === "حد أدنى" || label === "موصى به")) continue;
      if (test(rec)) miss.push(label);
    }
    if (miss.length) rows.push({ title: item.title, miss });
  }

  if (!rows.length) continue;

  const counts = {};
  for (const r of rows) for (const m of r.miss) counts[m] = (counts[m] || 0) + 1;
  tally[cat.id] = counts;
  grand += rows.length;

  top();
  line(`  ${CATN[cat.id]}  (${cat.id})`);
  line(`  ${rows.length} عنصر ناقص من ${cat.items.length}`);
  div();
  const legend = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" · ");
  line(`  ${legend}`);
  div();

  if (FIELDS_ONLY) {
    for (const r of rows) line(`   ${r.title}  ←  ${r.miss.join(" + ")}`);
  } else {
    for (const r of rows) line(`   ${r.title}  ←  ${r.miss.join(" + ")}`);
  }
  printed += rows.length;
  bot();
  console.log("");
}

console.log(`الإجمالي: ${grand} عنصر`);
