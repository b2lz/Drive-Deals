"use strict";
// The last nine foreign-film gaps.
//
// "Wandering Interstellar" gets no director or cast: the supplier pointed
// out the name may refer to an independent space work rather than to any
// identifiable film, and linking it to Nolan's Interstellar would be a
// different film. It stays open and flagged rather than being guessed.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "details", "foreign-films.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const S = (...names) => names.join("، ");

const SET = [
  ["As God (2020)", "تشين بينغفي", S("شيه مياو", "نان شينغ", "وانغ وينجي"), null],
  [
    "Big Awning (2020) [1080p]",
    null,
    null,
    "الاسم يشير إلى إنتاج صيني رقمي (iQIYI أو Tencent) ضمن فئة الفانتايا والدراما — لم يُحدد الفيلم بالاسم",
  ],
  [
    "Big Bee (2020) [1080p]",
    "تشونغهواي سون",
    S("كيانغبا كايدان", "يدان زو", "لينغليغ سو", "تشيوتشي هان"),
    null,
  ],
  [
    "Ghost Wife (2018) [1080P]",
    "ميت ييمسومبون",
    S("سوباوادي كيتيسوباكول", "تشيتيبات واتاناسيريبونغ"),
    "إنتاج آسيوي تايلندي — الوصف السابق كان فيلم رعب مختلف",
  ],
  [
    "Hero (2015)",
    "نيخيل أدفاني",
    S("سوراج بانشولي", "أتياشيتي", "تيغمانشو دوليا"),
    "العنوان عام — قد يكون فيلماً هندياً مختلفاً",
  ],
  [
    "Kung Fu Master Huo Yuanjia (2020) [720p]",
    "ليو كايي",
    S("تشونغيو تشنغ", "تشاو كيوشينغ", "يابِن وانغ", "تشيانلونغ يانغ"),
    null,
  ],
  [
    "Martial Arts Master (2019) [1080p]",
    "لي ليمينغ",
    S("دينيس تو", "ميتشل وينتر"),
    "العمل معروف أيضاً بـ Ip Man: Kung Fu Master",
  ],
  [
    "Mega.Crocodile (2019) [1080P]",
    "فوغوي",
    S("غوانغ بين لي", "شيون غوو", "لينغشنغ تشين"),
    null,
  ],
  [
    "Wandering Interstellar (2019) [1080p]",
    null,
    null,
    "الاسم قد يشير إلى أعمال فضاء مستقلة أو إلى التباس مع فيلم Interstellar (2014) — وهو فيلم مختلف تماماً، فلا ينطبق عليه مخرج أو أبطال هذا العمل",
  ],
];

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()));
let written = 0;
let flagged = 0;

for (const [folder, director, cast, note] of SET) {
  const rec = parsed.items[`foreign-films/${folder}.jpg`];
  if (!rec) {
    console.log(`  no record: ${folder}`);
    continue;
  }
  if (director && !has(rec.director)) {
    rec.director = director;
    if (!has(rec.directors)) rec.directors = [director];
  }
  if (cast && !has(rec.cast)) rec.cast = cast.split("، ").filter(Boolean);

  rec.extra = { ...(rec.extra || {}), factsSource: "بحث يدوي" };
  if (note) {
    rec.needsReview = true;
    rec.extra.reviewNote = note;
    flagged++;
  } else {
    delete rec.needsReview;
  }
  written++;
  console.log(`  ${folder}: ${director || "—"} / ${cast || "—"}${note ? "  [موسوم]" : ""}`);
}

fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`\n${written} written, ${flagged} flagged.`);