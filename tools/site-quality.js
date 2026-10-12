"use strict";
// Site-wide quality sweep across every category: language of the summary,
// placeholder text, markdown leaking into prose, embedded newlines in
// single-line fields, and malformed link entries.
//
// Usage: node tools/site-quality.js [category]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const only = process.argv[2];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const ar = (v) => (v ? String(v).trim() : "");

const PLACEHOLDER = /(استوديو مستقل|متفرقة|محاكي|غير محدد|غير معروف|موقع تجريبي|بيانات عامة|إنتاج تقني)/;
const MARKDOWN = /[*#`]|\[[^\]]*\]\(/;

const rows = [];
const problems = [];
const seen = new Map();

for (const cat of data.categories) {
  if (only && cat.id !== only) continue;

  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  const r = { id: cat.id, n: cat.items.length, enOnly: 0, arOnly: 0, both: 0, none: 0 };
  const add = (kind, item, detail) => problems.push({ cat: cat.id, kind, item, detail });

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) { r.none++; add("لا سجل", item.title); continue; }

    const a = ar(rec.summaryAr);
    const e = ar(rec.summaryEn);
    if (a && e) r.both++;
    else if (e) { r.enOnly++; add("ملخص إنجليزي بدل عربي", item.title); }
    else if (a) r.arOnly++;
    else { r.none++; add("بلا ملخص", item.title); }

    const shown = a || e;
    if (shown && PLACEHOLDER.test(shown)) add("نص عام بديل", item.title, shown.slice(0, 60));
    if (shown && MARKDOWN.test(shown)) add("ماركداون في الملخص", item.title);
    if (shown && /\s{2,}|\n/.test(shown.trim())) add("مسافات زائدة", item.title);
    if (!ar(rec.releaseDate)) add("بلا سنة", item.title);

    const oneLine = { المخرج: rec.director, المطور: rec.developer, الناشر: rec.publisher };
    for (const [label, v] of Object.entries(oneLine))
      if (typeof v === "string" && /\n/.test(v)) add("سطر جديد", item.title, label);
    for (const [label, list] of [["مخرجون", rec.directors], ["أبطال", rec.cast]])
      if (Array.isArray(list))
        for (const v of list)
          if (typeof v === "string" && /\n/.test(v)) add("سطر جديد", item.title, label);

    const bad = (rec.links || []).filter(
      (L) => !L || !L.url || /undefined|NaN|\{\}/.test(String(L.url)),
    ).length;
    if (bad) { seen.set(cat.id, (seen.get(cat.id) || 0) + bad); add("رابط تالف", item.title); }

    const flags = ["needsSummary", "needsRequirements", "needsReview"].filter((f) => rec[f]);
    if (flags.length) add("موسوم", item.title, flags.join(","));
  }
  rows.push(r);
}

const pad = (s, n) => String(s).padStart(n);
console.log("=".repeat(78));
console.log("  فحص جودة الموقع كامل");
console.log("=".repeat(78));
console.log(
  "  " + "category".padEnd(20) + pad("عربي", 6) + pad("إنجليزي", 8) + pad("كلاهما", 8) + pad("بلا", 6),
);
console.log("  " + "-".repeat(74));
const tot = { enOnly: 0, arOnly: 0, both: 0, none: 0 };
for (const r of rows) {
  console.log(
    "  " + r.id.padEnd(20) + pad(r.arOnly, 6) + pad(r.enOnly, 8) + pad(r.both, 8) + pad(r.none, 6),
  );
  for (const k of Object.keys(tot)) tot[k] += r[k];
}
console.log("  " + "-".repeat(74));
console.log(
  "  " + "المجموع".padEnd(20) + pad(tot.arOnly, 6) + pad(tot.enOnly, 8) + pad(tot.both, 8) + pad(tot.none, 6),
);

const byKind = new Map();
for (const p of problems) byKind.set(p.kind, (byKind.get(p.kind) || 0) + 1);

console.log("\n" + "=".repeat(78));
console.log(`  الملاحظات: ${problems.length}`);
console.log("=".repeat(78));
for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`\n  ■ ${kind} — ${count}`);
  for (const p of problems.filter((x) => x.kind === kind).slice(0, 12)) {
    console.log(`      ${p.cat} / ${p.item}${p.detail ? "  ← " + p.detail : ""}`);
  }
  const extra = count - 12;
  if (extra > 0) console.log(`      … و${extra} غيرهم`);
}
console.log();
