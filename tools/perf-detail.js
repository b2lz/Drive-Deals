"use strict";
// Find what the long task actually is. Attributes the blocking window to the
// script that was running, and reports render-blocking resources.

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "https://b2lz.github.io/Drive-Deals";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await client.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  await page.evaluateOnNewDocument(() => {
    window.__marks = [];
    const mark = (name) => window.__marks.push({ name, t: Math.round(performance.now()) });
    window.__mark = mark;
    mark("script-start");
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 180000 });
  await new Promise((r) => setTimeout(r, 1500));

  const info = await page.evaluate(() => {
    const res = performance.getEntriesByType("resource").map((r) => ({
      name: r.name.split("/").pop().slice(0, 44),
      type: r.initiatorType,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      dur: Math.round(r.duration),
    }));
    const nav = performance.getEntriesByType("navigation")[0] || {};
    return {
      res: res.sort((a, b) => b.end - a.end).slice(0, 12),
      ttfb: Math.round(nav.responseStart || 0),
      domInt: Math.round(nav.domInteractive || 0),
      marks: window.__marks,
    };
  });

  console.log("\n  أبطأ 12 مورد (ترتيب التحميل):");
  for (const r of info.res)
    console.log(`    ${String(r.end).padStart(6)}ms  ${r.type.padEnd(10)} ${r.name}`);

  console.log(`\n  TTFB            : ${info.ttfb} ms`);
  console.log(`  DOMInteractive  : ${info.domInt} ms`);

  // Which script does the heavy work?
  const heavy = await page.evaluate(() => {
    const t = {};
    for (const e of performance.getEntriesByType("measure")) {
      t[e.name] = Math.round(e.duration);
    }
    return t;
  });
  if (Object.keys(heavy).length) {
    console.log("\n  measures:");
    for (const [k, v] of Object.entries(heavy).sort((a, b) => b[1] - a[1]).slice(0, 10))
      console.log(`    ${k.padEnd(34)} ${v} ms`);
  }

  // Render-blocking check.
  const blocking = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("script[src], link[rel=stylesheet]")) {
      out.push({
        tag: el.tagName,
        url: (el.src || el.href || "").split("/").pop().slice(0, 40),
        defer: el.defer, async: el.async,
        media: el.media || "",
        inHead: el.closest("head") !== null,
      });
    }
    return out;
  });
  console.log("\n  موارد في <head> (حاجبة للعرض):");
  for (const b of blocking) console.log(`    ${b.tag.padEnd(7)} ${b.url.padEnd(42)} ${b.defer ? "defer" : ""}${b.async ? "async" : ""}`);

  await browser.close();
})();
