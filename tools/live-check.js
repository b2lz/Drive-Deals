"use strict";
// Drive the live GitHub Pages site across all four page shapes. Item ids come
// from data.json so a title with an unusual space still resolves.
//
// Usage: node tools/live-check.js

const path = require("path");

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "https://b2lz.github.io/Drive-Deals";
const LIB = require("puppeteer-core");

(async () => {
  const fs = require("fs");
  const ROOT = path.resolve(__dirname, "..");
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  // Fall back to the first item when a title does not match, so the sweep
  // always covers every category instead of throwing on a renamed folder.
  const pick = (cat, re) => {
    const items = data.categories.find((c) => c.id === cat).items;
    const hit = items.find((i) => re.test(i.title)) || items[0];
    return hit.id;
  };

  const SAMPLES = [
    ["فيلم عربي",  pick("arabic-films", /^11\.11$/)],
    ["فيلم أجنبي", pick("foreign-films", /^Oppenheimer/)],
    ["مسلسل كوري", pick("korean-series", /^Goblin/)],
    ["أنمي",       pick("anime", /^3 Gatsuno/)],
    ["كرتون",      pick("cartoon-films", /^Aladdin/)],
    ["لعبة",       pick("games", /^Alan Wake/)],
  ];

  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  console.log("=== المكتبة ===");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const lib = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent.trim(),
    cards: document.querySelectorAll(".card, [data-id]").length,
    links: document.querySelectorAll('a[href*="item.html"]').length,
  }));
  console.log(`  h1=${lib.h1}  cards=${lib.cards}  detailLinks=${lib.links}`);

  for (const [label, id] of SAMPLES) {
    console.log(`\n=== ${label}  —  ${id} ===`);
    await page.goto(`${BASE}/item.html#id=${encodeURIComponent(id)}`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    const info = await page.evaluate(() => {
      const dl = document.querySelector("#item-facts");
      const facts = [];
      if (dl) {
        const dts = [...dl.querySelectorAll("dt")];
        const dds = [...dl.querySelectorAll("dd")];
        dts.forEach((dt, i) => {
          const v = (dds[i]?.textContent || "").trim();
          if (v) facts.push([dt.textContent.trim(), v]);
        });
      }
      return {
        h1: document.querySelector("h1")?.textContent.trim(),
        summary: (document.querySelector("#item-summary")?.textContent || "").trim(),
        facts,
        reqs: [...document.querySelectorAll(".item-req-card")].map((c) => ({
          t: c.querySelector(".item-req-title")?.textContent.trim(),
          rows: c.querySelectorAll(".item-req-list > *").length,
        })),
      };
    });

    console.log(`  العنوان: ${info.h1 || "(فاضي)"}`);
    console.log(`  ملخص  : ${info.summary.slice(0, 95) || "(فاضي)"}`);
    for (const [k, v] of info.facts) console.log(`      ${k.padEnd(16)} ${v.slice(0, 58)}`);
    for (const r of info.reqs) console.log(`      [مواصفات] ${r.t} — ${r.rows} صف`);
  }

  console.log(`\n=== أخطاء الكونسول: ${errors.length} ===`);
  for (const e of errors.slice(0, 6)) console.log("  " + e.slice(0, 120));
  await browser.close();
})();
