"use strict";
// Deep audit of the games category only.
//
// "Has a record" is not the same as "is complete". A record can exist with
// empty strings, an empty requirements object, a _miss flag, or a title that
// does not match its folder. This checks every field the item page renders,
// so a game that looks filled in the gap report can still turn out empty.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const details = JSON.parse(fs.readFileSync(path.join(ROOT, "details", "games.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");

// The same fields item.js renders for a game.
const CHECKS = [
  ["summary", (r) => nonempty(r.summaryAr) || nonempty(r.summaryEn)],
  ["genres", (r) => Array.isArray(r.genres) && r.genres.length && r.genres.some(nonempty)],
  ["developer", (r) => nonempty(r.developer)],
  ["publisher", (r) => nonempty(r.publisher)],
  ["releaseDate", (r) => nonempty(r.releaseDate) && r.releaseDate !== "unknown"],
  [
    "requirements",
    (r) =>
      r.requirements &&
      [r.requirements.minimum, r.requirements.recommended].some(
        (s) => s && Object.values(s).some(nonempty),
      ),
  ],
  ["platforms", (r) => Array.isArray(r.platforms) && r.platforms.length],
  ["type", (r) => nonempty(r.type)],
];

function nonempty(v) {
  return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
}

const rows = [];
const noRecord = [];
let missFlag = 0;

for (const item of cat.items) {
  const rec = details.items[item.id];
  if (!rec) {
    noRecord.push(item.title);
    continue;
  }
  if (rec._miss) {
    missFlag++;
    rows.push({ title: item.title, missing: ["_miss (محاولة فاشلة)"] });
    continue;
  }
  const missing = CHECKS.filter(([, fn]) => !fn(rec)).map(([name]) => name);
  if (missing.length) rows.push({ title: item.title, missing });
}

console.log("=".repeat(80));
console.log("  مراجعة شاملة للألعاب");
console.log("=".repeat(80));
console.log(`  إجمالي الألعاب        : ${cat.items.length}`);
console.log(`  بدون سجل خالص          : ${noRecord.length}`);
console.log(`  معلّم كفشل (_miss)     : ${missFlag}`);
console.log(`  ناقصة حقل واحد على الأقل: ${rows.length}`);
console.log(`  كاملة 100%             : ${cat.items.length - rows.length - noRecord.length}`);

if (noRecord.length) {
  console.log(`\n  بدون سجل:`);
  for (const t of noRecord) console.log(`     ${t}`);
}

if (rows.length) {
  const byField = new Map();
  for (const r of rows) for (const f of r.missing) byField.set(f, (byField.get(f) || 0) + 1);
  console.log(`\n  عدد الناقص لكل حقل:`);
  for (const [f, n] of [...byField].sort((a, b) => b[1] - a[1])) console.log(`     ${f.padEnd(14)} ${n}`);

  console.log(`\n  القوائم الكاملة:`);
  for (const r of rows.sort((a, b) => b.missing.length - a.missing.length)) {
    console.log(`     ${r.title.padEnd(56)} ${r.missing.join("، ")}`);
  }
}

// Second-order checks: records that exist but whose own bookkeeping is wrong.
const staleFlag = [];
const vagueSpec = [];
for (const item of cat.items) {
  const rec = details.items[item.id];
  if (!rec || rec._miss) continue;
  if (rec.needsRequirements && rec.requirements) staleFlag.push(item.title);
  if (rec.requirements) {
    const vals = [rec.requirements.minimum, rec.requirements.recommended]
      .filter(Boolean)
      .flatMap((s) => Object.values(s));
    // Requirements whose every value is a placeholder like "—" or prose.
    if (vals.length && vals.every((v) => !nonempty(v) || v === "—" || v === "—")) {
      vagueSpec.push(item.title);
    }
  }
}
if (staleFlag.length) {
  console.log(`\n  needsRequirements مع وجود requirements (${staleFlag.length}):`);
  for (const t of staleFlag) console.log(`     ${t}`);
}
if (vagueSpec.length) {
  console.log(`\n  مواصفات بلا قيم حقيقية (${vagueSpec.length}):`);
  for (const t of vagueSpec) console.log(`     ${t}`);
}