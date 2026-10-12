"use strict";
// Quality scan for the games category: not "is the field empty" but "is
// the field filled with something wrong".
//
// Two classes of defect this catches:
//   1. summaryAr holding untranslated English pasted from Steam, often
//      with ** markdown left in.
//   2. canonicalTitle pointing at a different game than the folder.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const details = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");

const ARABIC = /[؀-ۿ]/;

function latinRatio(s) {
  if (!s || !s.trim()) return 0;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  const arabic = (s.match(/[؀-ۿ]/g) || []).length;
  const total = latin + arabic || 1;
  return latin / total;
}

const untranslated = [];
const markdown = [];
const mismatched = [];
const handNoCanonical = [];

for (const item of cat.items) {
  const r = details.items[item.id];
  if (!r || r._miss) continue;

  const s = r.summaryAr || "";
  if (s && latinRatio(s) > 0.5) untranslated.push({ t: item.title, s });
  if (/\*\*|^#{1,6}\s|\[.+\]\(.+\)/m.test(s)) markdown.push({ t: item.title, s });

  // canonicalTitle should share most tokens with the folder title. A big
  // disagreement usually means the matcher latched onto the wrong game.
  if (r.canonicalTitle) {
    const toks = (x) =>
      new Set(
        x
          .toLowerCase()
          .replace(/\[[^\]]*\]|\{[^}]*\}/g, " ")
          .replace(/[^a-z0-9؀-ۿ]+/g, " ")
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      );
    const a = toks(item.title);
    const b = toks(r.canonicalTitle);
    const shared = [...a].filter((w) => b.has(w)).length;
    const total = new Set([...a, ...b]).size || 1;
    const overlap = shared / total;
    if (overlap < 0.34) mismatched.push({ t: item.title, c: r.canonicalTitle, o: overlap.toFixed(2) });
  } else if (!r.source) {
    handNoCanonical.push(item.title);
  }
}

const show = (label, rows, fmt) => {
  if (!rows.length) return;
  console.log(`\n${label} (${rows.length}):`);
  for (const row of rows) console.log(`   ${fmt(row)}`);
};

console.log("=".repeat(80));
console.log("  فحص جودة بيانات الألعاب");
console.log("=".repeat(80));

show("ملخص إنجليزي مكانه ملخص عربي", untranslated, (r) => `${r.t}\n        ${r.s.slice(0, 110)}`);
show("ملخص فيه تنسيق markdown غير معروض", markdown, (r) => `${r.t}\n        ${r.s.slice(0, 110)}`);
show(
  "canonicalTitle مختلف عن اسم المجلد",
  mismatched.sort((a, b) => a.o - b.o),
  (r) => `${r.t.padEnd(50)} -> ${r.c}`,
);
show("سجل يدوي بدون canonicalTitle", handNoCanonical, (r) => r);