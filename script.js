// ============================================================
// DRIVE DEALS V1.1 — media library (single-page static app)
// "Liquid Glass" UI edition.
//
// This file keeps 100% of the V1.0 business logic and data flow:
//   * library normalization + validation (data.json)
//   * typo-tolerant search (English + Arabic)
//   * category tabs, file-size range filter
//   * drive-capacity engine (selection is blocked past the chosen size)
//   * infinite scroll / Load More batching
//   * review screen, order .txt generation, Telegram Bot API upload
//   * procedural Web Audio sound effects
//
// What changed in V1.1 is presentation only:
//   * category <select>  -> glass category tabs
//   * drive size <select> -> glass capacity pills + crystal tube reservoir
//   * banner slides     -> glass carousel with "add to drive" quick action
//   * footer summary bar -> floating spatial dock
//   * cards             -> glass poster cards
//
// No frameworks, no build step. Works on any static host
// (GitHub Pages / Netlify / Cloudflare Pages).
// ============================================================

// ------------------------------------------------------------
// Telegram delivery
// ------------------------------------------------------------
// TELEGRAM_PROXY_URL (optional security upgrade):
// Leave it empty and the browser calls the Telegram Bot API directly
// (V1.0 behaviour — the bot token is then visible in page source).
// Set it to a same-origin serverless endpoint to keep the token on
// the server instead. See telegram-proxy-worker.js in the project
// root for a ready-to-deploy Cloudflare Worker.
const TELEGRAM_BOT_TOKEN = "8876959540:AAGjT9zdwYctpueEI24uBQYx-P2fEALqXgA";
const TELEGRAM_CHAT_ID = "992199091";
const TELEGRAM_PROXY_URL = ""; // e.g. "/api/telegram-order"

// The app starts on the drive size question; the gallery only
// opens after a size is chosen, so the drive capacity is always
// known before anything is selected.
const DRIVE_SIZES_GB = [
  { label: "320 GB", value: 320 },
  { label: "500 GB", value: 500 },
  { label: "1 TB", value: 1024 },
  { label: "2 TB", value: 2048 },
  { label: "3 TB", value: 3072 },
  { label: "4 TB", value: 4096 },
  { label: "6 TB", value: 6144 },
  { label: "8 TB", value: 8192 },
  { label: "10 TB", value: 10240 },
  { label: "12 TB", value: 12288 },
  { label: "16 TB", value: 16384 },
];

// Lazy loading: cards are appended in batches this many items
// wide; the rest stays behind the "Load More" button.
const BATCH_SIZE = 50;

// A single media item. Every field is optional; validation fills
// in what is missing and skips records that cannot be used.
//   id     — unique identifier (category id + image file)
//   title  — the name shown to the user
//   image  — file name inside the category's assets folder:
//              assets/<categoryId>/<image> (so the full path is assets/<id>)
//   sizeGB — size in gigabytes (number)
//   category — back-reference to the owning category (assigned by
//              normalizeLibrary, never stored in data.json)
// ============================================================

function mediaItem({ id, title, image, sizeGB, year = null, category = null }) {
  return { id, title, image, sizeGB, year, category };
}

function makeCategory({ id, name, items = [] }) {
  return {
    id,
    name,
    items: items.map((item) => mediaItem({ ...item, category: null })),
  };
}

// ============================================================
// Data loading — normalizes any supported data.json format into
// { categories: [{ id, name, items: [...] }] }.
// ============================================================

/**
 * True if `raw` is the current object format
 * ({ categories: [...] }).
 */
function isLibraryObject(raw) {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.categories);
}

/**
 * Turn a legacy flat record ({ image, value }) into a media item.
 * The raw value is passed through untouched so the validator can
 * report the original problem (string, NaN, ...).
 */
function legacyToMediaItem(rec) {
  return { image: rec.image, title: rec.image, sizeGB: rec.value };
}

/**
 * Normalize any supported raw data.json payload into the current
 * library shape. Returns null when the payload is unusable.
 */
function normalizeLibrary(raw) {
  if (Array.isArray(raw)) {
    // Legacy format: one flat list of { image, value } records.
    // Kept so old exports and the Phase-1 dataset keep working.
    return {
      categories: [
        {
          id: "legacy",
          name: "ألعاب",
          items: raw.map(legacyToMediaItem),
        },
      ],
    };
  }
  if (isLibraryObject(raw)) {
    return { categories: raw.categories };
  }
  return null;
}

/**
 * Validate the normalized library in place:
 *   - item fields (id, title, image, sizeGB) are filled in / checked
 *   - records with missing/invalid fields or duplicate ids are
 *     skipped (one console.warn each) — the rest of the library
 *     always loads.
 * Returns the list of valid items grouped per category.
 */
function validateLibrary(loaded) {
  const validItems = new Map(); // id -> item
  const validByCategory = new Map(); // category id -> [item]
  for (const category of loaded.categories) {
    if (!category || typeof category.name !== "string" || category.name.trim() === "") {
      console.warn("Skipping category: missing or empty name.");
      continue;
    }
    const catId = category.id || category.name;
    for (const rec of category.items || []) {
      if (!rec) continue;
      const image = typeof rec.image === "string" ? rec.image.trim() : "";
      const sizeGB = rec.sizeGB;
      const okSize = typeof sizeGB === "number" && Number.isFinite(sizeGB) && sizeGB > 0;
      if (image === "" || !image.toLowerCase().endsWith(".jpg")) {
        console.warn(`Skipping invalid record (missing image or wrong extension): ${JSON.stringify(rec)}`);
        continue;
      }
      if (!okSize) {
        console.warn(`Skipping invalid record (bad sizeGB) for ${image}: ${JSON.stringify(rec)}`);
        continue;
      }
      const id = rec.id || `${catId}/${image}`;
      if (validItems.has(id) || (validByCategory.get(catId) || []).some((it) => it.image === image)) {
        console.warn(`Skipping duplicate record for ${image}.`);
        continue;
      }
      const title =
        typeof rec.title === "string" && rec.title.trim() !== "" ? rec.title : image;
      let year = null;
      if (typeof rec.year === "number" && Number.isFinite(rec.year)) {
        year = rec.year;
      } else if (typeof rec.year === "string") {
        const parsed = parseInt(rec.year, 10);
        if (Number.isFinite(parsed)) year = parsed;
      }
      if (!year) {
        const match = title.match(/\b(19\d\d|20\d\d)\b/);
        if (match) year = parseInt(match[1], 10);
      }
      const item = mediaItem({ id, title, image, sizeGB, year });
      // Search indexes (matching only — the title itself is never modified).
      item._norm = normalizeSearchText(title);
      item._chars = new Set(item._norm.replace(/\s+/g, ""));
      item.category = null; // set below once the category object exists
      validItems.set(id, item);
      if (!validByCategory.has(catId)) validByCategory.set(catId, []);
      validByCategory.get(catId).push(item);
    }
  }

  const categories = [];
  for (const category of loaded.categories) {
    const catId = (category && (category.id || category.name)) || "";
    const items = validByCategory.get(catId);
    if (!items) continue;
    const cat = makeCategory({ id: catId, name: category.name, items: [] });
    cat.id = catId;
    cat.items = items.map((it) => {
      it.category = cat;
      return it;
    });
    categories.push(cat);
  }
  return { categories };
}

/**
 * Fetch data.json, normalize it and store it. On failure the page
 * shows the Arabic error message and stays empty (no crash).
 */
async function loadData() {
  const statusEl = document.getElementById("status-message");
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`data.json responded with HTTP ${res.status}`);
    const raw = await res.json();
    const normalized = normalizeLibrary(raw);
    if (!normalized) {
      throw new Error("data.json has an unrecognized format.");
    }
    const library = validateLibrary(normalized);
    state.categories = library.categories;
    state.mediaItems = library.categories.flatMap((c) => c.items);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "تعذر تحميل بيانات المكتبة، حاول لاحقًا.";
    statusEl.classList.add("status-error");
  }
}

