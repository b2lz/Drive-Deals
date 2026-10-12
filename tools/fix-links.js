"use strict";
// item.js renders a link as `link.label || link.url` and sets
// `a.href = link.url`. Most records store links as bare strings, not
// {label, url} objects, so the page emits a second anchor with an empty
// label and href="undefined".
//
// Convert every bare-string link into the object shape the page expects,
// and drop null/empty entries left over from refetches.
//
// Usage: node tools/fix-links.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

let converted = 0;
let dropped = 0;

for (const [id, rec] of Object.entries(parsed.items)) {
  if (!rec || !Array.isArray(rec.links)) continue;

  const out = [];
  for (const link of rec.links) {
    if (typeof link === "string") {
      const url = link.trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        dropped++;
        continue;
      }
      // A Steam store link reads best labelled "Steam"; anything else
      // keeps its own text, which the page shows as the url itself.
      const label = /store\.steampowered\.com/i.test(url) ? "Steam" : null;
      out.push(label ? { label, url } : { url });
      converted++;
    } else if (link && typeof link === "object" && typeof link.url === "string" && link.url.trim()) {
      out.push(link);
    } else {
      dropped++;
    }
  }

  if (out.length !== rec.links.length || out.some((l, i) => l !== rec.links[i])) {
    rec.links = out;
  }
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`روابط محوّلة: ${converted} · Entries maisonة: ${dropped} ${DRY ? "(dry run)" : ""}`);