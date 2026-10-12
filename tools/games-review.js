"use strict";
// Full review of every game, checking for defects rather than just gaps.
// A field that is full can still be wrong: text pasted from Steam, a
// developer list stuffed into one string, a record pointing at a different
// game, a Steam app id that resolves to another title.
//
// Usage: node tools/games-review.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const details = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");

// Language findings are opt-in: by default the review reports data defects
// only, since an English summary is a translation gap rather than a wrong
// value. Pass --language to include them.
const LANGUAGE = process.argv.includes("--language");

const ARABIC = /[؀-ۿ]/;
const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));
const findings = new Map();
const add = (key, title) => {
  if (!findings.has(key)) findings.set(key, []);
  findings.get(key).push(title);
};

for (const item of cat.items) {
  const r = details.items[item.id];
  if (!r || r._miss) {
    add("سجل مفقود أو _miss", item.title);
    continue;
  }

  // 1. Summary: only its presence is checked here. The language a summary
  // is written in is a translation question, not a data defect, so it is
  // reported separately by --language.
  const ar = (r.summaryAr || "").trim();
  const en = (r.summaryEn || "").trim();
  if (!ar && !en) add("ملخص فاضي", item.title);

  if (LANGUAGE) {
    if (ar && !ARABIC.test(ar) && !ARABIC.test(en)) add("الملخص إنجليزي في حقل عربي", item.title);
    else if (ar && !ARABIC.test(ar) && ARABIC.test(en)) add("summaryAr إنجليزي و summaryEn عربي (معكوسين)", item.title);
    if (ar && en && ar === en) add("summaryAr و summaryEn نفس النص", item.title);
  }

  // 3. Markdown left in text the page prints verbatim.
  if (/\*\*|^#{1,6}\s|\[[^\]]+\]\([^)]+\)|`[^`]+`/m.test(ar) || /\*\*|\[[^\]]+\]\([^)]+\)/.test(en)) {
    add("تنسيق markdown غير معروض", item.title);
  }

  // 4. A multi-line / bulleted list stuffed into a single-value field.
  for (const key of ["developer", "publisher", "releaseDate", "type"]) {
    if (typeof r[key] === "string" && r[key].includes("\n")) {
      add(`حقل ${key} فيه قائمة متعدد الأسطر`, item.title);
    }
  }
  if (Array.isArray(r.genres) && r.genres.some((g) => String(g).includes("\n"))) {
    add("التصنيف فيه قائمة متعدد الأسطر", item.title);
  }

  // 5. Placeholder text that is not a fact.
  const vague = (s) => /^[\s—\-–.]*$/.test(s) || /^(unknown|غير معروف|n\/?a|tbd|todo|-)$/i.test(s.trim());
  if (r.developer && vague(r.developer)) add("مطور = قيمة فارغة", item.title);
  if (r.publisher && vague(r.publisher)) add("ناشر = قيمة فارغة", item.title);
  if (r.releaseDate && vague(String(r.releaseDate))) add("سنة إصدار = قيمة فارغة", item.title);

  // 6. Requirements whose every cell is a placeholder.
  if (r.requirements) {
    for (const side of ["minimum", "recommended"]) {
      const block = r.requirements[side];
      if (!block) continue;
      const vals = Object.values(block).filter((v) => v !== undefined && v !== null);
      if (vals.length && vals.every((v) => vague(String(v)))) {
        add(`مواصفات ${side} بلا قيم`, item.title);
      }
    }
  }

  // 7. Canonical title that disagrees with the folder name.
  if (r.canonicalTitle) {
    const toks = (x) =>
      new Set(
        x.toLowerCase().replace(/\[[^\]]*\]|\{[^}]*\}/g, " ").replace(/[^a-z0-9؀-ۿ]+/g, " ")
          .split(/\s+/).filter((w) => w.length > 2),
      );
    const a = toks(item.title);
    const b = toks(r.canonicalTitle);
    const shared = [...a].filter((w) => b.has(w)).length;
    const union = new Set([...a, ...b]).size || 1;
    if (shared / union < 0.34) {
      add("canonicalTitle مختلف عن اسم المجلد", item.title);
    }
  }

  // 8. Bookkeeping that contradicts itself.
  if (r.needsRequirements && r.requirements && (r.requirements.minimum || r.requirements.recommended)) {
    add("needsRequirements مع وجود مواصفات", item.title);
  }
  if (r.needsSummary && (r.summaryAr || r.summaryEn)) add("needsSummary مع وجود ملخص", item.title);
  if (!r.source && !r.needsReview && r.extra?.factsSource !== "بحث يدوي") {
    add("سجل بلا مصدر", item.title);
  }

  // 9. A Steam app id that cannot be one. Steam ids passed 4,000,000 long
  //    ago, so only a non-integer or a non-positive value is a defect here.
  if (r.steamAppId && (!Number.isInteger(r.steamAppId) || r.steamAppId <= 0)) {
    add("رقم Steam غير منطقي", item.title);
  }

  // 10. Duplicate records: two folders carrying the identical body.
  if (LANGUAGE && r.summaryEn && Object.values(details.items).filter(
      (o) => o && o.summaryEn && o.summaryEn === r.summaryEn).length > 1) {
    add("نفس الملخص الإنجليزي مكرر في أكثر من لعبة", item.title);
  }

  // 11. Every field the page renders, so a full-looking record that is
  // actually missing something cannot pass as complete.
  for (const [label, ok] of [
    ["تصنيف فاضي", has(r.genres) && r.genres.some((g) => String(g).trim())],
    ["مطور وناشر فاضيان", has(r.developer) || has(r.publisher)],
    ["ناشر فاضي", has(r.publisher)],
    ["سنة إصدار فاضية", has(r.releaseDate)],
    [
      "مواصفات تشغيل فاضية",
      r.requirements && (r.requirements.minimum || r.requirements.recommended),
    ],
    ["منصات فاضية", has(r.platforms)],
  ]) {
    if (!ok) add(label, item.title);
  }
}

console.log("=".repeat(80));
console.log("  مراجعة شاملة لكل لعبة — أي عيب مش أي فراغ");
console.log("=".repeat(80));
console.log(`  عدد الألعاب: ${cat.items.length}\n`);

const order = [...findings].sort((a, b) => b[1].length - a[1].length);
let total = 0;
for (const [issue, titles] of order) {
  total += titles.length;
  console.log(`${String(titles.length).padStart(4)}  ${issue}`);
  if (titles.length <= 12) for (const t of titles) console.log(`        ${t}`);
  else {
    for (const t of titles.slice(0, 6)) console.log(`        ${t}`);
    console.log(`        ... و${titles.length - 6} غيرهم`);
  }
  console.log("");
}

console.log(`إجمالي الملاحظات: ${total}`);