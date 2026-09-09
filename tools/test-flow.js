// ============================================================
// End-to-end smoke tests (run in Node, no browser).
// Covers the main user flow plus Phase 21 (missing images)
// and Phase 22 (data validation).
// Usage: npm test   (or: node tools/test-flow.js)
// Requires the dev dependency "jsdom".
// ============================================================

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptSrc = fs.readFileSync(path.join(root, "script.js"), "utf8");

function makeDataset(n) {
  const items = [];
  for (let i = 1; i <= n; i++) {
    items.push({ image: String(i).padStart(3, "0") + ".jpg", value: i * 5 });
  }
  return items;
}

async function boot(dataset) {
  const virtualConsole = new VirtualConsole(); // swallow jsdom noise (scrollTo etc.)
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const { window } = dom;

  window.scrollTo = () => {};
  window.URL.createObjectURL = () => "blob:test-url";
  window.URL.revokeObjectURL = () => {};

  // Stub fetch so data.json comes from memory.
  window.fetch = async () => ({ ok: true, status: 200, json: async () => dataset });

  // Run the app script inside this DOM; expose a few internals for assertions.
  window.eval(
    scriptSrc +
      "\n;window.__t = { get state() { return state; }, generateOrderText, createOrderFile, calculateTotal, formatSize };"
  );

  await new Promise((r) => setTimeout(r, 50)); // let loadData() finish
  return window;
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("ok -", msg);
}

