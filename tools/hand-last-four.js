"use strict";
// The last four categories, supplied by hand: release year, director,
// cast and a spoiler-free summary.
//
// Only empty fields are filled. A few titles are ambiguous or the supplied
// detail looks doubtful (a 1990 Bugs Bunny directed by Chuck Jones, a 1995
// Woody, a 2019 "Edge of Extinction" that matches no film); those are
// written and flagged so the page says the match is unconfirmed.
//
// Usage: node tools/hand-last-four.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

const S = (...names) => names.join("، ");

// [category, folder, year, director, cast, summary, note]
const DATA = [
  // ===== أفلام كرتون — بلا سجل خالص =====
  ["cartoon-films", "A.Goofy.y", "1995", "كيفن ليما", S("بيل فارمر", "جيسون مارسدن"),
    "مغامرة كوميدية عاطفية للأب غوفي وابنه مكس في رحلة صيد تحاول تقريب المسافات بين جيلين مختلفين.", ""],
  ["cartoon-films", "atlants", "2001", "غاري تروسديل / كيرك وايز", S("مايكل جيه فوكس", "كريبلي باور"),
    "شاب لغوي ومغامر ينضم لفريق استكشافي للعثور على القارة المفقودة أتلانتس وتاريخها السحري التكنولوجي.", ""],
  ["cartoon-films", "bee", "2007", "سيمون سميث / ستيف فيكنر", S("جيري سينفيلد", "رينيه زيلويغر"),
    "نحلة عاملة ترفض حياة العسل الروتينية وتقرر التحدث مع بشرية، لتكتشف أسرار العالم الخارجي وتنقذ صناعة العسل.", ""],
  ["cartoon-films", "Bilal A New Breed of Hero 2018", "2018", "خرم آغا / أيمن جمال", S("أديوالي أقبوي", "إيان ماكشين"),
    "ملحمة تاريخية مستوحاة من سيرة بلال بن رباح ورحلته البطولية في البحث عن الحرية والعدالة والمساواة.", ""],
  ["cartoon-films", "ducktales", "1990", "بوب هيلفيتش", S("آلان يونغ", "تيري مكنرن"),
    "مغامرات العم دهب وأبناء أشقائه في البحث عن مصباح سحري أسطوري يخبئ أسراراً جبارة وصراعات مع الأشرار.", ""],
  ["cartoon-films", "hop", "2011", "تيم هيل", S("جيمس مارسدن", "راسل براند"),
    "أرنب صغير يعشق الطبول والموسيقى ويهرب لهوليوود ليصبح عازف روك، ليلتقي بشاب بشري عاطل عن العمل.", ""],
  ["cartoon-films", "How.To.Train.Your.Dragon 3", "2019", "دين ديبلوا", S("جاي باروشيل", "أميركا فيريرا"),
    "إيكوك وحزلقوم يقودان قبيلتهما وتنانينهم بحثاً عن العالم المخفي، الملاذ الآمن الأخير في مواجهة صيادي التنانين.", ""],
  ["cartoon-films", "klaus", "2019", "سيرجيو بابلوس", S("جيسون شوارتزمان", "جي كي سيمونز"),
    "ساعي بريد فاشل يُرسل لبلدة جليدية معزولة، ليتعاون مع صانع ألعاب عجوز لابتكار تقليد أعياد الميلاد وصنع البهجة.", ""],
  ["cartoon-films", "kronk", "2005", "إليوت مي / ساول أندرو", S("باتريك واربرتون", "أوسكار لي"),
    "كوميديا ديزني تدور حول الطباخ الطيب كرونك ومحاولاته اليائسة لكسب رضا والده ومواقف طريفة مع أصدقائه.", ""],
  ["cartoon-films", "kung fu banda", "2008", "مارك أوسبورن / جون ستيفنسون", S("جاك بلاك", "داستن هوفمان"),
    "الباندا الكسول بو يُختار بالخطأ ليكون محارب التنين الأسطوري، ليتدرب بقسوة لهزيمة الشرير تاي لونغ.", ""],
  ["cartoon-films", "Leo", "2023", "روبرت سميجل / كريس اليوان", S("آدم ساندلر", "بيل برور"),
    "سحلية عجوز تبلغ من العمر 74 عاماً تعيش في فصل دراسي وتكتشف قدرتها على التحدث مع الأطفال لتغيير حياتهم.", ""],
  ["cartoon-films", "mars need moms", "2011", "سيمون ويلز", S("سيث غرين", "جوان كوزاك"),
    "طفل يسافر مركبة فضائية لإنقاذ والدته التي اختطفتها كائنات فضائية لسرقة مشاعر الأمومة وتربية أطفالهم.", ""],
  ["cartoon-films", "Ninja Turtles", "2023", "جيف رو", S("هيرك إيفو", "نيسيا باري"),
    "السلاحف الأربعة يخرجون من أعماق نيويورك ليكتسبوا حب البشر من خلال محاربة عصابة وجيش من المتحولين.",
    "العنوان الصحيح Teenage Mutant Ninja Turtles: Mutant Mayhem"],
  ["cartoon-films", "onword", "2020", "دان سكانلون", S("توم هولاند", "كريس برات"),
    "شقيقان قزمان في عالم خيالي يفقد السحر بمرور الزمن، يقومان بمغامرة سحرية لمدة 24 ساعة لإعادة والدهما للحياة مؤقتاً.", ""],
  ["cartoon-films", "Open Seasone", "2006", "روجر أليرز / جيل كينان", S("مارتن لورنس", "أشتون كوتشر"),
    "دب أليف مدلل يجد نفسه تائهاً في الغابة قبيل موسم الصيد، ليتعاون مع سنجاب مشاكس للنجاة من الصيادين.", ""],
  ["cartoon-films", "peabody&sherman", "2014", "روب مينكوف", S("تاي باريل", "ماكس تشارلز"),
    "كلب عبقري خارق وذكاء اصطناعي يتبني طفلاً بشرياً، ويصنعان آلة زمن للسفر عبر التاريخ لتفادي الكوارث.", ""],
  ["cartoon-films", "Shreak", "2001", "أندرو آدمز / فيكي جونسون", S("مايك مايرز", "إيدي مورفي", "كاميرون دياز"),
    "غول أخضر منعزل يُجبر على إنقاذ أميرة عنيدة برفقة حمار ثرثار لتطهير مستنقعه من المخلوقات الخرافية.", ""],
  ["cartoon-films", "Sinbad", "2003", "تيم جونسون / باتريك غيلمور", S("براد بيت", "كاثريت زيتا جونز"),
    "المغامر سندباد يُتهم زوراً بسرقة كتاب السلام المقدس، فيسافر لبلاد الأساطير لاسترداده وإنقاذ حياة صديقه الطفولة.",
    "العنوان الصحيح Sinbad: Legend of the Seven Seas"],
  ["cartoon-films", "Sing", "2016", "غارث جينينغز", S("ماثيو ماكونهي", "ريس ويذرسبون"),
    "كوالا يكافح لإنقاذ مسرحه الغنائي المفلس عبر تنظيم أكبر مسابقة غناء حيوانية لاكتشاف المواهب.", ""],
  ["cartoon-films", "Tresure Island", "2002", "رون كليمنتس / جون موسكر", S("جوزيف غوردون ليفيت", "برايان موراي"),
    "مغامرة خيال علمي فضاء كلاسيكية لرواية جزيرة الكنز، حول فتى يجد خريطة طريق لكنز قراصنة ضخم في أبعاد الفضاء.",
    "العنوان الصحيح Treasure Island / Treasure Planet"],

  // ===== أفلام كرتون — ناقصهم سنة أو مخرج =====
  ["cartoon-films", "epic", "2013", "كريس ويج", S("أماندا سيفريد", "كولين فاريل"),
    "فتى صغير يكتشف فحسب هو في عالمه أنه واحد من أبطال الأسطورة مختبئين في الغابة، فيسعى للحفاظ على قوته وواقعه.",
    "الملخص مكتوب بصيغة ناقصة ويحتاج مراجعة"],
  ["cartoon-films", "The Bugs Bunny", "1990", "تشاك جونز", S("ميل بلانك"),
    "أشهر أرنب في تاريخ الكرتون، صاحب الحيل والمقالب التي لا تنتهي.",
    "البيانات موضع شك: تشاك جونز أخرج في الأربعينيات، وميل بلانك توفي عام 1989"],
  ["cartoon-films", "valiant", "2005", "غاري تشابمان", S("إيوان مكغريغور", "ريكي جيرفيس"),
    "حمام صغير معمر في قرية إنجليزية يرفض أن يكون ضعيفاً، فينطلق إلى مدينة لندن ليواجه المصير.", ""],
  ["cartoon-films", "finding nemo - dori", "2016", null, null, null,
    "العنوان يجمع فيلمين:الجزء الأول 2003 والجزء الثاني 2016 — التاريخ المكتوب هو تاريخ دوري"],
  ["cartoon-films", "Woody", "1995", null, null, null,
    "أول ظهور لشخصية وودي في فيلم Toy Story"],
  ["cartoon-films", "angry birds", "2016", null, null, null, ""],

  // ===== أفلام كرتون — ناقصهم مخرج =====
  ["cartoon-films", "101 كلب", null, "كلايد جيرونيني / ولفغانغ ريثرمان", S("رود تايلور", "بيتي لو جيرسون"),
    null, "بيانات نسخة ديزني عام 1961 — لا يُعرف أي نسخة في المجلد"],
  ["cartoon-films", "Anastasia", null, "دون بلوث / غاري غولدمان", S("ميغ رايان", "جون كيوزاك"),
    "أميرة روسية مفقودة تبحث عن أصلها وسط مؤامرة ملكية داخلية بالساحرة والتأمر.",
    ""],
  ["cartoon-films", "mickeys christmas carol", null, "بورني ماتتسون", S("واين ألوين", "آلان يونغ"),
    "إعادة تكييف قصة ديكنز من صميم ميكي ماوس في نسخة كرستماسية.",
    "العنوان الصحيح Mickey's Christmas Carol"],

  // ===== أفلام كرتون — ناقصهم ملخص =====
  ["cartoon-films", "Rise of the Teenage Mutant Ninja Turtles", null, null, null,
    "مغامرات حماسية وفنون قتالية حديثة للسلاحف الأربعة وهم يكتشفون قوى صوفية جديدة لمواجهة أشرار خارقين يهدّدون مدينة نيويورك.", ""],
  ["cartoon-films", "Shaun the Sheep Movie (2015)", null, null, null,
    "الخروف المشاكس شون يتسبب بالخطأ في ذهاب المزارع للمدينة وفقدانه لذاكرته، فيضطر هو والقطيع للتنكر ودخول المدينة لاسترجاعه في كوميديا صامتة ذكية.", ""],

  // ===== أفلام هندية =====
  ["indian-films", "Brothers (2015)", "2015", "كاران مالهوترا", S("أكشاي كومار", "سيدهارث مالهوترا"),
    "شقيقان متنافران يجمعهما صراع عنيف ودموي داخل حلبة قتال الفنون القتالية المختلطة لتصفية خلافات العائلة القديمة.", ""],
  ["indian-films", "Don  [2006].[1080p]", "2006", "فارهان أختار", S("شاروخان", "بريانكا شوبرا"),
    "زعيم عصابة دولية خطير يموت، فتستعين الشرطة برجل فقير شبيه له ليتسلل للعصابة ويفكك شبكتها السرية.", ""],
  ["indian-films", "Edge Of Extinction", "2019", null, null,
    "معركة بقاء بشرية في مواجهة كوارث بيئية وتهديدات فناء كوني.",
    "لم يُحدد العمل بالاسم — البيانات عامة ومحتاجة مصدر"],
  ["indian-films", "Fan (2016)", "2016", "مانيش شارما", S("شاروخان"),
    "شاب مهووس بنجمه المفضل لدرجة الجنون، تنقلب محبته لحقد أعمى وانتقام مدمر بعد رفض النجم لقاؤه.", ""],
  ["indian-films", "Like Stars on Earth (2007)", "2007", "عامر خان", S("دارشيل سفاري", "عامر خان"),
    "طفل يعاني من صعوبات التعلم وعسر القراءة يُساء فهمه من أسرته ومدرسته، إلى أن يأتي معلم متحمس يغير حياته.", ""],
  ["indian-films", "Psycho Party Planner [Z]", "2019", null, null,
    "تنظيم حفلات ينقلب لكوابيس مرعبة ومطاردات نفسية.",
    "إنتاج هندي درامي — المخرج والأبطال غير محددين"],
  ["indian-films", "SULTAN", "2016", "علي عباس ظفر", S("سلمان خان", "أنوشكا شارما"),
    "مصارع هيمن على البطولات يفقد كل شيء بسبب غروره، ليكافح من جديد للعودة للحلبة واستعادة كرامته.", ""],
  ["indian-films", "Tanhaji The Unsung Warrior (2020) [1080p]", "2020", "أوم راوت", S("أجاي ديفجان", "سيف علي خان"),
    "ملحمة تاريخية حقيقية عن القائد العسكري ماراتها تانهاجي مالوساري ومعركته البطولية لاستعادة حصن كونهاندا.", ""],
  ["indian-films", "Penance Lane [Z] (2020)", "2020", null, null,
    "مجرم سابق يتولى أعمال صيانة في مبنى معزول وسيء السمعة، ليكتشف أسراراً دموية وكيانات مرعبة تختبئ في جدرانه.", ""],
  ["indian-films", "Salaar (2023)", "2023", null, null,
    "صديقان حميمان يتحولان إلى خصوم وأعداء شرسين في صراع دموي مروع للسيطرة والنفوذ في إمبراطورية جريمة خيالية.", ""],

  // ===== مسلسلات كورية =====
  ["korean-series", "Goblin 720p", "2016", "لي إيون بوك", S("غونغ يو", "لي دونغ ووك", "كيم غو إيون"),
    "جنرال خالد يعيش مئات السنين يبحث عن عروسه البشرية التي تستطيع سحب السيف المغروس في صدره لإنهاء حياته الأبدية.",
    "العنوان الصحيح Guardian: The Lonely and Great God (Goblin)"],
  ["korean-series", "Inheritors", "2013", "كانغ شين هيو", S("لي مين هو", "بارك شين هاي", "كيم وو بين"),
    "رومانسي شبابي ترصد صراعات وتنافس ورثة الشركات الكبرى والطبقة الراقية في مدرسة ثانوية ومشاعر الحب المعقدة.",
    "العنوان الصحيح The Heirs"],
  ["korean-series", "The First Responders.1&2", "2022-2023", "شين كيونغ سو", S("كيم ري وون", "سون هو جون", "غونغ سيونغ يون"),
    "تعاون ميداني وثيق ومثير بين رجال الشرطة وقوات الإطفاء والمسعفين الطبيين لحل أبشع الجرائم وإنقاذ الأرواح في قياس الزمن.", ""],
  ["korean-series", "House of Ninjas_1", null, "ديف يوس", S("كينتو كاكو", "يوسوكي إيغوتشي", "تاي تيمورا"), null, ""],
  ["korean-series", "Island", null, "باه ج جونغ", S("كيم نام جيل", "لي دا هي", "تشا أون وو"), null, ""],
  ["korean-series", "Love Alarm", null, "لي نا جونغ", S("كيم سو هيون", "جونغ غا رام", "سونغ كانغ"), null, ""],
  ["korean-series", "Parasyte The Grey", null, "يون سانغ هو", S("جون سو ني", "كوو غيو هوان", "لي جونغ هيون"), null, ""],
  ["korean-series", "Tempted", "2018", null, null, null, ""],

  // ===== مسلسلات تركية =====
  ["turkish-series", "احمد بن حنبل", "2017", "عبد الباري أبو الخير", S("مهيار خضور", "سلوم حداد"),
    "ملحمة تاريخية دينية ترصد سيرة الإمام أحمد بن حنبل ومواقفه الصلبة وثباته خلال محنة خلق القرآن.", ""],
  ["turkish-series", "زمن الخيانة", "2016", null, null,
    "دراما عائلية ترصد انهيار العلاقات الزوجية والأسرية تحت وطأة الخيانة والطمع والصراعات المادية.",
    "دراما تركية اجتماعية — المخرج والأبطال غير محددين"],
  ["turkish-series", "السلطان عبد الحميد", null, "إيمري كونوك", S("بولنت إينال", "أوزليم كونوك"), null, ""],
  ["turkish-series", "Price of Passion", "2017", null, null,
    "دراما رومانسية سوداء عن طبيبة جراحة تُجبر على الزواج من قاتل محترفة لحماية شقيقها.", ""],
  ["turkish-series", "حب للايجار", "2015", "متين باليك أوغلو", S("باريش أردوتش", "إلتشين سانغو"), null, ""],
  ["turkish-series", "FERIHA", null, "مروة غونجاي", S("شاتاي أولسوي", "هازال كايا"), null, ""],
  ["turkish-series", "الحب الاعمى", "2015", null, null, null, ""],
  ["turkish-series", "المؤسس عثمان", "2019", null, null, null, ""],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cats = new Map(data.categories.map((c) => [c.id, c]));
const files = new Map();

if (LIST) {
  for (const [cat, f, y, d, c, s, n] of DATA) {
    console.log(`${cat.padEnd(16)} ${f.slice(0, 34).padEnd(36)} ${String(y || "—").padEnd(11)} ${String(d || "—").slice(0, 20).padEnd(20)} ${c ? "cast" : "—"} ${s ? "sum" : "—"}`);
  }
  process.exit(0);
}

const counts = { date: 0, director: 0, cast: 0, summary: 0, flagged: 0 };
let missing = 0;

for (const [catId, folder, year, director, cast, summary, note] of DATA) {
  const cat = cats.get(catId);
  const item = cat.items.find((i) => i.title === folder);
  if (!item) {
    console.log(`  no folder named "${folder}" in ${catId}`);
    missing++;
    continue;
  }
  const file = path.join(ROOT, "details", `${catId}.json`);
  if (!files.has(catId)) files.set(catId, JSON.parse(fs.readFileSync(file, "utf8")));
  const parsed = files.get(catId);

  let rec = parsed.items[item.id];
  if (!rec) {
    rec = {
      title: folder,
      canonicalTitle: null,
      type: catId.endsWith("series") ? "series" : "film",
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

if (!DRY) {
  for (const [catId, parsed] of files) {
    fs.writeFileSync(path.join(ROOT, "details", `${catId}.json`), JSON.stringify(parsed, null, 2) + "\n");
  }
}
console.log(
  `\nسنة: ${counts.date} · مخرج: ${counts.director} · أبطال: ${counts.cast} · ` +
    `ملخص: ${counts.summary} · موسوم: ${counts.flagged} · لم يُطبّق: ${missing} ${DRY ? "(dry run)" : ""}`,
);