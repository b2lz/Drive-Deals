// Makes sure every category in data.json has a details/<id>.json file.
//
// item.js fetches details/<categoryId>.json for whichever category an
// item belongs to. Only categories that have been researched (e.g.
// games) get a real file, so opening any other item page fires a 404
// and logs a console error — the page still renders, but it wastes a
// request and pollutes the console.
//
// This script creates an empty stub with the same shape for any
// category that is missing one. Safe to re-run: it never overwrites a
// file that already has items.
//
// Usage: node tools/ensure-details-stubs.js
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DETAILS = path.join(ROOT, "details");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const categories = Array.isArray(data) ? [] : data.categories || [];

fs.mkdirSync(DETAILS, { recursive: true });

let created = 0;
let kept = 0;
let repaired = 0;

for (const category of categories) {
  const id = category && (category.id || category.name);
  if (!id) continue;
  const file = path.join(DETAILS, `${id}.json`);

  if (fs.existsSync(file)) {
    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      console.error(`  ! ${id}.json is not valid JSON — leaving it alone: ${err.message}`);
      continue;
    }
    const count = parsed && parsed.items ? Object.keys(parsed.items).length : 0;
    if (count === 0 && !parsed.items) {
      // Shape drift: fill in an empty "items" map without losing data.
      parsed.items = {};
      fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
      repaired++;
      console.log(`  repaired ${id}.json (added empty "items")`);
    } else {
      kept++;
    }
    continue;
  }

  const stub = {
    _meta: {
      version: 1,
      collection: id,
      note:
        "No researched details yet for this category. item.js treats a missing " +
        "entry as 'render the basic page', which is the intended behaviour.",
      items: 0,
    },
    items: {},
  };
  fs.writeFileSync(file, JSON.stringify(stub, null, 2) + "\n");
  created++;
  console.log(`  created details/${id}.json`);
}

console.log(
  `\ndetails/: ${created} created, ${repaired} repaired, ${kept} already had data ` +
    `(${fs.readdirSync(DETAILS).length} files for ${categories.length} categories)`
);