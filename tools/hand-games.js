"use strict";
// Hand-researched game records, entered by hand rather than fetched.
//
// Three kinds of entry, and the difference matters:
//
//   full    — a date, a developer and specific requirements were supplied.
//   partial — the date and developer are sound but the requirements were
//             described rather than stated ("runs on anything"), which is
//             not something to publish.
//   skip    — the entry could not be matched to this folder, or names a
//             medium the game does not exist on. Recorded with a reason
//             rather than written, so the gap stays visible and honest.
//
// Records are written without a `source` tag, which is what marks them as
// hand research: every fill script leaves such records alone.
//
// Usage: node tools/hand-games.js [--dry] [--verbose]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const VERBOSE = process.argv.includes("--verbose");

/**
 * [folder title, canonical title, year, developer, publisher,
 *  requirements or null, note]
 */
const FULL = [
  ["BEAM NG", "BeamNG.drive", 2015, "BeamNG", null, { cpu: "Core i5", ram: "16 GB", gpu: "GTX 970 أو AMD R9 290" }],
  ["Blades of Time - Limited Edition", "Blades of Time", 2012, "Gaijin Entertainment", "Konami", { cpu: "Intel Core i3", ram: "2 GB", gpu: "Nvidia GeForce 8800 GT" }],
  ["Brothers - AToTS Remake", "Brothers: A Tale of Two Sons Remake", 2024, "Avantgarden", "505 Games", { cpu: "Core i7-7700", ram: "16 GB", gpu: "GTX 1060 أو RX 580" }],
  ["Call of Duty - MW2CR", "Call of Duty: Modern Warfare 2 Campaign Remastered", 2020, "Beenox", "Activision", { cpu: "Core i3-4340", ram: "8 GB", gpu: "GTX 670 أو HD 7950" }],
  ["CallOfDutyModerWarfareRemastered", "Call of Duty: Modern Warfare Remastered", 2016, "Raven Software", "Activision", { cpu: "Core i3-3225", ram: "8 GB", gpu: "GTX 660 أو HD 7850" }],
  ["Call to Arms - GoH - Ostfront", "Call to Arms: Gates of Hell - Ostfront", 2021, "Barbedwire Studios / Digitalmindsoft", null, { cpu: "Quad Core 3.0 GHz", ram: "8 GB", gpu: "GTX 960" }],
  ["Castlevania - Lords of Shadow UE", "Castlevania: Lords of Shadow - Ultimate Edition", 2013, "MercurySteam", "Konami", { cpu: "Quad Core 2.4 GHz", ram: "1 GB", gpu: "GeForce 9800 GT" }],
  ["Castlevania - LoS - Mirror of Fate HD", "Castlevania: Lords of Shadow - Mirror of Fate HD", 2013, "MercurySteam", "Konami", { cpu: "Intel Core 2 Duo", ram: "1 GB", gpu: "Nvidia 8800 GTS" }],
  ["DCG - Aladdin & The Lion King", "Disney Classic Games: Aladdin and The Lion King", 2019, "Digital Eclipse", "Nighthawk Interactive", null],
  ["Demon X Machine", "Daemon X Machina", 2020, "Marvelous", "Xseed Games", { cpu: "Intel Core i7-6700", ram: "8 GB", gpu: "GTX 970" }],
  ["Dragonball Xenoverse", "Dragon Ball Xenoverse", 2015, "Dimps", "Bandai Namco Entertainment", { cpu: "Core i3-530", ram: "2 GB", gpu: "GeForce 450" }],
  ["Earthfall.Invasion", "Earthfall: Invasion", 2018, "Holospark", null, { cpu: "Intel Core i5-4430", ram: "8 GB", gpu: "GTX 960 أو R9 280" }],
  ["F1 22 Champions Edition", "F1 22", 2022, "Codemasters", "EA Sports", { cpu: "Core i3-6100 أو FX-4300", ram: "8 GB", gpu: "GTX 1050 Ti أو RX 470" }],
  ["FNAF-Help-Wanted", "Five Nights at Freddy's: Help Wanted", 2019, "Steel Wool Studios", null, { cpu: "Intel Core i5", ram: "8 GB", gpu: "GTX 970" }],
  ["FNAF-Into-the-Pit", "Five Nights at Freddy's: Into the Pit", 2024, "Mega Cat Studios", "Scott Cawthon", null],
  ["FNAF-Security-Breach", "Five Nights at Freddy's: Security Breach", 2021, "Steel Wool Studios", null, { cpu: "Core i5-6600K", ram: "16 GB", gpu: "GTX 1050 Ti أو RX 570" }],
  ["FNAF.Help.Wanted.2", "Five Nights at Freddy's: Help Wanted 2", 2023, "Steel Wool Studios", null, { cpu: "Intel Core i7", ram: "16 GB", gpu: "GTX 1070" }],
  ["G-FOREC", "G-Force", 2009, "Eurocom", "Disney Interactive", { cpu: "Intel Pentium D", ram: "1 GB", gpu: "GeForce 6800" }],
  ["Generals-Zero Hour - Last Stand", "Command & Conquer: Generals - Zero Hour", 2003, "EA Los Angeles", null, null, "تعديل (Last Stand) على لعبة 2003"],
  ["GTA - The Original Trilogy", "Grand Theft Auto: The Original Trilogy", "2001-2004", "Rockstar Games", null, null, "مجموعة من ثلاث إصدارات"],
  ["GTA Trilogy - DE-BSE", "Grand Theft Auto: The Trilogy - The Definitive Edition", 2021, "Grove Street Games", "Rockstar Games", { cpu: "Core i5-6600K", ram: "8 GB", gpu: "GTX 970 أو RX 570" }],
  ["gta vice city", "Grand Theft Auto: Vice City", 2002, "Rockstar North", "Rockstar Games", null],
  ["Horizon - Zero Dawn CE", "Horizon Zero Dawn - Complete Edition", 2020, "Guerrilla Games", "PlayStation PC LLC", { cpu: "Core i5-2500K", ram: "16 GB", gpu: "GTX 780 أو R9 290" }],
  ["IGI", "Project I.G.I.", 2000, "Innerloop Studios", "Eidos Interactive", null],
  ["IGI2", "Project I.G.I. 2: Covert Strike", 2003, "Innerloop Studios", "Codemasters", null],
  ["Injustice 2 Legendary Edition", "Injustice 2", 2018, "NetherRealm Studios", "Warner Bros", { cpu: "Core i5-750", ram: "8 GB", gpu: "GTX 670 أو HD 7950" }],
  ["James Bond 007 Legends", "James Bond 007: Legends", 2012, "Eurocom", "Activision", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "Nvidia 8800 GT" }],
  ["Kingdom Hearts 3 and Re-Mind", "Kingdom Hearts III", 2021, "Square Enix", "Square Enix", { cpu: "Core i5-7500", ram: "8 GB", gpu: "GTX 760 أو RX 560" }],
  ["Kunitsu", "Kunitsu-Gami: Path of the Goddess", 2024, "Capcom", "Capcom", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060 أو RX 580" }],
  ["Life is Strange - BtS Remastered", "Life is Strange: Before the Storm - Remastered", 2022, "Deck Nine", "Square Enix", { cpu: "Core i5-2300", ram: "6 GB", gpu: "GTX 750 Ti أو HD 7770" }],
  ["LotR - War in the North - LE", "The Lord of the Rings: War in the North", 2011, "Snowblind Studios", "Warner Bros", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "Radeon HD 3870 أو GeForce 8800 GT" }],
  ["Marvel - Ultimate Alliance Bundle 2016  7.39GB_1", "Marvel: Ultimate Alliance", 2006, "Activision", "Activision", { cpu: "Intel Core i3", ram: "4 GB", gpu: "GeForce GTX 550 Ti" }, "السنة في العنوان 2016 تاريخ الحزمة؛ اللعبة 2006"],
  ["Marvels Avengers Full unlocked  87GB_3", "Marvel's Avengers", 2020, "Crystal Dynamics", "Square Enix", { cpu: "Intel Core i3-8100", ram: "8 GB", gpu: "GTX 950 أو R9 270" }],
  ["MAXPYNE 2", "Max Payne 2: The Fall of Max Payne", 2003, "Remedy Entertainment", "Rockstar Games", null],
  ["mechwarior 5", "MechWarrior 5: Mercenaries", 2019, "Piranha Games", null, { cpu: "Core i3-7100", ram: "8 GB", gpu: "GTX 770 أو RX 470" }],
  ["MGS MASTER COLLECTION Vol.1 BONUS CONTENT", "Metal Gear Solid: Master Collection Vol. 1", 2023, "Konami", "Konami", { cpu: "Core i7-3770", ram: "8 GB", gpu: "GTX 760" }, "مجموعة"],
  ["MGS2 Sons of Liberty Master Collection Version", "Metal Gear Solid 2: Sons of Liberty - Master Collection", 2023, "Konami", "Konami", { cpu: "Core i7-3770", ram: "8 GB", gpu: "GTX 760" }],
  ["MGS3 Snake Eater Master Collection Version", "Metal Gear Solid 3: Snake Eater - Master Collection", 2023, "Konami", "Konami", { cpu: "Core i7-3770", ram: "8 GB", gpu: "GTX 760" }],
  ["Middle-earth - Shadow of War DE", "Middle-earth: Shadow of War - Definitive Edition", 2017, "Monolith Productions", "Warner Bros", { cpu: "Core i5-2500K", ram: "8 GB", gpu: "GTX 660 أو HD 7870" }],
  ["NARUTO SHIPPUDEN - UNS 4", "Naruto Shippuden: Ultimate Ninja Storm 4", 2016, "CyberConnect2", "Bandai Namco", null],
  ["NARUTO X BORUTO - UNSC", "Naruto x Boruto: Ultimate Ninja Storm Connections", 2023, "CyberConnect2", "Bandai Namco", { cpu: "Core i5-3470", ram: "8 GB", gpu: "GTX 660" }],
  ["Need for Spee  3.3gbd  ProStreet", "Need for Speed: ProStreet", 2007, "EA Black Box", "Electronic Arts", null],
  ["NFS Hot Pursuit Remastered", "Need for Speed: Hot Pursuit Remastered", 2020, "Stellar Entertainment", "Electronic Arts", { cpu: "Core i3-2120", ram: "8 GB", gpu: "GTX 660 أو HD 7850" }],
  ["Olympic Games Tokyo 2020", "Olympic Games Tokyo 2020 - The Official Video Game", 2021, "Sega", "Sega", { cpu: "Intel Core i5-2500", ram: "4 GB", gpu: "GTX 760" }],
  ["Planet_Coaster_Alpha", "Planet Coaster", 2016, "Frontier Developments", "Frontier Developments", { cpu: "Intel Core i5-2300", ram: "8 GB", gpu: "GTX 560" }],
  ["ptototype2", "Prototype 2", 2012, "Radical Entertainment", "Activision", { cpu: "Intel Core 2 Duo 2.6 GHz", ram: "2 GB", gpu: "GeForce 8800 GT" }],
  ["Rabbids - Party of Legends [HV]", "Rabbids: Party of Legends", 2022, "Ubisoft", "Ubisoft", null],
  ["Rage Anarchy Edition", "Rage: Anarchy Edition", 2011, "id Software", "Bethesda Softworks", { cpu: "Core 2 Duo", ram: "4 GB", gpu: "GeForce 9800 GTX" }],
  ["ResidentEvil4UltimateHD", "Resident Evil 4: Ultimate HD Edition", 2014, "Capcom", "Capcom", { cpu: "Intel Core 2 Duo", ram: "2 GB", gpu: "GeForce 8800 GTS" }],
  ["Sim Digital Combat World", "Digital Combat Simulator (DCS World)", 2008, "Eagle Dynamics", "Eagle Dynamics", { cpu: "Intel Core i5 أو أعلى", ram: "16-32 GB", gpu: "GTX 1070 أو أعلى" }],
  ["Sim Supermarket Security 2023", "Supermarket Security Simulator", 2023, null, null, null],
  ["snow runner", "SnowRunner", 2020, "Saber Interactive", "Focus Entertainment", { cpu: "Core i3-4130", ram: "8 GB", gpu: "GTX 660 أو R9 270" }],
  ["Stranger of Paradise - FFO", "Stranger of Paradise: Final Fantasy Origin", 2023, "Team Ninja", "Square Enix", { cpu: "Core i7-6700", ram: "16 GB", gpu: "GTX 1060 أو RX 5700 XT" }],
  ["Styx - Master of Darkness", "Styx: Master of Darkness", 2014, "Cyanide Studio", "Focus Home Interactive", { cpu: "AMD FX-4100", ram: "4 GB", gpu: "GeForce GTX 460 أو Radeon HD 6850" }],
  ["TABS", "Totally Accurate Battle Simulator", 2019, "Landfall Games", "Landfall Games", { cpu: "Intel Core i5-2400", ram: "8 GB", gpu: "GTX 670" }],
  ["TDPA - The Devil in Me", "The Dark Pictures Anthology: The Devil in Me", 2022, "Supermassive Games", "Bandai Namco", { cpu: "Core i5-8400", ram: "8 GB", gpu: "GTX 1060 أو RX 580" }],
  ["The Amazing Spid  er Man 1", "The Amazing Spider-Man", 2012, "Beenox", "Activision", { cpu: "Intel Core 2 Duo 2.6 GHz", ram: "3 GB", gpu: "GeForce 8800 GT" }],
  ["The Crew unlimited", "The Crew", 2014, "Ivory Tower", "Ubisoft", { cpu: "Core 2 Quad Q9300", ram: "4 GB", gpu: "GeForce GTX 260 أو Radeon HD 4870" }],
  ["The Elder Scrolls V - Skyrim - Legendary Edition", "The Elder Scrolls V: Skyrim - Legendary Edition", 2011, "Bethesda Game Studios", "Bethesda Softworks", { cpu: "Dual Core 2.0 GHz", ram: "2 GB", gpu: "DirectX 9.0c متوافق" }],
  ["The Outer Worlds - SCE", "The Outer Worlds: Spacer's Choice Edition", 2019, "Obsidian Entertainment", "Private Division", { cpu: "Core i7-6700", ram: "16 GB", gpu: "GTX 1070 أو RX Vega 56" }],
  ["The Walking Dead - Definitive Series  2019  16.4GB_1", "The Walking Dead: The Telltale Definitive Series", 2019, "Telltale Games", "Skybound Games", { cpu: "Intel Core i5-2500M", ram: "3 GB", gpu: "Nvidia GTS 450" }],
  ["TLotR War in the North", "The Lord of the Rings: War in the North", 2011, "Snowblind Studios", "Warner Bros", { cpu: "Core 2 Duo", ram: "2 GB", gpu: "Radeon HD 3870 أو GeForce 8800 GT" }],
  ["TMNT - Shredder's Revenge", "Teenage Mutant Ninja Turtles: Shredder's Revenge", 2022, "Tribute Games", "Dotemu", null],
  ["Tony Hawk's Pro Skater 1 plus 2", "Tony Hawk's Pro Skater 1 + 2", 2020, "Vicarious Visions", "Activision", { cpu: "Core i3-3210", ram: "8 GB", gpu: "GTX 660 أو HD 7950" }],
  ["Ultimate Spiderman  1.71GB_1", "Ultimate Spider-Man", 2005, "Treyarch", "Activision", null],
  ["Yakuza Like a Dragon - Infinite Wealth 30GB   {HV{", "Yakuza: Like a Dragon - Infinite Wealth", 2024, "Ryu Ga Gotoku Studio", "Sega", { cpu: "Core i5-7400", ram: "16 GB", gpu: "GTX 1060 أو RX 580" }],
  ["Yakuza Like a Dragon - Ishin [HV]", "Yakuza: Like a Dragon - Ishin!", 2023, "Ryu Ga Gotoku Studio", "Sega", { cpu: "Core i7-4790", ram: "8 GB", gpu: "GTX 960 أو RX 470" }],
  ["Yakuza Like a Dragon Gaiden  {HV]", "Like a Dragon Gaiden: The Man Who Erased His Name", 2023, "Ryu Ga Gotoku Studio", "Sega", { cpu: "Core i5-8400", ram: "16 GB", gpu: "GTX 1060 أو RX 580" }],
  ["Yakuza Lost Judgment {HV}", "Lost Judgment", 2022, "Ryu Ga Gotoku Studio", "Sega", { cpu: "Core i7-6700", ram: "8 GB", gpu: "GTX 1060 أو RX 580" }],
];