// ============================================================
// State — one object so tests can observe (and reset) everything.
//   categories   — every category, in data.json order
//   mediaItems   — flat list of all items (search + lookup by id)
//   selectedItems— Map<id, item>, insertion order = selection order
//   activeCategoryId — the category currently shown in the gallery
//   searchTerm   — live text from the search box
//   sizeFilter   — { min, max } GB bounds from the size filter
// ============================================================
const state = {
  categories: [],
  mediaItems: [],
  selectedItems: new Map(),
  activeCategoryId: null,
  searchTerm: "",
  sizeFilter: { min: null, max: null },
  yearFilter: { min: null, max: null },
  driveCapacityGB: 0,
};

function itemById(id) {
  return state.mediaItems.find((item) => item.id === id);
}

function activeCategory() {
  return state.categories.find((c) => c.id === state.activeCategoryId) || state.categories[0];
}

function selectedItems() {
  return [...state.selectedItems.values()];
}

function getSelectedItemsByCategory() {
  const grouped = [];
  for (const category of state.categories) {
    const items = selectedItems().filter((item) => item.category === category);
    if (items.length > 0) grouped.push({ category, items });
  }
  return grouped;
}

// ============================================================
// Typo-tolerant search (English + Arabic).
// Strategy: exact substring first (cheap); only when nothing matches
// do we run fuzzy matching, where every query word must be within a
// small edit distance of *some substring* of the normalized title.
// A distinct-letter set per item rejects 99% of non-matches in O(1)
// checks before any dynamic programming runs.
// ============================================================

// Matching-only normalization: casefold, fold common Arabic variants
// (أ/إ/آ → ا, ى/ی → ي, ة → ه), drop ء + diacritics/tatweel, map
// Arabic-Indic digits, collapse whitespace. Titles are never modified.
function normalizeSearchText(raw) {
  if (typeof raw !== "string") return "";
  const text = raw
    .toLowerCase()
    .replace(/[\u064b-\u0652\u0640]/g, "") // diacritics, tanween, tashdid, tatweel
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // أ إ آ → ا
    .replace(/[\u064a\u06cc]/g, "\u064a") // ى ى(Persian ی) → ي
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0621/g, "") // ء (often dropped while typing)
    .replace(/[\u0660-\u0669]/g, (ch) => String("\u0660".indexOf(ch))); // ٠-٩ → 0-9
  return text.replace(/\s+/g, " ").trim();
}

// Per-word typo budget by word length. 3-letter words get 1 edit (2 edits
// would be >50% of the word); 4+ letter words get 2 (the "1–2 wrong
// character" case, e.g. "drpe" → "drive").
function fuzzyTolerance(wordLength) {
  return wordLength >= 4 ? 2 : wordLength === 3 ? 1 : 0;
}

// Minimum edit distance between `word` and any substring of `title`
// (classic approximate substring DP, O(m·n)).
function minEditDistanceToSubstring(title, word) {
  const m = word.length;
  const n = title.length;
  if (m === 0) return 0;
  let prev = new Array(n + 1).fill(0); // D[0][j] = 0: match may start anywhere
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = word.charCodeAt(i - 1) === title.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1; // drop word[i-1]
      const sub = prev[j - 1] + cost; // match / substitute title[j-1]
      const ins = cur[j - 1] + 1; // skip title[j-1]
      cur[j] = del < sub ? (del < ins ? del : ins) : sub < ins ? sub : ins;
    }
    prev = cur;
  }
  let best = Infinity;
  for (let j = 0; j <= n; j++) if (prev[j] < best) best = prev[j];
  return best;
}

// Score one item against a normalized query: total typos (0..FUZZY_MAX_ERRORS)
// or -1 when the title is too far away.
const FUZZY_MAX_ERRORS = 2;

function fuzzyTitleScore(item, queryNorm) {
  let total = 0;
  for (const word of queryNorm.split(" ")) {
    if (word === "") continue;
    const tol = fuzzyTolerance(word.length);
    if (item._norm.includes(word)) continue; // exact — cheapest check first
    if (tol === 0) return -1;
    // Cheap prefilter: >tol *distinct* letters of the word missing from the
    // title can never be repaired by tol edits.
    const seen = new Set();
    let missing = 0;
    for (const ch of word) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      if (!item._chars.has(ch)) missing++;
      if (missing > tol) return -1;
    }
    const dist = minEditDistanceToSubstring(item._norm, word);
    if (dist > tol) return -1;
    total += dist;
    if (total > FUZZY_MAX_ERRORS) return -1;
  }
  return total;
}

function matchesSizeFilter(item) {
  const { min, max } = state.sizeFilter;
  if (min !== null && item.sizeGB < min) return false;
  if (max !== null && item.sizeGB > max) return false;
  return true;
}

/** Same bounds as the size filter, applied to the release year instead. */
function matchesYearFilter(item) {
  const { min, max } = state.yearFilter;
  if (min === null && max === null) return true;
  if (item.year === null || item.year === undefined) return false; // unknown year never matches a range
  if (min !== null && item.year < min) return false;
  if (max !== null && item.year > max) return false;
  return true;
}

/** Both range filters have to pass. */
function matchesRangeFilters(item) {
  return matchesSizeFilter(item) && matchesYearFilter(item);
}

function visibleItems() {
  const category = activeCategory();
  if (!category) return [];
  const term = normalizeSearchText(state.searchTerm);
  const base =
    term === ""
      ? category.items
      : category.items.filter((item) => item._norm.includes(term) && matchesRangeFilters(item));
  if (term !== "" && base.length > 0) return base; // exact hits win
  // Nothing matched exactly — tolerate 1–2 typos across the whole query.
  if (term === "") return category.items.filter(matchesRangeFilters);
  const ranked = [];
  for (let i = 0; i < category.items.length; i++) {
    const item = category.items[i];
    if (!matchesRangeFilters(item)) continue;
    const score = fuzzyTitleScore(item, term);
    if (score >= 0) ranked.push({ item, score, order: i });
  }
  ranked.sort((a, b) => a.score - b.score || a.order - b.order);
  return ranked.map((entry) => entry.item);
}

function hasActiveFilters() {
  return (
    state.searchTerm.trim() !== "" ||
    state.sizeFilter.min !== null ||
    state.sizeFilter.max !== null ||
    state.yearFilter.min !== null ||
    state.yearFilter.max !== null
  );
}

// ============================================================
// Rendering
// ============================================================
const views = {
  drive: document.getElementById("drive-view"),
  gallery: document.getElementById("gallery-view"),
  form: document.getElementById("form-view"),
  review: document.getElementById("review-view"),
  success: document.getElementById("success-view"),
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    if (el) el.hidden = key !== name;
  }
  const dock = document.getElementById("summary-bar");
  if (dock) dock.hidden = name !== "gallery";
  window.scrollTo({ top: 0, behavior: "instant" });
  syncDockSpacing();
  // The tab strip is measured with getBoundingClientRect, so it
  // reports 0 while the gallery is still hidden. Re-check the
  // arrows once it is actually visible.
  if (name === "gallery") updateCategoryScrollButtons();
}

/**
 * The dock is fixed to the bottom, so the gallery needs enough
 * bottom padding to keep its last row of cards reachable. Measuring
 * the real dock height (which changes with the warning notices and
 * with the responsive breakpoints) is more reliable than a hard
 * coded value per media query.
 */
