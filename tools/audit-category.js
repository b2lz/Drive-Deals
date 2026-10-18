"use strict";
// ============================================================
// One focused audit of a whole category. Everything worth knowing about the
// data in a single pass, grouped so the important part is readable at a glance:
//
//   1) totals and how the category breaks down
//   2) items the site silently drops
//   3) items with a missing required field
//   4) items carrying a value that was never confirmed (needsReview)
//   5) placeholder / filler text that should not have shipped
//   6) items referenced but missing on disk, and orphan detail records
//
// Usage: node tools/audit-category.js [categoryId]   (default: games)
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

/** Filler the project agreed never to ship as if it were real. */
const PLACEHOLDERS = [
  "استوديو مستقل",
  "استوديو خاص",
  "محاكي",
  "نخبة من الممثلين",
  "نخبة من نجوم",
  "غير معروف",
  "غير متوفر",
  "معلومات غير متاحة",
  "TBA",
];

const PLACEHOLDER_LABEL = "نص نائب (placeholder)";

const nameOf = (d) => (d && d.title) || "";

/** Fields a game must have to render completely. */
function gapsFor(item) {
  const d = details[item.id];
  const out = [];
  if (!d) return ["كل التفاصيل"];

  if (!(d.releaseDate || Number.isFinite(item.year))) out.push("سنة الإصدار");
  if (!String(d.developer || "").trim()) out.push("المطوّر");
  if (String(d.summaryAr || "").trim().length < 40) out.push("الملخص العربي");

  if (CATEGORY === "games") {
    if (d.requirements) {
      if (!d.requirements.minimum) out.push("المواصفات الدنيا");
      if (!d.requirements.recommended) out.push("الموصى به");
    } else if (!d.needsRequirements) {
      out.push("المواصفات");
    }
  }
  return out;
}

/** Collect the human-readable text of a record, for placeholder scanning. */
function textsOf(d) {
  if (!d) return [];
  const out = [];
  const push = (v) => {
    if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === "string" && v.trim()) out.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(push);
  };
  for (const k of [
    "developer", "publisher", "director", "directors", "cast", "summaryAr",
    "summaryEn", "genres", "modes", "platforms",
  ]) push(d[k]);
  return out;
}

const dropped = [];
const missingField = [];
const flagged = [];
const placeholder = [];
const shortSummary = [];
const missingImage = [];

for (const item of items) {
  const d = details[item.id];
  const title = nameOf(d) || item.title;

  // The site drops records whose size is not a positive number.
  if (!(typeof item.sizeGB === "number" && Number.isFinite(item.sizeGB) && item.sizeGB > 0)) {
    dropped.push({ title, id: item.id, sizeGB: item.sizeGB });
  }

  const gaps = gapsFor(item);
  if (gaps.length) missingField.push({ title, gaps });

  if (d && d.needsReview && d.needsReview.length) {
    flagged.push({
      title,
      fields: Array.isArray(d.needsReview) ? d.needsReview : [String(d.needsReview)],
      note: (d.extra && (d.extra.reviewNote || d.extra.titleMismatch)) || "",
    });
  }

  for (const t of textsOf(d)) {
    const hit = PLACEHOLDERS.find((p) => t.includes(p));
    if (hit) placeholder.push({ title, field: hit, text: t.slice(0, 90) });
  }

  const s = String((d && d.summaryAr) || "").trim();
  if (s && s.length < 80) shortSummary.push({ title, len: s.length });

  if (!fs.existsSync(path.join(ROOT, "assets", item.id))) {
    missingImage.push({ title, id: item.id });
  }
}

const ids = new Set();
for (const c of data.categories) for (const i of c.items || []) ids.add(i.id);
const orphans = Object.keys(details).filter((k) => !ids.has(k));

const W = Math.max(
  24,
  ...[...dropped, ...missingField, ...flagged, ...placeholder, ...missingImage].map(
    (x) => [...x.title].length + 2
  )
);
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length));

const box = (title, rows) => {
  console.log(`\n╔${"═".repeat(W + 46)}╗`);
  console.log(`║  ${title}`);
  console.log(`╟${"─".repeat(W + 46)}╢`);
  for (const r of rows) console.log(`║  ${r}`);
  if (!rows.length) console.log(`║  ${pad("مفيش ✔", W + 43)}`);
  console.log(`╚${"═".repeat(W + 46)}╝`);
};

console.log(`\n  ${CATEGORY}: ${items.length} عنصر · تفاصيل: ${Object.keys(details).length} سجل`);

box(
  `1) الموقع بيتجاهلها entirely (${dropped.length})`,
  dropped.map((x) => `${pad(x.title, W)}  ←  sizeGB = ${x.sizeGB}`)
);

box(
  `2) حقول ناقصة (${missingField.length})`,
  missingField.map((x) => `${pad(x.title, W)}  ←  ${x.gaps.join(" + ")}`)
);

box(
  `3) قيم غير مؤكدة، محتاجة مراجعة (${flagged.length})`,
  flagged.flatMap((x) => [
    pad(x.title, W) + `  ←  ${x.fields.join(" + ")}`,
    ...(x.note ? [pad("", W) + "      " + x.note.slice(0, W + 36)] : []),
  ])
);

box(
  `4) نص نائب (${placeholder.length})`,
  placeholder.map((x) => `${pad(x.title, W)}  ←  ${x.field}`)
);

box(
  `5) ملخص عربي قصير (أقل من 80 حرف) (${shortSummary.length})`,
  shortSummary.map((x) => `${pad(x.title, W)}  ←  ${x.len} حرف`)
);

box(
  `6) صورة ناقصة على القرص (${missingImage.length})`,
  missingImage.map((x) => `${pad(x.title, W)}  ←  ${x.id}`)
);

box(
  `7) سجلات تفاصيل لعنصر مش موجود (${orphans.length})`,
  orphans.map((k) => `${pad(nameOf(details[k]) || k, W)}  ←  ${k}`)
);

const clean = items.length - missingField.length;
console.log(`\n  ناقص الحقول: ${missingField.length}   ·   متسق: ${clean} من ${items.length}`);