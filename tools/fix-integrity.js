"use strict";
// Repair the values that came out of the hand-supplied batches corrupted or
// with a stray token pasted in. Every replacement below is either a clean
// reading of what was supplied or a plain correction; nothing new is invented.
//
//   F1                            cast entry was garbled to
//                                 "برادونCorrelationCorrelation الإ IDSID…"
//   Guten Morgen Verônica 2020    "إدواردو …ويس" is Idiota by name
//   Pacific.Rim 1+2               director had "DENАIT" pasted in
//   The Maze Runner Collection    director was "weis بال"
//   Timon & Pumbaa                "نITHن لين" is Jeremy Lion
//   جامبول                        "logan نيكولاس"
//   سلاحف النينجا                 "رافIEL" is Raphael
//   Bokutachi no Remake           "كيويا هاشiba"
//   Ouran Koukou Host Club        "هارuhi فوجيوكا"
//
// Usage: node tools/fix-integrity.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// [file, record id, field, new value]
const FIX = [
  ["foreign-films", "foreign-films/F1.jpg", "cast", ["براد بيت", "برادون آيدريس"]],

  ["foreign-film-series", "foreign-film-series/Pacific.Rim 1+2.jpg", "director", "جييرمو ديل تورو / ستيفن ديل نايت"],
  ["foreign-film-series", "foreign-film-series/Pacific.Rim 1+2.jpg", "directors", ["جييرمو ديل تورو", "ستيفن ديل نايت"]],
  ["foreign-film-series", "foreign-film-series/The Maze Runner Collection Bul-ray.jpg", "director", "ويس بَل"],
  ["foreign-film-series", "foreign-film-series/The Maze Runner Collection Bul-ray.jpg", "directors", ["ويس بَل"]],

  ["foreign-series", "foreign-series/Guten Morgen Verônica 2020.jpg", "cast", ["تين تاندر", "إدواردو إيدياتا"]],
  ["cartoon-series", "cartoon-series/Timon & Pumbaa - تيمون وبومبا.jpg", "cast", ["جيمري لايون", "إروين كازالي"]],
  ["cartoon-series", "cartoon-series/جامبول.jpg", "cast", ["لوقا مورال", "نيكولاس"]],

  ["cartoon-series", "cartoon-series/سلاحف النينجا.jpg", "cast", ["ليوناردو", "رافائيل", "دوناتيلو", "ميكائيلانجيلو"]],

  ["anime", "anime/Bokutachi no Remake.jpg", "cast", ["كيويا هاشيبا", "أكيتشي نينو", "تاماكي كوماشيرو"]],
  ["anime", "anime/Ouran Koukou Host Club.jpg", "cast", ["هاروهي فوجيوكا", "تاماكي سوزوكي"]],
];

let applied = 0;
const missing = [];

for (const [cat, id, field, value] of FIX) {
  const file = path.join(ROOT, "details", `${cat}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const rec = parsed.items[id];
  if (!rec) { missing.push(id); continue; }
  rec[field] = value;
  applied++;
  console.log(`  ${id}  →  ${field}`);
  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
}

console.log(`\napplied ${applied}, missing ${missing.length} ${DRY ? "(dry run)" : ""}`);
for (const m of missing) console.log("  no record: " + m);
