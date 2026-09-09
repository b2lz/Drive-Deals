#!/usr/bin/env node
// ============================================================
// Phase 24 — final full test (runs in Node, no browser).
// Usage: npm run test:full   (or: node tools/test-full-flow.js)
//
// Boots the real app with the real data.json and walks ONE
// continuous user flow, in order, covering every item of the
// Phase 24 checklist:
//
//   1.  Open website.                    9.  Continue works.
//   2.  Images load.                   10.  Form validation works.
//   3.  Search works.                  11.  Review screen is correct.
//   4.  Select images.                 12.  TXT content is correct.
//   5.  Unselect images.               13.  Telegram send works.
//   6.  Total updates.                 14.  Send button cannot be spammed.
//   7.  Clear All works.               15.  Success screen appears.
//   8.  Load More works.               16.  New Order resets everything.
//
// A second, short scenario checks the failure path: a failed Telegram
// upload keeps the order and re-enables the Send button (Phase 15).
//
// The Telegram API is stubbed in-memory — no real network request is
// ever made, so the configured chat is never spammed.
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptSrc = fs.readFileSync(path.join(root, "script.js"), "utf8");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));

if (
  !dataset ||
  !Array.isArray(dataset.categories) ||
  dataset.categories.length < 11 ||
  !Array.isArray(dataset.categories[0].items) ||
  dataset.categories[0].items.length < 500
) {
  console.error(
    `data.json should be the multi-category library (11 categories with 500 items each).`
  );
  process.exit(1);
}

// Expected Telegram settings, read from script.js so this test always
// matches what the app actually sends.
const botToken = /const TELEGRAM_BOT_TOKEN = "([^"]*)"/.exec(scriptSrc)[1];
const chatId = /const TELEGRAM_CHAT_ID = "([^"]*)"/.exec(scriptSrc)[1];

const valueOf = new Map(dataset.categories[0].items.map((item) => [item.image, item.sizeGB]));
const nameOf = (n) => String(n).padStart(3, "0") + ".jpg"; // 5 -> "005.jpg"

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Boot the app inside a fresh JSDOM. Returns helpers plus a `tg` object
 * that controls and records every Telegram request:
 *   tg.calls            — captured { url, body } per sendDocument call
 *   tg.mode             — "instant" | "delayed" | "fail"
 *   tg.armDelayed()    — hold the next upload open until releaseGate()
 *   tg.releaseGate()   — let the held upload finish (success response)
 */
