"use strict";
// Print, per category, the items still missing a director or a cast — the two
// fields that are genuinely empty (as opposed to merely present in English).
//
// Usage: node tools/people-gaps.js [category] [--names]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const SHOW_NAMES = process.argv.includes("--names");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const filled = (v) =>
  Array.isArray(v) ? v.length > 0 : v != null && String(v).trim().length > 0;

let total = 0;
for (const cat of data.categories) {
  if (only && cat.id !== only) continue;
  if (cat.id === "games") continue; // games use developer/publisher, not director/cast
  if (cat.id === "anime") continue;  // anime shows studios/creators by design

  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${cat.id}.json`), "utf8"));
  const noDir = [];
  const noCast = [];

  for (const item of cat.items) {
    const rec = parsed.items[item.id];
    if (!rec) continue;
    if (!filled(rec.director) && !filled(rec.directors)) noDir.push(item.title);
    if (!filled(rec.cast)) noCast.push(item.title);
  }

  if (!noDir.length && !noCast.length) continue;
  total += noDir.length + noCast.length;

  console.log(`\n${"=".repeat(72)}`);
  console.log(`  ${cat.id}  —  ناقص مخرج: ${noDir.length} · ناقص أبطال: ${noCast.length}`);
  console.log("=".repeat(72));
  if (SHOW_NAMES) {
    if (noDir.length) {
      console.log(`\n  ■ بلا مخرج (${noDir.length}):`);
      for (const t of noDir) console.log(`      ${t}`);
    }
    if (noCast.length) {
      console.log(`\n  ■ بلا أبطال (${noCast.length}):`);
      for (const t of noCast) console.log(`      ${t}`);
    }
  } else {
    const show = (label, arr) =>
      arr.length
        ? console.log(`  ${label.padEnd(14)} ${arr.slice(0, 14).join(" · ")}${arr.length > 14 ? ` … و${arr.length - 14}` : ""}`)
        : null;
    show("بلا مخرج", noDir);
    show("بلا أبطال", noCast);
    console.log(`  (استخدم --names لعرض الأسماء كاملة)`);
  }
}
console.log(`\n${"=".repeat(72)}\n  الإجمالي: ${total}\n`);
