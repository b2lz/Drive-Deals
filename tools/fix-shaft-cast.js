"use strict";
// One cast value lost its surname: "Samuel L" should be "Samuel L. Jackson".
// The split on newlines in the earlier cleanup pass truncated at the dot.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "details", "foreign-films.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const rec = parsed.items["foreign-films/Shaft (2019).jpg"];
if (rec && Array.isArray(rec.cast) && rec.cast.includes("Samuel L")) {
  rec.cast = rec.cast.map((c) => (c === "Samuel L" ? "Samuel L. Jackson" : c));
  rec.needsReview = true;
  rec.extra = {
    ...(rec.extra || {}),
    factsSource: "بحث يدوي",
    reviewNote: "اسمACTORlast مقطوع أثناء تنظيف الحقول مسبقاً — يحتاج مراجعة باقي الأسماء.",
  };
  console.log("  Shaft (2019): cast restored ->", JSON.stringify(rec.cast));
}

fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log("done");