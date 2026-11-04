"use strict";
// Fill the missing "المصادر" (links) on detail records.
//
// Some records were catalogued without any source link. This tool adds a
// Wikipedia source for each such record, but only after verifying the page
// exists (HTTP 200), so no dead links are ever published.
//
// Resolution order per record:
//   1. Direct URL built from canonicalTitle / cleaned title.
//   2. Wikipedia search API with the title.
//   3. Wikipedia search API with "<title> video game" (disambiguates titles
//      that collide with non-game articles, e.g. "Invincible").
// A candidate page is accepted only when its tokens overlap the query well
// enough (score >= 0.6); ties fall back to Wikipedia's own relevance order.
//
// Records that cannot be resolved are left untouched and listed at the end
// for manual review. Writes a backup before touching details/games.json.
//
// Usage: node tools/fill-missing-links.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "details", "games.json");
const UA = "DriveDeals-source-check/1.0 (contact: owner of this site)";
const API = "https://en.wikipedia.org/w/api.php";

const doc = JSON.parse(fs.readFileSync(TARGET, "utf8"));

// ---------------------------------------------------------------- helpers

function cleanTitle(t) {
  return String(t || "")
    .replace(/\s*\[[^\]]*\]/g, " ") // [HV], [2003] ...
    .replace(/\{[^}]*\}/g, " ") // leftover {HV{ ...
    .replace(/\d+(\.\d+)?\s*(GB|MB|GBD)/gi, " ") // 1.2GB, 87GB_3 ...
    .replace(/\b\d{1,2}\.\d+\b/g, " ") // stray size leftovers like "3.96"
    .replace(/\b(GB|MB|GBD)\b/gi, " ") // bare units left behind
    .replace(/_\d+\b/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(t) {
  return new Set(
    norm(t)
      .split(" ")
      .filter((x) => x && !/^(19|20)\d{2}$/.test(x) && x !== "video" && x !== "game")
  );
}

function score(query, page) {
  const qT = tokens(query);
  const pT = tokens(page);
  if (!qT.size || !pT.size) return 0;
  let inter = 0;
  for (const t of qT) if (pT.has(t)) inter++;
  const base = inter / Math.max(qT.size, pT.size);
  // Prefer game-specific articles when the query is a bare name.
  const boost = /video game/i.test(page) ? (/video game/i.test(query) ? 0.15 : 0.1) : 0;
  return Math.min(1, base + boost);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function headStatus(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "user-agent": UA } });
    return r.status;
  } catch {
    return 0;
  }
}

function wikiUrl(title) {
  return "https://en.wikipedia.org/wiki/" + title.replace(/ /g, "_");
}

async function fetchJson(u) {
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA } });
      if (!r.ok) {
        lastErr = new Error(`HTTP ${r.status}`);
        // Wikipedia rate limit: wait a proper while before retrying.
        if (r.status === 429) await sleep(5000 * (attempt + 1));
      } else {
        return await r.json();
      }
    } catch (e) {
      lastErr = e;
    }
    if (!/429/.test(String(lastErr))) await sleep(800 * 2 ** attempt);
  }
  throw lastErr || new Error("fetch failed");
}

async function searchWiki(query) {
  const u = `${API}?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&srlimit=8&format=json&formatversion=2`;
  return (await fetchJson(u)).query.search || [];
}

// A page is eligible when the score is high enough, or when one side's
// tokens are fully contained in the other's (query ⊆ page = the article is
// a more specific match; page ⊆ query = the article covers the base game).
function eligible(query, page) {
  const qT = tokens(query);
  const pT = tokens(page);
  if (!qT.size || !pT.size) return false;
  if (score(query, page) >= 0.6) return true;
  if (qT.size < 2) {
    // Single-token titles are ambiguous ("HULK", "INVINCIBLE"): only an
    // exact core-name match on a video-game article is safe.
    return (
      /video game/i.test(page) &&
      qT.size === pT.size &&
      [...qT].every((t) => pT.has(t))
    );
  }
  const qInP = [...qT].every((t) => pT.has(t));
  const pInQ = [...pT].every((t) => qT.has(t)) && pT.size >= 3;
  return qInP || pInQ;
}

async function resolveWikipedia(title, debug) {
  // 1. direct URL from the title itself — but only for multi-token titles:
  //    a bare name can case-redirect into an unrelated same-name article.
  if (tokens(title).size >= 2) {
    const direct = wikiUrl(title);
    if ((await headStatus(direct)) === 200) return { title, url: direct };
  }

  // 2./3. search API (plain, then "… video game" for disambiguation)
  const candidates = [];
  for (const q of [title, `${title} video game`]) {
    const hits = await searchWiki(q);
    hits.forEach((h) => candidates.push({ query: q, ...h, order: candidates.length }));
    await sleep(150);
  }
  const ranked = candidates
    .filter((c) => eligible(c.query, c.title))
    .map((c) => ({ ...c, rank: score(c.query, c.title) }))
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        a.title.length - b.title.length || // shorter = less over-specific
        a.order - b.order
    );
  if (debug && candidates.length) {
    console.log(
      `      candidates: ${candidates
        .slice(0, 4)
        .map((c) => `${c.title} (${score(c.query, c.title).toFixed(2)})`)
        .join(" | ")}`
    );
  }
  for (const c of ranked) {
    const url = wikiUrl(c.title);
    if ((await headStatus(url)) === 200) return { title: c.title, url };
  }
  return null;
}

// ------------------------------------------------------------------- main

async function main() {
  const missing = Object.entries(doc.items).filter(
    ([id, r]) => r && !r._miss && (!r.links || !r.links.length)
  );

  console.log(`سجلات بدون مصادر: ${missing.length}\n`);

  let added = 0;
  const unresolved = [];
  for (let i = 0; i < missing.length; i++) {
    const [id, rec] = missing[i];
    const want = cleanTitle(rec.canonicalTitle || rec.title) || cleanTitle(rec.title);
    let res = null;
    try {
      res = await resolveWikipedia(want, true);
    } catch (e) {
      console.log(`  ! ${rec.title} — خطأ: ${e.message}`);
    }
    if (!res) {
      unresolved.push(rec.title || id);
      console.log(`  ✗ ${rec.title} — ما لقيت صفحة موثقة`);
      continue;
    }
    rec.links = [{ label: "Wikipedia", url: res.url }];
    added++;
    console.log(`  ✔ ${rec.title}  ←  ${res.title}`);
    if (i < missing.length - 1) await sleep(600); // stay polite to the API
  }

  if (added) {
    const stamp = new Date().toISOString().slice(0, 10);
    const backup = `${TARGET}.backup-links-${stamp}`;
    fs.copyFileSync(TARGET, backup);
    doc._meta.updatedAt = stamp;
    fs.writeFileSync(TARGET, JSON.stringify(doc, null, 2) + "\n");
    console.log(`\n  نسخة احتياطية: ${path.basename(backup)}`);
  }

  console.log(`\n  اتضاف مصادر: ${added} من ${missing.length}`);
  if (unresolved.length) {
    console.log(`  بلا مصدر (${unresolved.length}):`);
    unresolved.forEach((t) => console.log(`    - ${t}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