function syncDockSpacing() {
  const dock = document.getElementById("summary-bar");
  const gallery = document.getElementById("gallery-view");
  if (!dock || !gallery) return;
  if (dock.hidden) {
    gallery.style.paddingBottom = "";
    return;
  }
  const height = dock.getBoundingClientRect().height;
  gallery.style.paddingBottom = `${Math.ceil(height + 44)}px`;
}

/** Tiny helper so gauges can be updated without null checks everywhere. */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Scroll the tab strip horizontally (never the page) until `pill`
 * is fully visible. Uses rect deltas so it behaves the same in RTL
 * and LTR.
 */
function scrollPillIntoView(pill) {
  const row = document.getElementById("category-pills");
  if (!row || !pill) return;
  const pillRect = pill.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  if (pillRect.left < rowRect.left) row.scrollLeft -= rowRect.left - pillRect.left;
  else if (pillRect.right > rowRect.right) row.scrollLeft += pillRect.right - rowRect.right;
}

/**
 * Category tabs. Categories are DATA (data.json), so the tab strip
 * is rebuilt whenever the library loads — adding a category in the
 * spreadsheet never requires a code change.
 */
function renderCategoryBar() {
  const row = document.getElementById("category-pills");
  if (!row) return;
  row.textContent = "";
  for (const category of state.categories) {
    const isActive = category.id === state.activeCategoryId;
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "cat-pill" + (isActive ? " active" : "");
    pill.dataset.category = category.id;
    pill.setAttribute("role", "tab");
    pill.setAttribute("aria-selected", isActive ? "true" : "false");
    pill.title = `${category.name} — ${category.items.length} عنصر`;

    const label = document.createElement("span");
    label.textContent = category.name;
    const count = document.createElement("span");
    count.className = "cat-count";
    count.textContent = String(category.items.length);

    pill.append(label, count);
    row.appendChild(pill);
  }
  // Keep the active tab visible when the library switches category
  // (e.g. after a quick add from the banner carousel).
  scrollPillIntoView(row.querySelector(".cat-pill.active"));
  updateCategoryScrollButtons();
}

/** One delegated listener for the whole (re-rendered) tab strip. */
function bindCategoryPills() {
  const row = document.getElementById("category-pills");
  if (!row) return;
  row.addEventListener("click", (event) => {
    const pill = event.target.closest(".cat-pill");
    if (!pill || !row.contains(pill)) return;
    selectCategory(pill.dataset.category);
    pill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  });
}

/**
 * The tab strip only fits ~7 of the 12 categories, so it scrolls.
 * Show an arrow only on the side that still has hidden tabs — that
 * is what tells the customer there is more to see.
 */
function updateCategoryScrollButtons() {
  const row = document.getElementById("category-pills");
  const prevBtn = document.getElementById("category-prev");
  const nextBtn = document.getElementById("category-next");
  if (!row || !prevBtn || !nextBtn) return;

  const max = row.scrollWidth - row.clientWidth;
  if (max <= 2) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    return;
  }
  const pos = -row.scrollLeft; // RTL: scrolled right = 0, left = max
  const EPS = 2;
  prevBtn.hidden = pos <= EPS;
  nextBtn.hidden = pos >= max - EPS;
}

/**
 * Scroll the tab strip by roughly one tab.
 * In RTL, scrollLeft is 0 at the right-hand start and goes NEGATIVE
 * as you move towards the end, so "next" must subtract and "prev"
 * must add — the opposite of LTR.
 */
function scrollCategories(direction) {
  const row = document.getElementById("category-pills");
  if (!row) return;
  const first = row.querySelector(".cat-pill");
  const step = first ? first.getBoundingClientRect().width + 7 : 180;
  row.scrollBy({ left: -direction * step, behavior: "smooth" });
}

function bindCategoryScroll() {
  const row = document.getElementById("category-pills");
  if (!row) return;

  const prevBtn = document.getElementById("category-prev");
  const nextBtn = document.getElementById("category-next");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => scrollCategories(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => scrollCategories(1));
  }

  row.addEventListener("scroll", updateCategoryScrollButtons, { passive: true });
  window.addEventListener("resize", updateCategoryScrollButtons, { passive: true });

  // Catches web-font loading and breakpoint changes that resize the
  // strip while it is on screen.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => updateCategoryScrollButtons()).observe(row);
  }

  // Web fonts land after first paint and change the tab widths.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateCategoryScrollButtons).catch(() => {});
  }
}

function selectCategory(categoryId) {
  if (!state.categories.some((c) => c.id === categoryId)) return;
  state.activeCategoryId = categoryId;
  // Switching category clears the search (it rarely makes sense to
  // keep it across categories) but keeps the size filter.
  state.searchTerm = "";
  const searchInput = document.getElementById("search-input");
  searchInput.value = "";
  renderCategoryBar();
  applyFilters();
}

function renderCards() {
  const gallery = document.getElementById("gallery");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const noResults = document.getElementById("no-results");
  const clearSearchBtn = document.getElementById("clear-search-btn");

  const items = visibleItems();
  renderedCount = Math.min(BATCH_SIZE, items.length);

  gallery.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < renderedCount; i++) {
    fragment.appendChild(createCard(items[i]));
  }
  gallery.appendChild(fragment);

  loadMoreBtn.hidden = renderedCount >= items.length;

  // No results: distinct message when the size filter is the cause.
  if (items.length === 0) {
    const filterActive = state.sizeFilter.min !== null || state.sizeFilter.max !== null;
    noResults.textContent = filterActive
      ? "لا توجد نتائج ضمن نطاق المساحة المحدد."
      : "لا توجد نتائج مطابقة لبحثك.";
    noResults.hidden = false;
  } else {
    noResults.hidden = true;
  }

  clearSearchBtn.hidden = state.searchTerm === "";
  updateSummary();
}

let renderedCount = 0;
let isLoadingBatch = false;
let scrollObserver = null;

function renderNextBatch() {
  const gallery = document.getElementById("gallery");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const noResults = document.getElementById("no-results");

  const items = visibleItems();
  const nextCount = Math.min(BATCH_SIZE, items.length - renderedCount);
  if (nextCount <= 0) {
    if (loadMoreBtn) loadMoreBtn.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (let i = renderedCount; i < renderedCount + nextCount; i++) {
    fragment.appendChild(createCard(items[i]));
  }
  gallery.appendChild(fragment);
  renderedCount += nextCount;

  if (loadMoreBtn) {
    loadMoreBtn.hidden = renderedCount >= items.length;
    loadMoreBtn.textContent = "تحميل المزيد...";
  }
  if (items.length === 0) noResults.hidden = true;
  updateSummary();
}

function triggerNextBatch() {
  if (isLoadingBatch) return;
  const items = visibleItems();
  if (renderedCount >= items.length) return;
  isLoadingBatch = true;
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) loadMoreBtn.textContent = "جارٍ التحميل...";
  renderNextBatch();
  setTimeout(() => {
    isLoadingBatch = false;
  }, 120);
}

function initInfiniteScroll() {
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (!loadMoreBtn) return;

  if (typeof IntersectionObserver !== "undefined") {
    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            triggerNextBatch();
          }
        }
      },
      {
        root: null,
        rootMargin: "600px 0px",
        threshold: 0,
      }
    );
    scrollObserver.observe(loadMoreBtn);
  }

  // Scroll event fallback for fast flicks and environments without IntersectionObserver
  let scrollTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        const galleryView = document.getElementById("gallery-view");
        if (!galleryView || galleryView.hidden) return;
        if (!loadMoreBtn || loadMoreBtn.hidden) return;

        const rect = loadMoreBtn.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 600) {
          triggerNextBatch();
        }
      });
    },
    { passive: true }
  );
}

function applyFilters() {
  renderedCount = 0;
  renderCards();
}

/**
 * Create one glass poster card for a media item. The selected state
 * is restored from the global selection map, so a card keeps its
 * state across search / filter / Load More re-renders.
 */
