"use strict";
// Is the page shifting after it appears? Late-loading fonts swapping in make
// the whole grid reflow, which reads as a freeze on a slow link. Measures CLS
// plus when each render-blocking resource actually landed.
//
// Usage: node tools/cls-check.js <url> [url2 ...]

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });

  for (const url of process.argv.slice(2)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

    const client = await page.target().createCDPSession();
    await client.send("Network.enable");
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", {
      offline: false, latency: 250,
      downloadThroughput: (1.2 * 1024 * 1024) / 8,   // a weak 4G link
      uploadThroughput: (400 * 1024) / 8,
    });

    await page.evaluateOnNewDocument(() => {
      window.__cls = 0;
      window.__shifts = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (!e.hadRecentInput) {
            window.__cls += e.value;
            window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), n: e.sources?.length || 0 });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto(url, { waitUntil: "load", timeout: 180000 });
    for (let i = 0; i < 60; i++) {
      if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.evaluate(() => { if (typeof showView === "function") showView("gallery"); });
    await new Promise((r) => setTimeout(r, 4000));

    const r = await page.evaluate(() => {
      const res = performance.getEntriesByType("resource").map((e) => ({
        name: e.name.split("/").slice(-1)[0].slice(0, 34) || "/",
        type: e.initiatorType,
        end: Math.round(e.responseEnd),
        start: Math.round(e.startTime),
      }));
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      return {
        cls: window.__cls,
        shifts: window.__shifts.sort((a, b) => b.v - a.v).slice(0, 6),
        fcp: fcp ? Math.round(fcp.startTime) : null,
        fonts: res.filter((x) => x.type === "font"),
        css: res.filter((x) => x.name.endsWith(".css")),
        json: res.filter((x) => x.name === "data.json"),
        last: Math.max(...res.map((x) => x.end), 0),
      };
    });

    console.log(`\n  ${url}   (250ms latency, ~1.2 Mbps)`);
    console.log(`  ─────────────────────────────────────────────`);
    console.log(`  CLS            : ${r.cls.toFixed(4)}  ${r.cls > 0.1 ? "✗.stagehousefeels" : "✔"}`);
    for (const s of r.shifts) console.log(`      انزياحة ${s.v}  عند ${s.t}ms  (${s.n} عنصر)`);
    console.log(`  FCP            : ${r.fcp} ms`);
    console.log(`  آخر مورد خلص   : ${r.last} ms`);
    const lastFont = Math.max(0, ...r.fonts.map((f) => f.end));
    const fcpV = r.fcp ?? 0;
    console.log(`  آخر خط وصل     : ${lastFont} ms  ${lastFont > fcpV ? "⚠ بعد الرسم الأول = حركة نص" : "✔ قبل الرسم"}`);
    if (r.css.length) console.log(`  style.css       : ${r.css.map((c) => c.end + "ms").join(", ")}`);
    if (r.json.length) console.log(`  data.json       : ${r.json.map((c) => c.end + "ms").join(", ")}`);

    await page.close();
  }

  await browser.close();
})();