/** Entries where the folder name does not identify the game confidently. */
const REVIEW = [
  ["Alice American McGees", "Alice: Madness Returns / American McGee's Alice", "2000 أو 2011", "Spicy Horse / Electronic Arts", "العنوان يخلط بين نسختين: الأصلية 2000 وال.follow-up 2011. المجلد 1.08 GB."],
  ["Crash Team Racing Nitro", "Crash Bandicoot: N. Sane Trilogy", 2018, "Vicarious Visions / Activision", "اسم المجلد مختلف تمامًا عن اللعبة المقترحة."],
  ["Ghost Of Recon", null, null, null, "المجلد 60 GB — سلسلة Ghost Recon كبيرة، والعنوان alone لا يحدد أي جزء."],
  ["house of the dead 4   3.96", null, null, null, "لا توجد نسخة حاسب من اللعبة؛ الوصف يعتمد على محاكي."],
  ["tomp rider 4-5-6 Remastered", "Tomb Raider", null, null, "اسم المجلد مكتوب خطأً؛ غير واضح إن كان Tomb Raider."],
  ["The Elder Scrolls oblivian REMAKE  108GB_1", null, null, null, "المجلد 116 GB — حجم Skyrim لا Oblivion."],
  ["NFS Most Wanted Unofficial Remake", "Need for Speed: Most Wanted", 2005, null, "تعديل غير رسمي؛ المواصفات تختلف عن اللعبة الأصلية."],
  ["Stalker Anomaly", "S.T.A.L.K.E.R.: Anomaly", 2019, null, "تعديل مستقل؛ المواصفات تختلف حسب الحزم."],
  ["Silent.Hill.4.New.Edition", "Silent Hill 4: The Room", 2004, "Konami", "النسخة الأصلية على Xbox فقط؛ الحاس غير رسمي."],
];