function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = item.id;
  card.dataset.image = item.image; // kept for tooling/tests
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", "false");
  card.title = `${item.title} — ${formatSize(item.sizeGB)}`;

  // ---- media area ----
  const media = document.createElement("div");
  media.className = "card-media";

  const image = document.createElement("img");
  // Item ids are shaped like "<categoryId>/<image>", which is exactly
  // the file path under assets/ — one folder per category.
  image.className = "card-img";
  image.src = `assets/${item.id}`;
  image.alt = item.title;
  image.loading = "lazy";
  image.decoding = "async";
  // Intrinsic ratio up front so the card reserves its space and does not jump
  // as images stream in on a slow connection. 2:3 matches the poster covers.
  image.width = 400;
  image.height = 600;
  image.addEventListener("error", () => markImageUnavailable(card, item));

  const scrim = document.createElement("span");
  scrim.className = "card-scrim";

  const catBadge = document.createElement("span");
  catBadge.className = "card-cat-badge";
  catBadge.textContent = item.category ? item.category.name : "";

  const sizeLine = document.createElement("div");
  sizeLine.className = "card-size";
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "size-label";
  sizeLabel.textContent = "الحجم";
  const sizeValue = document.createElement("span");
  sizeValue.className = "card-value";
  sizeValue.textContent = formatSize(item.sizeGB);
  sizeLine.append(sizeLabel, sizeValue);

  const check = document.createElement("span");
  check.className = "check-badge";
  check.textContent = "✓";
  check.setAttribute("aria-hidden", "true");

  media.append(image, scrim, catBadge, sizeLine, check);

  // ---- title + details link ----
  const name = document.createElement("p");
  name.className = "card-name";
  name.setAttribute("dir", "auto");
  name.textContent = item.title;

  const details = createDetailsButton(item);

  card.append(media, name, details);

  const activate = () => {
    const nowSelected = toggleSelection(item);
    setCardSelected(card, item, nowSelected);
  };
  card.addEventListener("click", activate);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });

  if (state.selectedItems.has(item.id)) {
    setCardSelected(card, item, true);
  }

  return card;
}

/**
 * The small "details" link on a card. It is a real <a> to
 * item.html, so it keeps middle-click / open-in-new-tab, and its
 * click handler stops the event from reaching the card (otherwise
 * it would toggle the selection while opening the page).
 */
function createDetailsButton(item) {
  const link = document.createElement("a");
  link.className = "card-details";
  // Hash form (not "?id=") so the link survives static hosts and dev
  // servers that rewrite "/item.html" to "/item" and drop the query.
  link.href = `item.html#id=${encodeURIComponent(item.id)}`;
  link.textContent = "التفاصيل";
  link.setAttribute("aria-label", `تفاصيل ${item.title}`);
  link.addEventListener("click", (event) => {
    // Left click only — leave modified clicks to the browser.
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.stopPropagation();
    }
  });
  // Keyboard users tabbing to the link should not toggle the card.
  link.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  });
  return link;
}

/**
 * A missing image file marks the card "unavailable" (placeholder +
 * badge) but the item stays selectable — its size is still useful.
 */
function markImageUnavailable(card, item) {
  const image = card.querySelector("img");
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = item.image;
  if (image) image.replaceWith(placeholder);
  card.classList.add("unavailable");
  const badge = document.createElement("span");
  badge.className = "unavailable-badge";
  badge.textContent = "غير متاحة";
  const host = card.querySelector(".card-media") || card;
  host.prepend(badge);
  console.warn(`Missing image: ${item.image}`);
}

function setCardSelected(card, item, selected) {
  card.classList.toggle("selected", selected);
  card.setAttribute("aria-pressed", selected ? "true" : "false");
}

function showToast(message, type = "warning") {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `app-toast active ${type}`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("active");
  }, 4000);
}

// ============================================================
// Sound Effects Engine (Web Audio API)
// Procedural audio synthesis — 0 network payload, 0ms latency.
// ============================================================

const soundFX = {
  ctx: null,
  enabled: true,

  init() {
    try {
      const saved = localStorage.getItem("dd_sound_enabled");
      if (saved !== null) {
        this.enabled = saved === "true";
      }
    } catch {
      // localStorage may be unavailable/restricted in some sandbox environments
    }
    this.updateToggleBtn();

    const toggleBtn = document.getElementById("sound-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggle());
    }
  },

  getAudioContext() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("dd_sound_enabled", String(this.enabled));
    } catch {}
    this.updateToggleBtn();
    if (this.enabled) {
      this.playCardSelect(true);
    }
  },

  updateToggleBtn() {
    const btn = document.getElementById("sound-toggle-btn");
    if (!btn) return;
    btn.classList.toggle("muted", !this.enabled);
    btn.setAttribute("aria-label", this.enabled ? "كتم الصوت" : "تشغيل الصوت");
    btn.title = this.enabled ? "كتم الصوت" : "تشغيل الصوت";
    const icon = btn.querySelector(".sound-icon");
    if (icon) {
      icon.textContent = this.enabled ? "🔊" : "🔇";
    }
  },

  /**
   * Sound 1: Item select/unselect.
   * Smooth, crisp micro-blip.
   */
  playCardSelect(selected = true) {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      if (selected) {
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.07);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {}
  },

  /**
   * Sound 2: Navigation & Confirmation.
   * Cheerful two-tone chord when confirming/moving between screens.
   */
  playNavConfirm() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [
        { freq: 440, start: 0, dur: 0.08 },
        { freq: 880, start: 0.06, dur: 0.12 },
      ].forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.12, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {}
  },

  /**
   * Sound 3: Drive Full / Warning.
   * Distinct low double-buzz when storage is exceeded.
   */
  playFullWarning() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.11].forEach((startOffset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now + startOffset);
        osc.frequency.linearRampToValueAtTime(125, now + startOffset + 0.09);
        gain.gain.setValueAtTime(0.16, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + 0.09);
      });
    } catch (e) {}
  },
};

/**
 * Toggle an item in the global selection (insertion order =
 * selection order). Returns true when the item is now selected.
 */
function toggleSelection(item) {
  if (state.selectedItems.has(item.id)) {
    state.selectedItems.delete(item.id);
    soundFX.playCardSelect(false);
  } else {
    const isFull = state.driveCapacityGB > 0 && calculateTotal() + item.sizeGB > state.driveCapacityGB;
    if (isFull) {
      shakeCard(document.querySelector(`.card[data-id="${CSS.escape(item.id)}"]`));
      const remaining = Math.max(0, state.driveCapacityGB - calculateTotal());
      const driveFullWarning = document.getElementById("drive-full-warning");
      if (driveFullWarning) driveFullWarning.hidden = false;
      showToast(`قرصك ممتلئ! المساحة المتبقية (${formatSize(remaining)}) لا تكفي لإضافة "${item.title}" (${formatSize(item.sizeGB)}).`, "warning");
      soundFX.playFullWarning();
      return false;
    }
    state.selectedItems.set(item.id, item);
    soundFX.playCardSelect(true);
  }
  updateSummary();
  return state.selectedItems.has(item.id);
}

function shakeCard(card) {
  if (!card) return;
  card.classList.add("blocked");
  const clear = () => card.classList.remove("blocked");
  card.addEventListener("animationend", clear, { once: true });
  setTimeout(clear, 400); // safety net where animations never fire
}

/** Sum of the sizes (GB) of every selected item. */
function calculateTotal() {
  let total = 0;
  for (const item of state.selectedItems.values()) total += item.sizeGB;
  return total;
}

