#!/usr/bin/env node
// ============================================================
// Compare local data against the live GitHub Pages site.
//
// Usage:
//   node tools/compare-live.js            -> compares data.json + banner/data.json
//   node tools/compare-live.js --details  -> also compares details/<cat>.json
//
// Reports, per file:
//   - category / item count differences
//   - ids present locally but missing live (and vice versa)
//   - field-level drift for shared ids (title/image/sizeGB/year)
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BASE = "https://b2lz.github.io/Drive-Deals";
const WITH_DETAILS = process.argv.includes("--details");

async function fetchLive(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return JSON.parse(await res.text());
}

function readLocal(rel) {
  const p = path.join(ROOT, rel);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const fmtCount = (n) => n.toLocaleString("en-US");

// ---------- data.json ----------

async function compareData() {
  const [local, live] = await Promise.all([readLocal("data.json"), fetchLive(BASE + "/data.json")]);

  const lc = Object.fromEntries((local.categories || []).map((c) => [c.id, c]));
  const lv = Object.fromEntries((live.categories || []).map((c) => [c.id, c]));

  let localTotal = 0;
  let liveTotal = 0;
  let onlyLocal = 0;
  let onlyLive = 0;
  let fieldDrift = 0;

  console.log("\n=== data.json ===");
  console.log(
    "category".padEnd(24) +
      "local".padStart(8) +
      "live".padStart(8) +
      "Δ".padStart(8)
  );

  const catIds = [...new Set([...Object.keys(lc), ...Object.keys(lv)])];
  for (const catId of catIds) {
    const lItems = lc[catId] ? lc[catId].items : [];
    const vItems = lv[catId] ? lv[catId].items : [];
    localTotal += lItems.length;
    liveTotal += vItems.length;

    const lMap = new Map(lItems.map((i) => [i.id, i]));
    const vMap = new Map(vItems.map((i) => [i.id, i]));

    let oL = 0;
    let oV = 0;
    const drifts = [];

    for (const [id, item] of lMap) {
      if (!vMap.has(id)) {
        oL++;
        continue;
      }
      const vItem = vMap.get(id);
      for (const f of ["title", "image", "sizeGB", "year"]) {
        if (JSON.stringify(item[f]) !== JSON.stringify(vItem[f])) {
          drifts.push({ id, field: f, local: item[f], live: vItem[f] });
        }
      }
    }
    for (const id of vMap.keys()) if (!lMap.has(id)) oV++;

    onlyLocal += oL;
    onlyLive += oV;
    const delta = lItems.length - vItems.length;
    const flag = delta === 0 && oL === 0 && oV === 0 ? "" : "  ⚠";
    console.log(
      catId.padEnd(24) +
        fmtCount(lItems.length).padStart(8) +
        fmtCount(vItems.length).padStart(8) +
        (delta > 0 ? "+" : "") + String(delta).padStart(7) + flag
    );

    if (oL || oV || drifts.length) {
      if (oL || oV) console.log(`   • only local: ${oL}   only live: ${oV}`);
      for (const d of drifts.slice(0, 20)) {
        console.log(
          `   • drift [${d.id}] ${d.field}: local=${JSON.stringify(d.local)} live=${JSON.stringify(d.live)}`
        );
      }
      if (drifts.length > 20) console.log(`   … and ${drifts.length - 20} more field drifts`);
    }
  }

  fieldDrift = 0; // recomputed below if needed
  console.log(
    `\nTotals: local=${fmtCount(localTotal)}  live=${fmtCount(liveTotal)}  ` +
      `only-local=${onlyLocal}  only-live=${onlyLive}`
  );
  return { ok: onlyLocal === 0 && onlyLive === 0 };
}

// ---------- banner/data.json ----------

async function compareBanner() {
  const [local, live] = await Promise.all([readLocal("banner/data.json"), fetchLive(BASE + "/banner/data.json")]);
  const lItems = Array.isArray(local) ? local : local.items || [];
  const vItems = Array.isArray(live) ? live : live.items || [];

  console.log("\n=== banner/data.json ===");
  console.log(`local=${lItems.length}  live=${vItems.length}`);

  if (JSON.stringify(lItems) === JSON.stringify(vItems)) {
    console.log("identical ✔");
    return;
  }

  const lIds = new Set(lItems.map((i) => i.id || i.image));
  const vIds = new Set(vItems.map((i) => i.id || i.image));
  for (const id of lIds) if (!vIds.has(id)) console.log(`   only local: ${id}`);
  for (const id of vIds) if (!lIds.has(id)) console.log(`   only live: ${id}`);

  const vMap = new Map(vItems.map((i) => [i.id || i.image, i]));
  for (const item of lItems) {
    const key = item.id || item.image;
    const vItem = vMap.get(key);
    if (!vItem) continue;
    for (const f of Object.keys(item)) {
      if (JSON.stringify(item[f]) !== JSON.stringify(vItem[f])) {
        console.log(`   drift [${key}] ${f}: local=${JSON.stringify(item[f])} live=${JSON.stringify(vItem[f])}`);
      }
    }
  }
}

// ---------- details/<cat>.json ----------

async function compareDetails() {
  const dir = path.join(ROOT, "details");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.includes("backup"));

  console.log("\n=== details/*.json ===");
  for (const file of files) {
    try {
      const local = readLocal(path.join("details", file));
      const live = await fetchLive(`${BASE}/details/${file}`);
      const lKeys = new Set(Object.keys(local));
      const vKeys = new Set(Object.keys(live));

      let diffEntries = 0;
      for (const k of lKeys) {
        if (!vKeys.has(k)) continue;
        if (JSON.stringify(local[k]) !== JSON.stringify(live[k])) diffEntries++;
      }
      const onlyL = [...lKeys].filter((k) => !vKeys.has(k));
      const onlyV = [...vKeys].filter((k) => !lKeys.has(k));

      if (!onlyL.length && !onlyV.length && !diffEntries) {
        console.log(`  ${file}: identical (${fmtCount(lKeys.size)} entries) ✔`);
      } else {
        console.log(
          `  ${file}: local=${fmtCount(lKeys.size)} live=${fmtCount(vKeys.size)} ` +
            `only-local=${onlyL.length} only-live=${onlyV.length} changed=${diffEntries}`
        );
        for (const k of onlyL.slice(0, 10)) console.log(`     only local: ${k}`);
        for (const k of onlyV.slice(0, 10)) console.log(`     only live:  ${k}`);
        if (onlyL.length > 10) console.log(`     … +${onlyL.length - 10} more only-local`);
        if (onlyV.length > 10) console.log(`     … +${onlyV.length - 10} more only-live`);
      }
    } catch (e) {
      if (e.message && e.message.includes("HTTP 404")) {
        console.log(`  ${file}: NOT DEPLOYED live (404)`);
      } else {
        console.log(`  ${file}: ERROR ${e.message}`);
      }
    }
  }
}

(async () => {
  const t0 = Date.now();
  try {
    await compareData();
    await compareBanner();
    if (WITH_DETAILS) await compareDetails();
    console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s — live base: ${BASE}`);
  } catch (e) {
    console.error("FATAL:", e.message);
    process.exit(1);
  }
})();
