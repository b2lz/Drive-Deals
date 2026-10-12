// Responsive smoke-test: loads the running site at phone / tablet /
// desktop widths, drives the first two steps, and writes screenshots.
// Usage: node tools/responsive-check.js [baseUrl] [outDir]
const path = require("path");
const fs = require("fs");

const puppeteer = require(
  path.resolve(
    "C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer"
  )
);

const BASE = process.argv[2] || "http://localhost:4321";
const OUT =
  process.argv[3] || path.join(process.env.TEMP || ".", "drive-deals-responsive");

// Use a locally installed Chrome/Edge so no download is required.
const BROWSER_CANDIDATES = [
  process.env.DRIVE_DEALS_BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

const executablePath = BROWSER_CANDIDATES.find((p) => fs.existsSync(p));

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, dsf: 2 },
  { name: "tablet", width: 820, height: 1180, dsf: 2 },
  { name: "desktop", width: 1440, height: 900, dsf: 1 },
];

(async () => {
  if (!executablePath) {
    console.error("No Chrome/Edge found. Set DRIVE_DEALS_BROWSER to a browser executable.");
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", executablePath });
  const problems = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dsf,
      isMobile: vp.name === "phone",
      hasTouch: vp.name === "phone",
    });

    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

    await page.goto(BASE, { waitUntil: "networkidle2" });

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // step 1 — drive size
    await wait(400);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-1-drive.png`) });

    // pick 1 TB and continue
    await page.click('.pill[data-size="1024"]');
    await page.click("#start-selection-btn");
    await wait(500);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-2-gallery.png`) });

    // select a few items so the dock / reservoir have data
    await page.evaluate(() => {
      [...document.querySelectorAll(".card")].slice(0, 4).forEach((c) => c.click());
    });
    await wait(400);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-3-selected.png`) });

    // layout assertions
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;

      // Elements inside a clipping ancestor (the ambient mesh, the
      // scrollable tab strip, ...) are allowed to sit outside.
      const isClipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX !== "visible" || o.overflowY !== "visible") return true;
          if (o.position === "fixed") return true;
        }
        return false;
      };
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -2 || r.right > window.innerWidth + 2) && !isClipped(el);
        })
        .slice(0, 8)
        .map((el) => (el.className || el.tagName) + "#" + Math.round(el.getBoundingClientRect().left));
      const dock = document.querySelector(".glass-dock").getBoundingClientRect();
      const cards = [...document.querySelectorAll(".card")].slice(0, 3).map((c) => {
        const r = c.getBoundingClientRect();
        return Math.round(r.width);
      });
      return {
        overflow,
        wide,
        dockWidth: Math.round(dock.width),
        dockFits: dock.left >= -1 && dock.right <= window.innerWidth + 1,
        cardWidths: cards,
        bannerH: Math.round(document.getElementById("banner").getBoundingClientRect().height),
        tubeFill: document.getElementById("dock-tube-fill").style.height,
        dockPct: document.getElementById("dock-percent").textContent,
      };
    });

    if (metrics.overflow > 1) problems.push(`${vp.name}: horizontal overflow ${metrics.overflow}px`);
    if (metrics.wide.length) problems.push(`${vp.name}: elements outside viewport -> ${metrics.wide.join(", ")}`);
    if (!metrics.dockFits) problems.push(`${vp.name}: dock not fully on screen`);

    console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
    console.log(JSON.stringify(metrics, null, 2));
    if (consoleErrors.length) {
      console.log("console errors:", consoleErrors.slice(0, 5));
      problems.push(`${vp.name}: ${consoleErrors.length} console error(s)`);
    }
    await page.close();
  }

  await browser.close();

  console.log("\nScreenshots ->", OUT);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    problems.forEach((p) => console.log(" - " + p));
    process.exitCode = 1;
  } else {
    console.log("\nNo layout problems detected.");
  }
})();