function formatSize(sizeGB) {
  const rounded = Math.round(sizeGB * 10) / 10;
  if (rounded >= 1024) {
    const tb = rounded / 1024;
    return `${Number.isInteger(tb) ? tb : tb.toFixed(1)} TB`;
  }
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} GB`;
}

/**
 * Single source of truth for every gauge on screen: header capsule,
 * crystal tube reservoir, and the floating spatial dock.
 */
function updateSummary() {
  const total = calculateTotal();
  const count = state.selectedItems.size;

  setText("selected-count", String(count));
  const badge = document.getElementById("dock-badge");
  if (badge) badge.textContent = String(count);

  if (count > 0) {
    const warn = document.getElementById("continue-warning");
    if (warn) warn.hidden = true;
  }

  const capacity = state.driveCapacityGB;
  if (capacity <= 0) return;

  const remaining = Math.max(0, capacity - total);
  const pct = Math.min(100, (total / capacity) * 100);
  const pctRounded = Math.round(pct * 100) / 100;
  const isFull = pct >= 100;

  // ---- header capsule ----
  setText("drive-capacity-label", formatSize(capacity));

  // ---- crystal tube reservoir ----
  const tubeLiquid = document.getElementById("tube-liquid");
  if (tubeLiquid) {
    tubeLiquid.style.height = `${pct}%`;
    tubeLiquid.classList.toggle("full", isFull);
  }
  const tube = document.querySelector(".crystal-tube");
  if (tube) tube.setAttribute("aria-label", `مستوى امتلاء القرص ${Math.round(pct)} بالمئة`);
  setText("tube-percent", `${Math.round(pct)}%`);
  setText("tube-used", formatSize(total));
  setText("tube-remaining", formatSize(remaining));
  setText("tube-count", String(count));

  // ---- floating dock ----
  const fill = document.getElementById("dock-fill");
  if (fill) {
    fill.style.width = `${pctRounded}%`;
    fill.classList.toggle("full", isFull);
  }
  const bar = document.getElementById("dock-bar");
  if (bar) bar.setAttribute("aria-valuenow", String(Math.round(pct)));
  const tubeFill = document.getElementById("dock-tube-fill");
  if (tubeFill) tubeFill.style.height = `${pct}%`;
  setText("dock-used", formatSize(total));
  setText("dock-capacity", formatSize(capacity));
  setText("dock-remaining", formatSize(remaining));
  setText("dock-percent", `${Math.round(pct)}%`);

  const fullWarning = document.getElementById("drive-full-warning");
  if (fullWarning) fullWarning.hidden = total < capacity;

  syncDockSpacing();
  updateBannerAddState();
}

// ============================================================
// Latest-items banner — glass carousel at the top of the site.
// Fed by banner/data.json (edit banner/source.xlsx, then run
// `npm run banner-excel-to-json`, images live in banner/assets/).
// Slides crossfade every 4.5 seconds and each one can add its
// item straight to the chosen drive.
// ============================================================

const BANNER_ROTATE_MS = 4500;

const bannerState = {
  items: [],
  index: 0,
  timer: null,
  // normalized library title -> media item, so a banner card can be
  // toggled into the real selection (and thus into the order).
  index_byTitle: null,
};

/**
 * Keep only usable banner records. Anything unexpected (network
 * returning the wrong shape, bad rows) yields an empty list and
 * the banner stays hidden — never a crash.
 */
function validateBannerItems(raw) {
  if (!raw || !Array.isArray(raw.items)) return [];
  const seen = new Set();
  const items = [];
  for (const rec of raw.items) {
    if (!rec || typeof rec !== "object") continue;
    const image = typeof rec.image === "string" ? rec.image.trim() : "";
    const title =
      typeof rec.title === "string" && rec.title.trim() !== "" ? rec.title.trim() : image;
    const sizeGB = rec.sizeGB;
    const okSize =
      typeof sizeGB === "number" && Number.isFinite(sizeGB) && sizeGB > 0;
    if (image === "" || !/\.(jpe?g|png|webp)$/i.test(image)) continue;
    if (!okSize) continue;
    const key = image.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, image, sizeGB });
  }
  return items;
}

async function loadBanner() {
  const bannerEl = document.getElementById("banner");
  if (!bannerEl) return;
  try {
    const res = await fetch("banner/data.json");
    if (!res.ok) throw new Error(`banner/data.json responded with HTTP ${res.status}`);
    const raw = await res.json();
    bannerState.items = validateBannerItems(raw);
  } catch (err) {
    console.warn("Banner unavailable:", err);
    bannerState.items = [];
  }
  if (bannerState.items.length === 0) {
    bannerEl.hidden = true;
    return;
  }
  bannerEl.hidden = false;
  renderBanner();
}

/** Build (once) the normalized-title -> media item lookup. */
function buildBannerTitleIndex() {
  const map = new Map();
  for (const item of state.mediaItems) {
    const key = normalizeSearchText(item.title);
    if (key !== "" && !map.has(key)) map.set(key, item);
  }
  bannerState.index_byTitle = map;
}

/** Resolve a banner card to the real library item it advertises. */
function findLibraryItemByTitle(title) {
  if (bannerState.index_byTitle === null) buildBannerTitleIndex();
  const key = normalizeSearchText(title);
  const exact = bannerState.index_byTitle.get(key);
  if (exact) return exact;
  // Fallback: a banner title that is a prefix of a library title
  // (the spreadsheet often trims trailing spaces).
  for (const [libKey, item] of bannerState.index_byTitle) {
    if (libKey.startsWith(key) || key.startsWith(libKey)) return item;
  }
  return null;
}

function renderBanner() {
  const track = document.getElementById("banner-track");
  const dotsBox = document.getElementById("banner-dots");
  const bannerEl = document.getElementById("banner");
  if (!track || !dotsBox || !bannerEl) return;

  track.textContent = "";
  dotsBox.textContent = "";
  bannerState.index = 0;

  bannerState.items.forEach((item, i) => {
    const slide = document.createElement("div");
    slide.className = "banner-slide" + (i === 0 ? " active" : "");
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-label", `${i + 1} / ${bannerState.items.length}: ${item.title}`);

    const img = document.createElement("img");
    img.src = `banner/assets/${item.image}`;
    img.alt = item.title;
    img.width = 1200;
    img.height = 675;
    img.loading = i === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => img.remove());

    const scrim = document.createElement("span");
    scrim.className = "banner-scrim";

    const body = document.createElement("div");
    body.className = "banner-body";

    const tag = document.createElement("span");
    tag.className = "banner-tag";
    tag.textContent = "🔥 أحدث الإضافات";

    const title = document.createElement("h2");
    title.className = "banner-title";
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "banner-meta";
    const cat = document.createElement("span");
    cat.textContent = "أحدث الإضافات";
    const dot1 = document.createElement("span");
    dot1.textContent = "•";
    const size = document.createElement("strong");
    size.className = "b-size";
    size.textContent = formatSize(item.sizeGB);
    const dot2 = document.createElement("span");
    dot2.textContent = "•";
    const ready = document.createElement("span");
    ready.textContent = "جاهز للنسخ على قرصك";
    meta.append(cat, dot1, size, dot2, ready);

    const desc = document.createElement("p");
    desc.className = "banner-desc";
    desc.textContent =
      "من أحدث الإضافات إلى المكتبة — اضغط لإضافته مباشرة إلى قرصك، وسيتم احتسابه في المساحة المستخدمة فورًا.";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "banner-add";
    addBtn.dataset.title = item.title;
    addBtn.textContent = "+ أضف مباشرة للقرص";
    addBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      addBannerItem(item);
    });

    body.append(tag, title, meta, desc, addBtn);
    slide.append(img, scrim, body);
    track.append(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "banner-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `شريحة ${i + 1}`);
    dot.addEventListener("click", () => {
      showBannerSlide(i);
      startBannerRotation();
    });
    dotsBox.append(dot);
  });

  document.getElementById("banner-prev").addEventListener("click", () => {
    showBannerSlide((bannerState.index - 1 + bannerState.items.length) % bannerState.items.length);
    startBannerRotation();
  });
  document.getElementById("banner-next").addEventListener("click", () => {
    showBannerSlide((bannerState.index + 1) % bannerState.items.length);
    startBannerRotation();
  });

  // Pause while the pointer is over the banner so text stays readable.
  bannerEl.addEventListener("mouseenter", stopBannerRotation);
  bannerEl.addEventListener("mouseleave", startBannerRotation);

  // Touch swipe (mobile): horizontal swipe switches slides.
  // Only mostly-horizontal moves count, so vertical page scroll is untouched.
  let touchStartX = null;
  let touchStartY = null;
  bannerEl.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );
  bannerEl.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null || touchStartY === null) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      const SWIPE_MIN_PX = 40;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) {
        showBannerSlide((bannerState.index + 1) % bannerState.items.length);
      } else {
        showBannerSlide(
          (bannerState.index - 1 + bannerState.items.length) % bannerState.items.length
        );
      }
      startBannerRotation();
    },
    { passive: true }
  );

  updateBannerAddState();
  startBannerRotation();
}

/**
 * Quick add from the carousel: toggles the real library item so the
 * drive meter, the dock, the review screen and the Telegram order
 * all stay consistent, then scrolls its card into view.
 */
function addBannerItem(bannerItem) {
  const item = findLibraryItemByTitle(bannerItem.title);
  if (!item) {
    showToast(`العنصر "${bannerItem.title}" غير موجود في المكتبة حالياً.`, "warning");
    return;
  }
  if (state.driveCapacityGB <= 0) {
    showToast("اختر حجم القرص أولاً من الشاشة الأولى.", "warning");
    return;
  }
  const nowSelected = toggleSelection(item);
  if (nowSelected) {
    revealCard(item.id);
    showToast(`تمت إضافة "${item.title}" إلى قرصك.`, "success");
  }
}

/** Keep every carousel button in sync with the real selection. */
function updateBannerAddState() {
  const buttons = document.querySelectorAll(".banner-add");
  for (const btn of buttons) {
    const title = btn.dataset.title || "";
    const item = findLibraryItemByTitle(title);
    const selected = !!item && state.selectedItems.has(item.id);
    btn.classList.toggle("is-added", selected);
    btn.textContent = selected ? "✓ مضاف إلى القرص" : "+ أضف مباشرة للقرص";
    btn.setAttribute(
      "aria-label",
      selected ? `إزالة ${title} من القرص` : `إضافة ${title} إلى القرص`
    );
  }
}

/**
 * Make a card reachable: switch to its category, drop filters that
 * hide it, render the batches it lives in, then scroll + flash it.
 */
function revealCard(id) {
  const item = itemById(id);
  if (!item) return;

  if (item.category && state.activeCategoryId !== item.category.id) {
    state.activeCategoryId = item.category.id;
    state.searchTerm = "";
    document.getElementById("search-input").value = "";
    renderCategoryBar();
    applyFilters();
  }

  // The card is gone from the grid, so one of the range filters is hiding it.
  if (visibleItems().indexOf(item) < 0) {
    if (state.sizeFilter.min !== null || state.sizeFilter.max !== null) clearSizeFilter();
    if (state.yearFilter.min !== null || state.yearFilter.max !== null) clearYearFilter();
  }

  // Render extra batches until the card exists in the DOM.
  let guard = 0;
  while (visibleItems().indexOf(item) >= renderedCount && guard++ < 200) {
    renderNextBatch();
  }

  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("flash");
  setTimeout(() => card.classList.remove("flash"), 1400);
}

function showBannerSlide(i) {
  const track = document.getElementById("banner-track");
  const dotsBox = document.getElementById("banner-dots");
  if (!track || !dotsBox) return;
  bannerState.index = i;
  track.querySelectorAll(".banner-slide").forEach((el, k) => {
    el.classList.toggle("active", k === i);
  });
  dotsBox.querySelectorAll(".banner-dot").forEach((el, k) => {
    el.classList.toggle("active", k === i);
  });
}

function startBannerRotation() {
  stopBannerRotation();
  if (bannerState.items.length < 2) return;
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return; // accessibility: no autoplay when reduced motion is requested
  }
  bannerState.timer = setInterval(() => {
    showBannerSlide((bannerState.index + 1) % bannerState.items.length);
  }, BANNER_ROTATE_MS);
}

function stopBannerRotation() {
  if (bannerState.timer !== null) {
    clearInterval(bannerState.timer);
    bannerState.timer = null;
  }
}

// ============================================================
// Drive size question — first screen (glass capacity pills).
// ============================================================

// Value of the "custom size" option in the drive pill row.
const CUSTOM_DRIVE_SIZE_VALUE = "custom";

// Parse a user-typed drive size in GB (integer, >= 1). Returns 0 when invalid.
function parseDriveSizeGB(raw) {
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function renderDriveOptions() {
  const row = document.getElementById("drive-pills");
  const startBtn = document.getElementById("start-selection-btn");
  const customRow = document.getElementById("custom-size-row");
  const customInput = document.getElementById("custom-size-input");
  const customPreview = document.getElementById("custom-size-preview");
  if (!row || !startBtn) return;
  row.textContent = "";

  const pills = [];
  const makePill = (value, label) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill";
    pill.dataset.size = String(value);
    pill.setAttribute("role", "radio");
    pill.setAttribute("aria-checked", "false");
    pill.textContent = label;
    pill.addEventListener("click", () => selectDrivePill(value));
    pills.push(pill);
    row.appendChild(pill);
    return pill;
  };

  for (const option of DRIVE_SIZES_GB) {
    makePill(option.value, option.label);
  }
  makePill(CUSTOM_DRIVE_SIZE_VALUE, "حجم آخر…");

  /** Highlight one pill and recompute state.driveCapacityGB. */
  function selectDrivePill(value) {
    for (const pill of pills) {
      const on = pill.dataset.size === String(value);
      pill.classList.toggle("active", on);
      pill.setAttribute("aria-checked", on ? "true" : "false");
    }
    if (value === CUSTOM_DRIVE_SIZE_VALUE) {
      customRow.hidden = false;
      state.driveCapacityGB = parseDriveSizeGB(customInput.value);
      customPreview.textContent = state.driveCapacityGB > 0 ? "يعادل " + formatSize(state.driveCapacityGB) : "";
    } else {
      customRow.hidden = true;
      customPreview.textContent = "";
      state.driveCapacityGB = parseDriveSizeGB(value);
    }
    startBtn.disabled = state.driveCapacityGB <= 0;
    updateSummary();
  }

  customInput.addEventListener("input", () => selectDrivePill(CUSTOM_DRIVE_SIZE_VALUE));

  // Default: the first fixed size (320 GB) is preselected so the
  // customer can start immediately.
  selectDrivePill(DRIVE_SIZES_GB[0].value);
}

function enterGallery() {
  if (!state.driveCapacityGB) return;
  soundFX.playNavConfirm();
  updateSummary();
  showView("gallery");
  const banner = document.getElementById("banner");
  if (banner && !banner.hidden) {
    banner.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ============================================================
// Search + size filter controls.
// ============================================================

function bindSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    state.searchTerm = input.value;
    applyFilters();
  });
  document.getElementById("clear-search-btn").addEventListener("click", () => {
    input.value = "";
    state.searchTerm = "";
    applyFilters();
  });
}

function bindSizeFilter() {
  const minInput = document.getElementById("filter-min-input");
  const maxInput = document.getElementById("filter-max-input");

  const parseBound = (value) => {
    if (value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  /** Read the two inputs, validate them, then apply the range. */
  function applySizeFilter() {
    const min = parseBound(minInput.value);
    const max = parseBound(maxInput.value);
    minInput.setAttribute("aria-invalid", minInput.value !== "" && min === null ? "true" : "false");
    maxInput.setAttribute("aria-invalid", maxInput.value !== "" && max === null ? "true" : "false");
    const errorEl = document.getElementById("filter-error");
    if (minInput.value !== "" && min === null) {
      errorEl.textContent = "أدخل رقمًا صالحًا.";
    } else if (maxInput.value !== "" && max === null) {
      errorEl.textContent = "أدخل رقمًا صالحًا.";
    } else if (min !== null && max !== null && min > max) {
      errorEl.textContent = "الحد الأدنى أكبر من الحد الأقصى.";
    } else {
      state.sizeFilter = { min, max };
      updateActiveFilterChip();
      applyFilters();
    }
  }

  document.getElementById("apply-filter-btn").addEventListener("click", applySizeFilter);
  document.getElementById("clear-filter-btn").addEventListener("click", clearSizeFilter);
  document.getElementById("clear-filter-active-btn").addEventListener("click", clearSizeFilter);

  // Enter inside either bound applies the filter (no extra click needed).
  minInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applySizeFilter(); });
  maxInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applySizeFilter(); });
}

function clearSizeFilter() {
  state.sizeFilter = { min: null, max: null };
  const minInput = document.getElementById("filter-min-input");
  const maxInput = document.getElementById("filter-max-input");
  minInput.value = "";
  maxInput.value = "";
  minInput.removeAttribute("aria-invalid");
  maxInput.removeAttribute("aria-invalid");
  document.getElementById("filter-error").textContent = "";
  updateActiveFilterChip();
  applyFilters();
}

function updateActiveFilterChip() {
  const chip = document.getElementById("active-filter");
  const { min, max } = state.sizeFilter;
  const active = min !== null || max !== null;
  chip.hidden = !active;
  if (!active) return;
  const parts = [];
  if (min !== null) parts.push(`من ${min} GB`);
  if (max !== null) parts.push(`إلى ${max} GB`);
  document.getElementById("active-filter-info").textContent = parts.join(" ");
}

function clearYearFilter() {
  state.yearFilter = { min: null, max: null };
  const minInput = document.getElementById("filter-year-min-input");
  const maxInput = document.getElementById("filter-year-max-input");
  minInput.value = "";
  maxInput.value = "";
  minInput.removeAttribute("aria-invalid");
  maxInput.removeAttribute("aria-invalid");
  document.getElementById("year-filter-error").textContent = "";
  updateActiveYearFilterChip();
  applyFilters();
}

function updateActiveYearFilterChip() {
  const chip = document.getElementById("active-year-filter");
  const { min, max } = state.yearFilter;
  const active = min !== null || max !== null;
  chip.hidden = !active;
  if (!active) return;
  const parts = [];
  if (min !== null) parts.push(`من سنة ${min}`);
  if (max !== null) parts.push(`إلى سنة ${max}`);
  document.getElementById("active-year-filter-info").textContent = parts.join(" ");
}

function bindYearFilter() {
  const minInput = document.getElementById("filter-year-min-input");
  const maxInput = document.getElementById("filter-year-max-input");

  const parseYear = (value) => {
    if (value === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1900 && n <= 2099 ? n : null;
  };

  function applyYear() {
    const min = parseYear(minInput.value);
    const max = parseYear(maxInput.value);
    minInput.setAttribute("aria-invalid", minInput.value !== "" && min === null ? "true" : "false");
    maxInput.setAttribute("aria-invalid", maxInput.value !== "" && max === null ? "true" : "false");
    const errorEl = document.getElementById("year-filter-error");
    if (minInput.value !== "" && min === null) {
      errorEl.textContent = "أدخل سنة صالحة (1900-2099).";
    } else if (maxInput.value !== "" && max === null) {
      errorEl.textContent = "أدخل سنة صالحة (1900-2099).";
    } else if (min !== null && max !== null && min > max) {
      errorEl.textContent = "سنة البداية أكبر من سنة النهاية.";
    } else {
      state.yearFilter = { min, max };
      updateActiveYearFilterChip();
      applyFilters();
    }
  }

  document.getElementById("apply-year-filter-btn").addEventListener("click", applyYear);
  document.getElementById("clear-year-filter-btn").addEventListener("click", clearYearFilter);
  document.getElementById("clear-year-filter-active-btn").addEventListener("click", clearYearFilter);
  minInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applyYear(); });
  maxInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applyYear(); });
}

// ============================================================
// Review view — selection grouped per category.
// ============================================================

function renderReview() {
  const list = document.getElementById("review-images");
  const customer = document.getElementById("review-customer");
  list.innerHTML = "";
  customer.innerHTML = "";

  const items = selectedItems();
  document.getElementById("review-count").textContent = String(items.length);
  document.getElementById("review-total").textContent = formatSize(calculateTotal());

  const addRow = (key, value) => {
    const row = document.createElement("div");
    row.className = "review-row";
    const k = document.createElement("span");
    k.className = "row-label";
    k.textContent = key;
    const v = document.createElement("span");
    v.className = "row-value-text";
    v.textContent = value;
    row.append(k, v);
    customer.appendChild(row);
  };

  if (state.driveCapacityGB > 0) {
    addRow("حجم القرص", formatSize(state.driveCapacityGB));
  }
  addRow("الاسم", document.getElementById("name-input").value);
  addRow("رقم الهاتف", document.getElementById("phone-input").value);
  addRow("العنوان", document.getElementById("address-input").value);
  const notes = document.getElementById("notes-input").value.trim();
  if (notes !== "") addRow("ملاحظات", notes);

  for (const { category, items: catItems } of getSelectedItemsByCategory()) {
    const header = document.createElement("li");
    const headerLabel = document.createElement("span");
    headerLabel.className = "review-category-header";
    headerLabel.textContent = `${category.name} (${catItems.length})`;
    header.append(headerLabel);
    list.append(header);
    for (const item of catItems) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.setAttribute("dir", "auto");
      name.textContent = item.title;
      const size = document.createElement("span");
      size.className = "row-value-text";
      size.textContent = formatSize(item.sizeGB);
      li.append(name, size);
      list.append(li);
    }
  }
}

// ============================================================
// Order text (TXT) — the same data Telegram receives, grouped by
// category.
// ============================================================

function generateOrderText() {
  const lines = [
    "DRIVE DEALS - NEW ORDER",
    "",
    "Customer:",
    `Name: ${document.getElementById("name-input").value}`,
    `Phone: ${document.getElementById("phone-input").value}`,
    `Address: ${document.getElementById("address-input").value}`,
  ];
  if (state.driveCapacityGB > 0) {
    lines.push(`Drive Capacity: ${formatSize(state.driveCapacityGB)}`);
  }
  lines.push("", "Selected Content:");
  let total = 0;
  let count = 0;
  for (const { category, items } of getSelectedItemsByCategory()) {
    const catTotal = items.reduce((sum, item) => sum + item.sizeGB, 0);
    lines.push("", `${category.name} (${items.length} items, ${formatSize(catTotal)}):`);
    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title} - ${formatSize(item.sizeGB)}`);
      total += item.sizeGB;
      count += 1;
    });
  }
  lines.push(
    "",
    `Total Items: ${count}`,
    `Estimated Total Size: ${formatSize(total)}`,
    "",
    "Notes:",
    document.getElementById("notes-input").value.trim()
  );
  return lines.join("\n");
}

