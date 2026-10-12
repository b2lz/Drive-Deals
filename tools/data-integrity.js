"use strict";
// Scan the applied data — not the scripts — for corrupted values: mixed
// Arabic/Latin names, placeholder cast lists, and values that leaked build
// artefacts such as "Castlevania" appearing inside a cast list.
//
// Usage: node tools/data-integrity.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const AR = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;
const NON_AR = /[^\u0000-\u007F\u00A0-\u024F\u2000-\u206F\u0600-\u06FF\uFB50-\uFEFF]/;

// A descriptive list rather than real names.
const PLACEHOLDER = /(نخبة|ومothers|فريق شخصيات|أبطال المصنفون|مرجع تقني|المشاهير|الخ)/;

const issues = { mixed: [], nonArabic: [], placeholder: [], known: [] };

for (const cat of data.categories) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  for (const item of cat.items) {
    const r = parsed.items[item.id];
    if (!r) continue;
    const at = `${cat.id} / ${item.title}`;

    const scan = (value, field) => {
      const list = Array.isArray(value) ? value : [value];
      for (const v of list) {
        if (typeof v !== "string" || !v.trim()) continue;
        if (NON_AR.test(v)) issues.nonArabic.push(`${at}  ${field}: ${v}`);
        if (AR.test(v) && LATIN.test(v) && !/[A-Za-z]{3,}\s+(TGX|Ryzen|Core|Duo|AMD|Intel)/.test(v))
          issues.mixed.push(`${at}  ${field}: ${v}`);
        if (PLACEHOLDER.test(v)) issues.placeholder.push(`${at}  ${field}: ${v}`);
      }
    };

    scan(r.cast, "cast");
    scan(r.directors, "directors");
    if (typeof r.director === "string") scan([r.director], "director");
    scan(r.developer, "developer");

    // A cast entry that simply repeats the folder's own title.
    if (Array.isArray(r.cast)) {
      for (const n of r.cast) {
        const a = String(n).toLowerCase().replace(/\s+/g, "");
        const t = String(r.canonicalTitle || item.title).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "");
        if (a.length > 6 && a === t) issues.known.push(`${at}  cast = العنوان نفسه: ${n}`);
      }
    }
  }
}

for (const [k, list] of Object.entries(issues)) {
  console.log(`\n${"=".repeat(70)}\n${k}: ${list.length}\n${"=".repeat(70)}`);
  for (const l of list.slice(0, 25)) console.log("  " + l);
  if (list.length > 25) console.log(`  … و${list.length - 25} غيرهم`);
}
console.log();
