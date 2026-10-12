"use strict";
// The last hand-supplied batch: Turkish series, plus the Arabic films that
// still lack a director or a cast.
//
// Usage: node tools/hand-last-people.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

// [category, folder, director|null, [cast...]|null]
const DATA = [
  // ---- turkish-series ------------------------------------------------------
  ["turkish-series", "bizim hikaye", "سيردار غوزيلكلي", ["هازال كايا", "بوراك دينيز", "ريها أوزكان"]],
  ["turkish-series", "cukur", "سنان أوزتورك", null],
  ["turkish-series", "Ertugrul", "متين غوناي", ["إنغين ألتان دوزياتان", "إسرا بيليغيتش", "سيمجيز كوشكون", "نوريتين سونمز"]],
  ["turkish-series", "Price of Passion", "ياسين أوسلو", null],
  ["turkish-series", "Soz", "ياغيز ألب أكايدين", null],
  ["turkish-series", "الحب لا يفهم الكلام", "بهادير إنجه", null],
  ["turkish-series", "المؤسس عثمان", "متين غوناي ثم أحمد يلماز", null],
  ["turkish-series", "زمن الخيانة", "نعيم الحمصي", null],
  ["turkish-series", "محمد الفاتح", null, ["سيركان تشاي أوغلو", "سليم بايراكتار", "توبا أنسال", "فيكري كوشكان"]],

  // ---- arabic-films: مخرج --------------------------------------------------
  ["arabic-films", "اعز الولد 2021", "سارة نوح", null],
  ["arabic-films", "الحريفة", "رؤوف السيد", null],
  ["arabic-films", "العميل صفر", "كريمة بدير", null],
  ["arabic-films", "الفيل الازرق 1+2", "مروان حامد", null],
  ["arabic-films", "اللعبه الامريكي", "أحمد البنداري", null],
  ["arabic-films", "المعديه", "محمد عادل", null],
  ["arabic-films", "بنات العم", "أحمد سمير فرج", null],
  ["arabic-films", "تاني تاني 2024", "شريف حامد", null],
  ["arabic-films", "سالم ابو اخته", "محمد المحمدي", null],
  ["arabic-films", "صاحب المقام", "محمد العدل", null],
  ["arabic-films", "ع الزيرو", "محمد جمال العدل", null],
  ["arabic-films", "عسل ابيض", "حسام الرومي", null],
  ["arabic-films", "عش البلبل", "حسام الجوهري", null],
  ["arabic-films", "عمر وسلوى", "تامر الباسطي", null],
  ["arabic-films", "غش الزوجيه", "أحمد البدري", null],
  ["arabic-films", "فضل ونعمه", "رامي إمام", null],
  ["arabic-films", "كدبة كل يوم", "خالد حلفاوي", null],
  ["arabic-films", "كيرا والجن", "مروان حامد", null],
  ["arabic-films", "لخمة راس", "أحمد البدري", null],
  ["arabic-films", "مرعي البريمو", "سعيد حامد", null],
  ["arabic-films", "ممنوع الاقتراب او التصوير", "محمود متولي", null],
  ["arabic-films", "واحد تاني", "محمد هاني", null],
  ["arabic-films", "وش سجون", "عبد العزيز حشاد", null],

  // ---- arabic-films: أبطال -------------------------------------------------
  ["arabic-films", "آخر ديك في مصر", null, ["محمد رمضان", "مي عمر", "دينا محسن", "ملك قورة", "هالة صدقي"]],
  ["arabic-films", "ابقى قابلنى", null, ["محمد لطفي", "مها أحمد", "حسن حسني", "راندا البحيري", "سليمان عيد"]],
  ["arabic-films", "الأصليين", null, ["ماجد الكدواني", "خالد الصاوي", "شندى", "منة شلبي", "كنده علوش"]],
  ["arabic-films", "الشيخ جاكسون", null, ["أحمد الفيشاوي", "مأجد الكدواني", "أحمد مالك", "أمينة خليل", "بسمة"]],
  ["arabic-films", "حملة فرعون", null, ["عمرو سعد", "روبي", "محمد لطفي", "محمود حميدة", "مايك تايسون"]],
  ["arabic-films", "خير وبركة 2017", null, ["علي ربيع", "محمد عبد الرحمن", "بيومي فؤاد", "محمد ثروت", "دلال عبد العزيز"]],
  ["arabic-films", "راس السنة", null, ["إياد نصار", "أحمد مالك", "شيرين رضا", "صبا مبارك", "هدى المفتي"]],
  ["arabic-films", "رغدة متوحشة", null, ["رامز جلال", "بيومي فؤاد", "رهام حجاج", "حمدي الميرغني", "أحمد فتحي"]],
  ["arabic-films", "سعيد كلاكيت", null, ["محمد رمضان", "هالة فاخر", "ريهام سعيد", "سارة سلامة", "سليمان عيد"]],
  ["arabic-films", "سلاح التلميذ", null, ["حمادة هلال", "ريم البارودي", "لطفي لبيب", "حسن حسني", "إدوارد"]],
  ["arabic-films", "صابر جوجل 2016", null, ["محمد رمضان", "راندا البحيري", "سارة سلامة", "لطفى لبيب", "مؤمن نور"]],
  ["arabic-films", "عفريت ترانزيت 2020", null, ["بيومي فؤاد", "محمد ثروت", "أحمد فتحي", "أسامة أبو زيد", "محمود الليثي"]],
  ["arabic-films", "عندما يقع الانسان في مستنقع افكاره", null, ["بيومي فؤاد", "محمد ثروت", "أحمد فتحي", "محسن منصور", "هاجر الشرنوبي"]],
  ["arabic-films", "قسطى بيوجعنى 2018", null, ["هاني رمزي", "مايا نصري", "حسن حسني", "مصطفى أبو سريع", "لطفي لبيب"]],
  ["arabic-films", "كنغر حبنا", null, ["رامز جلال", "سارة سلامة", "حسن حسني", "إدوارد", "داود حسين"]],
  ["arabic-films", "محمد حسين", null, ["محمد سعد", "سمير صبري", "بيومي فؤاد", "محمد ثروت", "مي سليم"]],
  ["arabic-films", "ياتهدي يا تعدي", null, ["إيتن عامر", "محمد شاهين", "سلوى خطاب", "طارق الإبياري", "شيماء سيف"]],

  // ---- arabic-series -------------------------------------------------------
  ["arabic-series", "الكينج", "شيرين عادل", null],
  ["arabic-series", "سوتس", "عصام عبد الحميد", null],
  ["arabic-series", "ب100 وش", "كاملة أبو ذكري", null],
  ["arabic-series", "رجالة البيت", "أحمد الجندي", null],
  ["arabic-series", "الزوجة الـ18", "مصطفى فكري", null],
  ["arabic-series", "زلزال", "إبراهيم فخر", null],
  ["arabic-series", "ذهاب وعوده", "أحمد نادر جلال", null],
  ["arabic-series", "اولاد الراعي", null, ["أحمد بدير", "لطفي لبيب"]],
  ["arabic-series", "شباب امرأة", null, ["غادة عبد الرازق", "مصطفى شعبان"]],
  ["arabic-series", "المداح اسطوره العوده", null, ["حمادة هلال", "فتحي عبد الوهاب", "هبة مجدي", "دنيا عبد العزيز", "سحر الصواف"]],
  ["arabic-series", "بدون سابق انذار", null, ["آسر ياسين", "عياد نصار", "أحمد خالد صالح", "صبا مبارك", "جهاد حسام الدين"]],
  ["arabic-series", "جودر", null, ["ياسر جلال", "نور اللبنانية", "ياسمين رئيس", "تارا عماد", "أحمد فتحي"]],
  ["arabic-series", "هجمة مرتدة", null, ["أحمد عز", "هند صبري", "ماجد الكدواني", "هشام سليم", "صلاح عبد الله"]],
  ["arabic-series", "سكر زياده", null, ["نادية الجندي", "نبيلة عبيد", "سميحة أيوب", "هالة فاخر"]],
  ["arabic-series", "اخر دور", null, ["دينا الشربيني", "أحمد خالد صالح", "إبراهيم السمان", "ميمي جمال", "مها نصار"]],
  ["arabic-series", "المال والبنون", null, ["عبد الله غيث", "يوسف شعبان", "أحمد عبد العزيز", "إبراهيم يسري", "فايزة كمال"]],
  ["arabic-series", "لمعي القط", null, ["محمد إمام", "تارا عماد", "بيومي فؤاد", "أحمد فتحي", "هالة فاخر"]],

  // ---- korean-series: مخرج ------------------------------------------------
  ["korean-series", "Angel's Last Mission Love 720p", "لي جونغ سوب", null],
  ["korean-series", "Are You Human 720p", "تشا يونغ هون", null],
  ["korean-series", "Arthdal Chronicles", "كيم وون سيوك", null],
  ["korean-series", "Bad and Crazy", "يو سون دونغ", null],
  ["korean-series", "Bad Guys 720p", "كيم جونغ مين", null],
  ["korean-series", "Because This Is My First Life 720p", "بارك جون هوا", null],
  ["korean-series", "Behind Your Touch", "كيم سيوك يون", null],
  ["korean-series", "Big Mouth", "أو تشونغ هوان", null],
  ["korean-series", "Black Knight", "تشو إي سوك", null],
  ["korean-series", "Bulgasal Immortal Souls [2021]", "جانغ يونغ و", null],
  ["korean-series", "Celebrity", "كيم تشول جيو", null],
  ["korean-series", "Cheese in the Trap 720p", "لي يون جونغ", null],
  ["korean-series", "Chimera [2021]_1", "كيم دو هون", null],
  ["korean-series", "Dark Hole [T-720p-3.53GB]", "كيم بونغ جو", null],
  ["korean-series", "Defendant.S01. [2017]", "تشو يونغ غوانغ", null],
  ["korean-series", "Doom At Your   Service [2021]", "كون يونغ إيل", null],
  ["korean-series", "Evilive", "كيم جونغ مين", null],
  ["korean-series", "Ghost Doctor", "بو سونغ تشول", null],
  ["korean-series", "Happiness  [T-720p-]_1", "آن كيل هو", null],
  ["korean-series", "Healer S01", "لي جونغ سوب", null],
  ["korean-series", "HeartBeat", "لي هيون سوك", null],
  ["korean-series", "Hell Is Other People [T-1080p-]", "لي تشانغ هي", null],
  ["korean-series", "Its Okay To Not Be Okay [T-1080p]", "بارك شين و", null],
  ["korean-series", "King The Land", "إم هيون ووك", null],
  ["korean-series", "Kingdom [T-2-1080p-]", "كيم سونغ هون", null],
  ["korean-series", "My Secret Romance 720p", "كانغ تشول و", null],
  ["korean-series", "Oh My Ghost 720p", "يو جي وون", null],
  ["korean-series", "One Ordinary Day [T-720p-]_1", "لي ميونغ و", null],
  ["korean-series", "Revenge.of.  Others.S01", "كيم يو جين", null],
  ["korean-series", "Romance Is a Bonus Book", "لي جونغ هيو", null],
  ["korean-series", "Shadow Detective", "هان دونغ هوا", null],
  ["korean-series", "Strong Girl Bong Soon S01", "لي هيونغ مين", null],
  ["korean-series", "Tale of the Nine-Tailed", "كانغ شين هيو", null],
  ["korean-series", "Taxi Driver S1", "بارك جون و", null],
  ["korean-series", "Tempted", "كانغ إن", null],
  ["korean-series", "The Devil Judge", "تشوي جونغ غيو", null],
  ["korean-series", "The Good Detective S01", "تشو نام غوك", null],
  ["korean-series", "The Secret Life of My Secretary [2019]_1", "لي كانغ يونغ", null],
  ["korean-series", "The Worst of Evil", "هان دونغ ووك", null],
  ["korean-series", "The.King.Eternal.Monarch [2020]", "بيك سانغ هون", null],
  ["korean-series", "Vagabond", "يو إن شيك", null],
  ["korean-series", "Vigilante.S01 [1080p]", "تشوي جونغ يون", null],
  ["korean-series", "Vincenzo", "كيم هي وون", null],

  // ---- korean-series: أبطال ------------------------------------------------
  ["korean-series", "Angel's Last Mission Love 720p", null, ["كيم لي", "شين هي سون", "لي دون غون"]],
  ["korean-series", "Bad and Crazy", null, ["لي دون ووك", "وي ها جون", "هان جي إيون", "تشا هاك يون"]],
  ["korean-series", "Bad Guys 720p", null, ["كيم سانغ جونغ", "ما دونغ سيوك", "بارك هاي جين", "جو دون هيوك"]],
  ["korean-series", "Black Knight", null, ["كيم وو بين", "سونغ سونغ هيون", "إسوم", "كانغ يو سيوك"]],
  ["korean-series", "Bulgasal Immortal Souls [2021]", null, ["لي جين ووك", "كون نارا", "لي جون", "غونغ سونغ يون"]],
  ["korean-series", "Celebrity", null, ["بارك غي يونغ", "كانغ مين هيوك", "لي تشونغ آه", "لي دون غون"]],
  ["korean-series", "Chimera [2021]_1", null, ["بارك هاي سو", "لي هي جون", "كلوديا كيم", "سو هيون"]],
  ["korean-series", "Dark Hole [T-720p-3.53GB]", null, ["كيم أوك فين", "لي جون هيوك", "إم وون هي", "كيم بيونغي"]],
  ["korean-series", "Deaths Game [1080p-6.14GB]", null, ["سو إن غوك", "بارك سو دام", "كيم جي هون", "تشو سي وون"]],
  ["korean-series", "Defendant.S01. [2017]", null, ["جي سونغ", "أوم كي جون", "كون يوري", "أو تشانغ سيوك"]],
  ["korean-series", "Doom At Your   Service [2021]", null, ["بارك بو يونغ", "سو إن غوك", "لي سو هيوك", "كانغ تيه أو"]],
  ["korean-series", "Evilive", null, ["شين ها كيون", "كيم يونغ كوانغ", "شين جيه آ"]],
  ["korean-series", "Happiness  [T-720p-]_1", null, ["هان هيو جو", "بارك هيونغ سيك", "جو وو جين"]],
  ["korean-series", "Its Okay To Not Be Okay [T-1080p]", null, ["كيم سو هيون", "سو ييا جي", "أو جونغ سي", "بارك غي يونغ"]],
  ["korean-series", "Moon Lovers - Scarlet Heart Ryeo [T-1080p-]", null, ["لي جون جي", "آيو", "كانغ ها نول", "نام جو هيوك", "جي سو"]],
  ["korean-series", "My Girlfriend Is a Gumiho  720p", null, ["لي سونغ جي", "شين مينا", "نو مين وو", "بارك سو جين"]],
  ["korean-series", "My Love from the Star 720p", null, ["كيم سو هيون", "جون جي هيون", "بارك هاي جين", "يو إن نا"]],
  ["korean-series", "Oh My Ghost 720p", null, ["بارك بو يونغ", "تشو جونغ سوك", "إم جو هوان", "كيم سول جي"]],
  ["korean-series", "Sisyphus The Myth 720p", null, ["تشو سونغ وو", "بارك شين هي"]],
  ["korean-series", "The.King.Eternal.Monarch [2020]", null, ["سونغ جونغ كي", "جون يو بين", "أوك تيك يون", "كواك دونغ يون"]],
  ["korean-series", "Vagabond", null, ["لي سونغ جي", "سوزي", "شين سونغ روك"]],
  ["korean-series", "Vigilante.S01 [1080p]", null, ["نام جو هيوك", "يو جي تاي", "لي جون هيوك", "كيم سو جين"]],
  ["korean-series", "Vincenzo", null, ["سونغ جونغ كي", "جون يو بين", "أوك تيك يون", "كواك دونغ يون"]],
  ["korean-series", "Catch the Ghost 720p", null, ["مون غون يونغ", "كيم سون هو", "جون أوجين", "كي دو هون"]],
];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));

// Folder titles carry spelling variants (alef forms, ya/alef-maqsura, tatweel,
// doubled spaces). Match on a normalised key so a near-identical spelling
// still finds its folder instead of being reported as missing.
const norm = (s) =>
  String(s)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "\u0627")
    .replace(/[ىي]/g, "\u064A")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const byTitle = new Map();
for (const c of data.categories) byTitle.set(c.id, new Map(c.items.map((i) => [i.title, i])));
const byNorm = new Map();
for (const c of data.categories) {
  const m = new Map();
  for (const i of c.items) if (!m.has(norm(i.title))) m.set(norm(i.title), i);
  byNorm.set(c.id, m);
}

const resolve = (cat, t) =>
  byTitle.get(cat).get(t) || byNorm.get(cat).get(norm(t)) || null;

if (LIST) {
  for (const [cat, t] of DATA) console.log(`${resolve(cat, t) ? "ok  " : "MISS"}  ${cat} / ${t}`);
  process.exit(0);
}

const files = new Map();
let d = 0;
let c = 0;
const miss = [];

for (const [cat, folder, director, cast] of DATA) {
  const item = resolve(cat, folder);
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