function orderFileName() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `order-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}-${p(now.getMinutes())}.txt`;
}

/** @returns {{ blob: Blob, fileName: string }} */
function createOrderFile() {
  return { blob: new Blob([generateOrderText()], { type: "text/plain" }), fileName: orderFileName() };
}

// ============================================================
// Telegram — upload the TXT to the DRIVE DEALS chat and send it as
// a document. The chat id is hard-coded: the order goes straight
// to the owner.
//
// Two transports:
//   1. TELEGRAM_PROXY_URL set  -> POST to your own serverless
//      function, which holds the bot token server-side (recommended).
//   2. TELEGRAM_PROXY_URL ""   -> POST straight to api.telegram.org,
//      so the bot token is readable in the page source (V1.0).
// ============================================================

async function sendOrderToTelegram() {
  const { blob, fileName } = createOrderFile();
  const file = new File([blob], fileName, { type: "text/plain" });

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("document", file);
  form.append("caption", telegramCaption());

  const url = TELEGRAM_PROXY_URL || `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram HTTP ${res.status}`);
  }
}

function telegramCaption() {
  const items = selectedItems();
  return `DRIVE DEALS - NEW ORDER | Items: ${items.length} | Estimated Total Size: ${formatSize(calculateTotal())}${state.driveCapacityGB ? ` | Drive: ${formatSize(state.driveCapacityGB)}` : ""}`;
}

