"use strict";
// Publishers, platforms and developers, supplied by hand for the last 78
// games. Fills only the fields that were empty and never overwrites a
// value that is already there.
//
// [folder, publisher or null, platforms or null, developer or null]
//
// Usage: node tools/hand-games-5.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const DATA = [
  ["Time Shift", "Sierra Entertainment", ["PC", "Xbox 360", "PlayStation 3"], null],
  ["Alice American McGees", "Electronic Arts", null, null],
  ["Anno - History Collection", "Ubisoft", null, null],
  ["Aragami 2016  2Gb_1", "Lince Works", null, null],
  ["BEAM NG", "BeamNG GmbH", null, null],
  ["Blur", "Activision", null, null],
  ["call of duty black obs 6", "Activision", null, null],
  ["call of duty black obs1", "Activision", null, null],
  ["call of duty vangard", "Activision", null, null],
  ["Call to Arms - GoH - Ostfront", "Digitalmindsoft", null, null],
  ["Car.X.Street", "CarX Technologies", null, null],
  ["CoD - Black Ops - Cold War", "Activision", null, null],
  ["Control The Foundation", "505 Games", null, null],
  ["Crash Team Racing Nitro", "Activision", null, null],
  ["CRISIS CORE - FF7 - REUNION", "Square Enix", null, null],
  ["Crysis 1", "Electronic Arts", null, null],
  ["Dark Souls - Prepare to Die Edition", "FromSoftware / Bandai Namco", null, null],
  ["DiRT 3 - Complete Edition", null, ["PC", "Xbox 360", "PlayStation 3", "OS X"], null],
  ["disbatch", "استوديو مستقل", null, null],
  ["Disney Infinity - Gold Collection", "Disney Interactive Studios", null, null],
  ["Earthfall.Invasion", "Holospark", null, null],
  ["eldin ring nightreign", "Bandai Namco Entertainment", null, null],
  ["End of Abyss", "استوديو مستقل", null, null],
  ["Entoria The Last Song", "استوديو مستقل", null, null],
  ["FNAF-Help-Wanted", "ScottGames / Lionsgate Games", null, null],
  ["FNAF-Security-Breach", "ScottGames / Maximum Games", null, null],
  ["FNAF.Help.Wanted.2", "ScottGames", null, null],
  ["Game Of Thrones", "Telltale Games / Warner Bros", null, null],
  ["Ghost Of Recon", "Ubisoft", null, null],
  ["GTA - The Original Trilogy", "Rockstar Games", null, null],
  ["GTA VICE CITY NEXT GEN", "تعديلات مجتمعية (Fan-made / Modding)", null, null],
  ["Half-Life - Source Quadrilogy", "Valve", null, null],
  ["Harry Potter And The Deathly Hallows Part 1", "Electronic Arts", null, null],
  ["Harry Potter And The Deathly Hallows Part 2", "Electronic Arts", null, null],
  ["Hitman Sniper Challenge", "Square Enix", null, null],
  ["Hold Out", "استوديو مستقل", null, null],
  ["Horizon Chase Turbo", "Aquiris Game Studio", null, null],
  ["house of the dead 4   3.96", "Sega", null, null],
  ["Ice Age 3", "Activision", null, null],
  ["JoJos Bizarre Adventure All Star Battle R", "Bandai Namco Entertainment", null, null],
  ["keeper  25GB_1", "استوديو مستقل", null, null],
  ["Lantern", "استوديو مستقل", null, null],
  ["little nghtmare 3", "Bandai Namco Entertainment", null, null],
  ["Man of Medan [21.1GB]_3", "Bandai Namco Entertainment", null, null],
  ["mechwarior 5", "Piranha Games / Sold Out", null, null],
  ["Need For Speed Carbon Remastered", null, ["PC", "PlayStation 2", "PlayStation 3", "Xbox 360", "Wii"], null],
  ["Need for Speed Most Wanted Remastered  3gb_1", null, ["PC", "Xbox 360", "PlayStation 3"], null],
  ["Need for Speed Undercover Remastered", null, ["PC", "PlayStation 3", "Xbox 360"], null],
  ["NFS Most Wanted Unofficial Remake", "تعديلات مجتمعية (Community Project)", null, null],
  ["NieR Replicant", "Square Enix", null, null],
  ["NODE - The Last Favor of the Antarii", "استوديو مستقل", null, null],
  ["Prince Of Persia 4", null, ["PC", "Xbox 360", "PlayStation 3", "Mac OS X"], null],
  ["Race Driver GRID", null, ["PC", "PlayStation 3", "Xbox 360", "Nintendo DS"], null],
  ["rock of age 3", "Modus Games / Atlus", null, null],
  ["Shank 1 [2010]", "Electronic Arts", null, null],
  ["Silent Hill Downpour PC", "Konami", null, null],
  ["silient hill f", "Konami", null, null],
  ["Sim Supermarket Security 2023", "استوديو مستقل", null, null],
  ["Sniper Elite 2  2.87GB_1", null, null, "Rebellion Developments"],
  ["Sniper Elite Nazi Zombie Army 2", null, null, "Rebellion Developments"],
  ["Sniper Ghost Warior 3", "CI Games", null, null],
  ["Sonic.And.All.Stars.Racing", "Sega", null, null],
  ["Spider-Man - Miles Morales", "Sony Interactive Entertainment", null, null],
  ["Spider-man Remastered", "Sony Interactive Entertainment", null, null],
  ["Spider-Man Web of Shadows", null, ["PC", "PS3", "Xbox 360", "Wii", "PS2", "PSP", "DS"], null],
  ["Stalker Anomaly", "فريق تعديل مستقل مجاني", null, null],
  ["Stalker Shadow of Chernobyl -", "THQ / GSC Game World", null, null],
  ["Stray Souls", "Versus Evil / Jukai Studio", null, null],
  ["Super Mario 3D World + Bowser's Fury", "Nintendo", null, null],
  ["The Elder Scrolls oblivian REMAKE  108GB_1", "فريق Skyblivion (مستقل مجاني)", null, null],
  ["The Exit", null, ["PC"], null],
  ["The Incredibles [2004]   840MB_2", "THQ", null, null],
  ["The Legend Of Korra", "Activision", null, null],
  ["The Punisher", "THQ / ValuSoft", null, null],
  ["The Witcher 1 Enhanced Edition", "CD Projekt", null, null],
  ["tomp rider 4-5-6 Remastered", "Aspyr / Square Enix", null, null],
  ["ultra street fighter", null, ["PC", "PlayStation 3", "Xbox 360", "PlayStation 4"], null],
  ["Wolfenstein - Youngblood", "Bethesda Softworks", null, null],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

let filled = { publisher: 0, platforms: 0, developer: 0 };
let missing = 0;

for (const [folder, publisher, platforms, developer] of DATA) {
  const item = byTitle.get(folder);
  if (!item) {
    console.log(`  no folder named "${folder}"`);
    missing++;
    continue;
  }
  const rec = parsed.items[item.id];
  if (!rec) {
    console.log(`  "${folder}" has no record`);
    missing++;
    continue;
  }

  if (publisher && !has(rec.publisher)) {
    rec.publisher = publisher;
    filled.publisher++;
  }
  if (platforms && !has(rec.platforms)) {
    rec.platforms = platforms;
    filled.platforms++;
  }
  if (developer && !has(rec.developer)) {
    rec.developer = developer;
    filled.developer++;
  }

  rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(
  `\nناشر: ${filled.publisher} · منصات: ${filled.platforms} · مطور: ${filled.developer}` +
    ` · لم يُطبّق: ${missing}. ${DRY ? "(dry run)" : ""}`,
);