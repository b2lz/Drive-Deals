"use strict";
// The folder "رامز" was ambiguous — a yearly prank show with many seasons.
// Its cover image reads "رامز موفي ستار", which identifies the season, so
// the record can be resolved instead of left open.
//
// Source: Arabic Wikipedia, "رامز موفي ستار" — broadcast 2 April 2022 on
// MBC (Ramadan 1443 AH), presented and produced by Ramez Galal, with Jean
// Claude Van Damme.
//
// Usage: node tools/fix-ramz.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "arabic-series.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["arabic-series/رامز.jpg"];
if (rec) {
  rec.canonicalTitle = "رامز موفي ستار";
  rec.releaseDate = "2022-04-02";
  rec.director = "رامز جلال";
  rec.directors = ["رامز جلال"];
  rec.cast = ["رامز جلال", "جان كلود فان دام"];
  rec.genres = ["برامج مقالب", "ترفيه"];
  rec.networks = ["إم بي سي مصر", "إم بي سي 1", "إم بي سي 5", "شاهد"];
  rec.summaryAr =
    "برنامج كاميرا خفية من إعداد وتقديم رامز جلال، عُرض في رمضان 2022 على قنوات إم بيسي " +
    "برعاية الهيئة العامة للترفيه. صُوّر في صحراء الرياض، وتُبنى كل حلقة على مقلب يدعو فيه " +
    "نجماً للمشاركة في مشهد فيلم يُصوَّر في السعودية، فيدخل في مشاهد محفّرة بالمخاطر " +
    "والسرعة المفاجئة، مع استضافة النجم العالمي جان كلود فان دام.";
  rec.links = [
    { label: "Wikipedia", url: "https://ar.wikipedia.org/wiki/رامز_موفي_ستار" },
  ];
  console.log("  رامز -> resolved as رامز موفي ستار (2022-04-02)");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");