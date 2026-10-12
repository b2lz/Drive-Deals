"use strict";
// Sanity-check every details file: valid JSON, non-empty items map,
// no _miss records leaking into the published data.
const fs = require("fs");
const path = require("path");
const ROOT = "C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.1";

let bad = 0;
const rows = [];
for (const f of fs.readdirSync(path.join(ROOT, "details")).filter((x) => x.endsWith(".json"))) {
  const full = path.join(ROOT, "details", f);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (err) {
    console.log(`INVALID JSON  ${f}: ${err.message}`);
    bad++;
    continue;
  }
  if (!parsed.items || typeof parsed.items !== "object") {
    console.log(`NO ITEMS MAP  ${f}`);
    bad++;
    continue;
  }
  const ids = Object.keys(parsed.items);
  const misses = ids.filter((id) => parsed.items[id] && parsed.items[id]._miss).length;
  // A record may legitimately have no summary when it says so: some
  // games are catalogued by a specifications site only, and the record
  // is flagged needsSummary so the page explains the gap.
  const noSummary = ids.filter((id) => {
    const r = parsed.items[id];
    return r && !r._miss && !(r.summaryAr || r.summaryEn) && !r.needsSummary;
  }).length;
  if (misses) {
    console.log(`${misses} _miss records published in ${f}`);
    bad++;
  }
  if (noSummary) {
    console.log(`${noSummary} records without a summary in ${f}`);
    bad++;
  }
  rows.push([f.replace(".json", ""), ids.length]);
}

console.log(bad ? `\n${bad} problem(s) found` : "\nall details files are valid and clean");
console.log("\ncounts:");
for (const [name, n] of rows.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${name.padEnd(22)} ${n}`);
}