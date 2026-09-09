#!/usr/bin/env node
// ============================================================
// Phase 19 — large dataset test (runs in Node, no browser).
// Usage: npm run test:large   (or: node tools/test-large-dataset.js)
//
// Boots the real app with the full data.json (500+ entries) and checks:
//   - load + first batch render time
//   - search performance across the complete dataset
//   - selecting many images + total calculation
//   - clearing all selections
//   - order TXT generation with a large selection
//   - Telegram upload path with a large TXT (fetch stubbed — no network,
//     so the real chat is never spammed)
//
// Timings are printed for reference only; jsdom is slower than a real
// browser, and in a browser images load lazily per batch.
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptSrc = fs.readFileSync(path.join(root, "script.js"), "utf8");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));

if (!Array.isArray(dataset.categories) || dataset.categories.length < 11) {
  console.error(
    `data.json must use the multi-category format (12 categories) — run "node tools/make-test-data.js 500" first.`
  );
  process.exit(1);
}
const firstCategory = dataset.categories[0];
if (!Array.isArray(firstCategory.items) || firstCategory.items.length < 500) {
  console.error(
    `the first category has only ${firstCategory.items ? firstCategory.items.length : 0} items — run "node tools/make-test-data.js 500" first.`
  );
  process.exit(1);
}

const valueOf = new Map(firstCategory.items.map((item) => [item.image, item.sizeGB]));

let telegramCall = null; // captured sendDocument request (no real network)

async function boot() {
  const virtualConsole = new VirtualConsole(); // swallow jsdom noise
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const { window } = dom;

  window.scrollTo = () => {};

  if (typeof window.File !== "function") {
    // Minimal File shim for older jsdom builds.
    window.File = class extends window.Blob {
      constructor(parts, name, options) {
        super(parts, options);
        this.name = name;
      }
    };
  }

  window.fetch = async (url, options) => {
    if (typeof url === "string" && url.includes("api.telegram.org")) {
      telegramCall = { url, formData: options.body };
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, status: 200, json: async () => dataset };
  };

  const t0 = process.hrtime.bigint();
  window.eval(
    scriptSrc +
      "\n;window.__t = { generateOrderText, calculateTotal, formatSize };"
  );
  await new Promise((r) => setTimeout(r, 150)); // let loadData() finish
  return { window, bootMs: Number(process.hrtime.bigint() - t0) / 1e6 };
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

/** Run fn and print how long it took (informational). */
function time(label, fn) {
  const t0 = process.hrtime.bigint();
  const result = fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`     [${label}: ${ms.toFixed(1)} ms]`);
  return result;
}

