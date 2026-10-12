"use strict";
// A plain answer to "what has no details": counts per shelf, grouped by
// kind, plus a separate line for system requirements.
//
// Reads only local files, so it is safe to run at any time.
//
// Usage: node tools/missing-report.js [--verbose]

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

/** The kind of thing each shelf holds, for grouping the totals. */
const KIND = {
  games: "لعبة",
  anime: "أنمي",
  "arabic-films": "فيلم",
  "foreign-films": "فيلم",
  "indian-films": "فيلم",
  "cartoon-films": "فيلم",
  "foreign-film-series": "فيلم",
  "arabic-series": "مسلسل",
  "foreign-series": "مسلسل",
  "korean-series": "مسلسل",
  "cartoon-series": "مسلسل",
  "turkish-series": "مسلسل",
};

const rows = [];
const byKind = new Map();
let grandTotal = 0;
let grandFilled = 0;

for (const cat of data.categories) {
  const parsed = load(`${cat.id}.json`);
  const recs = Object.values(parsed.items).filter((r) => r && !r._miss);
  const filled = recs.length;
  const missing = cat.items.length - filled;

  let withSummary = 0;
  let withSpecs = 0;
  let withCredits = 0;
  let withDate = 0;
  for (const r of recs) {
    if (r.summaryAr || r.summaryEn) withSummary++;
    if (r.requirements && (r.requirements.minimum || r.requirements.recommended)) withSpecs++;
    if (r.director || r.developer || r.creators || r.studio || (r.cast && r.cast.length)) {
      withCredits++;
    }
    if (r.releaseDate) withDate++;
  }

  rows.push({ cat, kind: KIND[cat.id] || "أخرى", total: cat.items.length, filled, missing, withSummary, withSpecs, withCredits, withDate });

  const k = rows[rows.length - 1].kind;
  const agg = byKind.get(k) || { kind: k, total: 0, filled: 0, missing: 0, specs: 0 };
  agg.total += cat.items.length;
  agg.filled += filled;
  agg.missing += missing;
  agg.specs += withSpecs;
  byKind.set(k, agg);

  grandTotal += cat.items.length;
  grandFilled += filled;
}

const line = "-".repeat(74);

console.log(line);
console.log("  كام عنصر مش متكتبله تفاصيل");
console.log(line);
console.log();

console.log(
  "  " + "القايمة".padEnd(24) + "الإجمالي".padStart(9) + "متكتب".padStart(9) + "ناقص".padStart(8) + "  النسبة",
);
console.log("  " + "-".repeat(70));

for (const r of rows.sort((a, b) => b.missing - a.missing)) {
  const pct = ((r.filled / r.total) * 100).toFixed(0) + "%";
  console.log(
    "  " + r.cat.name.padEnd(24) + String(r.total).padStart(9) + String(r.filled).padStart(9) + String(r.missing).padStart(8) + "  " + pct,
  );
}

console.log("  " + "-".repeat(70));
console.log(
  "  " + "الإجمالي".padEnd(24) + String(grandTotal).padStart(9) + String(grandFilled).padStart(9) +
    String(grandTotal - grandFilled).padStart(8) + "  " + ((grandFilled / grandTotal) * 100).toFixed(1) + "%",
);

console.log();
console.log(line);
console.log("  بال نوع");
console.log(line);
console.log();

for (const agg of byKind.values()) {
  if (!agg.total) continue;
  const pct = ((agg.filled / agg.total) * 100).toFixed(0) + "%";
  console.log(
    `  ${agg.kind.padEnd(10)} إجمالي ${String(agg.total).padStart(5)}   ` +
      `متكتب ${String(agg.filled).padStart(5)}   ` +
      `ناقص ${String(agg.missing).padStart(4)}   ${pct}`,
  );
}

console.log();
console.log(line);
console.log("  مواصفات التشغيل");
console.log(line);
console.log();

const games = rows.find((r) => r.cat.id === "games");
console.log(`  ألعاب في المكتبة        : ${games.total}`);
console.log(`  ليها مواصفات تشغيل       : ${games.withSpecs}  (${((games.withSpecs / games.total) * 100).toFixed(1)}%)`);
console.log(`  مالهاش مواصفات (لسه فاضية): ${games.total - games.withSpecs}`);
console.log();

console.log(line);
console.log("  الحقول الناقصة عموماً");
console.log(line);
console.log();

const totals = { summary: 0, credits: 0, date: 0 };
for (const r of rows) {
  totals.summary += r.filled - r.withSummary;
  totals.credits += r.filled - r.withCredits;
  totals.date += r.filled - r.withDate;
}
console.log(`  سجل بدون ملخص            : ${totals.summary}`);
console.log(`  سجل بدون مخرج/أبطال/مطور : ${totals.credits}`);
console.log(`  سجل بدون سنة إصدار       : ${totals.date}`);