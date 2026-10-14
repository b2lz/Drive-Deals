"use strict";
// script.js drops any record whose sizeGB is not a positive number, and the
// category counter shows the post-filter total. Find every remaining offender.
//
// Usage: node tools/find-bad-sizes.js

const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data.json"), "utf8"));

let bad = 0;
for (const c of data.categories) {
  const hits = [];
  for (const i of c.items) {
    const s = i.sizeGB;
    const ok = typeof s === "number" && Number.isFinite(s) && s > 0;
    const imgOk = typeof i.image === "string" && i.image.trim().toLowerCase().endsWith(".jpg");
    if (!ok || !imgOk) hits.push({ title: i.title, sizeGB: s, image: i.image, ok, imgOk });
  }
  if (!hits.length) continue;
  console.log(`\n=== ${c.name || c.id} (${c.id}) — ${hits.length} ===`);
  for (const h of hits) {
    console.log(`  ${JSON.stringify(h.title)}`);
    console.log(`     sizeGB=${JSON.stringify(h.sizeGB)}  image=${JSON.stringify(h.image)}`);
    if (!h.ok) console.log("     ✗ بيتشال من الموقع — الحجم مش رقم موجب");
    if (!h.imgOk) console.log("     ✗ بيتشال من الموقع — الصورة مش .jpg");
  }
  bad += hits.length;
}

console.log(`\n${"=".repeat(60)}\n  إجمالي اللي بيتشال: ${bad}`);
