"use strict";
// Visual check: what does an anime page actually show, given that anime
// records carry `studios`/`creators` rather than `director`/`cast`?
//
// Usage: node tools/render-anime-check.js

const path = require("path");

const PUPPETEER = "C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

const SAMPLES = [
  "3 Gatsuno Lion.jpg",   // has canonicalTitle fix, no director, no cast
  "91Days.jpg",
  "Ajin.jpg",
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  for (const file of SAMPLES) {
    await page.goto(`${BASE}/item.html#id=${encodeURIComponent("anime/" + file)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1200));

    const info = await page.evaluate(() => {
      // Facts are <dt>/<dd> pairs in a single <dl>, not wrapped elements.
      const dl = document.querySelector("#item-facts, .item-facts, dl");
      const facts = [];
      if (dl) {
        const dts = [...dl.querySelectorAll("dt")];
        const dds = [...dl.querySelectorAll("dd")];
        dts.forEach((dt, i) => {
          facts.push({ k: dt.textContent.trim(), v: (dds[i]?.textContent || "").trim().slice(0, 44) });
        });
      }
      return {
        h1: document.querySelector("h1")?.textContent.trim(),
        facts,
        chips: [...document.querySelectorAll(".item-chip")].map((c) => c.textContent.trim()),
      };
    });

    console.log(`\n── anime/${file}`);
    console.log(`   h1: ${info.h1}`);
    if (info.chips.length) console.log(`   شرائح: ${info.chips.join(" · ")}`);
    for (const f of info.facts) console.log(`     ${f.k} : ${f.v || "(فارغ)"}`);
    if (!info.facts.length) console.log("     (لا حقولFacts معروضة)");
  }

  await browser.close();
})();
