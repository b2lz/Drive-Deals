"use strict";
// Two cast fields in foreign-film-series carry corrupted text that slipped
// through the batch write. Replace them with clean values.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "details", "foreign-film-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const FIX = {
  "foreign-film-series/The Bourne Collection_1.jpg": ["مات ديمون", "فرانكا بوتينيتي"],
  "foreign-film-series/The Hunger Games Trilogy Blu-ray.jpg": [
    "جينيڤر لورانس",
    "جوش هوتشرسن",
    "ليام همسورث",
  ],
  "foreign-film-series/Kingsman 1+2.jpg": [
    "تارون إجيرتون",
    "كولين فيث",
    "صامuel ل. جاكسون".replace("صامuel", "صامويل"),
  ],
};

for (const [id, cast] of Object.entries(FIX)) {
  const rec = parsed.items[id];
  if (!rec) continue;
  rec.cast = cast.map((c) => c.replace(/uel/g, "ويل"));
  console.log(`${id.split("/")[1]}: ${JSON.stringify(rec.cast)}`);
}

fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log("done");