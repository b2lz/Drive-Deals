"use strict";
// Emit a blank fill-in sheet for a category: one line per item, with the
// missing fields as empty slots the user can type into.
//
// Usage: node tools/gaps-template.js <category> [out.txt]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const catId = process.argv[2];
const out = process.argv[3];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "details", `${catId}.json`), "utf8"));
const cat = data.categories.find((c) => c.id === catId);
const isGame = catId === "games";

const filled = (v) =>
  Array.isArray(v) ? v.length > 0 && v.some((x) => String(x).trim())
  : v != null && (typeof v === "object" ? Object.keys(v).length > 0 : String(v).trim().length > 0);

const LABEL = {
  summary: "الملخص العربي",
  director: "المخرج",
  cast: "الأبطال",
  min: "الحد الأدنى",
  rec: "الموصى به",
};

const lines = [];
for (const item of cat.items) {
  const rec = parsed.items[item.id];
  if (!rec) continue;
  const need = [];
  if (!filled(rec.summaryAr)) need.push("summary");
  if (catId !== "anime" && !isGame && !filled(rec.director) && !filled(rec.directors)) need.push("director");
  if (catId !== "anime" && !isGame && !filled(rec.cast)) need.push("cast");
  if (isGame && !filled((rec.requirements || {}).minimum)) need.push("min");
  if (isGame && !filled((rec.requirements || {}).recommended)) need.push("rec");
  if (!need.length) continue;
  lines.push(`${item.title}  ::  ${need.map((k) => LABEL[k]).join(" | ")}  ::`);
}

const text =
  `# ${cat.titleAr || catId}\n` +
  `# اكتب بعد "::"  بالشكل:  العنوان :: الحقل1 = القيمة | الحقل2 = القيمة\n` +
  `# مثال:  Game of Thrones  ::  المخرج = Benioff و Weiss | الأبطال = Emilia Clarke, Kit Harington\n\n` +
  lines.join("\n") +
  "\n";

if (out) {
  fs.writeFileSync(out, text, "utf8");
  console.log(`wrote ${lines.length} lines -> ${out}`);
} else {
  process.stdout.write(text);
}
