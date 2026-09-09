#!/usr/bin/env node
// ============================================================
// Tests for tools/excel-to-json.js (runs in Node).
// Usage: npm run test:excel   (or: node tools/test-excel-to-json.js)
//
// Covers:
//   - multi-category format (categories sheet + one sheet per category)
//   - row validation, empty rows, numeric coercion, duplicates,
//     non-jpg warnings, missing columns
//   - legacy two-column format (image_name | value) still converts
//   - full CLI round-trips with real files (new + legacy)
// ============================================================

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const XLSX = require("xlsx");
const {
  convertRows,
  convertCategoriesSheet,
  convertCategorySheet,
  convertWorkbook,
  isMultiCategoryWorkbook,
} = require("./excel-to-json.js");

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

function sheetFromAoa(aoa) {
  return XLSX.utils.aoa_to_sheet(aoa);
}

function workbookFromSheets(namedSheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of namedSheets) {
    XLSX.utils.book_append_sheet(wb, sheetFromAoa(aoa), name);
  }
  return wb;
}

(async () => {
  /* ---------- Unit: legacy convertRows (unchanged contract) ---------- */

  const rows = [
    ["image_name", "value"],
    ["001.jpg", 10], // valid
    ["002.jpg", "25"], // number stored as text — accepted
    [], // empty row — ignored silently
    ["003.jpg", null], // missing value — warn + skip
    [null, null], // fully empty row — ignored silently
    ["001.jpg", 99], // duplicate name — warn + skip (first wins)
    ["bad.txt", 5], // non-jpg — warn but kept
    ["004.jpg", "abc"], // non-numeric value — warn + skip
  ];

  const { items, warnings } = convertRows(rows);
  assert(items.length === 3, "legacy: only valid rows become entries");
  assert(
    JSON.stringify(items) ===
      JSON.stringify([
        { image: "001.jpg", value: 10 },
        { image: "002.jpg", value: 25 },
        { image: "bad.txt", value: 5 },
      ]),
    "legacy: entries keep order; text numbers are converted"
  );
  assert(warnings.some((w) => w.includes("missing value")), "legacy: missing value warns");
  assert(warnings.some((w) => w.includes("not a number")), "legacy: non-numeric value warns");
  assert(warnings.some((w) => /duplicate/i.test(w)), "legacy: duplicate image name warns");
  assert(
    warnings.some((w) => w.includes("bad.txt") && w.includes(".jpg")),
    "legacy: non-jpg file name warns"
  );

  let threw = false;
  try {
    convertRows([["name", "value"], ["a.jpg", 1]]);
  } catch (err) {
    threw = /image_name/.test(err.message);
  }
  assert(threw, "legacy: missing image_name column throws a clear error");

  /* ---------- Unit: categories sheet parsing ---------- */

  const catRows = [
    ["id", "name"],
    ["arabic-films", "أفلام عربي"],
    [], // empty row — ignored
    ["anime", null], // missing name — falls back to id
    ["anime", "أنمي"], // duplicate id — warn + skip
    ["", "بدون"], // missing id — warn + skip
  ];
  const { categories: cats, warnings: catWarnings } = convertCategoriesSheet(catRows);
  assert(
    JSON.stringify(cats) ===
      JSON.stringify([
        { id: "arabic-films", name: "أفلام عربي" },
        { id: "anime", name: "anime" },
      ]),
    "categories: valid rows keep order; empty/missing/duplicates handled"
  );
  assert(catWarnings.length === 2, "categories: missing id + duplicate id warn");

  let threwCat = false;
  try {
    convertCategoriesSheet([["name"], ["a"]]);
  } catch (err) {
    threwCat = /id\s*\|\s*name/.test(err.message);
  }
  assert(threwCat, "categories: missing id|name columns throws a clear error");

  /* ---------- Unit: category item sheet parsing ---------- */

  const itemRows = [
    ["title", "image", "sizeGB"],
    ["فيلم أ", "001.jpg", 8], // valid
    [null, "002.jpg", "12.5"], // missing title — falls back to image name; text size ok
    ["فيلم ج", "", 7], // missing image — warn + skip
    ["فيلم د", "003.jpg", null], // missing size — warn + skip
    [], // empty row — ignored silently
    ["مكرر", "001.jpg", 99], // duplicate image — warn + skip (first wins)
    ["وثيقة", "doc.txt", 5], // non-jpg — warn but kept
    ["سج", "004.jpg", "abc"], // non-numeric size — warn + skip
  ];
  const parsed = convertCategorySheet(itemRows);
  assert(parsed.items.length === 3, "items: only valid rows become entries");
  assert(
    JSON.stringify(parsed.items) ===
      JSON.stringify([
        { title: "فيلم أ", image: "001.jpg", sizeGB: 8 },
        { title: "002.jpg", image: "002.jpg", sizeGB: 12.5 },
        { title: "وثيقة", image: "doc.txt", sizeGB: 5 },
      ]),
    "items: keep order; missing title falls back to image; text sizes convert"
  );
  assert(parsed.warnings.some((w) => w.includes("missing image")), "items: missing image warns");
  assert(parsed.warnings.some((w) => w.includes("missing size")), "items: missing size warns");
  assert(parsed.warnings.some((w) => /duplicate/i.test(w)), "items: duplicate image warns");
  assert(parsed.warnings.some((w) => w.includes("doc.txt") && w.includes(".jpg")), "items: non-jpg file name warns");

  let threwItem = false;
  try {
    convertCategorySheet([["name", "image", "sizeGB"], ["a", "a.jpg", 1]]);
  } catch (err) {
    threwItem = /title\s*\|\s*image\s*\|\s*sizeGB/.test(err.message);
  }
  assert(threwItem, "items: missing title|image|sizeGB columns throws a clear error");

  /* ---------- Unit: convertWorkbook (in-memory) ---------- */

  const wb = workbookFromSheets([
    ["categories", [["id", "name"], ["alpha", "ألفا"], ["beta", "بيتا"], ["gamma", "غيم"]]],
    ["alpha", [["title", "image", "sizeGB"], ["أ1", "001.jpg", 8], ["أ2", "002.jpg", 9]]],
    ["beta", [["title", "image", "sizeGB"], ["ب1", "001.jpg", 4]]],
    // "gamma" has no sheet — must warn + skip
  ]);
  const converted = convertWorkbook(wb);
  assert(
    JSON.stringify(converted.categories) ===
      JSON.stringify([
        {
          id: "alpha",
          name: "ألفا",
          items: [
            { id: "alpha/001.jpg", title: "أ1", image: "001.jpg", sizeGB: 8 },
            { id: "alpha/002.jpg", title: "أ2", image: "002.jpg", sizeGB: 9 },
          ],
        },
        {
          id: "beta",
          name: "بيتا",
          items: [{ id: "beta/001.jpg", title: "ب1", image: "001.jpg", sizeGB: 4 }],
        },
      ]),
    "workbook: categories keep order; ids are category-prefixed; sheet-less category skipped"
  );
  assert(converted.warnings.some((w) => w.includes("gamma") && w.includes("no sheet")), "workbook: missing category sheet warns");
  assert(isMultiCategoryWorkbook(wb), "workbook: categories sheet detected");

  /* ---------- End-to-end: NEW format CLI round-trip (full data) ---------- */

  const root = path.join(__dirname, "..");
  const original = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel-test-"));
  const inXlsx = path.join(tmpDir, "in.xlsx");
  const outJson = path.join(tmpDir, "out.json");

  const wbFull = workbookFromSheets([
    ["categories", [["id", "name"], ...original.categories.map((c) => [c.id, c.name])]],
  ]);
  for (const cat of original.categories) {
    const aoa = [["title", "image", "sizeGB"], ...cat.items.map((i) => [i.title, i.image, i.sizeGB])];
    XLSX.utils.book_append_sheet(wbFull, sheetFromAoa(aoa), cat.id);
  }
  XLSX.writeFile(wbFull, inXlsx);

  execFileSync(process.execPath, [path.join(__dirname, "excel-to-json.js"), inXlsx, "-o", outJson], {
    stdio: "pipe",
  });

  const convertedFull = JSON.parse(fs.readFileSync(outJson, "utf8"));
  assert(
    JSON.stringify(convertedFull) === JSON.stringify(original),
    `CLI round-trip (new format) reproduces all ${original.categories.length} categories and ${original.categories.reduce((n, c) => n + c.items.length, 0)} items exactly`
  );

  /* ---------- End-to-end: LEGACY format CLI round-trip ---------- */

  const legacyOriginal = JSON.parse(fs.readFileSync(path.join(root, "data-legacy.json"), "utf8"));
  const legacyXlsx = path.join(tmpDir, "legacy.xlsx");
  const legacyOut = path.join(tmpDir, "legacy.json");

  const wbLegacy = workbookFromSheets([
    ["images", [["image_name", "value"], ...legacyOriginal.map((i) => [i.image, i.value])]],
  ]);
  XLSX.writeFile(wbLegacy, legacyXlsx);

  execFileSync(process.execPath, [path.join(__dirname, "excel-to-json.js"), legacyXlsx, "-o", legacyOut], {
    stdio: "pipe",
  });

  const legacyConverted = JSON.parse(fs.readFileSync(legacyOut, "utf8"));
  assert(
    JSON.stringify(legacyConverted) === JSON.stringify(legacyOriginal),
    `CLI round-trip (legacy format) reproduces all ${legacyOriginal.length} entries exactly`
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("\nALL EXCEL-TO-JSON TESTS PASSED");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
