"use strict";
// Measure the live site the way a weak phone experiences it: throttled CPU,
// slow network, then record timings, transfer sizes and the long tasks that
// stall the main thread.

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "https://b2lz.github.io/Drive-Deals";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();

  // A mid-range phone: ~6x slower CPU, "Fast 3G"-ish uplink.
  const client = await page.target().createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const bytes = { byType: {}, total: 0 };
  const longTasks = [];
  await page.evaluateOnNewDocument(() => {
    window.__longTasks = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__longTasks.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    } catch {}
  });

  page.on("response", async (res) => {
    try {
      const len = Number(res.headers()["content-length"] || 0);
      const t = (res.request().resourceType() || "other");
      bytes.byType[t] = (bytes.byType[t] || 0) + len;
      bytes.total += len;
    } catch {}
  });

  const url = BASE + (process.argv[2] ? "/" + process.argv[2] : "/");
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
  const wall = Date.now() - t0;

  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const lcp = performance.getEntriesByType("largest-contentful-paint").pop();
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      longTasks: window.__longTasks || [],
      resources: performance.getEntriesByType("resource").length,
      cards: document.querySelectorAll(".card").length,
      images: document.querySelectorAll("img").length,
      completeImages: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });

  const kb = (n) => (n / 1024).toFixed(0) + " KB";
  console.log(`\n  ${url}`);
  console.log(`  CPU throttle     : 6x`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  wall clock       : ${(wall / 1000).toFixed(1)} s`);
  console.log(`  FCP              : ${m.fcp} ms`);
  console.log(`  LCP              : ${m.lcp ?? "?"} ms`);
  console.log(`  DOMContentLoaded : ${m.domContentLoaded} ms`);
  console.log(`  load             : ${m.load} ms`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  requests         : ${m.resources}`);
  console.log(`  transferred      : ${kb(bytes.total)}`);
  for (const [t, n] of Object.entries(bytes.byType).sort((a, b) => b[1] - a[1]))
    console.log(`      ${t.padEnd(12)} ${kb(n)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  cards rendered   : ${m.cards}`);
  console.log(`  images in DOM    : ${m.images}  loaded: ${m.completeImages}`);
  const lt = m.longTasks.sort((a, b) => b - a);
  console.log(`  long tasks (>50ms): ${lt.length}` + (lt.length ? `  top: ${lt.slice(0, 6).join(", ")} ms` : ""));

  await browser.close();
})();
