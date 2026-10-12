"use strict";
// The two entries hand-games-3 could not fill because no record existed
// for them yet (they had no record at all, not just empty fields).
// Creates them, with the same marking rule: a requirements block that
// describes an emulator is stored but flagged, so the page says so
// instead of presenting emulator hardware as the game's own.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const DATA = [
  [
    "MGS Peace Walker",
    "Metal Gear Solid: Peace Walker",
    2010,
    "Kojima Productions",
    "Konami",
    "تسلل، أكشن، استراتيجية إدارة قواعد",
    "تتبع «بيغ بوس» في كوستاريكا خلال فترة الحرب الباردة، حيث ينشئ جيشه الخاص بلا حدود ويواجه تهديدات نووية سرية.",
    { minimum: { cpu: "معالج متوسط للمحاكي", ram: "4 GB", gpu: "—" }, recommended: null },
    "محاكي",
  ],
  [
    "Neighbours from Hell - Revenge Is a Sweet Game",
    "Neighbours from Hell: Revenge is a Sweet Game",
    2020,
    "JoWooD / Far From Home",
    "JoWooD",
    "ألغاز، مقالب كوميدية، تسلل خفيف",
    "ساعد بطل اللعبة «وودي» في تنفيذ مقالب مضحكة ومبتكرة لإزعاج جاره المزعج دون أن يتم القبض عليك أثناء قضاء إجازته الصيفية.",
    { minimum: { cpu: "مواصفات بسيطة جداً", ram: "—", gpu: "—" }, recommended: null },
    "",
  ],
];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

let written = 0;
for (const [folder, canonical, year, developer, publisher, genre, summary, requirements, note] of DATA) {
  const item = byTitle.get(folder);
  if (!item) {
    console.log(`  no folder named "${folder}"`);
    continue;
  }
  if (parsed.items[item.id]) {
    console.log(`  "${folder}" already has a record; skipped`);
    continue;
  }

  const record = {
    title: folder,
    canonicalTitle: canonical,
    type: "game",
    releaseDate: String(year),
    developer,
    publisher,
    platforms: ["PC"],
    genres: [genre],
    summaryAr: summary,
    requirements,
    needsRequirements: false,
    needsSummary: false,
    confidence: "medium",
    extra: { factsSource: "بحث يدوي" },
  };
  if (note) {
    record.needsReview = true;
    record.extra.reviewNote = "لا توجد نسخة حاسب رسمية؛ المواصفات تخص محاكي المنصة الأصلية";
  }
  parsed.items[item.id] = record;
  written++;
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`\n${written} record(s) created. ${DRY ? "(dry run)" : ""}`);