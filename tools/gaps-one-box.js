"use strict";
// ============================================================
// One single box listing ONLY what is missing or unconfirmed in a category.
// Every affected title appears once, with each outstanding field beside it.
//
// Titles are de-duplicated across the checks: a game that is both missing a
// recommended tier and flagged for review gets one line carrying both.
//
// Usage: node tools/gaps-one-box.js [categoryId]   (default: games)
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
const items = category.items || [];

const PLACEHOLDERS = [
  "استوديو مستقل", "استوديو خاص", "محاكي", "نخبة من الممثلين",
  "نخبة من نجوم", "غير معروف", "غير متوفر", "معلومات غير متاحة",
];

/** Collect every string of a record so placeholders can be found anywhere. */
function textsOf(d) {
  const out = [];
  const push = (v) => {
    if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === "string" && v.trim()) out.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(push);
  };
  if (d) {
    for (const k of ["developer", "publisher", "director", "directors", "cast", "summaryAr", "genres", "modes", "platforms"]) {
      push(d[k]);
    }
  }
  return out;
}

const rows = new Map(); // id -> { title, notes: Set }
const touch = (id, title, note) => {
  if (!rows.has(id)) rows.set(id, { title, notes: new Set() });
  rows.get(id).notes.add(note);
};

for (const item of items) {
  const d = details[item.id];
  const title = (d && d.title) || item.title;

  // Dropped by the site outright.
  if (!(typeof item.sizeGB === "number" && Number.isFinite(item.sizeGB) && item.sizeGB > 0)) {
    touch(item.id, title, "الحجم = 0 — الموقع بيحذفها");
    continue;
  }

  if (!d) {
    touch(item.id, title, "بلا تفاصيل");
    continue;
  }

  if (!(d.releaseDate || Number.isFinite(item.year))) touch(item.id, title, "سنة الإصدار");
  if (!String(d.developer || "").trim()) touch(item.id, title, "المطوّر");

  const summary = String(d.summaryAr || "").trim();
  if (summary.length < 40) touch(item.id, title, "الملخص العربي غايب");
  else if (summary.length < 80) touch(item.id, title, `الملخص العربي قصير (${summary.length} حرف)`);

  if (CATEGORY === "games") {
    if (d.requirements) {
      if (!d.requirements.minimum) touch(item.id, title, "المواصفات الدنيا ناقصة");
      if (!d.requirements.recommended) touch(item.id, title, "الموصى به ناقص");
    } else if (!d.needsRequirements) {
      touch(item.id, title, "المواصفات ناقصة");
    }
  }

  for (const t of textsOf(d)) {
    const hit = PLACEHOLDERS.find((p) => t.includes(p));
    if (hit) touch(item.id, title, `نص نائب: ${hit}`);
  }

  if (d.needsReview) {
    const fields = Array.isArray(d.needsReview) ? d.needsReview : [String(d.needsReview)];
    touch(item.id, title, "يحتاج مراجعة: " + fields.join(" + "));
  }
}

const list = [...rows.values()].sort((a, b) => a.title.localeCompare(b.title, "en"));

// --strict keeps only genuinely missing values. A short summary and a
// needsReview flag both mean "there is a value here", so neither is a gap.
const STRICT = process.argv.includes("--strict");
const final = STRICT
  ? list
      .map((r) => ({ ...r, notes: new Set([...r.notes].filter((n) => !n.startsWith("يحتاج مراجعة") && !n.includes("قصير"))) }))
      .filter((r) => r.notes.size > 0)
  : list;

const W = Math.max(24, ...list.map((r) => [...r.title].length + 2));
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length));
const inner = W + 50;

console.log(`\n╔${"═".repeat(inner)}╗`);
console.log(`║  ${CATEGORY} — ناقص ${final.length} من ${items.length}`.padEnd(inner + 1) + "║");
console.log(`╟${"─".repeat(inner)}╢`);
for (const r of final) {
  const notes = [...r.notes];
  // Wrap the note list so a long row stays inside the box.
  const parts = [];
  let line = "";
  for (const n of notes) {
    if (line && [...line + " · " + n].length > inner - W - 8) {
      parts.push(line);
      line = n;
    } else {
      line = line ? line + " · " + n : n;
    }
  }
  if (line) parts.push(line);

  console.log(`║  ${pad(r.title, W)}  ←  ${parts[0]}`);
  for (const p of parts.slice(1)) console.log(`║  ${pad("", W)}      ${p}`);
}
console.log(`╚${"═".repeat(inner)}╝`);
console.log(`\n  متسق تمامًا: ${items.length - final.length} من ${items.length}`);