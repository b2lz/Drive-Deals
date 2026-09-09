#!/usr/bin/env node
// ============================================================
// Dev tool (NOT part of the website): convert source.xlsx to data.json.
//
// The owner keeps the media library in Excel with ONE SHEET PER
// CATEGORY plus a "categories" sheet:
//
//   Sheet "categories" (id | name):
//       id          | name
//       arabic-films | أفلام عربي
//       anime        | أنمي
//
//   One sheet per category, named after its id, with three columns:
//       title          | image      | sizeGB
//       فيلم رمضان 2024 | 001.jpg    | 8
//
//   The photo file goes into assets/<sheet-name>/ on disk.
//
// Legacy support: a workbook WITHOUT a "categories" sheet that has the
// old two-column layout (image_name | value) is still converted into
// the old flat list — the website normalizes that into one category.
//
// Usage:
//   node tools/excel-to-json.js [input.xlsx] [-o output.json]
//
// Defaults: input = source.xlsx, output = data.json (project root).
//
// Behavior:
//   - empty rows are ignored
//   - sizeGB must be numeric (numbers stored as text are accepted)
//   - duplicate image names inside a category warn and are skipped
//   - non-.jpg file names warn but are kept
//   - missing photo files inside assets/<category>/ warn (first 10)
//   - writes clean JSON: { categories: [ { id, name, items } ] }
//
// The website itself never touches Excel — this is the only place.
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

/**
 * Convert legacy flat rows (header row: image_name | value) into items.
 * Kept for old exports; the website normalizes the flat list itself.
 * @param {Array<Array>} rows  output of XLSX.utils.sheet_to_json(ws, {header:1})
 * @returns {{items: Array<{image:string,value:number}>, warnings: string[]}}
 */
function convertRows(rows) {
  const warnings = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("The sheet is empty — expected a header row with image_name and value.");
  }

  const normalize = (cell) => String(cell == null ? "" : cell).trim().toLowerCase().replace(/[\s_]+/g, "");
  const header = rows[0].map(normalize);
  const imgIdx = header.indexOf("imagename");
  const valIdx = header.indexOf("value");
  if (imgIdx === -1 || valIdx === -1) {
    throw new Error(
      "Missing required columns. The first row must contain: image_name | value"
    );
  }

  const items = [];
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "")) {
      continue;
    }

    const rawName = row[imgIdx];
    const imageName = String(rawName == null ? "" : rawName).trim();
    if (!imageName) {
      warnings.push(`Row ${r + 1}: missing image name — skipped.`);
      continue;
    }

    const rawValue = row[valIdx];
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
      warnings.push(`Row ${r + 1} (${imageName}): missing value — skipped.`);
      continue;
    }

    let value = typeof rawValue === "number" ? rawValue : Number(String(rawValue).trim());
    if (!Number.isFinite(value)) {
      warnings.push(`Row ${r + 1} (${imageName}): value "${String(rawValue).trim()}" is not a number — skipped.`);
      continue;
    }

    const key = imageName.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`Duplicate image name: ${imageName} — skipped (first occurrence kept).`);
      continue;
    }
    seen.add(key);

    if (!/\.jpe?g$/i.test(imageName)) {
      warnings.push(`${imageName}: not a .jpg file name — kept, but the app expects JPG files.`);
    }

    items.push({ image: imageName, value });
  }

  return { items, warnings };
}

/**
 * Parse the "categories" sheet (header row: id | name).
 * @returns {{categories: Array<{id:string,name:string}>, warnings: string[]}}
 */
function convertCategoriesSheet(rows) {
  const warnings = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      'The "categories" sheet is empty — expected a header row with: id | name'
    );
  }

  const normalize = (cell) => String(cell == null ? "" : cell).trim().toLowerCase().replace(/[\s_]+/g, "");
  const header = rows[0].map(normalize);
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("name");
  if (idIdx === -1 || nameIdx === -1) {
    throw new Error(
      'The "categories" sheet must contain: id | name'
    );
  }

  const categories = [];
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "")) {
      continue;
    }

    const rawId = row[idIdx];
    const id = String(rawId == null ? "" : rawId).trim();
    if (!id) {
      warnings.push(`categories row ${r + 1}: missing id — skipped.`);
      continue;
    }

    const rawName = row[nameIdx];
    const name = String(rawName == null ? "" : rawName).trim() || id;

    const key = id.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`Duplicate category id: ${id} — skipped (first occurrence kept).`);
      continue;
    }
    seen.add(key);

    categories.push({ id, name });
  }

  return { categories, warnings };
}

/**
 * Parse one category sheet (header row: title | image | sizeGB).
 * Returns raw items (no ids yet — the caller assigns them).
 */
