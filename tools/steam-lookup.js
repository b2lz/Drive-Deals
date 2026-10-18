"use strict";
// ============================================================
// Look up the real store data for a list of titles.
//
// Searches the Steam catalogue, then pulls appdetails for the best match:
// release date, developer, publisher, genres and the official PC minimum /
// recommended requirements. Prints a report to fill in by hand — it never
// writes details/games.json on its own.
//
// Usage:
//   node tools/steam-lookup.js "Atomfall" "ZERO PARADES" ...
//   node tools/steam-lookup.js --from-data        (the items lacking details)
// ============================================================

const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "data.json");
const DETAILS = path.join(__dirname, "..", "details", "games.json");

/** Normalise a title the way the store does, so "!" and spacing do not matter. */
const key = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

async function json(url) {
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Score a candidate: exact normalised title beats a prefix beats a substring. */
function score(query, candidate) {
  const a = key(query);
  const b = key(candidate);
  if (a === b) return 3;
  if (b.startsWith(a) || a.startsWith(b)) return 2;
  if (b.includes(a)) return 1;
  return 0;
}

async function search(term) {
  const url =
    "https://store.steampowered.com/api/storesearch/?term=" +
    encodeURIComponent(term) +
    "&l=english&cc=us";
  const data = await json(url);
  return data.items || [];
}

async function details(appid) {
  const url =
    "https://store.steampowered.com/api/appdetails?appids=" + appid + "&l=english&cc=us";
  const data = await json(url);
  const entry = data[appid];
  if (!entry || !entry.success) return null;
  return entry.data;
}

/** Steam ships requirements as an HTML blob; flatten it to the site's shape. */
function cleanRequirements(html) {
  if (!html || typeof html !== "string") return null;
  const strip = (s) =>
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

  const out = {};
  for (const tier of ["minimum", "recommended"]) {
    const block = html[tier];
    if (!block) continue;
    const rows = [];
    // Each requirement is one <li>, with the field name in <strong>.
    for (const li of block.match(/<li>([\s\S]*?)<\/li>/gi) || []) {
      const strong = li.match(/<strong>([\s\S]*?)<\/strong>/i);
      if (!strong) continue; // a bare note such as "Requires a 64-bit processor"
      const label = strip(strong[1]).replace(/:\s*$/, "");
      const value = strip(li.replace(/<strong>[\s\S]*?<\/strong>/i, ""));
      if (label && value) rows.push([label, value]);
    }
    if (rows.length) out[tier] = rows;
  }
  return Object.keys(out).length ? out : null;
}

(async () => {
  let titles = process.argv.slice(2);

  if (titles.includes("--from-data")) {
    const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
    const have = JSON.parse(fs.readFileSync(DETAILS, "utf8")).items;
    const games = data.categories.find((c) => c.id === "games");
    titles = games.items.filter((i) => !have[i.id]).map((i) => i.title);
    console.log(`  عناصر بلا تفاصيل: ${titles.length}\n`);
  }

  for (const title of titles) {
    process.stdout.write(`\n=== ${title} ===\n`);
    let candidates = [];
    try {
      candidates = await search(title);
    } catch (err) {
      console.log(`  بحث فشل: ${err.message}`);
      continue;
    }
    if (!candidates.length) {
      console.log("  مفيش نتيجة في المتجر");
      continue;
    }
    candidates.sort((a, b) => score(title, b.name) - score(title, a.name));
    const best = candidates[0];
    const s = score(title, best.name);
    console.log(`  أفضل تطابق: ${best.name}  (appid ${best.id}, ثقة ${s}/3)`);
    if (s === 0) console.log("  ⚠ التطابق ضعيف — راجعه بنفسك");

    try {
      const d = await details(best.id);
      if (!d) {
        console.log("  تفاصيل غير متاحة");
        continue;
      }
      console.log(`  الاسم الرسمي : ${d.name}`);
      console.log(`  الإصدار      : ${d.release_date?.date || "—"}  (${d.release_date?.coming_soon ? "قادمة" : "صدرت"})`);
      console.log(`  المطور       : ${(d.developers || []).join(", ") || "—"}`);
      console.log(`  الناشر       : ${d.publishers?.join(", ") || "—"}`);
      console.log(`  التصنيفات    : ${(d.genres || []).map((g) => g.description).join(", ") || "—"}`);
      const plats = Object.entries(d.platforms || {})
        .filter(([, on]) => on)
        .map(([k]) => k);
      console.log(`  المنصات     : ${plats.join(", ") || "—"}`);
      const req = cleanRequirements(d.pc_requirements);
      console.log("  المتطلبات:");
      for (const [tier, rows] of Object.entries(req || {})) {
        console.log(`    ${tier}:`);
        for (const [label, value] of rows) console.log(`      ${label.padEnd(12)} ${value}`);
      }
      console.log(`  الرابط       : https://store.steampowered.com/app/${best.id}/`);
      if (d.short_description) console.log(`  وصف المتجر   : ${d.short_description}`);
    } catch (err) {
      console.log(`  تفاصيل فشلت: ${err.message}`);
    }
  }
})();