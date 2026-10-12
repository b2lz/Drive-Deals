"use strict";
// Write every remaining gap into one fill-in sheet the user can edit and
// paste back: one line per item, the missing fields as blank slots.
//
// Usage: node tools/gaps-all-template.js [out.txt]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const out = process.argv[2];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const filled = (v) =>
  Array.isArray(v) ? v.length > 0 && v.some((x) => String(x).trim())
  : v != null && (typeof v === "object" ? Object.keys(v).length > 0 : String(v).trim().length > 0);

const CATN = {
  "arabic-films": "أفلام عربية", "foreign-films": "أفلام أجنبية",
  "foreign-film-series": "أفلام أجنبية (سلاسل)", "indian-films": "أفلام هندية",
  "arabic-series": "مسلسلات عربية", "foreign-series": "مسلسلات أجنبية",
  "korean-series": "مسلسلات كورية", "cartoon-films": "أفلام كرتون",
  "cartoon-series": "مسلسلات كرتون", anime: "أنمي",
  "turkish-series": "مسلسلات تركية", games: "ألعاب",
};

const LABEL = {
  summary: "الملخص العربي", director: "المخرج", cast: "الأبطال",
  min: "الحد الأدنى", rec: "الموصى به",
};

const lines = [];
lines.push("# العناصر الناقصة — اكتب البيانات في آخر السطر بعد ::");
lines.push("# الشكل:  العنوان  ::  الحقل = القيمة  |  الحقل = القيمة");
lines.push("# مثال:   Kuroko No Basket  ::  الأبطال = فلان، فلان");
lines.push("");

let total = 0;
for (const cat of data.categories) {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  const isGame = cat.id === "games";
  const rows = [];

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    const need = [];
    // Anime credits a studio rather than a director, so only the cast is asked
    // for; games credit a developer, so only the requirements are.
    if (!isGame && cat.id !== "anime" && !filled(rec.director) && !filled(rec.directors)) need.push("director");
    if (!isGame && !filled(rec.cast)) need.push("cast");
    if (isGame && !filled((rec.requirements || {}).minimum)) need.push("min");
    if (isGame && !filled((rec.requirements || {}).recommended)) need.push("rec");
    if (need.length) rows.push({ title: item.title, need });
  }
  if (!rows.length) continue;

  total += rows.length;
  lines.push(`# ── ${CATN[cat.id]}  (${cat.id})  —  ${rows.length} عنصر`);
  for (const r of rows) {
    lines.push(`${r.title}  ::  ${r.need.map((k) => LABEL[k]).join(" | ")}  ::`);
  }
  lines.push("");
}

lines.push(`# الإجمالي: ${total} عنصر`);
const text = lines.join("\n") + "\n";

if (out) {
  fs.writeFileSync(out, text, "utf8");
  console.log(`wrote ${total} lines -> ${out}`);
} else {
  process.stdout.write(text);
}
