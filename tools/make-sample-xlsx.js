#!/usr/bin/env node
// ============================================================
// Dev tool (NOT part of the website): create a source.xlsx template
// from the current data.json, so the Excel workflow is easy to try.
//
// Usage:  node tools/make-sample-xlsx.js
//
// The resulting source.xlsx has:
//   - a "categories" sheet (id | name) — one row per category
//   - one sheet per category named after its id, with columns
//     title | image | sizeGB and a few example rows
//
// Replace the example rows with the real data, put the photo files
// into assets/<sheet-name>/, then run:  npm run excel-to-json
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const SAMPLE_ROWS = 3; // example rows per category sheet

function main() {
  const root = path.join(__dirname, "..");
  const dataPath = path.join(root, "data.json");
  const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const categories = Array.isArray(raw) ? [{ id: "legacy", name: "ألعاب", items: raw }] : raw.categories;
  if (!Array.isArray(categories)) {
    throw new Error("data.json must contain a categories array.");
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: category list (id | name), in the same order as data.json.
  const catRows = [["id", "name"], ...categories.map((c) => [c.id, c.name])];
  const catSheet = XLSX.utils.aoa_to_sheet(catRows);
  catSheet["!cols"] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, catSheet, "categories");

  // One sheet per category, named after its id.
  for (const cat of categories) {
    const rows = [["title", "image", "sizeGB"]];
    for (const item of cat.items.slice(0, SAMPLE_ROWS)) {
      rows.push([item.title, item.image, item.sizeGB]);
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(workbook, sheet, cat.id);
  }

  const outPath = path.join(root, "source.xlsx");
  XLSX.writeFile(workbook, outPath);
  const total = categories.reduce((n, c) => n + Math.min(c.items.length, SAMPLE_ROWS), 0);
  console.log(`Wrote source.xlsx: categories sheet + ${categories.length} category sheets (${total} example rows).`);
  console.log("Fill in the real rows, put photos in assets/<category>/, then run: npm run excel-to-json");
}

if (require.main === module) {
  main();
}
