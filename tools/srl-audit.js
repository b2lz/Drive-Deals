"use strict";
// Report what SystemRequirementsLab would fill from the games shelf,
// without writing anything.
//
// This is the check to run before changing a matching guard: it shows
// both how many more titles a looser guard would reach and which titles
// it would reach wrongly. The second column matters more than the first.
//
// Usage: node tools/srl-audit.js [--verbose]

const fs = require("fs");
const path = require("path");
const srl = require("./lib/systemrequirementslab");

const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const cat = data.categories.find((c) => c.id === "games");
  const details = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));

  const idx = await srl.getIndex();
  console.log(`SystemRequirementsLab index: ${idx.bySlug.size} games\n`);

  // Games with no specifications yet.
  const gaps = cat.items.filter((it) => {
    const d = details.items[it.id];
    return !d || !(d.requirements && (d.requirements.minimum || d.requirements.recommended));
  });

  let reachable = 0;
  const refused = [];
  const found = [];

  for (const item of gaps) {
    const hit = await srl.resolve(item.title);
    if (hit) {
      reachable++;
      found.push({ title: item.title, slug: hit.slug, score: hit.score });
    } else {
      refused.push(item.title);
    }
  }

  console.log(`games still without specs : ${gaps.length}`);
  console.log(`reachable from this site  : ${reachable}`);
  console.log(`not there                 : ${refused.length}\n`);

  if (found.length) {
    console.log("--- would be filled ---");
    for (const f of found) {
      console.log(`  ${f.title.padEnd(44)} -> ${f.slug}  (${f.score.toFixed(2)})`);
    }
  }

  console.log("\n--- refused (no guess was made) ---");
  // Grouped so the shapes that need a second source are visible.
  const shapes = new Map();
  for (const t of refused) {
    const key = /\d{4}/.test(t)
      ? "carries a year"
      : /\bS\d|\bS0?\d\b/.test(t)
        ? "carries a season marker"
        : t.length < 12
          ? "very short or abbreviated"
          : "no matching page";
    shapes.set(key, (shapes.get(key) || 0) + 1);
  }
  for (const [shape, n] of [...shapes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${shape}`);
  }

  if (VERBOSE) {
    console.log("\n--- every refused title ---");
    for (const t of refused) console.log("  " + t);
  }
})();