(async () => {
  /* ---------- Scenario A: 10-item dataset, full user flow ---------- */
  const scenarioAData = makeDataset(10);
  let w = await boot(scenarioAData);
  let d = w.document;

  // The app now starts on the drive size question, before the gallery.
  assert(
    !d.getElementById("drive-view").hidden &&
      d.getElementById("gallery-view").hidden &&
      !d.getElementById("start-selection-btn").disabled,
    "A: first screen is the drive size question with 320 GB preselected (start enabled)"
  );
  assert(
    w.__t.state.driveCapacityGB === 320,
    "A: default drive capacity is 320 GB"
  );
  assert(d.querySelectorAll("#gallery .card").length === 10, "A: all 10 cards rendered");
  assert(
    d.getElementById("load-more-btn").hidden,
    "A: Load More hidden when everything fits in one batch"
  );

  // Phase 6 — selection + summary bar.
  const cards = () => [...d.querySelectorAll("#gallery .card")];
  const valueOf = (i) => scenarioAData[i].value;
  cards()[0].click();
  cards()[2].click();
  assert(d.getElementById("selected-count").textContent === "2", "A: count = 2 after two selections");
  // The footer number is now a storage meter; the calculation itself is unchanged.
  assert(
    w.__t.calculateTotal() === valueOf(0) + valueOf(2),
    "A: total adds the selected values"
  );

  cards()[0].click(); // unselect the first card
  assert(d.getElementById("selected-count").textContent === "1", "A: count back to 1 after unselect");
  assert(
    w.__t.calculateTotal() === valueOf(2),
    "A: total subtracts correctly on unselect"
  );

  d.getElementById("clear-all-btn").click();
  assert(d.getElementById("selected-count").textContent === "0", "A: Clear All resets count");
  assert(
    d.querySelectorAll("#gallery .card.selected").length === 0,
    "A: Clear All removes every selected style"
  );

  // Phase 9 — Continue blocked with zero selections.
  d.getElementById("continue-btn").click();
  assert(!d.getElementById("continue-warning").hidden, "A: warning shown when continuing with zero selections");

  const v5 = valueOf(4); // value of 005.jpg
  cards()[4].click(); // select 005.jpg
  assert(d.getElementById("continue-warning").hidden, "A: warning hides once something is selected");
  d.getElementById("continue-btn").click();
  assert(
    !d.getElementById("form-view").hidden && d.getElementById("gallery-view").hidden,
    "A: Continue opens the form view"
  );

  // Phase 10 — validation.
  const form = d.getElementById("customer-form");
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(
    d.getElementById("name-input-error").textContent === "الاسم مطلوب.",
    "A: empty name shows Arabic error"
  );
  assert(!d.getElementById("form-view").hidden, "A: still on form view after invalid submit");

  d.getElementById("name-input").value = "أحمد";
  d.getElementById("phone-input").value = "01000000000";
  d.getElementById("address-input").value = "القاهرة";
  d.getElementById("notes-input").value = "ملاحظة تجريبية";
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(
    !d.getElementById("review-view").hidden && d.getElementById("form-view").hidden,
    "A: valid submit opens the review view"
  );

  // Phase 11 — review content.
  const reviewItems = [...d.querySelectorAll("#review-images li")].map((li) => li.textContent);
  // Rebrand plan Phase 4: sizes display with a GB unit.
  // The first <li> is the category header, then the selected items.
  assert(
    reviewItems.length === 2 &&
    reviewItems[0].includes("ألعاب") &&
    reviewItems[1].startsWith("005.jpg") &&
    reviewItems[1].endsWith(`${v5} GB`),
    "A: review lists the selected image with its value"
  );
  assert(d.getElementById("review-count").textContent === "1", "A: review count = 1");
  assert(
    d.getElementById("review-total").textContent === `${v5} GB`,
    "A: review total matches the selected value"
  );

  // Phase 12 — TXT generation (rebrand plan Phase 10 format).
  const txt = w.__t.generateOrderText();
  assert(
    txt.startsWith("DRIVE DEALS - NEW ORDER") &&
      txt.includes("Name: أحمد") &&
      txt.includes("Phone: 01000000000"),
    "A: TXT contains the DRIVE DEALS header and customer info"
  );
  assert(
    txt.includes(`1. 005.jpg - ${w.__t.formatSize(v5)}`),
    "A: TXT lists the game numbered with its size"
  );
  assert(
    txt.includes("Total Items: 1") &&
      txt.includes(`Estimated Total Size: ${w.__t.formatSize(v5)}`) &&
      txt.endsWith("Notes:\nملاحظة تجريبية"),
    "A: TXT has count, final total and the notes section"
  );

  const { blob, fileName } = w.__t.createOrderFile();
  assert(
    /^order-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(fileName),
    "A: file name format order-YYYY-MM-DD-HH-MM.txt"
  );
  if (typeof blob.text === "function") {
    const body = await blob.text();
    assert(body === txt, "A: Blob contains the full order text");
  }

  /* ---------- Scenario B: 120 items — batching + search (Phases 7–8) ---------- */
  w = await boot(makeDataset(120));
  d = w.document;

  assert(d.querySelectorAll("#gallery .card").length === 50, "B: first batch renders exactly 50 cards");
  const loadMoreBtn = d.getElementById("load-more-btn");
  assert(!loadMoreBtn.hidden, "B: Load More visible while more items remain");
  loadMoreBtn.click();
  assert(d.querySelectorAll("#gallery .card").length === 100, "B: second batch adds 50 cards");
  loadMoreBtn.click();
  assert(
    d.querySelectorAll("#gallery .card").length === 120 &&
      d.getElementById("load-more-btn").hidden,
    "B: final batch renders the rest and hides itself"
  );

  // Selection survives search + re-render.
  const card5 = [...d.querySelectorAll("#gallery .card")].find(
    (c) => c.dataset.image === "005.jpg"
  );
  card5.click();

  const searchInput = d.getElementById("search-input");
  searchInput.value = "120";
  searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(
    d.querySelectorAll("#gallery .card").length === 1,
    "B: search '120' shows exactly one card (120.jpg)"
  );

  // "999" would now fuzzy-match "099.jpg" (1 edit away) — a query with no
  // close match must still show the Arabic no-results message.
  searchInput.value = "zzz";
  searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(
    d.querySelectorAll("#gallery .card").length === 0 && !d.getElementById("no-results").hidden,
    "B: no matches shows the Arabic message"
  );

  d.getElementById("clear-search-btn").click();
  const card5Again = [...d.querySelectorAll("#gallery .card")].find(
    (c) => c.dataset.image === "005.jpg"
  );
  assert(
    card5Again && card5Again.classList.contains("selected"),
    "B: selection survives search + re-render"
  );

  /* ---------- Scenario C: missing image file (Phase 21) ---------- */
  w = await boot(makeDataset(5));
  d = w.document;

  const cCard = d.querySelector('#gallery .card[data-image="001.jpg"]');
  cCard.querySelector("img").dispatchEvent(new w.Event("error"));

  assert(cCard.classList.contains("unavailable"), "C: card marked unavailable after image error");
  assert(!!cCard.querySelector(".image-placeholder"), "C: placeholder shown for the missing JPG");
  assert(
    cCard.querySelector(".card-name").textContent === "001.jpg",
    "C: file name stays visible on an unavailable card"
  );
  const cBadge = cCard.querySelector(".unavailable-badge");
  assert(cBadge && cBadge.textContent === "غير متاحة", "C: unavailable badge present");

  const healthyCard = d.querySelector('#gallery .card[data-image="002.jpg"]');
  assert(
    !healthyCard.classList.contains("unavailable") && !!healthyCard.querySelector("img"),
    "C: cards with a valid image are untouched"
  );

  /* ---------- Scenario D: invalid data records are skipped (Phase 22) ---------- */
  const badData = [
    { image: "001.jpg", value: 10 },   // valid
    { image: "002.png", value: 5 },    // wrong extension
    { value: 7 },                       // missing image name
    { image: "003.jpg" },              // missing value
    { image: "004.jpg", value: "12" }, // string, not a number
    { image: "005.jpg", value: NaN },  // NaN value
    { image: "006.jpg", value: 6 },    // valid
    { image: "006.jpg", value: 99 },   // duplicate name (skipped)
  ];
  w = await boot(badData);
  d = w.document;

  const dNames = [...d.querySelectorAll("#gallery .card")].map((c) => c.dataset.image);
  assert(
    dNames.length === 2 && dNames[0] === "001.jpg" && dNames[1] === "006.jpg",
    "D: only valid, unique records are rendered"
  );

  d.querySelector('#gallery .card[data-image="006.jpg"]').click();
  assert(
    w.__t.calculateTotal() === 6 && d.getElementById("selected-count").textContent === "1",
    "D: totals use the validated values"
  );

  /* ---------- Scenario E: data.json is not an array (Phase 22) ---------- */
  w = await boot({ not: "an array" });
  d = w.document;
  assert(
    d.querySelectorAll("#gallery .card").length === 0,
    "E: non-array data renders no cards without crashing"
  );

  /* ---------- Scenario F: drive size question + storage meter + drive full ---------- */
  const fData = [1, 2, 3, 4, 5].map((i) => ({ image: `${i}.jpg`, value: 256 }));
  w = await boot(fData);
  d = w.document;

  const fSelect = d.getElementById("drive-select");
  assert(fSelect.options.length === 13, "F: dropdown offers all drive sizes + custom + placeholder");
  assert(
    !d.getElementById("start-selection-btn").disabled,
    "F: start is already enabled at boot (320 GB default)"
  );

  fSelect.value = "1024"; // 1 TB
  fSelect.dispatchEvent(new w.Event("change"));
  assert(
    !d.getElementById("start-selection-btn").disabled && fSelect.value === "1024",
    "F: picking a size enables the start button"
  );

  d.getElementById("start-selection-btn").click();
  assert(
    !d.getElementById("gallery-view").hidden &&
      d.getElementById("drive-view").hidden &&
      !d.getElementById("summary-bar").hidden,
    "F: choosing a size enters the gallery with the meter visible"
  );
  assert(
    d.getElementById("drive-capacity-label").textContent === "1 TB" &&
      d.getElementById("drive-remaining").textContent === "متبقٍ: 1 TB" &&
      d.getElementById("drive-bar-fill").style.width === "0%",
    "F: meter starts empty at full capacity"
  );

  // Four 256 GB games = exactly 1 TB -> drive completely full.
  const fCards = [...d.querySelectorAll("#gallery .card")];
  fCards[0].click();
  fCards[1].click();
  fCards[2].click();
  fCards[3].click();
  assert(
    d.getElementById("drive-bar-fill").style.width === "100%" &&
      d.getElementById("drive-bar-fill").classList.contains("full") &&
      d.getElementById("drive-remaining").textContent === "متبقٍ: 0 GB",
    "F: bar is red and 100% when the drive is exactly full"
  );
  assert(
    !d.getElementById("drive-full-warning").hidden,
    "F: 'no more space' message shows when the drive is full"
  );

  // The fifth game must be rejected: no selection, no crash.
  fCards[4].click();
  assert(
    fCards[4].getAttribute("aria-pressed") === "false" &&
      d.getElementById("selected-count").textContent === "4" &&
      !d.getElementById("drive-full-warning").hidden,
    "F: an overflowing game is not added"
  );

  // Freeing space hides the message and updates the meter readout.
  fCards[0].click();
  assert(
    d.getElementById("drive-full-warning").hidden &&
      d.getElementById("drive-remaining").textContent === "متبقٍ: 256 GB" &&
      d.getElementById("drive-bar-fill").style.width === "75%",
    "F: removing a game frees space and hides the warning"
  );

  // The chosen capacity is part of the order.
  assert(
    w.__t.generateOrderText().includes("Drive Capacity: 1 TB"),
    "F: order TXT includes the drive capacity"
  );

  /* ---------- Scenario G: custom drive size (user types their own GB) ---------- */
  w = await boot([{ image: "1.jpg", value: 100 }]);
  d = w.document;

  const gSelect = d.getElementById("drive-select");
  const gInput = d.getElementById("custom-size-input");
  const gStart = d.getElementById("start-selection-btn");

  gSelect.value = "custom";
  gSelect.dispatchEvent(new w.Event("change"));
  assert(
    !d.getElementById("custom-size-row").hidden && gStart.disabled,
    "G: picking 'custom' shows the GB input; start stays disabled until a value is typed"
  );

  gInput.value = "777";
  gInput.dispatchEvent(new w.Event("input"));
  assert(
    !gStart.disabled && w.__t.state.driveCapacityGB === 777,
    "G: typing a size sets the capacity and enables the start button"
  );

  d.getElementById("start-selection-btn").click();
  assert(
    d.getElementById("drive-capacity-label").textContent === "777 GB" &&
      !d.getElementById("gallery-view").hidden,
    "G: the custom size becomes the drive capacity in the gallery"
  );

  // An invalid (empty) custom size keeps the start button disabled.
  const gSelect2 = d.getElementById("drive-select");
  gSelect2.value = "custom";
  gSelect2.dispatchEvent(new w.Event("change"));
  gInput.value = "";
  gInput.dispatchEvent(new w.Event("input"));
  assert(
    gStart.disabled && w.__t.state.driveCapacityGB === 0,
    "G: emptying the custom input disables start again"
  );

  // Switching back to a fixed size hides the custom row and resets the capacity.
  gSelect2.value = "2048";
  gSelect2.dispatchEvent(new w.Event("change"));
  assert(
    d.getElementById("custom-size-row").hidden &&
      w.__t.state.driveCapacityGB === 2048,
    "G: picking a fixed size again hides the custom row"
  );

  /* ---------- Scenario H: typo-tolerant search (1–2 wrong letters, EN + AR) ---------- */
  const hData = {
    categories: [
      {
        id: "hcat",
        name: "تصنيف اختبار",
        items: [
          { image: "h1.jpg", title: "Drive Deals: Season One", sizeGB: 10 },
          { image: "h2.jpg", title: "The Great Adventure", sizeGB: 20 },
          { image: "h3.jpg", title: "\u0627\u0644\u0625\u0645\u0628\u0631\u0627\u0637\u0648\u0631 \u0627\u0644\u0639\u0636\u0645\u0649", sizeGB: 30 },
          { image: "h4.jpg", title: "Crude Oil", sizeGB: 40 },
        ],
      },
    ],
  };
  w = await boot(hData);
  d = w.document;
  const hInput = d.getElementById("search-input");
  const hSearch = (term) => {
    hInput.value = term;
    hInput.dispatchEvent(new w.Event("input"));
  };
  const hVisibleTitles = () =>
    [...d.querySelectorAll("#gallery .card .card-name")].map((el) => el.textContent);

  // Exact search still works and wins instantly.
  hSearch("drive");
  assert(
    hVisibleTitles().join(",") === "Drive Deals: Season One",
    "H: exact search still finds the item"
  );

  // One misspelled word ("drpe deals" — 2 edits on the first word).
  hSearch("drpe deals");
  assert(
    hVisibleTitles().join(",") === "Drive Deals: Season One",
    "H: 'drpe deals' (typos) still finds 'Drive Deals: Season One'"
  );

  // Two misspelled words (1 edit each = 2 total).
  hSearch("the grte advnture");
  assert(
    hVisibleTitles().join(",") === "The Great Adventure",
    "H: 'the grte advnture' finds 'The Great Adventure'"
  );

  // Arabic: dropped letter (ط) + non-normalized alif/hamza spelling.
  hSearch("\u0627\u0644\u0627\u0645\u0628\u0631\u0637\u0648\u0631 \u0627\u0644\u0639\u0636\u0645\u0649");
  assert(
    hVisibleTitles().join(",") === "\u0627\u0644\u0625\u0645\u0628\u0631\u0627\u0637\u0648\u0631 \u0627\u0644\u0639\u0636\u0645\u0649",
    "H: Arabic query with a dropped letter + variant spelling finds the title"
  );

  // Nothing within budget → no results (no false positives).
  hSearch("xyz deals");
  assert(
    d.querySelectorAll("#gallery .card").length === 0 &&
      !d.getElementById("no-results").hidden,
    "H: query with no close match shows no results"
  );

  // A different category's items never leak into the search.
  hSearch("crude");
  assert(
    hVisibleTitles().join(",") === "Crude Oil",
    "H: search stays inside the active category"
  );

  console.log("\nALL TESTS PASSED");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