async function boot() {
  const virtualConsole = new VirtualConsole(); // swallow jsdom noise
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://localhost/",
    virtualConsole,
  });
  const { window } = dom;

  window.scrollTo = () => {};

  const tg = { calls: [], mode: "instant", gate: null, releaseGate: null };
  tg.armDelayed = () => {
    let resolve;
    tg.gate = new Promise((r) => (resolve = r));
    tg.releaseGate = () => resolve();
  };

  window.fetch = async (url, options) => {
    const u = String(url);
    if (u.includes("api.telegram.org")) {
      tg.calls.push({ url: u, body: options && options.body });
      if (tg.mode === "delayed") await tg.gate; // hold the request open
      if (tg.mode === "fail") {
        return { ok: false, status: 400, json: async () => ({ ok: false, description: "mock failure" }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    if (u.endsWith("data.json")) {
      return { ok: true, status: 200, json: async () => dataset };
    }
    throw new Error("unexpected fetch in test: " + u);
  };

  window.eval(
    scriptSrc +
      "\n;window.__t = { generateOrderText, createOrderFile, formatSize, calculateTotal };"
  );
  await tick(150); // let loadData() finish
  return { w: window, d: window.document, tg };
}

/* ============================================================
 * Scenario 1 — the complete user flow (checklist items 1–16)
 * ============================================================ */
(async () => {
  const { w, d, tg } = await boot();

  /* ---- 1. Open website ------------------------------------- */
  assert(
    d.getElementById("status-message").textContent === "" &&
      !d.getElementById("status-message").classList.contains("status-error"),
    "1: page opens with no error status"
  );
  assert(
    !d.getElementById("drive-view").hidden &&
      d.getElementById("gallery-view").hidden &&
      d.getElementById("form-view").hidden &&
      d.getElementById("review-view").hidden &&
      d.getElementById("success-view").hidden,
    "1: drive size question is the only visible screen at start"
  );

  // Pick the biggest drive (16 TB) so capacity never limits this flow, then enter the gallery.
  const driveSelect = d.getElementById("drive-select");
  driveSelect.value = "16384";
  driveSelect.dispatchEvent(new w.Event("change"));
  d.getElementById("start-selection-btn").click();
  assert(
    !d.getElementById("gallery-view").hidden &&
      d.getElementById("drive-view").hidden &&
      d.getElementById("drive-capacity-label").textContent === "16 TB",
    "1: choosing a drive size enters the gallery and stamps the meter capacity"
  );

  /* ---- 2. Images load ------------------------------------- */
  const firstBatch = [...d.querySelectorAll("#gallery .card")];
  assert(firstBatch.length === 50, "2: first batch renders exactly 50 cards");
  assert(
    firstBatch.every((c) => {
      const img = c.querySelector("img");
      return (
        img &&
        img.getAttribute("src") === `assets/${dataset.categories[0].id}/${c.dataset.image}` &&
        img.loading === "lazy" &&
        img.alt === c.dataset.image &&
        valueOf.has(c.dataset.image)
      );
    }),
    "2: every card has its JPG with the right src, lazy loading and alt text"
  );
  assert(
    d.querySelectorAll("#gallery .image-placeholder").length === 0,
    "2: no placeholders — all images are present in /assets"
  );

  // Rebrand plan Phase 6/12: each card shows its own size with label + unit.
  assert(
    firstBatch.every((c) => {
      const label = c.querySelector(".size-label");
      const valueEl = c.querySelector(".card-value");
      return (
        label &&
        label.textContent === "الحجم:" &&
        valueEl &&
        valueEl.textContent === `${valueOf.get(c.dataset.image)} GB`
      );
    }),
    "2: every card shows its own size (label + GB value from data.json)"
  );

  /* ---- 3. Search works ------------------------------------ */
  const searchInput = d.getElementById("search-input");
  const setQuery = (q) => {
    searchInput.value = q;
    searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  setQuery("123");
  assert(
    [...d.querySelectorAll("#gallery .card")].every((c) => c.dataset.image === "123.jpg") &&
      d.querySelectorAll("#gallery .card").length === 1,
    "3: search '123' shows exactly 123.jpg"
  );
  // "999" now fuzzy-matches 099.jpg (1 edit away); use a query with no close match.
  setQuery("zzz");
  assert(
    d.querySelectorAll("#gallery .card").length === 0 && !d.getElementById("no-results").hidden,
    "3: no matches shows the Arabic message"
  );
  d.getElementById("clear-search-btn").click();
  assert(
    searchInput.value === "" &&
      d.querySelectorAll("#gallery .card").length === 50 &&
      d.getElementById("clear-search-btn").hidden,
    "3: clearing the search restores the full list"
  );

  /* ---- 4–6. Select / unselect / total updates ------------- */
  const card = (n) => [...d.querySelectorAll("#gallery .card")].find((c) => c.dataset.image === nameOf(n));
  const clickCards = (...ns) => ns.forEach((n) => card(n).click());

  clickCards(5, 10, 42);
  assert(d.getElementById("selected-count").textContent === "3", "4: count = 3 after selecting three images");
  assert(
    w.__t.calculateTotal() === valueOf.get(nameOf(5)) + valueOf.get(nameOf(10)) + valueOf.get(nameOf(42)),
    "6: total adds the selected values"
  );
  assert(
    [5, 10, 42].every((n) => card(n).classList.contains("selected") && card(n).getAttribute("aria-pressed") === "true"),
    "4: selected cards show the selected state"
  );

  card(10).click(); // unselect one of them
  assert(d.getElementById("selected-count").textContent === "2", "5: count back to 2 after unselect");
  assert(
    w.__t.calculateTotal() === valueOf.get(nameOf(5)) + valueOf.get(nameOf(42)) &&
      !card(10).classList.contains("selected"),
    "6: total subtracts the unselected value"
  );

  /* ---- 7. Clear All works --------------------------------- */
  d.getElementById("clear-all-btn").click();
  assert(
    d.getElementById("selected-count").textContent === "0" &&
      w.__t.calculateTotal() === 0 &&
      d.querySelectorAll("#gallery .card.selected").length === 0,
    "7: Clear All resets count, total and every selected style"
  );

  /* ---- 8. Load More works --------------------------------- */
  const loadMoreBtn = d.getElementById("load-more-btn");
  assert(!loadMoreBtn.hidden, "8: Load More visible while more items remain");
  loadMoreBtn.click();
  assert(d.querySelectorAll("#gallery .card").length === 100, "8: second batch adds 50 cards (100 total)");
  loadMoreBtn.click();
  assert(
    d.querySelectorAll("#gallery .card").length === 150 && !loadMoreBtn.hidden,
    "8: third batch keeps working and the button stays visible"
  );

  /* ---- 9. Continue works ---------------------------------- */
  d.getElementById("continue-btn").click(); // still zero selections
  assert(
    !d.getElementById("continue-warning").hidden && !d.getElementById("gallery-view").hidden,
    "9: continue with zero selections shows the warning and stays on the gallery"
  );

  clickCards(5, 10, 42); // pick the order images (click order = TXT order)
  assert(d.getElementById("continue-warning").hidden, "9: warning hides once something is selected");
  d.getElementById("continue-btn").click();
  // The gallery-only buttons (Clear All / Continue) live inside the footer
  // bar, which is the element hidden outside the gallery view.
  assert(
    !d.getElementById("form-view").hidden && d.getElementById("gallery-view").hidden &&
      d.getElementById("summary-bar").hidden,
    "9: Continue opens the form view and hides the gallery-only summary bar"
  );

  /* ---- 10. Form validation works -------------------------- */
  const form = d.getElementById("customer-form");
  const submitForm = () => form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));

  submitForm(); // everything empty
  assert(
    d.getElementById("name-input-error").textContent === "الاسم مطلوب." &&
      d.getElementById("phone-input-error").textContent === "رقم الهاتف مطلوب." &&
      d.getElementById("address-input-error").textContent === "العنوان مطلوب.",
    "10: empty submit shows all three required-field errors"
  );
  assert(!d.getElementById("form-view").hidden, "10: invalid submit stays on the form view");

  d.getElementById("name-input").value = "أحمد";
  d.getElementById("address-input").value = "القاهرة";
  d.getElementById("phone-input").value = "abc"; // not a phone number
  submitForm();
  assert(
    d.getElementById("phone-input-error").textContent === "أدخل رقم هاتف صحيح." &&
      d.getElementById("name-input-error").textContent === "" &&
      d.getElementById("address-input-error").textContent === "",
    "10: bad phone format is rejected while valid fields pass"
  );

  const phoneInput = d.getElementById("phone-input");
  phoneInput.value = "01000000000";
  phoneInput.dispatchEvent(new w.Event("input", { bubbles: true })); // user fixes it
  assert(
    d.getElementById("phone-input-error").textContent === "",
    "10: fixing the field clears its error while typing"
  );

  /* ---- 11. Review screen is correct ----------------------- */
  d.getElementById("notes-input").value = "ملاحظة تجريبية";
  submitForm();
  assert(
    !d.getElementById("review-view").hidden && d.getElementById("form-view").hidden,
    "11: valid submit opens the review view"
  );

  const rows = [...d.querySelectorAll("#review-customer .review-row")].map((r) => [
    r.querySelector(".row-label").textContent,
    r.querySelector(".row-value-text").textContent,
  ]);
  assert(
    JSON.stringify(rows) ===
      JSON.stringify([
        ["حجم القرص", "16 TB"],
        ["الاسم", "أحمد"],
        ["رقم الهاتف", "01000000000"],
        ["العنوان", "القاهرة"],
        ["ملاحظات", "ملاحظة تجريبية"],
      ]),
    "11: review shows drive size, name, phone, address and the optional notes"
  );

  const reviewItems = [...d.querySelectorAll("#review-images li")];
  // Rebrand plan Phase 4: sizes display with a GB unit.
  // The first <li> is the category header, then the selected items.
  assert(
    reviewItems.length === 4 &&
      reviewItems[0].querySelector(".review-category-header") !== null &&
      [5, 10, 42].every((n, i) =>
        reviewItems[i + 1].textContent.startsWith(nameOf(n)) &&
        reviewItems[i + 1].textContent.endsWith(`${valueOf.get(nameOf(n))} GB`)
      ),
    "11: review lists every selected item with its value"
  );
  assert(
    d.getElementById("review-count").textContent === "3" &&
      d.getElementById("review-total").textContent === `${totalOf([5, 10, 42])} GB`,
    "11: review count and final total are correct"
  );

  /* ---- 12. TXT content is correct -------------------------- */
  // Rebrand plan Phase 10: readable DRIVE DEALS order format.
  const expectedTxt = [
    "DRIVE DEALS - NEW ORDER",
    "",
    "Customer:",
    "Name: أحمد",
    "Phone: 01000000000",
    "Address: القاهرة",
    "Drive Capacity: 16 TB",
    "",
    "Selected Content:",
    "",
    `${dataset.categories[0].name} (3 items, ${w.__t.formatSize(totalOf([5, 10, 42]))}):`,
    `1. ${nameOf(5)} - ${w.__t.formatSize(valueOf.get(nameOf(5)))}`,
    `2. ${nameOf(10)} - ${w.__t.formatSize(valueOf.get(nameOf(10)))}`,
    `3. ${nameOf(42)} - ${w.__t.formatSize(valueOf.get(nameOf(42)))}`,
    "",
    "Total Items: 3",
    `Estimated Total Size: ${w.__t.formatSize(totalOf([5, 10, 42]))}`,
    "",
    "Notes:",
    "ملاحظة تجريبية",
  ].join("\n");

  const txt = w.__t.generateOrderText();
  assert(txt === expectedTxt, "12: TXT content matches the expected order text exactly");

  const { blob, fileName } = w.__t.createOrderFile();
  assert(
    /^order-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(fileName) && (await blob.text()) === txt,
    "12: the .txt file name and Blob content are correct"
  );

  /* ---- 13 + 14. Telegram send works; button cannot be spammed */
  tg.armDelayed(); // hold the upload open so rapid clicks land mid-send
  const sendBtn = d.getElementById("send-order-btn");
  for (let i = 0; i < 5; i++) sendBtn.click();

  assert(tg.calls.length === 1, "14: five rapid Send clicks produce exactly one Telegram request");
  assert(
    sendBtn.disabled && sendBtn.textContent === "جارٍ الإرسال...",
    "14: the Send button stays disabled with 'Sending…' while sending"
  );

  const call = tg.calls[0];
  assert(call.url === `https://api.telegram.org/bot${botToken}/sendDocument`, "13: request goes to the configured bot's sendDocument endpoint");
  assert(call.body.get("chat_id") === chatId, "13: FormData carries the configured chat id");
  const doc = call.body.get("document");
  assert(
    doc && /^order-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(doc.name) && doc.type === "text/plain",
    "13: the TXT document is attached with the right name and type"
  );
  assert(
    call.body.get("caption") ===
      `DRIVE DEALS - NEW ORDER | Items: 3 | Estimated Total Size: ${w.__t.formatSize(totalOf([5, 10, 42]))} | Drive: 16 TB`,
    "13: the caption mirrors the new order format (brand, count, total, drive)"
  );

  /* ---- 15. Success screen appears -------------------------- */
  tg.releaseGate(); // let the held upload finish (success response)
  await tick(150);
  assert(
    !d.getElementById("success-view").hidden && d.getElementById("review-view").hidden,
    "15: success screen appears after Telegram accepts the file"
  );
  assert(
    d.getElementById("success-total").textContent === `${totalOf([5, 10, 42])} GB` &&
      d.getElementById("send-status").textContent === "",
    "15: success screen shows the final total and no stale status message"
  );

  /* ---- 16. New Order resets everything --------------------- */
  d.getElementById("new-order-btn").click();
  assert(
    !d.getElementById("drive-view").hidden &&
      d.getElementById("gallery-view").hidden &&
      d.getElementById("form-view").hidden &&
      d.getElementById("review-view").hidden &&
      d.getElementById("success-view").hidden,
    "16: New Order returns to the drive size question"
  );
  assert(
    d.getElementById("selected-count").textContent === "0" &&
      w.__t.calculateTotal() === 0 &&
      d.querySelectorAll("#gallery .card.selected").length === 0,
    "16: selections and summary are reset"
  );
  assert(searchInput.value === "", "16: search is cleared");
  assert(
    ["name-input", "phone-input", "address-input", "notes-input"].every((id) => d.getElementById(id).value === ""),
    "16: all form fields are cleared"
  );
  assert(
    d.querySelectorAll("#review-images li").length === 0 &&
      d.getElementById("review-count").textContent === "0" &&
      d.getElementById("review-total").textContent === "0 GB",
    "16: review screen is rebuilt empty"
  );
  assert(
    !sendBtn.disabled && sendBtn.textContent === "تأكيد وإرسال الطلب",
    "16: the Send button is restored for a fresh order"
  );

  // The app must be fully usable after the reset.
  card(1).click();
  assert(
    d.getElementById("selected-count").textContent === "1" &&
      w.__t.calculateTotal() === valueOf.get(nameOf(1)),
    "16: selecting an image right after New Order works normally"
  );

  console.log("\nFULL FLOW PASSED (items 1–16)");

  /* ============================================================
   * Scenario 2 — failed upload keeps the order (Phase 15 behavior)
   * ============================================================ */
  const s2 = await boot();
  const d2 = s2.d;

  [...d2.querySelectorAll("#gallery .card")].find((c) => c.dataset.image === nameOf(1)).click();
  d2.getElementById("name-input").value = "أحمد";
  d2.getElementById("phone-input").value = "01000000000";
  d2.getElementById("address-input").value = "القاهرة";
  d2.getElementById("customer-form").dispatchEvent(new s2.w.Event("submit", { bubbles: true, cancelable: true }));

  s2.tg.mode = "fail"; // Telegram rejects the upload
  d2.getElementById("send-order-btn").click();
  await tick(150);

  assert(
    !d2.getElementById("review-view").hidden &&
      d2.getElementById("success-view").hidden,
    "F: a failed send stays on the review screen (no success)"
  );
  const status = d2.getElementById("send-status");
  assert(
    status.textContent === "حدث خطأ أثناء الإرسال، حاول مرة أخرى." &&
      status.classList.contains("send-status-error"),
    "F: the Arabic error message is shown"
  );
  const sendBtn2 = d2.getElementById("send-order-btn");
  assert(
    !sendBtn2.disabled && sendBtn2.textContent === "تأكيد وإرسال الطلب",
    "F: the Send button is re-enabled after a failure"
  );
  assert(
    d2.getElementById("selected-count").textContent === "1" &&
      s2.w.__t.calculateTotal() === valueOf.get(nameOf(1)),
    "F: the order (selection + total) is preserved after a failure"
  );

  console.log("\nALL FULL-FLOW TESTS PASSED");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

function totalOf(nums) {
  return nums.reduce((sum, n) => sum + valueOf.get(nameOf(n)), 0);
}
