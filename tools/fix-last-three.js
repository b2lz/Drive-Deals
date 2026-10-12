"use strict";
// The last two items with no record at all. They were hidden earlier by a
// truncated console listing, not by a matching failure — both are resolved
// here from a manual identification:
//
//   "W Two Worlds Apart [2016]" → W (더블유), MBC, 2016-07-20 … 2016-09-14,
//       16 episodes. Director Jung Dae-yoon, writer Song Jae-jung.
//       Source: English Wikipedia "W (TV series)", Apple TV, Korea Herald.
//
//   "طائر الصباح" → Erkenci Kuş ("The Early Bird"), Star TV, 2018,
//       51 episodes. Director Çağrı Bayrak; Demet Özdemir and Can Yaman
//       in the lead roles.
//       Source: TMDB tv/80411-erkenci-kus, Arabic series pages.
//
// Usage: node tools/fix-last-three.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// [category, folder, year, director, cast, genres, summary, links]
const DATA = [
  [
    "korean-series",
    "W Two Worlds Apart [2016]",
    "2016",
    "جونغ داي يون",
    ["لي جونغ سوك", "هان هيو جو", "كيم إوي سونغ"],
    ["خيال", "رومانسي", "إثارة", "كوميديا"],
    "طبيبة undetّش، والدها رسّام مانغا شهير يختفي فجأة، فتُسحب داخل عالم قصته المصوّرة " +
      "لتلتقي بشخصياتها. تلتقي هناك ببطل القصة كانغ تشول، حامل ميدالية ذهبية في الرماية، " +
      "وتبدأ بينهما علاقة تنقّل بينهما بين عالمين متمايزين يتصادم كلما تحوّل ما يحدث في أحدهما.",
    [
      { label: "ويكيبيديا (إنجليزي)", url: "https://en.wikipedia.org/wiki/W_(TV_series)" },
      { label: "ويكيبيديا (عربي)", url: "https://ar.wikipedia.org/wiki/%D8%AF%D8%A8%D9%84%D9%8A%D9%88_(%D8%B3%D9%84%D8%B3%D9%84%D8%A9)" },
    ],
  ],
  [
    "turkish-series",
    "طائر الصباح",
    "2018",
    "تشاغري بايراق",
    ["ديميت أوزديمير", "جان يامان", "أوزنور سيرتشيلار", "براند تونجا"],
    ["رومانسي", "كوميدي"],
    "سنام شابة تعمل في بقالة والدها، ويُضطع عائليتها ليتزوجافتها إن لم تجد عملاً. تبحث عن وظيفة " +
      "فتتقدم إلى شركة الإعلانات التي تعمل فيها شقيقتها فتُعتمد فيها، فيتغيّر مسار حياتها " +
      "وتدخل في صراع عاطفي بين الأخوين.",
    [{ label: "TMDB — Erkenci Kuş", url: "https://www.themoviedb.org/tv/80411-erkenci-kus" }],
  ],
];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cats = new Map(data.categories.map((c) => [c.id, c]));
const files = new Map();

let written = 0;
for (const [catId, folder, year, director, cast, genres, summary, links] of DATA) {
  const item = cats.get(catId).items.find((i) => i.title === folder);
  if (!item) {
    console.log(`  no folder named "${folder}" in ${catId}`);
    continue;
  }
  const file = path.join(ROOT, "details", `${catId}.json`);
  if (!files.has(catId)) files.set(catId, JSON.parse(fs.readFileSync(file, "utf8")));
  const parsed = files.get(catId);

  if (parsed.items[item.id]) {
    console.log(`  ${folder}: already has a record — skipped`);
    continue;
  }

  parsed.items[item.id] = {
    title: folder,
    canonicalTitle: null,
    type: "series",
    genres,
    director,
    directors: [director],
    cast,
    releaseDate: year,
    platforms: null,
    creators: null,
    summaryAr: summary,
    summaryEn: null,
    requirements: null,
    links,
    confidence: "high",
    extra: {
      factsSource: "بحث يدوي",
      factsNote: "تطابق العنوان يدوياً مع العمل المذكور أعلاه بعد فشل البحث الآلي في التطابق.",
    },
  };
  written++;
  console.log(`  ${folder}: record written`);
}

if (!DRY) {
  for (const [catId, parsed] of files) {
    fs.writeFileSync(path.join(ROOT, "details", `${catId}.json`), JSON.stringify(parsed, null, 2) + "\n");
  }
}
console.log(`\nwritten ${written} ${DRY ? "(dry run)" : ""}`);
