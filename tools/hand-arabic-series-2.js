"use strict";
// The last 17 Arabic-series gaps, supplied by hand.
//
// Usage: node tools/hand-arabic-series-2.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

const C = (...names) => names.join("، ");

// [folder, year, director, cast, summary, note]
const DATA = [
  ["عقبال عندكم", "2025", "علاء إسماعيل", C("حنان مطاوع", "محمد ثروت"),
    "حلقات منفصلة متصلة تدور حول سها وفادي اللذين يستعدان للزواج، لكنهما يقعان في العديد من المشاكل قبل الزفاف، وأثناء محاولتهما لحلها تتداخل حياتهما مع سبع حكايات حول زيجات انتهت بالفشل.",
    "طاقم التمثيل غير كامل — حلقات منفصلة بأبطال مختلفين"],
  ["على قد الحب", "2026", "خالد سعيد", C("نيللي كريم", "شريف سلامة", "مها نصار", "أحمد ماجد"),
    "تجد سيدة الأعمال الناجحة مريم نفسها في مواجهة مع ماضٍ يأبى النسيان؛ حيث يطفو حدث قديم على السطح ليزلزل استقرارها ويقذف بها في دوامة من التشتت، واضعةً نجاحها ومستقبلها أمام خيارين: التجاوز أو الانهيار.", ""],
  ["كلهم بيحبوا مودي", "2026", "أحمد شفيق", C("ياسر جلال", "ميرفت أمين", "أيتن عامر", "ريهام الشنواني"),
    "رجل ثري يعيش حياة باذخة بين السفر وتعدد الزيجات، لكن استقراره ينهار أمام أزمة مالية تعصف بثروته ومستقبله، ليجد نفسه محاصراً في مواقف طريفة وعلاقات متشابكة مع محيطه.", ""],

  ["المعلم", null, "مرقس عادل", C("مصطفى شعبان", "سهر الصايغ", "هاجر أحمد", "أحمد فؤاد سليم"),
    "تدور الأحداث حول تاجر سمك يحاول الحفاظ على إرث عائلته وتجارته في السوق، ويخوض صراعات ضارية ضد كبار تجار السوق (عائلة شداد) للانتقام لوالده واستعادة مكانته.",
    "السنة غير محدّدة في البيانات الموردة"],
  ["الجسر", "2022", null, null,
    "دراما خيال علمي وفانتازيا تدور بعد 70 عاماً من دمار كوكب الأرض ونهاية العالم، حول محاولة من تبقى على قيد الحياة الوصول إلى بقعة الضوء الوحيدة المتبقية تحت سيطرة زعيمة مستعمرة غامضة.", ""],
  ["الزوجة الـ18", "2019", null, null,
    "تدور الأحداث حول حمزة رجل أعمال متعدد الزيجات ومستهتر لا تستمر زيجاته طويلاً، إلى أن يقع في حب الفتاة التي تصبح زوجته رقم 18 لتقلب حياته تماماً وتضع حدًا لتلاعبه.", ""],
  ["الطاووس", "2021", null, null,
    "يجد محامي مخضرم مهتم بقضايا التعويضات (كمال الأسطول) نفسه مضطراً للتحقيق في قضية اغتصاب بشعة تعرضت لها فتاة بريئة على يد مجموعة من أصحاب النفوذ، لتنقلب حياته رأساً على عقب.", ""],
  ["النهايه", "2020", null, null,
    "في مستقبل متطور عام 2120 بمدينة القدس، يحاول مهندس طاقة (زين) البحث عن حل لأزمة الطاقة والقيود التي يفرضها النظام المستبد، ويتغير كل شيء حين يظهر إنسان آلي مستنسخ منه.", ""],
  ["اولاد الراعي", "2026", null, null,
    "من نقطة الصفر وجذور بسيطة، ينطلق ثلاثة أشقاء في رحلة كفاح لبناء إمبراطورية تجارية ضخمة، لكن مع تضخم الثروة والنفوذ ينفجر صراع الدم والسلطة بينهم ليتحول الأشقاء إلى خصوم.", ""],
  ["زلزال", "2019", null, null,
    "تبدأ الأحداث يوم زلزال 1992 الشهير بوفاة والد الشاب (محمد حربي) نتيجة انهيار منزله بعد مماطلة مالك الأرض في تسليمها له، لتبدأ رحلة صراع شاقة وانتقام يخوضها الابن ضد عائلة البائع.", ""],
  ["shark tank egy", "2022", "باسم مبارك", C("أحمد السويدي", "محمد حمزة", "أحمد حسام ميدو", "روبرت هيرجافيك"),
    "برنامج واقعي يمنح رواد الأعمال الشباب فرصة عرض مشروعاتهم وابتكاراتهم أمام لجنة من كبار المستثمرين ورجال الأعمال للحصول على تمويل.",
    "ليست دراما تمثيلية — لجنة تحكيم ومستثمرون، لا أبطال مسلسل"],
  ["رامز ليفل الوحش", "2020", "محمد نصير", C("رامز جلال", "أسماء جلال", "كارولين عزمي", "ماجد المصري"),
    null,
    "برنامج مقالب سنوي وليس دراما — رامز جلال مقدم مع ضيوف شرف"],
  ["زينهم", "2020", "يحيى إسماعيل", C("أحمد داود", "كريم قاسم", "سلمى أبو ضيف"),
    null, ""],
  ["صلة رحم", "2024", "تامر نادي", C("إياد نصار", "ريهام عبد الغفور", "يسرا اللوزي"),
    null, ""],

  ["8الكبير", null, null, null, null, "سلسلة أجزاء الكبير أوي — لا ينطبق عليها تاريخ إصدار واحد"],
  ["رامز", null, null, null, null, "سلسلة برامج مقالب سنوية لرامز جلال في رمضان منذ سنوات طويلة"],
  ["ونيس", null, null, null, null, "سلسلة يوميات ونيس لمحمد صبحي — أجزاؤها الأولى منذ 1994 وتتسع عبر الزمن"],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "arabic-series");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

if (LIST) {
  for (const [f, y, d, c, s, n] of DATA) {
    console.log(`${f.padEnd(24)} ${String(y || "—").padEnd(6)} ${String(d || "—").padEnd(16)} ${c ? C() : "—"} ${s ? "summary" : "—"} ${n ? "NOTE" : ""}`);
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
  if (cast && !has(rec.cast)) { rec.cast = cast.split("، "); counts.cast++; }
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