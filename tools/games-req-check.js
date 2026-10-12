"use strict";
// Check that every game's PC requirements carry both a minimum and a
// recommended block, and that neither is an empty shell.
//
// Usage: node tools/games-req-check.js

const fs = require("fs");
const path = require("path");

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "details", "games.json"), "utf8"));

const filled = (v) => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
};

let both = 0;
const partial = [];
const shapes = new Map();

for (const rec of Object.values(parsed.items)) {
  const q = rec.requirements || {};
  shapes.set(Object.keys(q).sort().join("+") || "(empty)", (shapes.get(Object.keys(q).sort().join("+") || "(empty)") || 0) + 1);
  const min = filled(q.minimum);
  const rec2 = filled(q.recommended);
  if (min && rec2) both++;
  else partial.push({ title: rec.title, min, rec: rec2, keys: Object.keys(q) });
}

console.log("=".repeat(70));
console.log(`  الألعاب: ${Object.keys(parsed.items).length}`);
console.log(`  لديها أدنى + موصى: ${both}`);
console.log(`  ناقصة طرف: ${partial.length}`);
console.log("=".repeat(70));
console.log("\n  أشكال الحقل requirements:");
for (const [shape, n] of [...shapes.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(5)}  ${shape}`);
if (partial.length) {
  console.log("\n  ناقصة:");
  for (const p of partial.slice(0, 20)) console.log(`    ${p.title}  min=${p.min} rec=${p.rec}  [${p.keys.join(", ")}]`);
}
console.log();
