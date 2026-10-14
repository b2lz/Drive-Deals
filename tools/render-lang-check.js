"use strict";
// Render a handful of pages whose record has an English summary but no Arabic
// one, to confirm what a visitor actually sees on the Arabic site.
//
// Usage: node tools/render-lang-check.js

const path = require("path");

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

const SAMPLES = [
  ["arabic-films", "11.11.jpg"],
  ["foreign-films", "The Specialist.jpg"],
  ["anime", "Witch Craft Works.jpg"],
  ["cartoon-series", "Marvel Spider Man.jpg"],
  ["games", "It Takes Two.jpg"],
  ["foreign-films", "7Kogustaki Mucize.jpg"],
  ["arabic-films", "أمن دولت.jpg"],
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();

  const ARABIC = /[\u0600-\u06FF]/;
  for (const [cat, file] of SAMPLES) {
    // A hash-only change does not re-run the page's bootstrap, so set the
    // fragment and reload for every sample.
    await page.goto(`${BASE}/item.html#id=${encodeURIComponent(cat + "/" + file)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1200));
    const info = await page.evaluate(() => {
      const t = document.body.innerText;
      const i = t.indexOf("ملخص");
      return { snippet: (i === -1 ? t : t.slice(i, i + 190)).replace(/\s+/g, " ").trim() };
    });
    const lang = ARABIC.test(info.snippet) ? "عربي" : ">>> إنجليزي <<<";
    console.log(`\n${cat}/${file}\n  [${lang}] ${info.snippet}`);
  }

  await browser.close();
})();
