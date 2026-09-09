// ============================================================
// make-test-data.js — data.json generator (multi-category)
// ------------------------------------------------------------
//   node tools/make-test-data.js [count]
//
// Regenerates data.json: 12 categories, each with `count` items
// (default 500).
//
// The item values are deterministic: value = (((i * 37) % 580) + 20) / 10,
// so tests can predict every size (small 1-decimal numbers like 10.6, 54.9).
//
// Each category uses the same file names (001.jpg … 500.jpg); the
// physical files live in assets/<category>/ — one folder per category.
// `count` must stay <= 500 (one shared placeholder set per folder).
// ============================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const COUNT = Math.max(1, parseInt(process.argv[2], 10) || 500);

if (COUNT > 500) {
  console.error("count must be <= 500 (each assets/<category> folder has 500 placeholders)");
  process.exit(1);
}

// The 12 media categories. The order here is the display order of
// the category bar.
const CATEGORIES = [
  { id: "arabic-films", name: "أفلام عربي" },
  { id: "foreign-films", name: "أفلام أجنبي" },
  { id: "foreign-film-series", name: "سلاسل أفلام أجنبي" },
  { id: "indian-films", name: "أفلام هندي" },
  { id: "arabic-series", name: "مسلسلات عربي" },
  { id: "foreign-series", name: "مسلسلات أجنبي" },
  { id: "korean-series", name: "مسلسلات كوري" },
  { id: "cartoon-films", name: "أفلام كرتون" },
  { id: "cartoon-series", name: "مسلسلات كرتون" },
  { id: "anime", name: "أنمي" },
  { id: "turkish-series", name: "مسلسلات تركي" },
  { id: "games", name: "ألعاب" },
];

const categories = CATEGORIES.map((cat) => ({
  id: cat.id,
  name: cat.name,
  items: Array.from({ length: COUNT }, (_, idx) => {
    const i = idx + 1; // 1-based item number
    const image = String(i).padStart(3, "0") + ".jpg";
    return {
      id: `${cat.id}/${image}`, // globally unique
      title: image,
      image,
      sizeGB: Math.round((((i * 37) % 580) + 20) / 10 * 10) / 10,
    };
  }),
}));

fs.writeFileSync(
  path.join(ROOT, "data.json"),
  JSON.stringify({ categories }, null, 2),
  "utf8"
);

const total = COUNT * CATEGORIES.length;
console.log(`data.json: ${CATEGORIES.length} categories × ${COUNT} items = ${total} items`);
