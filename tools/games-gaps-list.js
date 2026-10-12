"use strict";
// Lists the games with a genuinely empty field, ignoring the language a
// summary happens to be written in (that is a separate question).
// Usage: node tools/games-gaps-list.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const details = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));
const rows = [];

for (const item of cat.items) {
  const r = details.items[item.id];
  if (!r || r._miss) continue;

  const gaps = [];
  if (!has(r.genres) || !r.genres.some((g) => String(g).trim())) gaps.push("تصنيف");
  if (!has(r.developer) && !has(r.publisher)) gaps.push("مطور وناشر");
  else if (!has(r.developer)) gaps.push("مطور");
  if (!has(r.publisher)) gaps.push("ناشر");
  if (!has(r.releaseDate)) gaps.push("سنة إصدار");
  if (!r.requirements || !(r.requirements.minimum || r.requirements.recommended)) {
    gaps.push("مواصفات تشغيل");
  }
  if (!has(r.platforms)) gaps.push("منصات");

  if (gaps.length) rows.push([item.title, gaps]);
}

rows.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
const width = Math.max(...rows.map((r) => r[0].length));

for (const [title, gaps] of rows) {
  console.log(title.padEnd(width + 2, ".") + "  " + gaps.join(" + "));
}

const counts = new Map();
for (const [, gaps] of rows) for (const g of gaps) counts.set(g, (counts.get(g) || 0) + 1);
console.log("");
for (const [g, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${g}: ${n}`);
console.log(`الإجمالي: ${rows.length}`);