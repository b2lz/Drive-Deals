"use strict";
// Foreign film series, supplied by hand: release year, director, cast and a
// spoiler-free summary.
//
// Many of these are franchises or "collection" folders holding several
// films, so the year is written as a range and the note says so rather than
// presenting one film as the whole folder.
//
// Usage: node tools/hand-foreign-film-series.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

const S = (...names) => names.join("، ");
const RANGE = "مجلد يجمع عدة أفلام — التاريخ مدى السلسلة وليست سنة فيلم واحد";

// [folder, year, director, cast, summary, note]
const DATA = [
  // --- مجموعات وسلسلات ---------------------------------------------------
  ["BOYKA COLLECTION", "2002-2017", "إسحاق فلورنتا / والتر هيل", S("سكوت آدكينز", "مايكل جاي وايت", "ويسلي سنايبس"), null, RANGE],
  ["Bruce Willis Collection", "1988-2021", "مخرجون متعددون (منهم جون مكترنان وإم. نايت شيامالان)", S("بروس ويليس"), null, RANGE],
  ["Collection Spider Man", "2002-2021", "سام رايمي / مارك ويب / جون واتس", S("توبي ماغواير", "أندرو غارفيلد", "توم هولاند"), null, RANGE],
  ["Fantastic Beasts 1+2 + 3", "2016-2022", "ديفيد ييتس", S("إيدي ريدماين", "جود لو", "جوني ديب", "مادس ميكلسن"), null, RANGE],
  ["Ghost Rider Collection_1", "2007-2011", "مارك جونسون / براين تايلور", S("نيكولاس كيج", "إيفا مينديز"), null, RANGE],
  ["Harry poter collection", "2001-2011", "كريس كولومبوس / ألفونسو كوارون / مايك نيويل / ديفيد ييتس", S("دانيال رادكليف", "إيما واتسون", "روبرت غرينت"), null, RANGE + " — العنوان في المجلد به خطأ مطبعي"],
  ["Home Alone Collection Bluray", "1990-2002", "كريس كولومبوس / راجا غوسنيل", S("ماكولي كولين", "جو بيشي", "دانيال ستيرن"), null, RANGE],
  ["iko uwais Collection", "2011-2021", "غاريث إيفانز وغيره", S("إيكو إويس"), null, RANGE],
  ["Jake Gyllenhaal Collection", "2001-2022", "مخرجون متعددون (دوني داركو وسورس كود)", S("جيك جيلنهال"), null, RANGE],
  ["Jason Statham Collection", "1998-2023", "غاي ريتشي / لويس ليترير وغيرهم", S("جيسون ستاثام"), null, RANGE],
  ["JOHN WICK COLLECTION", "2014-2023", "تشاد ستاهلسكي", S("كيانو ريفز", "إيان مكشين", "لورنس فيشبورن"), null, RANGE],
  ["Kingsman 1+2", "2014-2017", "ماثيو فون", S("تارون إجيرتون", "كولين فيث", "صامuel ل. جاكسون"), null, ""],
  ["Liam Neeson COLLECTION", "2008-2023", "بيير موريل وغيره", S("ليام نيسون"), null, RANGE],
  ["Pacific.Rim 1+2", "2013-2018", "جييرمو ديل تورو / ستيفن دENAIT", S("تشارلي هونام", "جون بويجا", "رينكو كيكوتشي"), null, ""],
  ["Rambo Collection_1", "1982-2019", "تيد كوتشيف / جورج كوزماتوس وغيرهم", S("سيلفستر ستالون"), null, RANGE],
  ["Resident Evil Collection Blu-ray", "2002-2016", "بول أندرسون وغيره", S("ميلا جوفوفيتش", "ميشيل رودريغيز"), null, RANGE],
  ["Sonic 1+2+3", "2020-2024", "جيف فاولر", S("جيم كاري", "بن شوارتز", "جيمس مارسدن"), null, "سلسلة أفلام — الأصوات مذكورة لأوّل جزء"],
  ["The Bourne Collection_1", "2002-2016", "دوج ليمان / بول غرينغراس", S("مات ديمون", "فرانكا AdvantagesMC disenfranchisedMCSC compromisingMC"), null, ""],
  ["The Hunger Games Trilogy Blu-ray", "2012-2015", "غاري روس / فرانسيس لورانس", S("جينياقرأ لورانس", "جوش هوتشرسن", "ليام همسورث"), null, ""],
  ["The Matrix 1+2+3+4", "1999-2021", "الأخوان واشوسكي", S("كيانو ريفز", "كاري آن موس", "لورنس فيشبورن"), null, RANGE],
  ["THE ROCK COLLECTION", "2001-2023", "مخرجون متعددون", S("دواين جونسون"), null, RANGE],
  ["The Twilight collection  Blu-ray", "2008-2012", "كاثرين هاردويك وغيرها", S("كريستيان بيل", "روبرت باتينسون", "تايلور لوتنر"), null, RANGE],
  ["Tom Cruise Collection", "1986-2023", "توني سكوت / كريستوفر ماكواري وغيرهم", S("توم كروز"), null, RANGE],
  ["underworld collection", "2003-2016", "لين وايزمان وغيره", S("كيت بيكينسيل", "سكوت سبيدمان"), null, RANGE],
  ["VAN DIESEL COLLECTION", "2000-2023", "روب كوهين وغيره", S("فان ديزل"), null, RANGE],
  ["Will Smith COLLECTION", "1995-2022", "باري جونسون / مايكل بي وغيرهم", S("ويل سميث"), null, RANGE],
  ["X Men collection Blu-ray", "2000-2020", "براين سينغر وغيره", S("هيو جكمان", "باتريك ستيوارت", "إيان ماكيلين", "جينيفر لورانس"), null, RANGE + " — العنوان في المجلد به خطأ مطبعي"],
  ["Zombieland  1+2", "2009-2019", "روبن فليشر", S("وودي هارلسون", "جيسي آيزينبرغ", "إيما ستون"), null, ""],
  ["Smile", "2022", "باركر فيني", S("سوسي بيكون", "كايل غالنر"), null, "فيلم منفرد وليس مجموعة"],

  // --- بلا سجل خالص ------------------------------------------------------
  ["Agent Cody  1+2", "2003-2004", "هارالد زوارت / كيفن ألين", S("فرانكي مونيز", "هيلاري داف"),
    "مراهق عادي يتم تجنيده سراً كعميلوكالة استخبارات سرية لينفذ مهام خطيرة ومضحكة بالتزامن مع حياته المدرسية.", ""],
  ["Charlies Angels", "2000 و 2019", "مكجي (2000) / إليزابيث بانكس (2019)", S("كاميرون دياز", "درو باريمور", "لوسي ليو"),
    "ثلاث نساء محترفات وعاليات المهارة يعملن لصالح وكالة تحقيقات سرية يديرها رجل غامض، وينفذن مهام خطيرة بأسلوب أكشن مشوق.", ""],
  ["DEADPOOL COLLECTEON", "2016-2024", "تيم ميلر / ديفيد ليتش / شون ليفي", S("رايان رينولدز", "مورينا باكارين", "هيو جكمان"),
    "مرتزق سابق يعاني من مرض خطير ويخضع لتجربة سرية تمنحه قدرات شفاء خارقة وشكلاً مشوهاً، ليتحول لبطل خارق ساخر بأسلوب كوميدي وأكشن دموي.", ""],
  ["G.I. Joe 1 Retaliation_1", "2009-2013", "ستيفن سومرز / جون تشو", S("شانين تاتوم", "دواين جونسون", "بروس ويليس"),
    "وحدة عسكرية سرية خارقة تقاتل منظمة إرهابية دولية خطيرة تحاول السيطرة على العالم بأسلحة مدمرة.", ""],
  ["JACKEI CHAN COLLECTION_1", "1978-2020", "مخرجون متعددون", S("جاكي شان"),
    "أرشيف ضخم لأشهر أفلام فنون القتال والكوميديا الأكشن للأسطورة جاكي شان المليئة بالحركات البهلوانية الخطيرة والمواقف الطريفة.", RANGE],
  ["Jet Li Coleection", "1982-2010", "يورين وشم وغيرهم", S("جيت لي"),
    "سلسلة أفلام فنون قتالية صينية وعالمية شهيرة تركز على مهارات الفنون القتالية الصارمة والفلسفة الآسيوية والأكشن.", RANGE],
  ["Jim Carrey Collection", "1994-2020", "توم شادياك وغيرهم", S("جيم كاري"),
    "مجموعة الكوميديا الأسطورية للساخر جيم كاري التي تضم أفلاماً مثل The Mask وAce Ventura وLiar Liar المليئة بالتعابير الكوميدية الجنونية.", RANGE],
  ["Jump Street", "2012-2014", "فيل لورد / كريستوفر ميلر", S("جونا هيل", "تشانين تاتوم"),
    "ضابطا شرطة فاشلان يُكلفان بالتنكر في هيئة طلاب ثانوية وجامعة للإيقاع بشبكة ترويج مخدرات وسط مواقف كوميدية ومفارقات جنونية.", ""],
  ["K.G.F Chapter 1+2", "2018-2022", "براشانت نيل", S("ياش", "سري نيثا شيتي"),
    "ملحمة أكشن هندية تتبع صعود شاب طموح ليصبح ملك حقول الذهب وسلطة مطلقة في وجه زعماء العصابات والشرطة.", ""],
  ["MARVEL Movies", "2008-حتى الآن", "مخرجون متعددون", S("روبرت داوني جونيور", "كريس إيفانز", "كريس هيمسورث", "سكارليت جوهانسون"),
    "ملحمة سينمائية ضخمة مترابطة تجمع الأبطال الخارقين مثل الأفينجرز والرجل الحديدي وثور وسبايدر مان للدفاع عن الكون ضد الأشرار الخارقين.", RANGE],
  ["Mr BeanThe Ultimate Collection", "1990-2007", "جون هوارد ديفيس وغيره", S("روان أتكينسون"),
    "المغامرات الكوميدية الصامتة الشهيرة للشخصية الغريبة مستر بين وتفاعله الأحمق والطريف مع تفاصيل الحياة اليومية.", RANGE],
  ["Night at the Museum Collection Bul-ray", "2006-2014", "شون ليفي", S("بن ستيلر", "روبن ويليامز", "أوين ويلسون"),
    "حارس أمن ليلي جديد يكتشف أن لوحة سحرية تعيد الحياة لكافة المعروضات والتماثيل والشخصيات التاريخية داخل المتحف كل ليلة لتشتعل المفارقات الكوميدية.", RANGE],
  ["Raid 1+2", "2011-2014", "غاريث إيفانز", S("إيكو إويس", "يانات فيرو"),
    "فريق تدخل سريع شرطي يحاصر مبنى ضخماً يسيطر عليه زعيم عصابة خطير، لتتحول القصة إلى معركة بقاء وفنون قتالية عنيفة للغاية.", ""],
  ["snowwhite", "1937", "ديفيد هاند", S("أدريانا كاسيلوتي"),
    "أميرة جميلة تهرب إلى الغابة هرباً من زوجة أبيها الشريرة التي تغار من جمالها، لتلتقي بسبعة أقزام طيبين يمنحونها المأوى والحماية.",
    "أصوات النسخة الأصلية وليست النسخة العربية"],
  ["Taken Collection Bulu-ray", "2008-2014", "بيير موريل وغيره", S("ليام نيسون", "فامك جانسن", "ماجي غريس"),
    "ضابط مخابرات سابق ومحترف يلاحق عصابات خطيرة استخدمت مهاراتها لاختطاف ابنته وزوجته، مستخدماً مهاراته القتالية الفتاكة لاسترجاعهم.", RANGE],
  ["The Expendapels", "2010-2023", "سيلفستر ستالون / باتريك هيوز", S("سيلفستر ستالون", "جيسون ستاثام", "جيت لي", "أرنولد شوارزنيجر"),
    "فريق من المرتزقة المخضرمين ينفذون عمليات عسكرية خطيرة ومستحيلة للإطاحة بديكتاتوريين وعصابات دولية مسلحة.", ""],
  ["The Maze Runner Collection Bul-ray", "2014-2018", "weis بال", S("ديلان أوبراين", "كايا سكوديلاريو", "توماس برودي سانغستر"),
    "مجموعة من الشباب محاصرون داخل متاهة عملقة ومتغيرة باستمرار تحرسها كائنات آلية، ليحاولوا فك اللغز والهرب نحو العالم الخارجي المدمر.", RANGE],
  ["Transformes", "2007-2023", "مايكل باي وغيره", S("شيا لبوف", "مارك والبيرغ", "ميغان فوكس"),
    "صراع ملحمي بين كائنات فضائية آلية تتخذ شكل سيارات وآلات على الأرض، وتورط البشر في هذه الحرب المدمرة.", RANGE],
  ["Van Damme_1", "1988-2021", "مخرجون متعددون", S("جان كلود فان دام"),
    "سلسلة أفلام الأكشن والفنون القتالية الشهيرة للبلجيكي فان دام مثل Bloodsport وKickboxer التي اشتهرت بحركاته المرنة والركلات القوية.", RANGE],

  // --- ناقصهم سنة فقط ---------------------------------------------------
  ["Alien", "1979", null, null, null, ""],
  ["Star Wars", "1977", null, null, null, ""],
  ["C . Star Wars", "1977", null, null, null, "العنوان في المجلد غير واضح — قد يكون مجموعة حرب النجوم الكلاسيكية"],
  ["CHUCKY", "1988", null, null, null, ""],
  ["Denzel Washington Collection", "1989-2023", null, null, null, RANGE],
  ["Fifty Shades", "2015", null, null, null, ""],
  ["Teenage Mutant Ninja Turtles (2014) [1080p]", "1990", null, null, null,
    "السنة تخص سلسلة سلاحف النينجا الأصلية، بينما عنوان المجلد يذكر نسخة 2014"],
  ["james bond 007", null, "مخرجون متعددون (منهم تيرنس ونغ وسام مينديز)", S("شون كونري", "بيرس بروسنان", "دانيال كريغ"), null, RANGE],

  // --- ناقصهم ملخص فقط --------------------------------------------------
  ["Siccin_1", null, null, null,
    "سلسلة أفلام رعب تركية شهيرة تدور حول السحر الأسود والأعمال الشيطانية والجن والعوالم المظلمة التي تدمر حياة العائلات والأشخاص من خلال الانتقام والسيطرة النفسية والجسدية.", ""],
  ["The Boy", null, null, null,
    "مربية أطفال أمريكية تسافر لبريطانيا للعمل لدى عائلة ثرية، لتكتشف أن الطفل الذي ستقوم برعايته ليس بشرياً بل دمية خزفية مرعبة تتعامل معها الأسرة كابن حقيقي وسط قواعد غامضة ومرعبة.", ""],
];

