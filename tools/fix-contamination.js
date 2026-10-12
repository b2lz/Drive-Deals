"use strict";
// Two records where the facts describe a different work than the folder.
//
//   cartoon-films / Soul — the Wikipedia match landed on "Soul to Soul", a 1971
//     concert documentary. In a cartoon-films folder the intended work is
//     almost certainly Pixar's "Soul" (2020). Rebuilt from the correct source
//     rather than deleted, and flagged because the folder name alone is
//     ambiguous.
//     Source: en.wikipedia.org/wiki/Soul_(2020_film).
//
//   arabic-films / ليل داخلي — the Wikipedia match landed on "ليلى (فلم)", a
//     disambiguation page for two 1927/1942 Egyptian films. The scraped
//     English summary and canonicalTitle belonged to that page, not to the
//     folder. Those borrowed fields are removed; the year, director, cast and
//     Arabic summary supplied by hand are kept, and the record is flagged
//     because the hand data has not been confirmed against a source.
//
// Usage: node tools/fix-contamination.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// ---- cartoon-films / Soul → Pixar (2020) ------------------------------------
const soulFile = path.join(ROOT, "details", "cartoon-films.json");
const soulParsed = JSON.parse(fs.readFileSync(soulFile, "utf8"));
const soul = soulParsed.items["cartoon-films/Soul.jpg"];

if (soul) {
  soul.canonicalTitle = "Soul";
  soul.type = "film";
  soul.genres = ["animated", "comedy", "drama", "adventure"];
  soul.director = "بيت دكتور / كيمب باورز";
  soul.directors = ["بيت دكتور", "كيمب باورز"];
  soul.cast = ["جيمي فوكس", "تينا فاي", "فيليشيا راشد", "ريتشارد أيوادي"];
  soul.releaseDate = "2020-06-25";
  soul.summaryEn =
    "A jazz musician and teacher who is stuck in a rut gets the chance to escape his soul when he " +
    "finds himself trapped in a surreal world between life and the afterlife, where he has to " +
    "rediscover what makes life worth living.";
  soul.summaryAr =
    "عازف جاز ومعلّم موسيقي يجد نفسه فجأة محبوساً في عالم سريالي بين الحياة والآخرة، ومع رحلته " +
    "للعودة إلى دنياه يعيد التفكير فيما يجعل الحياة تستحق العيش.";
  soul.links = [{ label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Soul_(2020_film)" }];
  delete soul.wikiTitle;
  soul.needsReview = true;
  soul.extra = {
    factsSource: "بحث يدوي",
    reviewNote:
      "العنوان «Soul» ملتبس. التطابق الآلي chose فيلم وثائقي عن حفلة عام 1971؛ أُعيد بناء السجل " +
      "من فيلم بيكسار (2020) لأنه الأنسب لمجلد أفلام الكرتون — يحتاج تأكيداً.",
  };
  if (!DRY) fs.writeFileSync(soulFile, JSON.stringify(soulParsed, null, 2) + "\n");
  console.log("  cartoon-films/Soul.jpg → Pixar Soul (2020), flagged as ambiguous");
} else {
  console.log("  missing record: cartoon-films/Soul.jpg");
}

// ---- arabic-films / ليل داخلي → strip borrowed fields -----------------------
const lailFile = path.join(ROOT, "details", "arabic-films.json");
const lailParsed = JSON.parse(fs.readFileSync(lailFile, "utf8"));
const lail = lailParsed.items["arabic-films/ليل داخلي.jpg"];

if (lail) {
  lail.canonicalTitle = null;
  delete lail.wikiTitle;
  delete lail.summaryEn;
  lail.links = [];
  lail.genres = ["جريمة", "تشويق", "دراما"];
  lail.needsReview = true;
  lail.extra = {
    factsSource: "بحث يدوي",
    factsNote: "السنة والمخرج والأبطال والملخص وردت يدوياً.",
    reviewNote:
      "التطابق الآلي وقع على صفحة «ليلى (فلم)» وهي صفحة تفرّع بين فيلمين من عام 1927 و1942 — " +
      "حُذف منها الملخص الإنجليزي والاسم القانوني. البيانات الحالية غير مؤكدة بمصدر.",
  };
  if (!DRY) fs.writeFileSync(lailFile, JSON.stringify(lailParsed, null, 2) + "\n");
  console.log("  arabic-films/ليل داخلي.jpg → borrowed fields removed, flagged");
} else {
  console.log("  missing record: arabic-films/ليل داخلي.jpg");
}

console.log(`\ndone ${DRY ? "(dry run)" : ""}`);
