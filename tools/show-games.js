"use strict";
// Show what the games records look like right now for a list of titles, so
// supplied data can be compared against what is stored.
//
// Usage: node tools/show-games.js "Deadfall Adventures" "LIMBO" ...

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const details = JSON.parse(
  fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8")
).items;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const games = data.categories.find((c) => c.id === "games");

const terms = process.argv.slice(2);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

for (const term of terms) {
  const key = Object.keys(details).find(
    (k) => norm(k).includes(norm(term)) || norm(details[k].title || "").includes(norm(term))
  );
  if (!key) {
    console.log(`\n=== ${term} — مفيش سجل`);
    continue;
  }
  const d = details[key];
  const item = games.items.find((i) => i.id === key);
  console.log(`\n=== ${d.title}`);
  console.log(`  key        : ${key}`);
  console.log(`  sizeGB     : ${item ? item.sizeGB : "?"}`);
  console.log(`  developer  : ${d.developer || "—"}`);
  console.log(`  publisher  : ${d.publisher || "—"}`);
  console.log(`  releaseDate: ${d.releaseDate || "—"}`);
  console.log(`  platforms  : ${JSON.stringify(d.platforms)}`);
  console.log(`  summaryAr  : ${d.summaryAr ? d.summaryAr.length + " حرف" : "— غايب"}`);
  console.log(`  needsReview: ${JSON.stringify(d.needsReview || null)}`);
  if (d.requirements) {
    for (const tier of ["minimum", "recommended"]) {
      const t = d.requirements[tier];
      console.log(`  ${tier}:`);
      if (!t) console.log("    — ناقص");
      else for (const [k, v] of Object.entries(t)) console.log(`    ${k.padEnd(8)} ${v}`);
    }
  } else {
    console.log(`  requirements: — مفيش (needsRequirements: ${!!d.needsRequirements})`);
  }
}