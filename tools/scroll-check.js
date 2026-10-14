"use strict";
// Scroll smoothness: how many frames drop while scrolling the library grid on a
// weak phone. Reports long tasks and dropped-frame ratio during a real scroll.
//
// Usage: node tools/scroll-check.js [url]

const PUPPETEER = "puppeteer-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.argv[2] || "http://localhost:4321/";

(async () => {
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  const client = await page.target().createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: 6 });

  await page.evaluateOnNewDocument(() => {
    window.__lt = [];
    window.__frames = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    } catch {}
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto(BASE, { waitUntil: "load", timeout: 120000 });
  for (let i = 0; i < 60; i++) {
    if ((await page.evaluate(() => document.querySelectorAll(".card").length)) > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  // The app opens on the drive-size screen; the grid is the "gallery" view.
  // Scroll the library, not the landing screen.
  const switched = await page.evaluate(() => {
    if (typeof showView === "function") {
      showView("gallery");
      return "showView(gallery)";
    }
    return "showView not reachable";
  });
  await new Promise((r) => setTimeout(r, 1800));
  console.log(`  view          : ${switched}`);

  // Reset, then scroll the page the way a thumb would.
  await page.evaluate(() => {
    window.__lt = [];
    window.__frames = [];
    window.scrollTo(0, 0);
  });

  const steps = 24;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((s) => window.scrollBy(0, s), 300);
    await new Promise((r) => setTimeout(r, 120));
  }
  await new Promise((r) => setTimeout(r, 800));

  const r = await page.evaluate(() => {
    const f = (window.__frames || []).slice(1);
    const sorted = [...f].sort((a, b) => a - b);
    const dropped = f.filter((d) => d > 50).length;
    const verySlow = f.filter((d) => d > 100).length;
    return {
      frames: f.length,
      median: sorted[Math.floor(sorted.length / 2)]?.toFixed(1),
      p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1),
      worst: sorted[sorted.length - 1]?.toFixed(1),
      dropped,
      verySlow,
      longTasks: (window.__lt || []).sort((a, b) => b - a),
      scrolled: window.scrollY,
    };
  });

  const ltTotal = r.longTasks.reduce((a, b) => a + b, 0);
  // Ablation: kill the expensive glass compositing to measure what it costs.
  // Run twice — once with it, once without — to see the difference.
  if (process.env.NOGLASS) {
    await page.addStyleTag({
      content: `* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
                .ambient-mesh { display: none !important; }`,
    });
    await new Promise((r) => setTimeout(r, 600));
  }
  // A targeted override, e.g. CARDS_CSS=".card{backdrop-filter:none}"
  if (process.env.CARDS_CSS) {
    await page.addStyleTag({ content: process.env.CARDS_CSS });
    await new Promise((r) => setTimeout(r, 600));
  }
  if (process.env.NOIMG) {
    await page.evaluate(() => {
      for (const img of document.querySelectorAll("img")) img.removeAttribute("src");
    });
  }

  console.log(`\n  ${BASE}   (390x844, CPU 6x)${process.env.NOGLASS ? "  [glass OFF]" : ""}${process.env.CARDS_CSS ? "  [cards override]" : ""}${process.env.NOIMG ? "  [images OFF]" : ""}`);
  console.log(`  scrolled to      : ${r.scrolled} px`);
  console.log(`  frames measured  : ${r.frames}`);
  console.log(`  frame time       : median ${r.median} ms · p95 ${r.p95} ms · worst ${r.worst} ms`);
  console.log(`  dropped (>50ms)  : ${r.dropped}   (${((r.dropped / r.frames) * 100).toFixed(1)}%)`);
  console.log(`  very slow >100ms : ${r.verySlow}`);
  console.log(`  long tasks       : ${r.longTasks.length}   total ${ltTotal} ms`);
  if (r.longTasks.length) console.log(`      top: ${r.longTasks.slice(0, 8).join(", ")} ms`);
  const verdict = r.dropped / r.frames < 0.05 ? "✔ ملساوان" : r.dropped / r.frames < 0.15 ? "△ مقبول" : "✗ تقيل";
  console.log(`\n  ${verdict}`);

  await browser.close();
})();