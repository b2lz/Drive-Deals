"use strict";
// List detail records whose item no longer exists in data.json — leftovers
// from a removed title. They are harmless (item.js looks up by id) but worth
// knowing about before deleting them.
//
// Usage: node tools/orphan-details.js [category]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

const ids = new Set();
for (const c of data.categories) for (const i of c.items || []) ids.add(i.id);

const dir = path.join(ROOT, "details");
let total = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const doc = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const orphans = Object.keys(doc.items || {}).filter((k) => !ids.has(k));
  if (!orphans.length) continue;
  console.log(`\n  ${file}: ${orphans.length}`);
  for (const k of orphans) {
    console.log(`    ${k}  →  ${(doc.items[k] && doc.items[k].title) || "?"}`);
    total++;
  }
}
console.log(`\n  الإجمالي: ${total}`);