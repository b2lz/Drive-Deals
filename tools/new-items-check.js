"use strict";
// Open one item page per new game and report what actually rendered: the
// summary, the requirement tiers, and the honest "no specs available" note for
// the console-only titles. Catches a record that is valid JSON but shows an
// empty tab.
//
// Usage: node tools/new-items-check.js [baseUrl]

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";

const IDS = [
  "games/Atomfall.jpg",
  "games/Clive Barker's Hellraiser - Revival.jpg",
  "games/DYNASTY WARRIORS 3 - CER.jpg",
  "games/God of War III Remastered.jpg",
  "games/LEGO Party.jpg",
  "games/Mario Party Superstars.jpg",
  "games/Minecraft Dungeons II.jpg",
  "games/Super Mario Party Jamboree.jpg",
  "games/Trails In The Sky 2nd Chapter.jpg",
  "games/Valor Mortis.jpg",
  "games/ZERO PARADES.jpg",
];

(async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });

  for (const id of IDS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const url = `${BASE}item.html?id=${encodeURIComponent(id)}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));

    const r = await page.evaluate(() => {
      const text = (sel) => document.querySelector(sel)?.textContent?.trim() || "";
      const reqCards = [...document.querySelectorAll(".item-req-card")].map((c) => ({
        title: c.querySelector(".item-req-title")?.textContent?.trim() || "",
        rows: c.querySelectorAll(".item-req-list > *").length,
      }));
      const body = document.body.innerText;
      return {
        title: text("#item-title") || text("h1"),
        summary: text("#item-summary") || text(".item-summary"),
        summaryLen: (text("#item-summary") || text(".item-summary")).length,
        reqCards,
        saysNoSpecs: body.includes("مواصفات التشغيل غير متاحة"),
        facts: [...document.querySelectorAll(".item-facts li, .item-fact")].length,
        devRow: body.includes("المطوّر"),
      };
    });

    const name = id.split("/").pop().replace(/\.jpg$/, "");
    const tiers = r.reqCards.map((c) => `${c.title}(${c.rows})`).join(" ") || "—";
    console.log(`\n  ${name}`);
    console.log(`    العنوان    : ${r.title || "✗"}`);
    console.log(`    المطور     : ${r.devRow ? "✔ ظاهر" : "✗ ناقص"}`);
    console.log(`    الملخص     : ${r.summaryLen} حرف ${r.summaryLen > 80 ? "✔" : "✗ قصير"}`);
    console.log(`    المواصفات  : ${tiers} ${r.saysNoSpecs ? "— ومعها إشعار «غير متاحة» ✔" : ""}`);
    if (errors.length) console.log(`    أخطاء      : ${errors[0].slice(0, 90)}`);

    await page.close();
  }

  await browser.close();
})();