// ============================================================
// Flow wiring
// ============================================================

function bindForm() {
  const form = document.getElementById("customer-form");
  const nameInput = document.getElementById("name-input");
  const phoneInput = document.getElementById("phone-input");
  const addressInput = document.getElementById("address-input");

  const setFieldError = (input, message) => {
    const errorEl = document.getElementById(`${input.id}-error`);
    if (errorEl) errorEl.textContent = message;
    if (message === "") input.removeAttribute("aria-invalid");
    else input.setAttribute("aria-invalid", "true");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let valid = true;
    if (nameInput.value.trim() === "") {
      setFieldError(nameInput, "الاسم مطلوب.");
      valid = false;
    } else {
      setFieldError(nameInput, "");
    }
    const phone = phoneInput.value.trim();
    if (phone === "") {
      setFieldError(phoneInput, "رقم الهاتف مطلوب.");
      valid = false;
    } else if (!/^\d{10,15}$/.test(phone)) {
      setFieldError(phoneInput, "أدخل رقم هاتف صحيح.");
      valid = false;
    } else {
      setFieldError(phoneInput, "");
    }
    if (addressInput.value.trim() === "") {
      setFieldError(addressInput, "العنوان مطلوب.");
      valid = false;
    } else {
      setFieldError(addressInput, "");
    }
    if (!valid) return;
    soundFX.playNavConfirm();
    renderReview();
    showView("review");
  });

  nameInput.addEventListener("input", () => setFieldError(nameInput, ""));
  phoneInput.addEventListener("input", () => setFieldError(phoneInput, ""));
  addressInput.addEventListener("input", () => setFieldError(addressInput, ""));
}