/** Entries that were supplied but cannot be published as they stand. */
const SKIP = [
  ["disbatch", "وصف غير محدد: «ألعاب مستقلة أو مشاريع خاصة»."],
  ["Desperados Wanted Dead or Alive Re-modernized", "المواصفات موصوفة بـ«تعمل على أي جهاز»."],
  ["F.E.A.R. Platinum Collection", "المواصفات موصوفة بـ«تعمل على أي جهاز»."],
  ["GTA VICE CITY NEXT GEN", "لا سنة، والوصف «تعديلات حديثة»."],
  ["Half-Life - Source Quadrilogy", "المواصفات «متطلبات ضعيفة جدًا»."],
  ["Neighbours from Hell - Revenge Is a Sweet Game", "المواصفات «خفيفة جدًا»، والسنة المعطاة 2003 بينما اللعبة 2008."],
  ["Silent Hill Downpour PC", "الوصف يعتمد على محاكي، لا مواصفات لعبة."],
  ["MGS Peace Walker", "الوصف يعتمد على محاكي."],
  ["Super Mario 3D World + Bowser's Fury", "ليس ضمن games في هذه المكتبة."],
];

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const cat = data.categories.find((c) => c.id === "games");
  const file = path.join(ROOT, "details", "games.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

  const byTitle = new Map(cat.items.map((i) => [i.title, i]));
  let written = 0;
  let flagged = 0;

  for (const [folder, canonical, year, developer, publisher, requirements, note] of FULL) {
    const item = byTitle.get(folder);
    if (!item) {
      console.log(`  no folder named "${folder}"`);
      continue;
    }

    const record = {
      title: folder,
      canonicalTitle: canonical,
      type: "game",
      releaseDate: year === null || year === undefined ? null : String(year),
      developer: developer || null,
      publisher: publisher || null,
      platforms: ["PC"],
      requirements: requirements ? { minimum: requirements, recommended: null } : null,
      needsRequirements: !requirements,
      needsSummary: true,
      confidence: "medium",
      extra: {
        factsSource: "بحث يدوي",
        ...(note ? { note } : {}),
      },
      // No `source` key: that absence is what protects a hand-written
      // record from every automated fill.
    };

    if (parsed.items[item.id]) {
      // Keep an existing record's text and provenance, take the facts.
      const existing = parsed.items[item.id];
      existing.canonicalTitle = canonical;
      if (!existing.releaseDate) existing.releaseDate = record.releaseDate;
      if (!existing.developer) existing.developer = record.developer;
      if (!existing.publisher) existing.publisher = record.publisher;
      if (!existing.requirements && requirements) {
        existing.requirements = record.requirements;
        existing.needsRequirements = false;
      }
      existing.extra = { ...(existing.extra || {}), factsSource: "بحث يدوي" };
    } else {
      parsed.items[item.id] = record;
    }
    written++;
    if (VERBOSE) console.log(`  ${folder} -> ${canonical}`);
  }

  for (const [folder, canonical, year, developer, reason] of REVIEW) {
    const item = byTitle.get(folder);
    if (!item) {
      console.log(`  no folder named "${folder}"`);
      continue;
    }
    const existing = parsed.items[item.id];
    if (existing) {
      existing.needsReview = true;
      existing.extra = { ...(existing.extra || {}), reviewNote: reason };
    } else {
      parsed.items[item.id] = {
        title: folder,
        canonicalTitle: canonical || null,
        type: "game",
        releaseDate: year ? String(year) : null,
        developer: developer || null,
        platforms: ["PC"],
        needsReview: true,
        needsSummary: true,
        needsRequirements: true,
        confidence: "low",
        extra: { reviewNote: reason },
      };
    }
    flagged++;
  }

  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");

  console.log(`\n${written} records written, ${flagged} flagged for review, ${SKIP.length} skipped.`);
  console.log("\nnot published:");
  for (const [title, why] of SKIP) console.log(`  ${title}\n      ${why}`);
})();