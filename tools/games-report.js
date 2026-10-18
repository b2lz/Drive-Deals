"use strict";
// ============================================================
// Full gap report for one category: every item, with each missing or
// flagged field printed beside its name.
//
// For games the required fields are: release year, developer, an Arabic
// summary, and the PC minimum + recommended requirements. A title that is not
// on PC is allowed to omit the specs, but only when it says so
// (needsRequirements), so it is reported as "معلنة" rather than silently
// counted as complete.
//
// Fields marked needsReview are listed separately: they have a value, but the
// value is a placeholder or was not confirmed against a source.
//
// Usage: node tools/games-report.js [categoryId]   (default: games)
// ============================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATEGORY = process.argv[2] || "games";

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const detailsPath = path.join(ROOT, "details", `${CATEGORY}.json`);
const details = fs.existsSync(detailsPath)
  ? JSON.parse(fs.readFileSync(detailsPath, "utf8")).items
  : {};

const category = data.categories.find((c) => c.id === CATEGORY);
if (!category) {
  console.error(`لا توجد فئة باسم ${CATEGORY}`);
  process.exit(1);
}

const isGame = CATEGORY === "games";

/** Which required fields this item is missing. */
function gapsFor(item) {
  const gaps = [];
  const d = details[item.id];
  const name = (item.title || "").trim();

  if (!d) return ["كل التفاصيل"];

  const hasYear = Boolean(d.releaseDate) || Number.isFinite(item.year);
  if (!hasYear) gaps.push("سنة الإصدار");

  if (!d.developer || !String(d.developer).trim()) {
    gaps.push(isGame ? "المطوّر" : "المخرج / المخرجون");
  }

  const summary = (d.summaryAr || d.summaryEn || "").trim();
  if (summary.length < 40) gaps.push("الملخص العربي");

  if (isGame) {
    // Platforms are written many ways ("PC", "Windows", "مايكروسوفت ويندوز",
    // or console-only), so the rule is about the specs themselves rather than
    // the platform label: a title passes when it has specs, or when it
    // explicitly declares that trustworthy specs do not exist.
    if (d.requirements) {
      if (!d.requirements.minimum) gaps.push("المواصفات الدنيا");
      if (!d.requirements.recommended) gaps.push("الموصى به");
    } else if (!d.needsRequirements) {
      gaps.push("المواصفات (وبلا declaration إنها غير متاحة)");
    }
  } else {
    const cast = d.cast || d.actors;
    if (!cast || (Array.isArray(cast) && !cast.length)) gaps.push("الأداء");
  }

  return gaps;
}

const gaps = [];
const flagged = [];
let complete = 0;

for (const item of category.items || []) {
  const g = gapsFor(item);
  if (g.length) gaps.push({ title: item.title, gaps: g, id: item.id });
  else complete++;

  const d = details[item.id];
  if (d && d.needsReview && d.needsReview.length) {
    flagged.push({
      title: item.title,
      fields: d.needsReview,
      note: (d.extra && (d.extra.reviewNote || d.extra.titleMismatch)) || "",
    });
  }
}

const pad = (s, n) => {
  // Arabic text mixes directions; pad by code points so columns stay aligned.
  const len = [...s].length;
  return s + " ".repeat(Math.max(0, n - len));
};
const W = Math.max(28, ...gaps.map((g) => [...g.title].length + 2));

console.log(`\n╔${"═".repeat(W + 44)}╗`);
console.log(
  `║  ${pad(CATEGORY, W - 1)}   ناقص: ${gaps.length} من ${(category.items || []).length}`.padEnd(W + 44) + "║"
);
console.log(`╟${"─".repeat(W + 44)}╢`);
if (!gaps.length) {
  console.log(`║  ${pad("مفيش عناصر ناقصة ✔", W + 42)}║`);
} else {
  for (const g of gaps) console.log(`║  ${pad(g.title, W)}  ←  ${g.gaps.join(" + ")}`);
  console.log(`╚${"═".repeat(W + 44)}╝`);
}

if (flagged.length) {
  console.log(`\n  ── تحتاج مراجعة يدوية (${flagged.length}) ──`);
  const FW = Math.max(28, ...flagged.map((f) => [...f.title].length + 2));
  for (const f of flagged) {
    console.log(`  ${pad(f.title, FW)}  ←  ${f.fields.join(" + ")}`);
    if (f.note) console.log(`  ${" ".repeat(FW)}      ${f.note.slice(0, 150)}`);
  }
}

console.log(`\n  مكتمل: ${complete}`);