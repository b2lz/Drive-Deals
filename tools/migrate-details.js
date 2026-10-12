"use strict";
// One-off migration: move top-level "metacritic" into "extra".
//
// item.js renders Metacritic only from the "extra" block, so a record
// carrying it at the top level shows nothing on the page. The Steam
// provider now writes it to "extra"; this brings the records written
// before that change in line.
//
// Usage: node tools/migrate-details.js

const fs = require("fs");
const path = require("path");

const DETAILS = path.resolve(__dirname, "..", "details");

let migrated = 0;
let files = 0;

for (const file of fs.readdirSync(DETAILS).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DETAILS, file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    continue;
  }
  if (!parsed.items) continue;

  let changed = 0;
  for (const rec of Object.values(parsed.items)) {
    if (rec._miss) continue;

    // A key present with a null value still counts as a key: it is
    // invisible to item.js but shows up as dead weight in the file.
    if (Object.prototype.hasOwnProperty.call(rec, "metacritic")) {
      if (rec.metacritic != null) {
        rec.extra = rec.extra || {};
        rec.extra.metacritic = `Metacritic ${rec.metacritic}/100`;
      }
      delete rec.metacritic;
      changed++;
    }

    // Drop any other null-valued top-level field the fillers emitted.
    for (const [key, value] of Object.entries(rec)) {
      if (value === null || value === undefined || value === "") delete rec[key], changed++;
    }
  }

  if (changed) {
    fs.writeFileSync(full, JSON.stringify(parsed, null, 2) + "\n");
    console.log(`${file}: migrated ${changed}`);
    migrated += changed;
    files++;
  }
}

console.log(`\n${migrated} records across ${files} files`);
if (!migrated) console.log("nothing to do — the data is already in the current shape");