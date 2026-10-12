"use strict";
// Three records left with real defects by the review sweep:
//
//   "The K2 S01" — the Wikidata filler wrote `type: "film"` for a television
//     series, and left the year and the summary empty. Director, cast and
//     genres from that record were correct and are kept.
//     Source: en.wikipedia.org/wiki/The_K2, DramaWiki, Rotten Tomatoes.
//
//   "vikram vedha2022" — Wikidata supplied everything except the summary.
//
//   "ليل داخلي" — one cast entry carried a scraped line break that had joined
//     two names and a stray "فلم مصري" into a single credit.
//
// Usage: node tools/fix-review-round.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

const edits = [
  {
    file: "korean-series",
    id: "korean-series/The K2 S01.jpg",
    set: {
      type: "series",
      releaseDate: "2016-09-23",
      genres: ["أكشن", "رومانسي", "سياسي", "تشويق"],
      director: "كواك جونغ هوان",
      directors: ["كواك جونغ هوان"],
      cast: ["جي تشانغ ووك", "سونغ يون آه", "إم يون آه", "جو سونغ ها", "كيم كاب سو"],
      summaryAr:
        "جندي مرتزق يُعرف بلقب K2 يصبح هارباً بعد اتهامه خطأً بقتل حبيبته، فيقبل وظيفة حارس شخصي " +
        "لابنة مرشّح رئيسي وبنته غير شرعية. تتقاطع مآثر الحارس مع طموحات زوجة المرشّح التي تخفي " +
        "نفوذها خلف ودّها المصقول، وتتحوّل الحماية التدريجية إلى علاقة تُهدّد ولاءه لبلاده.",
      links: [
        { label: "ويكيبيديا (إنجليزي)", url: "https://en.wikipedia.org/wiki/The_K2" },
        { label: "Rotten Tomatoes", url: "https://www.rottentomatoes.com/tv/the_k2/cast-and-crew" },
      ],
      extra: {
        factsSource: "بحث يدوي",
        factsNote: "سجل Wikidata كان يصفه كفيلم ويخلو من السنة والملخص — تم تصحيحه يدوياً.",
      },
    },
    drop: ["needsSummary"],
  },
  {
    file: "indian-films",
    id: "indian-films/vikram vedha2022.jpg",
    set: {
      summaryAr:
        "ضابط متقاعد ينكسر في محاولته السريعة لاستعادة مجوهرات مسروقة من عصابة مشتبَه بها، فيجد " +
        "نفسه متورطاً في شبكة جرائم متشابكة، ويشك أن الضحية الأولى التي واجهها قبل سنوات لم تكن " +
        "ما ظنّه طوال حياته.",
    },
    drop: ["needsSummary"],
  },
  {
    file: "arabic-films",
    id: "arabic-films/ليل داخلي.jpg",
    set: {
      cast: ["إستفان روستي", "عزيزة أمير", "ليلى"],
    },
  },
];

let applied = 0;
for (const e of edits) {
  const file = path.join(ROOT, "details", `${e.file}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const rec = parsed.items[e.id];
  if (!rec) {
    console.log(`  missing record: ${e.id}`);
    continue;
  }
  Object.assign(rec, e.set);
  for (const f of e.drop || []) delete rec[f];
  applied++;
  console.log(`  fixed ${e.id}`);
  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
}
console.log(`\n${applied} records ${DRY ? "(dry run)" : "updated"}`);
