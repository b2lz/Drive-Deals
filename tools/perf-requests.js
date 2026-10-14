"use strict";
// Count the real network requests per URL on a cold load, with a throttled
// CPU and a slow link, so duplicated fetches become obvious.

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "https://b2lz.github.io/Drive-Deals/";

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

  const seen = new Map();
  page.on("response", (res) => {
    const u = res.url().replace(BASE, "").split("?")[0];
    if (!u || u === "/") return;
    const key = u;
    if (!seen.has(key)) seen.set(key, { n: 0, type: res.request().resourceType(), status: res.status() });
    seen.get(key).n++;
  });

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 180000 });
  const wall = Date.now() - t0;

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] || {};
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const lcp = performance.getEntriesByType("largest-contentful-paint").pop();
    return {
      ttfb: Math.round(n.responseStart || 0),
      domInt: Math.round(n.domInteractive || 0),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      cards: document.querySelectorAll(".card").length,
    };
  });

  console.log(`\n  ${BASE}   (CPU 6x, ~1.6 Mbps, cache OFF)`);
  console.log(`  wall ${(wall / 1000).toFixed(1)}s · ttfb ${nav.ttfb}ms · FCP ${nav.fcp}ms · LCP ${nav.lcp ?? "?"}ms · cards ${nav.cards}`);
  console.log(`\n  طلبات مكررة:`);
  const dupes = [...seen.entries()].filter(([, v]) => v.n > 1);
  if (!dupes.length) console.log("    مفيش");
  for (const [u, v] of dupes) console.log(`    ${v.n}x  ${u}   [${v.type}]`);
  console.log(`\n  إجمالي الطلبات: ${[...seen.values()].reduce((a, v) => a + v.n, 0)}`);

  await browser.close();
})();
