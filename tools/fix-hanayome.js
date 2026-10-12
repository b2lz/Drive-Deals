"use strict";
// "Hanayome" was left open because the folder name reads as the generic
// Arabic word for "bride". It is not generic: hanayome (花嫁, "bride") is
// literally part of the Japanese title of The Quintessential Quintuplets.
//
// Confirmed against English Wikipedia:
//   season 1 - directed by Satoshi Kuwabara, Tezuka Productions,
//   aired 10 Jan - 28 Mar 2019 on TBS.
//   Yoshitsugu Matsuoka voices Futaro Uesugi, Kana Hanazawa Ichika,
//   Ayana Taketatsu Nino - the three names supplied.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "details", "anime.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["anime/Hanayome.jpg"];
if (rec) {
  rec.canonicalTitle = "خمس أخوات (The Quintessential Quintuplets)";
  rec.releaseDate = "2019-01-10";
  rec.director = "ساتوشي كواهارا";
  rec.directors = ["ساتوشي كواهارا"];
  rec.cast = ["يوشيتسوغو ماتسوكا", "كانا هانازاوا", "أيّانا تاكيتاتسو"];
  rec.summaryAr =
    "طالب ثانوي موهوب لكنه وحيد ومكسور مالياً، يُوظَّف مدرّساً خاصاً لخمس أخوات متطابقات " +
    "لا يرغبن في الدراسة. يقبلنّه بعد جهد، وتنشأ بينه وبين كل واحدة منهن علاقة خاصة، " +
    "بينما يُكشف منذ البداية أنه سيتزوج واحدة منهن دون أن تُحدَّد هويتها إلا في النهاية.";
  delete rec.needsSummary;
  delete rec.needsReview;
  rec.extra = {
    factsSource: "بحث يدوي",
    factsNote:
      "ويكيبيديا: الموسم الأول من إخراج ساتوشي كواهارا، إنتاج Tezuka Productions، " +
      "وبث من 10 يناير إلى 28 مارس 2019.",
    titleNote:
      "اسم المجلد Hanayome يعني «العروس» باليابانية، وهو جزء من اسم العمل الأصلي.",
  };
  rec.links = [
    { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/The_Quintessential_Quintuplets" },
  ];
  rec.confidence = "high";
  console.log("  Hanayome -> The Quintessential Quintuplets (2019), Kuwabara + 3 leads");
}

fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log("done");