function bindFlow() {
  document.getElementById("start-selection-btn").addEventListener("click", enterGallery);

  document.getElementById("continue-btn").addEventListener("click", () => {
    if (selectedItems().length === 0) {
      document.getElementById("continue-warning").hidden = false;
      return;
    }
    soundFX.playNavConfirm();
    showView("form");
  });

  document.getElementById("clear-all-btn").addEventListener("click", () => {
    soundFX.playCardSelect(false);
    state.selectedItems.clear();
    document.querySelectorAll(".card.selected").forEach((card) => setCardSelected(card, null, false));
    updateSummary();
  });

  document.getElementById("load-more-btn").addEventListener("click", () => {
    renderNextBatch();
  });

  document.getElementById("back-to-gallery-btn").addEventListener("click", () => {
    soundFX.playNavConfirm();
    showView("gallery");
  });
  document.getElementById("back-to-form-btn").addEventListener("click", () => {
    soundFX.playNavConfirm();
    showView("form");
  });

  const sendBtn = document.getElementById("send-order-btn");
  const sendStatus = document.getElementById("send-status");
  sendBtn.addEventListener("click", async () => {
    if (sendBtn.disabled) return; // no double-send: the button is disabled while in flight
    sendBtn.disabled = true;
    sendBtn.textContent = "جارٍ الإرسال...";
    document.getElementById("success-total").textContent = formatSize(calculateTotal());
    try {
      await sendOrderToTelegram();
      sendStatus.textContent = "";
      sendStatus.classList.remove("send-status-error");
      soundFX.playNavConfirm();
      showView("success");
    } catch (err) {
      console.error(err);
      sendStatus.textContent = "حدث خطأ أثناء الإرسال، حاول مرة أخرى.";
      sendStatus.classList.add("send-status-error");
      showToast("تعذّر إرسال الطلب. تحقق من الاتصال وحاول مرة أخرى.", "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "تأكيد وإرسال الطلب";
    }
  });

  document.getElementById("new-order-btn").addEventListener("click", startNewOrder);
}

function startNewOrder() {
  soundFX.playNavConfirm();
  state.selectedItems.clear();
  state.searchTerm = "";
  state.sizeFilter = { min: null, max: null };
  state.yearFilter = { min: null, max: null };
  state.activeCategoryId = state.categories[0] ? state.categories[0].id : null;
  document.getElementById("search-input").value = "";
  const minInput = document.getElementById("filter-min-input");
  const maxInput = document.getElementById("filter-max-input");
  if (minInput) minInput.value = "";
  if (maxInput) maxInput.value = "";
  document.getElementById("filter-error").textContent = "";
  updateActiveFilterChip();
  const yearMinInput = document.getElementById("filter-year-min-input");
  const yearMaxInput = document.getElementById("filter-year-max-input");
  if (yearMinInput) yearMinInput.value = "";
  if (yearMaxInput) yearMaxInput.value = "";
  document.getElementById("year-filter-error").textContent = "";
  updateActiveYearFilterChip();
  document.getElementById("continue-warning").hidden = true;
  const sendStatus = document.getElementById("send-status");
  sendStatus.textContent = "";
  sendStatus.classList.remove("send-status-error");
  const form = document.getElementById("customer-form");
  if (form) {
    form.reset();
    ["name-input", "phone-input", "address-input"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.removeAttribute("aria-invalid");
    });
    ["name-input-error", "phone-input-error", "address-input-error"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }
  renderCategoryBar();
  applyFilters();
  renderReview();
  updateSummary();
  showView("drive");
}

// ============================================================
// Init
// ============================================================

/**
 * Keep the gallery's bottom padding in sync with the dock's real
 * height: the warning notices change it, and so does every
 * responsive breakpoint.
 */
function bindDockSpacing() {
  const dock = document.getElementById("summary-bar");
  if (!dock) return;
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => syncDockSpacing()).observe(dock);
  }
  window.addEventListener("resize", syncDockSpacing, { passive: true });
  window.addEventListener("orientationchange", syncDockSpacing, { passive: true });
}

function init() {
  soundFX.init();
  renderDriveOptions();
  bindSearch();
  bindSizeFilter();
  bindYearFilter();
  bindForm();
  bindFlow();
  bindCategoryPills();
  bindCategoryScroll();
  initInfiniteScroll();
  bindDockSpacing();
  showView("drive");
  loadBanner();
  loadData().then(() => {
    state.activeCategoryId = state.categories[0] ? state.categories[0].id : null;
    buildBannerTitleIndex();
    renderCategoryBar();
    applyFilters();
    updateActiveFilterChip();
    updateSummary();
    updateBannerAddState();
  });
}

init();

// Test hooks (harmless in production).
if (typeof window !== "undefined") {
  window.__t = {
    get categories() { return state.categories; },
    get selectedItems() { return state.selectedItems; },
    get state() { return state; },
    soundFX,
    calculateTotal,
    formatSize,
    generateOrderText,
    createOrderFile,
    normalizeLibrary,
    validateLibrary,
    findLibraryItemByTitle,
    visibleItems,
  };
}