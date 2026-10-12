"use strict";
// Regression tests for the Steam system-requirements parser.
//
// The parser's job is to turn one HTML blob per preset into the keyed
// rows item.js renders. These cases are all real Steam output shapes,
// including the Arabic store pages that pack several fields onto a
// single line.
//
// Usage: node tools/test-requirements.js

const { parsePreset, parseRequirements } = require("./lib/requirements");

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}`);
    console.log(`        expected ${e}`);
    console.log(`        actual   ${a}`);
  }
}

// --- English store page, one label per line -------------------------
check(
  "english labelled rows",
  parsePreset(
    "<p><strong>Minimum:</strong>Requires a 64-bit processor and operating system</p>" +
      "<p><strong>OS: </strong>Windows 10/11, 64-bit<br></p>" +
      "<p><strong>Processor: </strong>Intel Core i5-9400 / AMD Ryzen 5 2600<br></p>" +
      "<p><strong>Memory: </strong>12 GB RAM<br></p>" +
      "<p><strong>Graphics: </strong>NVIDIA GeForce GTX 1660 6GB<br></p>" +
      "<p><strong>Storage: </strong>90 GB available space<br></p>",
  ),
  {
    os: "Windows 10/11, 64-bit",
    cpu: "Intel Core i5-9400 / AMD Ryzen 5 2600",
    ram: "12 GB RAM",
    gpu: "NVIDIA GeForce GTX 1660 6GB",
    storage: "90 GB available space",
  },
);

// --- Arabic store page: several fields crammed onto one line ---------
check(
  "arabic inline labels are split out",
  parsePreset(
    [
      "<p><strong>الحد الأدنى: </strong>يتطلب معالجًا ونظام تشغيل بقدرة 64 بت</p>",
      "<p><strong>نظام التشغيل: </strong>MICROSOFT WINDOWS 10/11, 64-BIT<br></p>",
      "<p><strong>كارت الشاشة: </strong>NVIDIA GTX 1660، مساحة التخزين: مساحة متوفرة قدرها 80 GB. متطلبات إضافية: SSD required<br></p>",
      "<p><strong>مساحة التخزين: </strong>80 GB available space<br></p>",
      "<p><strong>ملاحظات: </strong>يتطلب متصفح ونظام تشغيل يدعم بقدرة 64 بت<br></p>",
    ].join(""),
  ),
  {
    os: "MICROSOFT WINDOWS 10/11, 64-BIT",
    gpu: "NVIDIA GTX 1660",
    storage: "مساحة متوفرة قدرها 80 GB",
    note: "SSD required / يتطلب متصفح ونظام تشغيل يدعم بقدرة 64 بت",
  },
);

// --- No labels at all: positional fallback ---------------------------
check(
  "unlabelled rows fall back to Steam's fixed order",
  parsePreset(
    "<p><strong>Minimum:</strong></p>" +
      "<p>Requires 64-bit OS and processor</p>" +
      "<p>Windows 7/8/10 64-bit</p>" +
      "<p>Intel Core 2 Duo E8400 3.0GHz or equivalent</p>" +
      "<p>2 GB RAM</p>" +
      "<p>DirectX 9.0c</p>" +
      "<p>NVIDIA GeForce 9800 GT / ATI Radeon HD 5770</p>" +
      "<p>1.5 GB available space</p>",
  ),
  {
    os: "Windows 7/8/10 64-bit",
    cpu: "Intel Core 2 Duo E8400 3.0GHz or equivalent",
    ram: "2 GB RAM",
    directx: "DirectX 9.0c",
    gpu: "NVIDIA GeForce 9800 GT / ATI Radeon HD 5770",
    storage: "1.5 GB available space",
  },
);

// --- Nothing at all -------------------------------------------------
check("empty blob", parsePreset(""), null);
check("null blob", parsePreset(null), null);

// --- Arabic wins per field, English is the fallback ------------------
check(
  "arabic is preferred field by field",
  parseRequirements(
    // english minimum
    "<p><strong>OS: </strong>Windows 10<br></p><p><strong>Memory: </strong>8 GB RAM<br></p>",
    null,
    // arabic minimum
    "<p><strong>نظام التشغيل: </strong>ويندوز 10<br></p><p><strong>الذاكرة: </strong>ذاكرة 8 GB<br></p>",
    null,
  ),
  { minimum: { os: "ويندوز 10", ram: "ذاكرة 8 GB" }, recommended: null },
);

// --- A preset Steam does not publish stays null ----------------------
// item.js skips a null preset, so an unpublished "recommended" simply
// does not render a second card.
check(
  "missing recommended stays null",
  parseRequirements("<p><strong>OS: </strong>Windows 10<br></p>", null, null, null),
  { minimum: { os: "Windows 10" }, recommended: null },
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;