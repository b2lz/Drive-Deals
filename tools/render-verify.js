"use strict";
// Render pages for the records written in the latest batches to confirm the
// new cast / director / requirements actually appear.
//
// Usage: node tools/render-verify.js

const path = require("path");

const PUPPETEER = "C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:4321";

const SAMPLES = [
  ["anime", "3 Gatsuno Lion.jpg"],
  ["anime", "Naruto (2002).jpg"],
  ["cartoon-films", "Aladdin.jpg"],
  ["cartoon-films", "Kubo.jpg"],
  ["cartoon-series", "Primal.jpg"],
  ["foreign-series", "Game of Thrones.jpg"],
  ["korean-series", "Sisyphus The Myth 720p.jpg"],
  ["arabic-films", "سلاح التلميذ.jpg"],
  ["games", "mechwarior 5.jpg"],
  ["games", "Hitman Blood Money.jpg"],
];

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  for (const [cat, file] of SAMPLES) {
    await page.goto(`${BASE}/item.html#id=${encodeURIComponent(cat + "/" + file)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1100));

    const info = await page.evaluate(() => {
      const dl = document.querySelector("#item-facts");
      const get = (label) => {
        const dts = [...dl.querySelectorAll("dt")];
        const dds = [...dl.querySelectorAll("dd")];
        const i = dts.findIndex((d) => d.textContent.trim() === label);
        return i === -1 ? null : dds[i]?.textContent.trim() || null;
      };
      return {
        h1: document.querySelector("h1")?.textContent.trim(),
        director: get("المخرج / الإدارة"),
        cast: get("طاقم التمثيل"),
        reqs: [...document.querySelectorAll(".item-req-card")].map((c) => ({
          t: c.querySelector(".item-req-title")?.textContent.trim(),
          n: c.querySelectorAll(".item-req-list > *").length,
        })),
      };
    });

    const cut = (s, n = 46) => (s ? (s.length > n ? s.slice(0, n) + "…" : s) : "—");
    console.log(`\n${cat}/${file}`);
    console.log(`  العنوان : ${info.h1}`);
    console.log(`  المخرج  : ${cut(info.director)}`);
    console.log(`  الأبطال : ${cut(info.cast)}`);
    if (info.reqs.length)
      for (const r of info.reqs) console.log(`  ${r.t}  (${r.n} صف)`);
  }

  await browser.close();
})();
