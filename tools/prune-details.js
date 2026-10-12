"use strict";
// Remove bad auto-filled entries that the Wikipedia medium-guard now
// rejects — e.g. "11.11" pointing at a numerology article, "122" at the
// integer page. Anything whose summary does not describe a film/series,
// or that carries no usable facts, is dropped so a later run can retry
// it with the improved matcher.
//
// Usage: node tools/prune-details.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DETAILS = path.join(ROOT, "details");

const MEDIA_MARKERS =
  /\b(film|movie|television series|tv series|web series|miniseries|telenovela|anime|sitcom|documentary|drama series|show)\b|(?:فيلم|مسلسل|دراما|برنامج|وثائقي|أنمي)/i;

const DISAMBIGUATION = /\bmay refer to\b|^\s*(?:see also|list of)\b/i;

let totalDropped = 0;
for (const file of fs.readdirSync(DETAILS).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DETAILS, file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    continue;
  }
  if (!parsed.items) continue;

  let dropped = 0;
  for (const [id, rec] of Object.entries(parsed.items)) {
    if (rec._miss) continue;
    // Only prune film and series categories. Games go through their own
    // provider, which validates with the video-game infobox rather than
    // the film/series guard, and a game article would be thrown out by
    // it for not mentioning "film".
    const cat = file.replace(".json", "");
    if (cat === "games") continue;

    // Only touch auto-filled Wikipedia records; hand research and the
    // structured providers (which validate their own medium) stay.
    if (rec.source !== "wikipedia" && rec.source !== "wikipedia-collection") continue;

    const summary = rec.summaryEn || "";
    if (!summary || summary.length < 40) {
      delete parsed.items[id];
      dropped++;
      continue;
    }
    if (DISAMBIGUATION.test(summary.slice(0, 80))) {
      delete parsed.items[id];
      dropped++;
      continue;
    }
    if (!MEDIA_MARKERS.test(summary.slice(0, 400))) {
      delete parsed.items[id];
      dropped++;
    }
  }

  if (dropped) {
    fs.writeFileSync(full, JSON.stringify(parsed, null, 2) + "\n");
    console.log(`${file}: dropped ${dropped}`);
    totalDropped += dropped;
  }
}

console.log(`\ntotal dropped: ${totalDropped}`);