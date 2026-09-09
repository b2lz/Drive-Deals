#!/usr/bin/env node
// ============================================================
// Dev tool (NOT part of the website): convert banner/source.xlsx
// to banner/data.json.
//
// The rotating top banner ("latest items") is owned through Excel:
// one sheet named "banner" with three columns:
//
//       title          | image         | sizeGB
//       New Release 1  | game-001.jpg  | 10.6
//
//   The photo files go into banner/assets/ on disk.
//
// Usage:
//   node tools/banner-excel-to-json.js [input.xlsx] [-o output.json]
//
// Defaults: input = banner/source.xlsx, output = banner/data.json.
//
// Behavior:
//   - empty rows are ignored
//   - sizeGB must be numeric (numbers stored as text are accepted)
//   - duplicate image names warn and are skipped
//   - non-.jpg file names warn but are kept
//   - missing photo files inside banner/assets/ warn (first 10)
//   - writes clean JSON: { items: [ { title, image, sizeGB? } ] }
//
// The website itself never touches Excel — this is the only place.
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { convertCategorySheet } = require("./excel-to-json");

const ROOT = path.join(__dirname, "..");

function checkBannerPhotoFiles(items, warnings) {
  const missing = [];
  for (const item of items) {
    if (!fs.existsSync(path.join(ROOT, "banner", "assets", item.image))) {
      missing.push(item.image);
    }
  }
  if (missing.length > 0) {
    for (const m of missing.slice(0, 10)) {
      warnings.push(`Photo file not found: banner/assets/${m}`);
    }
    if (missing.length > 10) {
      warnings.push(`… and ${missing.length - 10} more missing photo file(s).`);
    }
  }
}

/** CLI entry point. */
function main() {
  const args = process.argv.slice(2);
  let input = path.join(ROOT, "banner", "source.xlsx");
  let output = path.join(ROOT, "banner", "data.json");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = path.resolve(args[++i]);
    } else if (!args[i].startsWith("-")) {
      input = path.resolve(args[i]);
    }
  }

  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    console.error(
      "Create banner/source.xlsx with a sheet named 'banner' (title | image | sizeGB)."
    );
    process.exit(1);
  }

  const workbook = XLSX.readFile(input);
  const sheetName = workbook.SheetNames.includes("banner")
    ? "banner"
    : workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
  });

  let parsed;
  try {
    parsed = convertCategorySheet(rows);
  } catch (err) {
    console.error("Conversion failed:", err.message);
    process.exit(1);
  }

  if (parsed.items.length === 0) {
    console.error("No valid rows found — nothing to write.");
    process.exit(1);
  }

  const photoWarnings = [];
  checkBannerPhotoFiles(parsed.items, photoWarnings);
  for (const warning of [...parsed.warnings, ...photoWarnings]) {
    console.warn("warning:", warning);
  }

  const outputJson = {
    items: parsed.items.map((it) => ({ title: it.title, image: it.image, sizeGB: it.sizeGB })),
  };
  fs.writeFileSync(output, JSON.stringify(outputJson, null, 2) + "\n");
  console.log(`Wrote ${outputJson.items.length} banner item(s) to ${output}`);
}

if (require.main === module) {
  main();
}

module.exports = {};