(async () => {
  const d0 = firstCategory.items.length;
  console.log(`Dataset: ${d0} items per category\n`);

  const { window, bootMs } = await boot();
  const w = window;
  const d = w.document;

  console.log(`     [boot + first batch render: ${bootMs.toFixed(0)} ms]`);
  assert(d.querySelectorAll("#gallery .card").length === 50, "first batch renders exactly 50 cards");

  // Pick the largest fixed drive and start, so the drive capacity limit
  // (default is 320 GB now) does not reject the mass selection below.
  const driveSelect = d.getElementById("drive-select");
  driveSelect.value = [...driveSelect.options].filter((o) => /^\d+$/.test(o.value)).pop().value;
  driveSelect.dispatchEvent(new w.Event("change"));
  d.getElementById("start-selection-btn").click();

  /* ---------- Search performance across the full dataset ---------- */

  const searchInput = d.getElementById("search-input");
  time("search '1' (hundreds of matches)", () => {
    searchInput.value = "1";
    searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  });
  assert(
    [...d.querySelectorAll("#gallery .card")].every((c) => c.dataset.image.includes("1")),
    "search '1' only shows matching cards"
  );

  time("search for one exact file name", () => {
    searchInput.value = "250.jpg";
    searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  });
  assert(
    d.querySelectorAll("#gallery .card").length === 1 &&
      d.querySelector("#gallery .card").dataset.image === "250.jpg",
    "search '250.jpg' shows exactly one card"
  );

  // Fuzzy pass over the whole active category (no exact hit, no close match —
  // the slowest search path: distinct-letter prefilter on every item).
  const fuzzyT0 = process.hrtime.bigint();
  searchInput.value = "زخاف";
  searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  const fuzzyMs = Number(process.hrtime.bigint() - fuzzyT0) / 1e6;
  console.log(`     [typo search with no match: ${fuzzyMs.toFixed(1)} ms]`);
  assert(
    d.querySelectorAll("#gallery .card").length === 0 &&
      !d.getElementById("no-results").hidden,
    "typo search with no close match shows no results"
  );
  assert(
    fuzzyMs < 500,
    `fuzzy search over the category stayed fast (${fuzzyMs.toFixed(0)} ms < 500 ms)`
  );

  // Restore the full list.
  time("clear search (back to full dataset)", () => {
    d.getElementById("clear-search-btn").click();
  });

  /* ---------- Render everything, then select many images ---------- */

  const loadMoreBtn = d.getElementById("load-more-btn");
  let guard = 0;
  while (!loadMoreBtn.hidden && guard++ < 50) {
    time(`Load More (batch ${guard + 1})`, () => loadMoreBtn.click());
  }
  assert(
    d.querySelectorAll("#gallery .card").length === d0,
    `all ${d0} cards rendered via Load More`
  );

  const allCards = [...d.querySelectorAll("#gallery .card")];
  let selectedCount = 0;
  time("select every other card (~half the library)", () => {
    for (let i = 0; i < allCards.length; i += 2) {
      allCards[i].click();
      selectedCount++;
    }
  });

  const expectedTotal = allCards.reduce(
    (sum, card, i) => (i % 2 === 0 ? sum + valueOf.get(card.dataset.image) : sum),
    0
  );

  assert(
    d.getElementById("selected-count").textContent === String(selectedCount),
    `count = ${selectedCount} after mass selection`
  );
  // The footer total is now a storage meter (drive-dependent); the raw
  // calculation is asserted directly.
  assert(
    w.__t.calculateTotal() === expectedTotal,
    `total = ${expectedTotal} matches the sum of selected values`
  );

  /* ---------- Clear all ---------- */

  time("clear all selections", () => d.getElementById("clear-all-btn").click());
  assert(d.getElementById("selected-count").textContent === "0", "Clear All resets count to 0");
  assert(
    d.querySelectorAll("#gallery .card.selected").length === 0,
    "Clear All removes every selected style"
  );

  /* ---------- Order generation with a large selection ---------- */

  // Select the same ~half again for the order.
  for (let i = 0; i < allCards.length; i += 2) allCards[i].click();

  // Fill the form and go to review.
  d.getElementById("name-input").value = "اختبار";
  d.getElementById("phone-input").value = "01000000000";
  d.getElementById("address-input").value = "القاهرة";
  const form = d.getElementById("customer-form");
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(!d.getElementById("review-view").hidden, "review view opens with a large selection");

  let txt;
  time(`generate order TXT for ${selectedCount} images`, () => {
    txt = w.__t.generateOrderText();
  });
  // Rebrand plan Phase 10: numbered game lines with a size + unit.
  const imageLines = txt.split("\n").filter((line) => /^\d+\. \d{3}\.jpg - .+ (GB|TB)$/.test(line));
  assert(imageLines.length === selectedCount, "TXT lists every selected game exactly once");
  assert(
    txt.includes(`Total Items: ${selectedCount}`) &&
      txt.includes(`Estimated Total Size: ${w.__t.formatSize(expectedTotal)}`),
    "TXT count and final total are correct for the large order"
  );

  /* ---------- Telegram upload path with a large TXT (stubbed) ---------- */

  d.getElementById("send-order-btn").click();
  await new Promise((r) => setTimeout(r, 150)); // let the async send finish

  assert(!d.getElementById("success-view").hidden, "success screen appears after stubbed upload");
  assert(telegramCall !== null, "sendDocument was called with FormData");

  const file = telegramCall.formData.get("document");
  const caption = telegramCall.formData.get("caption");
  assert(file && /^order-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(file.name), "TXT document has the right file name");
  console.log(`     [large TXT document size: ${(file.size / 1024).toFixed(1)} KB (Telegram bot limit: 50 MB)]`);
  assert(
    caption &&
      caption.startsWith("DRIVE DEALS - NEW ORDER") &&
      caption.includes(`Items: ${selectedCount}`),
    "caption mirrors the new order format (brand + item count)"
  );

  console.log("\nALL LARGE-DATASET TESTS PASSED");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
