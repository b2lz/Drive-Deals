"use strict";
// Visual spot check across categories and shapes: a game with full
// requirements, a game whose recommended block is empty, a record with an
// English summary, and a record carrying a needsReview flag.
//
// Usage: node tools/render-spot-check.js

const path = require("path");

const PUPPETEER = "C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

const SAMPLES = [
  ["games", "Alan Wake -.jpg", "recommended فارغة"],
  ["games", "007 First Light.jpg", "متطلبات كاملة"],
  ["foreign-films", "The Specialist.jpg", "ملخص إنجليزي"],
  ["korean-series", "The K2 S01.jpg", "مُصلح يدوياً"],
  ["arabic-films", "ليل داخلي.jpg", "أبطال مقسّمة"],
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  for (const [cat, file, why] of SAMPLES) {
    const url = `${BASE}/item.html#id=${encodeURIComponent(cat + "/" + file)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1200));

    const info = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".item-req-card")].map((c) => ({
        title: c.querySelector(".item-req-title")?.textContent.trim(),
        rows: c.querySelectorAll(".item-req-list > *").length,
      }));
      const facts = [...document.querySelectorAll(".item-fact")].length;
      return { h1: document.querySelector("h1")?.textContent.trim(), reqCards: cards, facts };
    });

    console.log(`\n── ${cat}/${file}   (${why})`);
    console.log(`   العنوان على الصفحة : ${info.h1}`);
    console.log(`   بطاقات المواصفات  : ${info.reqCards.length}`);
    for (const c of info.reqCards) console.log(`     - ${c.title}  (${c.rows} صف)`);
  }

  await browser.close();
})();
