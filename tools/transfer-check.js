"use strict";
// Per-URL transfer size on a cold load, so optimisation effort goes to the
// bytes that actually cross the network (compressed), not the file size on
// disk (uncompressed).
//
// Usage: node tools/transfer-check.js [url]

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "https://b2lz.github.io/Drive-Deals/";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  const client = await page.target().createCDPSession();
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await client.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const rows = [];
  page.on("response", async (res) => {
    try {
      const len = Number(res.headers()["content-length"] || 0);
      const enc = res.headers()["content-encoding"] || "—";
      rows.push({
        name: res.url().replace(BASE, "/").split("/").slice(-1)[0].slice(0, 46) || "/",
        type: res.request().resourceType(),
        len, enc,
      });
    } catch {}
  });

  await page.goto(BASE, { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 60; i++) {
    if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => setTimeout(r, 2500));

  // Group the images — they are 50 files, not 50 lines of report.
  const kb = (n) => (n / 1024).toFixed(1);
  const images = rows.filter((r) => r.type === "image");
  const others = rows.filter((r) => r.type !== "image");

  console.log(`\n  ${BASE}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  ملفات غير صور:`);
  for (const r of others.sort((a, b) => b.len - a.len))
    console.log(`    ${r.name.padEnd(46)} ${kb(r.len).padStart(7)} KB   ${r.enc}`);

  const imgTotal = images.reduce((n, r) => n + r.len, 0);
  const imgEnc = images[0]?.enc || "—";
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  صور: ${images.length} ملف   المجموع ${kb(imgTotal)} KB   (${imgEnc})`);
  const sorted = images.map((r) => r.len).sort((a, b) => b - a);
  console.log(`    أكبر 5   : ${sorted.slice(0, 5).map((n) => kb(n) + " KB").join(", ")}`);
  console.log(`    متوسط    : ${kb(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1))} KB`);
  console.log(`    إجمالي الموقع: ${kb(rows.reduce((n, r) => n + r.len, 0))} KB  (${rows.length} طلب)`);

  await browser.close();
})();