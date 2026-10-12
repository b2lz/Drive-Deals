"use strict";
// Cast and director for the film folders that lacked them, supplied by hand.
// Covers foreign-films, indian-films and foreign-film-series in one pass since
// the field names are identical.
//
// Usage: node tools/hand-films-people.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

// [category, folder, director|null, [cast...]|null]
const DATA = [
  // ---- foreign-films -------------------------------------------------------
  ["foreign-films", "2007 The Number 23", null, ["جيم كاري", "فيرجينيا مادسن", "لوقن ليرمان", "داني هاستن"]],
  ["foreign-films", "2011 Drive", null, ["ريان غوسلينغ", "كيري مولغان", "براين كرانستون", "ألبرت بروكس"]],
  ["foreign-films", "2023 Oppenheimer", null, ["كيليان مورفي", "إميلي بلنت", "مات ديمون", "روبرت داوني"]],
  ["foreign-films", "Alita Battle Angel", null, ["روزا سالازار", "كريستوف فالتس", "جينيغر كونلي", "ماهرشالا علي"]],
  ["foreign-films", "Avatar.The.Way.of.Water", null, ["سام وورثنجتون", "زوي سالدانا", "سيغورني ويفر", "ستيفن لانغ"]],
  ["foreign-films", "Babylon", null, ["براد بيت", "مارغو روبي", "دييغو كالڤا", "جان سمارت"]],
  ["foreign-films", "Big Awning (2020) [1080p]", "جون لو", null],
  ["foreign-films", "Birds.of.Prey", null, ["مارغو روبي", "روزي بيريز", "ماري إليزابيث وينستيد", "إيوان مكغرغور"]],
  ["foreign-films", "Black Mirror Bandersnatch", null, ["فيون وايتهيد", "ويل بولتر", "أسيوم تشاودري", "كريغ باركنسون"]],
  ["foreign-films", "BLOOD SHOT", null, ["فين ديزل", "ايزا غونثاليث", "سام هيوزان", "توبي كبيل"]],
  ["foreign-films", "Dont Let Them In (2020) [1080p]", "ريتشارد كوبر", null],
  ["foreign-films", "Dont Look Up", null, ["ليوناردو دي كابريو", "جينيفر لورنس", "ميريل ستريب", "كيتي بلانشارت"]],
  ["foreign-films", "Dragonheart Battle For The Heartfire (2017) [YTS.AG]", null, ["باتريك ستيوارت", "توم ريس هاريس", "جيسامين-بلس بيل", "تاملا كاري"]],
  ["foreign-films", "Fragile [G] (2005) [720p]", null, ["كاليستا فلوكهارت", "ريشارد روكسبيرغ", "إيلينا أنايا", "جيمّا جونز"]],
  ["foreign-films", "Fresh", null, ["دايسي إيدجار-جونز", "سيباستيان ستان", "جوجو تي جيبس", "شارلوت لي بون"]],
  ["foreign-films", "Hit", null, ["راجكومار راو", "سانيا مالهوترا", "داليب تحيل"]],
  ["foreign-films", "How To Train Your Dragon (2025) [1080p]", null, ["ميسون ثامز", "نيكو باركر", "جيرارد بتلر", "نيك فروست"]],
  ["foreign-films", "I Am Fear (2020) [1080p]", null, ["كريستينا كليبي", "وليام بالدين", "فاران تحير", "فرانسيس شولتو-دوغلاس"]],
  ["foreign-films", "Ice Road Vengeance (2025) [1080p]", null, ["ليام نيسون", "لورانس فيشبيرن", "رياي ماك كينن", "أمبر ميثندر"]],
  ["foreign-films", "Karate Kid Legends (2025) [1080p]", "جوناثان إنتويستل", null],
  ["foreign-films", "King Arthur Legend of the Sword", null, ["شارلي هنام", "أستريد بيرغس-فريسباي", "جود لو", "دجمون هونسو"]],
  ["foreign-films", "Lion King", null, ["دونالد غلوفر", "بيونسيٍ", "جيمس إيرل جونز", "تشيوتيل إيجيفور"]],
  ["foreign-films", "Malignant", null, ["آنا بيل ووليس", "مادي هاسون", "جورج يونغ", "ميشول برانا وايت"]],
  ["foreign-films", "Max Cloud 2021", null, ["سكوت أدكنز", "جون هانا", "لاشانا لينتش", "فرانز درامه"]],
  ["foreign-films", "Monsters Of Man", null, ["نيل ماكدونو", "بريتوتور", "جوزي روزيت", "ديفيد هافرتي"]],
  ["foreign-films", "Most Wanted [Z] (2020)", "دانيال روبي", null],
  ["foreign-films", "Mulan", null, ["ليو ييفي", "دوني يين", "جيسون سكوت لي", "جيت لي"]],
  ["foreign-films", "Ninja Shadow Of A Tear 2013", null, ["سكوت أدكنز", "كين كوسوغي", "ميكا هيجي", "تيم مان"]],
  ["foreign-films", "No Exit", null, ["هافانا روز ليو", "داني راميريز", "ديفيد ريسدال", "ديل ديكسي"]],
  ["foreign-films", "Rise of the Guardians (2012)", null, ["كريس باين", "أليك بالدوين", "هيو جاكمان", "إيسلا فيشر"]],
  ["foreign-films", "Roh (2020) [1080p]", null, ["فاراه أحمد", "حارث حازيق", "نام رون", "جونايينا الوجونغ"]],
  ["foreign-films", "Sisu Road to Revenge", null, ["جورما توميلا", "أكسيل هينّي", "جاك دولان", "ميموسا ويلامو"]],
  ["foreign-films", "The Cave (2019) [1080p]", null, ["فيران فايد"]],
  ["foreign-films", "The Shadows Edge", "فريق الإنتاج المستقل", null],
  ["foreign-films", "The.Conjuring The.Devil Made Me.Do It", null, ["باتريك ويلسون", "ڤيرا فارميغا", "رويري أوكونور", "سارة كاثرين هوك"]],
  ["foreign-films", "Time Crimes (2007) [720p]", null, ["كارا إلخاخالد", "كانديلا فيرنانديز", "باربارا غويناغا", "ناتشو فيغالوندو"]],
  ["foreign-films", "Wandering Interstellar (2019) [1080p]", "تشانغ وي", null],
  ["foreign-films", "War Machine (2026) [1080p]", "باتريك هيوز", null],

  // ---- indian-films --------------------------------------------------------
  ["indian-films", "Bahubali 2 The Conclusion 2017", null, ["براباس", "رانا داغوباتي", "أنوشكا شيتي", "تامانا بهاتيا", "راميا كريشنان", "ساتيارج"]],
  ["indian-films", "Class of 83 (2020) [720p]", null, ["بوبي ديل", "أنوب سوني", "جوي سنغوطا", "بهوبندرا جادات", "نيناد ماهاجاني"]],
  ["indian-films", "Darr  [1993].[1080p]", "ياش شوبرا", null],
  ["indian-films", "Dear Sathya 2022", null, ["آريان سانتوش", "أرشانا كوتيغي", "أرونا بالراج", "أشفين راو"]],
  ["indian-films", "Edge Of Extinction", "أندرو غيلبرت", ["لوك هوبسون", "جورجي سيمبيرت", "كريس كاي", "برين هودجن"]],
  ["indian-films", "Penance Lane [Z] (2020)", "بيتر إنجيرت", ["تايلر مين", "ميوز واتسون", "جون دوجان", "سكوت تايلور-كومبتون", "دانيال روبك"]],
  ["indian-films", "Pink (2016) Hindi [720p]", null, ["أميتاب باتشوان", "تابسي باندارا", "كيرتي كلهري", "أندريا تارينج", "أنجاد بيدي"]],
  ["indian-films", "Pk (2014) [720p]", null, ["أَمير خان", "أنوشكا شارما", "سوشانت سينغ راجبوت", "بومان إيراني", "سانجاي دوت"]],
  ["indian-films", "Pressure Cooker (2020) [1080p]", null, ["ساي روناك", "بريتي أسراني", "راحول راماكريشنان", "تانيكيللا بهاراني"]],
  ["indian-films", "Psycho Party Planner [Z]", "جيك هلغرن", ["ليندسي هارتلي", "كاثرين هيكس", "كاترينا بودن", "دايمون دايوب"]],
  ["indian-films", "Seetharama Kalyana (2019) [1080p]", null, ["نيكهيل غودا", "راشيتا رام", "ساراث كومار", "ب. رافيشانكر", "مادهو"]],

  // ---- foreign-film-series -------------------------------------------------
  ["foreign-film-series", "300 1+2", null, ["جيرارد بتلر", "لينا هيدي", "ديفيد وينهام", "دومينيك ويست", "رودريغو سانتورو", "إيفا غرين"]],
  ["foreign-film-series", "Alien", null, ["سيغورني ويفر", "توم سكريت", "فيرونيكا كارت رايت", "هاري دين ستانتون", "جون هيرت"]],
  ["foreign-film-series", "C . Star Wars", null, ["مارك هاميل", "هاريسون فورد", "كاري فيشر", "آدم درايفر", "دايسي ريدلي", "جون بويوغا"]],
  ["foreign-film-series", "Denzel Washington Collection", null, ["دينزل واشنطن", "داكوتا فاينج", "كريس برات", "إيثان هوك", "جودي فوستر"]],
  ["foreign-film-series", "Kill Bill", null, ["أوما ثورمان", "لوسي ليو", "فيڤيكا فوكس", "داري هانا", "ديفيد كارادين", "مايكل مادسن"]],
  ["foreign-film-series", "Mission Impossible_1", "بريان دي پاڤا", null],
  ["foreign-film-series", "percy Jackson Sea of Monsters", null, ["لوقن ليرمان", "أليكساندرا داداريو", "براندون ت. جاكسون", "جيك أبيل", "شون بين"]],
  ["foreign-film-series", "Star Wars", null, ["مارك هاميل", "هاريسون فورد", "كاري فيشر", "آدم درايفر", "دايسي ريدلي", "جون بويوغا"]],
  ["foreign-film-series", "Teenage Mutant Ninja Turtles (2014) [1080p]", null, ["ميغان فوكس", "ويل أرنيت", "وليم فيختنر", "آلان ريتشسون", "نويل فيشر"]],
  ["foreign-film-series", "The Godfather", null, ["مارلون براندو", "أل باسينو", "جيمس كان", "روبرت دوال", "ديان كيتون", "روبرت دي نيرو"]],
  ["foreign-film-series", "THE LORD OF THE RINGS", null, ["إيليو وود", "إيان ماك كيلن", "فيغو مورتنسن", "أورلاندو بلوم", "شون بين", "أندي سيركيس"]],
];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const byTitle = new Map();
for (const c of data.categories) byTitle.set(c.id, new Map(c.items.map((i) => [i.title, i])));

