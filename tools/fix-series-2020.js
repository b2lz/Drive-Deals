"use strict";
// The last gap in arabic-series: the series titled "2020", a Lebanese show
// on Shahid. The folder name is just the year, so the record had no
// director or cast; supplied by hand.
//
// Usage: node tools/fix-series-2020.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["arabic-series/2020.jpg"];
if (rec) {
  rec.director = "فيليب أسمر";
  rec.directors = ["فيليب أسمر"];
  rec.cast = [
    "نادين نسيب نجيم",
    "قصي خولي",
    "كارمن لبس",
    "فادي إبراهيم",
    "ماريتا الحلاني",
  ];
  rec.writers = ["بلال شحادات", "نادين جابر"];
  rec.extra = {
    ...(rec.extra || {}),
    factsSource: "بحث يدوي",
  };
  rec.links = [
    ...(rec.links || []),
    { label: "IMDb", url: "https://www.imdb.com/title/tt13377006" },
  ];
  console.log("  2020: director, cast and writers written");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");