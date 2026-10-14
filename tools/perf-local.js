"use strict";
// Same measurement as tools/perf-check.js, pointed at the local server so a
// change can be measured before it is pushed.
//
// Usage: node tools/perf-local.js

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();

  const client = await page.target().createCDPSession();
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const bytes = { byType: {}, total: 0 };
  let requests = 0;
  page.on("response", (res) => {
    requests++;
    try {
      const len = Number(res.headers()["content-length"] || 0);
      const t = res.request().resourceType() || "other";
      bytes.byType[t] = (bytes.byType[t] || 0) + len;
      bytes.total += len;
    } catch {}
  });

  const longTasks = [];
  await page.evaluateOnNewDocument(() => {
    window.__lt = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    } catch {}
  });

  const t0 = Date.now();
  // networkidle2 resolves too early against a plain static server, so wait for
  // the grid itself instead — that is the moment the page is actually usable.
  await page.goto(BASE, { waitUntil: "load", timeout: 180000 });
  let rendered = 0;
  for (let i = 0; i < 60; i++) {
    rendered = await page.evaluate(() => document.querySelectorAll(".card").length);
    if (rendered > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const wall = Date.now() - t0;
  void rendered;

  const m = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] || {};
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const lcp = performance.getEntriesByType("largest-contentful-paint").pop();
    return {
      ttfb: Math.round(n.responseStart || 0),
      domInt: Math.round(n.domInteractive || 0),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      longTasks: window.__lt || [],
      cards: document.querySelectorAll(".card").length,
      // Scroll smoothness proxy: how long the main thread was busy after load.
      busy: Math.round(
        performance.getEntriesByType("longtask").reduce((a, e) => a + e.duration, 0)
      ),
    };
  });

  const kb = (n) => (n / 1024).toFixed(0) + " KB";
  console.log(`\n  ${BASE}   (CPU 6x, ~1.6 Mbps, cache OFF)`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  wall clock       : ${(wall / 1000).toFixed(1)} s`);
  console.log(`  TTFB             : ${m.ttfb} ms`);
  console.log(`  DOMInteractive   : ${m.domInt} ms`);
  console.log(`  FCP              : ${m.fcp} ms`);
  console.log(`  LCP              : ${m.lcp ?? "?"} ms`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  requests         : ${requests}`);
  console.log(`  transferred      : ${kb(bytes.total)}`);
  for (const [t, n] of Object.entries(bytes.byType).sort((a, b) => b[1] - a[1]))
    console.log(`      ${t.padEnd(12)} ${kb(n)}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  cards rendered   : ${m.cards}`);
  const lt = m.longTasks.sort((a, b) => b - a);
  console.log(`  long tasks       : ${lt.length}  total ${m.busy} ms`);
  if (lt.length) console.log(`      top: ${lt.slice(0, 8).join(", ")} ms`);

  await browser.close();
})();