if (LIST) {
  for (const [cat, t] of DATA) console.log(`${byTitle.get(cat).has(t) ? "ok  " : "MISS"}  ${cat} / ${t}`);
  process.exit(0);
}

const files = new Map();
let d = 0;
let c = 0;
const miss = [];

for (const [cat, folder, director, cast] of DATA) {
  const item = byTitle.get(cat).get(folder);
  if (!item) { miss.push(`${cat}/${folder}`); continue; }
  const file = path.join(ROOT, "details", `${cat}.json`);
  if (!files.has(cat)) files.set(cat, JSON.parse(fs.readFileSync(file, "utf8")));
  const r = files.get(cat).items[item.id];
  if (!r) { miss.push(`${cat}/${folder}`); continue; }

  if (director && !r.director && !(Array.isArray(r.directors) && r.directors.length)) {
    r.director = director;
    r.directors = [director];
    d++;
  }
  if (cast && cast.length && !(Array.isArray(r.cast) && r.cast.length)) { r.cast = cast; c++; }
  r.extra = { ...(r.extra || {}), factsSource: "بحث يدوي" };
}

if (!DRY) for (const [cat, parsed] of files)
  fs.writeFileSync(path.join(ROOT, "details", `${cat}.json`), JSON.stringify(parsed, null, 2) + "\n");

console.log(`\nمخرج: ${d} · أبطال: ${c} · لم يُطبّق: ${miss.length} ${DRY ? "(dry run)" : ""}`);
for (const m of miss) console.log(`  no folder: ${m}`);