function convertCategorySheet(rows) {
  const warnings = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "The sheet is empty — expected a header row with: title | image | sizeGB"
    );
  }

  const normalize = (cell) => String(cell == null ? "" : cell).trim().toLowerCase().replace(/[\s_]+/g, "");
  const header = rows[0].map(normalize);
  const titleIdx = header.indexOf("title");
  const imgIdx = header.indexOf("image");
  const sizeIdx = header.indexOf("sizegb");
  if (titleIdx === -1 || imgIdx === -1 || sizeIdx === -1) {
    throw new Error(
      "Missing required columns. The first row must contain: title | image | sizeGB"
    );
  }

  const items = [];
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "")) {
      continue; // empty row — ignore silently
    }

    const rawImage = row[imgIdx];
    const image = String(rawImage == null ? "" : rawImage).trim();
    if (!image) {
      warnings.push(`Row ${r + 1}: missing image name — skipped.`);
      continue;
    }

    const rawTitle = row[titleIdx];
    const title = String(rawTitle == null ? "" : rawTitle).trim() || image;

    const rawSize = row[sizeIdx];
    if (rawSize === null || rawSize === undefined || String(rawSize).trim() === "") {
      warnings.push(`Row ${r + 1} (${image}): missing size — skipped.`);
      continue;
    }

    const sizeGB = typeof rawSize === "number" ? rawSize : Number(String(rawSize).trim());
    if (!Number.isFinite(sizeGB)) {
      warnings.push(`Row ${r + 1} (${image}): size "${String(rawSize).trim()}" is not a number — skipped.`);
      continue;
    }

    const key = image.toLowerCase(); // file names are case-insensitive on Windows
    if (seen.has(key)) {
      warnings.push(`Duplicate image name: ${image} — skipped (first occurrence kept).`);
      continue;
    }
    seen.add(key);

    if (!/\.jpe?g$/i.test(image)) {
      warnings.push(`${image}: not a .jpg file name — kept, but the app expects JPG files.`);
    }

    items.push({ title, image, sizeGB });
  }

  return { items, warnings };
}

/**
 * Convert a full multi-category workbook into the library shape.
 * @param {object} workbook  output of XLSX.readFile / XLSX.read
 * @returns {{categories: Array, warnings: string[]}}
 */
function convertWorkbook(workbook) {
  const warnings = [];
  const rowsOf = (name) => {
    const ws = workbook.Sheets[name];
    if (!ws) return null;
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  };

  const catRows = rowsOf("categories");
  const catResult = convertCategoriesSheet(catRows);
  warnings.push(...catResult.warnings);
  const categories = catResult.categories;

  const result = [];
  for (const cat of categories) {
    const sheetRows = rowsOf(cat.id);
    if (sheetRows === null) {
      warnings.push(`Category "${cat.id}": no sheet with that name — category skipped.`);
      continue;
    }
    const parsed = convertCategorySheet(sheetRows);
    warnings.push(...parsed.warnings);
    if (parsed.items.length === 0) {
      warnings.push(`Category "${cat.id}": no valid rows — category skipped.`);
      continue;
    }
    result.push({
      id: cat.id,
      name: cat.name,
      items: parsed.items.map((it) => ({ id: `${cat.id}/${it.image}`, title: it.title, image: it.image, sizeGB: it.sizeGB })),
    });
  }

  return { categories: result, warnings };
}

/**
 * Detect whether a workbook uses the new multi-category format.
 */
function isMultiCategoryWorkbook(workbook) {
  return workbook.SheetNames.includes("categories");
}

/**
 * Warn about photo files that are listed in the data but missing on disk
 * under assets/<categoryId>/. Warnings only — the file still converts.
 */
function checkPhotoFiles(categories, rootDir, warnings) {
  const missing = [];
  for (const cat of categories) {
    const dir = path.join(rootDir, "assets", cat.id);
    for (const item of cat.items) {
      if (!fs.existsSync(path.join(dir, item.image))) {
        missing.push(`${cat.id}/${item.image}`);
      }
    }
  }
  if (missing.length > 0) {
    const shown = missing.slice(0, 10);
    for (const m of shown) {
      warnings.push(`Photo file not found: assets/${m}`);
    }
    if (missing.length > shown.length) {
      warnings.push(`… and ${missing.length - shown.length} more missing photo file(s).`);
    }
  }
}

/** CLI entry point. */
function main() {
  const args = process.argv.slice(2);
  let input = path.join(__dirname, "..", "source.xlsx");
  let output = path.join(__dirname, "..", "data.json");

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
      "Create source.xlsx with a 'categories' sheet (id | name) and one sheet per category (title | image | sizeGB)."
    );
    process.exit(1);
  }

  const workbook = XLSX.readFile(input);

  let outputJson;
  if (isMultiCategoryWorkbook(workbook)) {
    let result;
    try {
      result = convertWorkbook(workbook);
    } catch (err) {
      console.error("Conversion failed:", err.message);
      process.exit(1);
    }
    checkPhotoFiles(result.categories, path.join(__dirname, ".."), result.warnings);
    for (const warning of result.warnings) console.warn("warning:", warning);
    if (result.categories.length === 0) {
      console.error("No valid categories found — nothing to write.");
      process.exit(1);
    }
    outputJson = { categories: result.categories };
    const total = result.categories.reduce((n, c) => n + c.items.length, 0);
    fs.writeFileSync(output, JSON.stringify(outputJson, null, 2) + "\n");
    console.log(
      `Wrote ${result.categories.length} categories (${total} items) to ${output}`
    );
  } else {
    // Legacy two-column workbook (image_name | value).
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    let result;
    try {
      result = convertRows(rows);
    } catch (err) {
      console.error("Conversion failed:", err.message);
      process.exit(1);
    }
    for (const warning of result.warnings) console.warn("warning:", warning);
    if (result.items.length === 0) {
      console.error("No valid data rows found — nothing to write.");
      process.exit(1);
    }
    fs.writeFileSync(output, JSON.stringify(result.items, null, 2) + "\n");
    console.log(`Wrote ${result.items.length} legacy entries to ${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { convertRows, convertCategoriesSheet, convertCategorySheet, convertWorkbook, isMultiCategoryWorkbook };
