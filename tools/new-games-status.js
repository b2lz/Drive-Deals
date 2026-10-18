"use strict";
// Status of the games added on 2026-10-18: does each one still have a gap by
// the strict rule (a genuinely missing value, not a short summary and not a
// needsReview flag)?
//
// Usage: node tools/new-games-status.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NEW = [
  "games/Atomfall.jpg",
  "games/Clive Barker's Hellraiser - Revival.jpg",
  "games/DYNASTY WARRIORS 3 - CER.jpg",
  "games/God of War III Remastered.jpg",
  "games/LEGO Party.jpg",
  "games/Mario Party Superstars.jpg",
  "games/Minecraft Dungeons II.jpg",
  "games/Super Mario Party Jamboree.jpg",
  "games/Trails In The Sky 2nd Chapter.jpg",
  "games/Valor Mortis.jpg",
  "games/ZERO PARADES.jpg",
];

const RESIZED = ["games/Bloodborne.jpg"];

const details = JSON.parse(
  fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8")
).items;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const games = data.categories.find((c) => c.id === "games");

const PLACEHOLDERS = ["استوديو مستقل", "محاكي", "غير معروف", "نخبة من"];

function strictGaps(d) {
  const gaps = [];
  if (!d) return ["كل التفاصيل"];
  if (!d.releaseDate) gaps.push("سنة الإصدار");
  if (!String(d.developer || "").trim()) gaps.push("المطوّر");
  if (String(d.summaryAr || "").trim().length < 40) gaps.push("الملخص العربي");
  if (d.requirements) {
    if (!d.requirements.minimum) gaps.push("المواصفات الدنيا");
    if (!d.requirements.recommended) gaps.push("الموصى به");
  } else if (!d.needsRequirements) {
    gaps.push("المواصفات");
  }
  return gaps;
}

const all = [...NEW, ...RESIZED];
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length));
const W = Math.max(...all.map((id) => [...(details[id] ? details[id].title : id)].length + 2));
const inner = W + 42;

console.log(`\n╔${"═".repeat(inner)}╗`);
console.log(`║  الألعاب الجديدة (${NEW.length}) + المعدّل (${RESIZED.length})`.padEnd(inner + 1) + "║");
console.log(`╟${"─".repeat(inner)}╢`);

let complete = 0;
for (const id of all) {
  const d = details[id];
  const item = games.items.find((i) => i.id === id);
  const title = d ? d.title : id;
  const isNew = NEW.includes(id);
  const gaps = strictGaps(d);
  const ph = d ? PLACEHOLDERS.find((p) => JSON.stringify(d).includes(p)) : null;

  let note = gaps.length ? gaps.join(" + ") : "كامل";
  if (ph) note += ` · نص نائب: ${ph}`;
  if (isNew) console.log(`║  ${pad(title, W)}  ←  ${note}`);
  else console.log(`║  ${pad(title + " (تعديل حجم)", W)}  ←  ${item ? item.sizeGB + " GB" : "?"}`);

  if (isNew && !gaps.length) complete++;
}

console.log(`╚${"═".repeat(inner)}╝`);
console.log(`\n  الجديد المكتمل: ${complete} من ${NEW.length}`);