// Verifies the "التفاصيل" link on gallery cards: present on every
// card, points at the matching item page, navigates on click, and
// never toggles the selection.
// Usage: node tools/details-link-check.js [baseUrl]
const path = require("path");
const fs = require("fs");

const puppeteer = require(
  path.resolve("C:/Users/bo2lz/Desktop/Drive Deals V1.0/Drive Deals V1.0/node_modules/puppeteer")
);

const BASE = process.argv[2] || "http://localhost:4321";
const BROWSERS = [
  process.env.DRIVE_DEALS_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);
const executablePath = BROWSERS.find((p) => fs.existsSync(p));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!executablePath) { console.error("No browser found"); process.exit(2); }
  const browser = await puppeteer.launch({ headless: "new", executablePath });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  const problems = [];
  const check = (name, cond, detail) => {
    console.log(`${cond ? "OK  " : "FAIL"} ${name}${detail !== undefined ? " -> " + JSON.stringify(detail) : ""}`);
    if (!cond) problems.push(name);
  };

  await page.goto(BASE, { waitUntil: "networkidle2" });
  await wait(500);
  await page.click('.pill[data-size="1024"]');
  await page.click("#start-selection-btn");
  await wait(600);

  // --- presence + href correctness ---
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".card")];
    const links = cards.map((c) => c.querySelector(".card-details"));
    return {
      cards: cards.length,
      withLink: links.filter(Boolean).length,
      allText: [...new Set(links.map((l) => l && l.textContent))],
      relative: links.every((l) => l && !/^https?:/.test(l.getAttribute("href"))),
      matchesCardId: links.every(
        (l, i) => l && decodeURIComponent(l.getAttribute("href").split("#id=")[1]) === cards[i].dataset.id
      ),
      sample: links[0] ? decodeURIComponent(links[0].getAttribute("href")) : null,
    };
  });
  check("every card has a details link", info.cards > 0 && info.cards === info.withLink, `${info.withLink}/${info.cards}`);
  check("link label", info.allText.length === 1 && info.allText[0] === "التفاصيل", info.allText);
  check("links are relative (same origin)", info.relative);
  check("href id matches the card id", info.matchesCardId, info.sample);

  // --- clicking must NOT toggle the selection ---
  const sel = await page.evaluate(() => {
    const card = document.querySelector(".card");
    const link = card.querySelector(".card-details");
    const stopper = (e) => e.preventDefault(); // keep the page from navigating
    document.addEventListener("click", stopper, true);
    const before = window.__t.selectedItems.size;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    const afterLink = window.__t.selectedItems.size;
    document.removeEventListener("click", stopper, true);
    card.querySelector(".card-name").dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    return { before, afterLink, afterCard: window.__t.selectedItems.size, cardSelected: card.classList.contains("selected") };
  });
  check("details click does NOT select", sel.afterLink === sel.before, sel);
  check("card body still selects", sel.afterCard === sel.before + 1 && sel.cardSelected);

  // --- the link really navigates ---
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await wait(400);
  await page.click('.pill[data-size="1024"]');
  await page.click("#start-selection-btn");
  await wait(500);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.click(".card .card-details"),
  ]);
  await wait(1200);
  const landed = await page.evaluate(() => ({
    url: location.pathname + location.hash,
    title: document.getElementById("item-title").textContent,
    detailVisible: !document.getElementById("item-detail").hidden,
    backLink: document.querySelector(".item-back") && document.querySelector(".item-back").getAttribute("href"),
  }));
  check("clicking navigates to item.html", landed.url.startsWith("/item.html#id="), landed.url);
  check("item page resolved the right item", landed.detailVisible && landed.title.length > 0, landed.title);
  check("back link points home", landed.backLink === "index.html");

  // --- back to the library ---
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.click(".item-back"),
  ]);
  await wait(800);
  const backUrl = new URL(page.url()).pathname;
  check(
    "back link returns to the library",
    backUrl === "/" || backUrl === "/index.html",
    backUrl
  );

  if (errs.length) { console.log("console errors:", errs.slice(0, 5)); problems.push("console errors"); }

  await browser.close();
  console.log("");
  if (problems.length) { console.log("PROBLEMS:"); problems.forEach((p) => console.log(" - " + p)); process.exitCode = 1; }
  else console.log("Details link works end to end.");
})();