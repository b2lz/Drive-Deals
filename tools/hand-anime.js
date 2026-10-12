"use strict";
// Anime, supplied by hand: release year, director, voice cast and a
// spoiler-free summary.
//
// Only empty fields are filled. Several folders do not literally name the
// work they hold (Itou Junji is a director's name, "Fate movies" and
// "Mushoku Tensei ... Folder Icon" carry archive suffixes, Free is a very
// generic title). Those are written as given and flagged so the page says
// the match is unconfirmed.
//
// Usage: node tools/hand-anime.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

const S = (...names) => names.join("، ");

// [folder, year, director, cast, summary, note]
const DATA = [
  // --- بلا سجل خالص -----------------------------------------------------
  ["Akatsuki No Yuna", "2014", "كازوهيرو يوندا", S("تشيوا سايتو", "تومواكي ماينو"),
    "أميرة صغرى مدللة تتقلب حياتها رأساً على عقب حين يُقتل والدها الملك على يد ابن عمها الذي تحبه وتثق به، فتضطر للهرب مع حارسها الشخصي لخوض رحلة بقاء واستعادة عرشها.", ""],
  ["Akuyaku Reijou Level 99 Watashi wa Ura-Boss desu ga Maou dewa Arimasen", "2024", "مينورو ياماوكا",
    S("فيروز إي", "يوما أوتشيدا"),
    "فتاة تتجسد في شخصية شريرة داخل لعبة فيديو وتكتشف أنها وصلت للمستوى الأقوى، فتحاول تجنب مصيرها المأساوي والابتعاد عن البطلة الرئيسية.", ""],
  ["Baccan", "2007", "تاكاهيرو أوموري", S("ماسايوشي أوكادا", "ريوكا يوزوكي"),
    "دراما جريمة تاريخية متشابكة تدور في ثلاثينيات القرن الماضي بأمريكا، حول عصابات المافيا وإكسير الخلود ومقطوعات دموية تتداخل مصائر شخصياتها بغرابة.",
    "العنوان الصحيح Baccano!"],
  ["Dr. Gray Man", "2006", "أوسامو نابيشيما", S("ساناي كوباياشي", "تاكاهيرو ساكوراي"),
    "شاب يمتلك ذراعاً ملعونة ينضم لمنظمة الوحشية لمحاربة المسخ التي يصنعها الإيرل الميلي مستغلاً أحزان البشر.", ""],
  ["Fate Grand Order - Zettai Majuu Sensen Babylonia", "2019", "توشيفومي أكاي", S("نوبوناغا شيمازاكي", "ريه تاكاهاشي"),
    "ملحمة فانتازيا وأكشن ضمن سلسلة فيت، حيث يسافر الأبطال عبر الزمن إلى بلاد بابل القديمة لمنع الفناء الكوني ومواجهة آلهة الشر.",
    "مجلد يجمع مواسم من السلسلة"],
  ["Fate movies", "2017-2020", "توموتومو سودو", S("نورياكي سوجياما", "نورياكي شيتايا"),
    "حروب الكأس المقدسة الدموية التي يتنافس فيها السحرة والأرواح البطولية المستدعاة للفوزهم في قالب درامي ملحمي.",
    "مجلد يجمع عدة أفلام من السلسلة"],
  ["Gunjou No Magmel", "2019", "هاياتو داتيه", S("كوغو كياما", "توموكازو سوغيتا"),
    "ظهور مفاجئ لقارة جديدة مجهولة مليئة بكائنات ونباتات خارقة للعادة، وانطلاق المغامرين لاستكشاف أسرارها الخطيرة.",
    "العنوان الصحيح Crimson Magmel"],
  ["Hanayome", null, null, null,
    "دراما اجتماعية رومانسية ترصد قصص ارتباط وعلاقات إنسانية وعاطفية معقدة.",
    "العنوان عام ولا يحدد عملاً بعينه — استوديوهات ومخرج غير محددين"],
  ["Kaij", "2024", "شيغييوكي ميا / تومايوشي كودا", S("ماسايا فوشي نيشي", "أسامة سيتو"),
    "رجل يائس يعمل في تنظيف مخلفات الوحوش يكتشف قدرته على التحول إلى وحش عملاق ذكي، فينضم لقوات الدفاع لمواجهة الكائنات المدمرة.",
    "العنوان الصحيح Kaiju No. 8"],
  ["Kami sama no Inai Nichiyoubi", "2013", "يوجي كوماتسودا", S("أكي تويساكي", "دايسوكي ناميكاوا"),
    "عالم هجره الإله منذ زمن، فلم يعد البشر يموتون أو يولدون، وتظهر فتاة صغيرة تحمل لقب حارسة القبور لتمنح الراحة والسلام لمن ينتظرون الموت الأبدي.", ""],
  ["Lv2 kara Cheat datta Motoyuusha Kouho no Mattari Isekai Life", "2024", "يوشياكي إيواساكي",
    S("ساتوشي هينو", "ري كوغيميا"),
    "بطل يتم استدعاؤه لعالم سحري بصفته بطلاً، لكن بسبب ضعف مستواه المبدئي يُطرد، ليكتشف أن وصوله للمستوى الثاني يمنحه قدرات غش خارقة.",
    "العنوان الكامل أطول من اسم المجلد ويحتاج مراجعة"],
  ["Mondaijitachi Ga Isekai Kara Kuru Sou De", "2013", "ياسوتاكا ياماموتو", S("شنتارو أسانوما", "إيميلي بروك"),
    "ثلاثة مراهقين عباقرة يشعرون بالملل في عالمهم الواقعي فيتم استدعاؤهم إلى عالم سحري آخر لخوض ألعاب وتحديات خطيرة ضد قوى شيطانية وإلهية.", ""],
  ["Mushoku Tensei Jobless Reincarnation Folder Icon", "2021", "مانابو أوكاموتو", S("يومي أوتشياما", "توموكازو سوغيتا"),
    "رجل عاطل عن العمل ومنعزل يموت في حادث ليتجسد مجدداً كطفل رضيع في عالم سحري، ويقرر عيش حياته الجديدة بجد وإتقان فنون السحر.",
    "لاحقة Folder Icon جزء من اسم الملف لا من اسم العمل"],
  ["oniisama e", "1991", "أوسامو ديزاكي", S("ريوكا يوزوكي", "كيكو هان"),
    "دراما مدرسية كلاسيكية عميقة ترصد حياة طالبات مدرسة داخلية راقية وما يعانينه من ضغوط نفسية وأسرار وعلاقات عاطفية معقدة.",
    "العنوان الصحيح Oniisama e..."],
  ["Saikyou no Shienshoku Wajutsushi de Aru Ore wa Sekai Saikyou Clan wo Shitagaeru", "2024", "يوجي توميناغا", S("دايكي أشيتا"),
    "فتى ينضم لفئة الداعمين اللفظيين ويكتشف أن مهارات الكلام والتكتيك يمكن أن تجعله أقوى شخصية قادرة على السيطرة على العشائر.", ""],
  ["Sakurako-San No Ashimoto Ni Wa Shitai Ga Umatteiru HD", "2015", "ماكوتو كاتو", S("شيزوكا إيتو", "جونيا إينوكي"),
    "فتاة مهووسة بدراسة وتشريح العظام البشرية، تتورط مع طالب ثانوي في حل ألغاز جرائم قتل غامضة تعتمد على الأدلة العظمية.", ""],
  ["Tengen Toppa Gurren Lagann The Destroyers", "2007", "هيرويوكي إيمايشي", S("تيتسيا كاكيهارا", "كاتسويوكي كونيشي"),
    "شابين يعيشان تحت سطح الأرض في مستعمرات ضيقة، يصعدان لسطح الكوكب ليقودا ثورة بشرية ضد طغيان كائنات فضائية بآليات روبوتية ضخمة.",
    "The Destroyers لاحقة تسمية والملف يجمع أكثر من عمل"],
  ["Tensei shitara Dainana Ouji Datta node, Kimama ni Majutsu wo Kiwamemasu", "2024", "جين تامامورا",
    S("ماكوتو كويتشي", "فائزة إي"),
    "أمير صغير يتجسد بذكريات ساحر عظيم يحب استكشاف السحر وتطويره بمتعة مطلقة لتجاوز حدود القوة الكلاسيكية.", ""],
  ["Yuusha Yamemasu.rar", "2022", "يو نوبوتا", S("كينشو أونو", "كايدي هوندو"),
    "بطل شجاع ينقذ العالم لكنه يُنبذ لخوف الملك منه، فينضم إلى جيش ملكة الشياطين التي هزمها سابقاً لمساعدتهم على إعادة تنظيم شؤونهم.",
    "لاحقة rar جزء من اسم الملف لا من اسم العمل"],

  // --- ناقصهم سنة + مخرج/أبطال -----------------------------------------
  ["Butlers Chitose Momotose Monogatari", "2018", "كين تاكاهاشي", S("تاتسوهيسا سوزوكي"), null, ""],
  ["Darwin’s Game", "2020", "يوشينوبو توكوموتو", S("يوسكي كوباياشي"), null, ""],
  ["Fate Stay Night Unlimited Blade Works", "2014", "تاكاهيرو ميوورا", S("نورياكي سوجياما", "كانا أويدا"), null, ""],
  ["Itou Junji", "2018", "شينوبو تاغاشيرا", S("ريه كوغيميا"), null,
    "المجلد يحمل اسم المخرج Junji Ito لا اسم عمل — تجميع أعمال كمؤلف"],
  ["Les Miserables Shoujo Cosette", "2007", "هيرواكي ساكوراي", S("كاوري نازوكا"), null, ""],
  ["No Gun No Life", "2019", "ناويوكي إيتو", S("جونيتشي سوابي"), null,
    "العنوان الصحيح No Guns Life"],
  ["JoJo’s Bizarre Adventure", "2012", "كينيتشي سوزوكي", S("كازويوكي أوكيتسو", "دايسوكي أونو"), null,
    "سلسلة طويلة تمتد عبر عدة أعمال"],

  // --- ناقصهم سنة فقط ---------------------------------------------------
  ["Avatar The Legend Of Korra", "2012", null, null, null, ""],
  ["Avatar.The.Last.Airbender", "2005", null, null, null, ""],
  ["B The Beginning", "2018", null, null, null, ""],
  ["BlazBlue Alter Memory", "2013", null, null, null, ""],
  ["Blood Of Zeus", "2020", null, null, null, ""],
  ["Castlevania", "2017", null, null, null, ""],
  ["Castlevania nocturne", "2023", null, null, null, ""],
  ["Code Breaker", "2012", null, null, null, "العنوان الصحيح Code:Breaker"],
  ["Devil May Cry 2025", "2025", null, null, null, "سنة الاسم ليست تاريخ الإصدار — تحتاج تأكيد"],
  ["Fate Stay Night TV Reproduction", "2010", null, null, null, ""],
  ["Re Cutey Honey", "2004", null, null, null, "العنوان الصحيح Re: Cutie Honey"],

  // --- ناقصهم مخرج/أبطال فقط -------------------------------------------
  ["Fist Of The North Star- Hokuto no Ken + Hokuto no Ken Raoh Gaiden Ten no Haoh", null, "توشيو تويودا",
    S("أكيرا كاميا", "توشيو فوروكاوا"), null,
    "المجلد يجمع أكثر من عمل في سلسلة Fist of the North Star"],
  ["Free", null, "هيروكو أوتسومي", S("نوبوناغا شيمازاكي", "تاتسوهيسا سوزوكي", "مامورو ميانو"), null,
    "العنوان عام جداً وقد لا يكون مسلسل Free!: Iwatobi swim club"],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "anime");
const file = path.join(ROOT, "details", "anime.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

if (LIST) {
  for (const [f, y, d, c, s, n] of DATA) {
    console.log(`${f.slice(0, 40).padEnd(42)} ${String(y || "—").padEnd(12)} ${String(d || "—").slice(0, 22).padEnd(22)} ${c ? "cast" : "—"} ${s ? "sum" : "—"}`);
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
      type: "series",
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