// Normalise fragments that arrived with the wrong script.

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "foreign-film-series");
const file = path.join(ROOT, "details", "foreign-film-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

if (LIST) {
  for (const [f, y, d, c, s, n] of DATA) {
    console.log(`${f.padEnd(42)} ${String(y || "—").padEnd(14)} ${String(d || "—").slice(0, 26).padEnd(26)} ${c ? "cast" : "—"} ${s ? "sum" : "—"}`);
  }
  process.exit(0);
}

const counts = { date: 0, director: 0, cast: 0, summary: 0, flagged: 0 };
let missing = 0;

for (const [folder, year, director, cast, summary, note] of DATA) {
  const item = byTitle.get(folder);
  if (!item) {
    console.log(`  no folder named "${folder}"`);
    missing++;
    continue;
  }
  let rec = parsed.items[item.id];
  if (!rec) {
    rec = {
      title: folder,
      canonicalTitle: null,
      type: "film",
      genres: null,
      director: null,
      directors: null,
      cast: null,
      releaseDate: null,
      platforms: null,
      creators: null,
      summaryAr: null,
      summaryEn: null,
      requirements: null,
      links: [],
      confidence: "medium",
    };
    parsed.items[item.id] = rec;
  }

  if (year && !has(rec.releaseDate)) { rec.releaseDate = year; counts.date++; }
  if (director && !has(rec.director)) {
    rec.director = director;
    if (!has(rec.directors)) rec.directors = [director];
    counts.director++;
  }
  if (cast && !has(rec.cast)) { rec.cast = cast.split("، ").filter(Boolean); counts.cast++; }
  if (summary && !has(rec.summaryAr)) { rec.summaryAr = summary; counts.summary++; }

  if (has(rec.summaryAr) || has(rec.summaryEn)) delete rec.needsSummary;

  if (note) {
    rec.needsReview = true;
    rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي", reviewNote: note };
    counts.flagged++;
  } else {
    rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
  }
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(
  `\nسنة: ${counts.date} · مخرج: ${counts.director} · أبطال: ${counts.cast} · ` +
    `ملخص: ${counts.summary} · موسوم: ${counts.flagged} · لم يُطبّق: ${missing} ${DRY ? "(dry run)" : ""}`,
);