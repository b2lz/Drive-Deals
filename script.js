// ============================================================
// DRIVE DEALS — media library (single-page static app)
//
// One generic media-library system: categories are DATA, not
// code. data.json holds a list of categories; each category
// holds a list of media items. Selecting, filtering, reviewing
// and exporting work identically no matter how many categories
// or items exist — adding a category never requires a code
// change.
//
// data.json format (current):
//   {
//     "categories": [
//       {
//         "id": "arabic_movies",
//         "name": "أفلام عربي",
//         "items": [ { "id": "arabic_movies/001.jpg", "title": "001.jpg", "image": "001.jpg", "sizeGB": 5 }, ... ]
//       },
//       ...
//     ]
//   }
//
// Legacy format (still supported): a flat array of
//   { "image": "001.jpg", "value": 5 }
// records. It is normalized into a single implicit category,
// so existing exports keep working until the library is
// re-exported with the new format (see tools/excel-to-json.js).
//
// No frameworks, no build step. Works on any static host
// (Netlify / GitHub Pages).
// ============================================================

const TELEGRAM_BOT_TOKEN = "8605435654:AAHNcKaCAhpzql8M2aF2AnTgidbi4Q5zXaI";
const TELEGRAM_CHAT_ID = "805256524";

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

function mediaItem({ id, title, image, sizeGB, category = null }) {
  return { id, title, image, sizeGB, category };
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
      const image = typeof rec.image === "string" ? rec.image.trim() : "";
      const sizeGB = rec.sizeGB;
      const okSize = typeof sizeGB === "number" && Number.isFinite(sizeGB) && sizeGB > 0;
      if (image === "" || !image.endsWith(".jpg")) {
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
      const item = mediaItem({ id, title, image, sizeGB });
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
// Filtering — search + size filter combine (AND). They change
// which cards are visible, never what is selected.
// ============================================================

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

function visibleItems() {
  const category = activeCategory();
  if (!category) return [];
  const term = normalizeSearchText(state.searchTerm);
  const base =
    term === ""
      ? category.items
      : category.items.filter((item) => item._norm.includes(term) && matchesSizeFilter(item));
  if (term !== "" && base.length > 0) return base; // exact hits win
  // Nothing matched exactly — tolerate 1–2 typos across the whole query.
  if (term === "") return category.items.filter(matchesSizeFilter);
  const ranked = [];
  for (let i = 0; i < category.items.length; i++) {
    const item = category.items[i];
    if (!matchesSizeFilter(item)) continue;
    const score = fuzzyTitleScore(item, term);
    if (score >= 0) ranked.push({ item, score, order: i });
  }
  ranked.sort((a, b) => a.score - b.score || a.order - b.order);
  return ranked.map((entry) => entry.item);
}

function hasActiveFilters() {
  return state.searchTerm.trim() !== "" || state.sizeFilter.min !== null || state.sizeFilter.max !== null;
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
    el.hidden = key !== name;
  }
  document.getElementById("summary-bar").hidden = name !== "gallery";
}

function renderCategoryBar() {
  const selectEl = document.getElementById("category-select");
  selectEl.innerHTML = "";
  for (const category of state.categories) {
    const opt = document.createElement("option");
    opt.value = category.id;
    opt.textContent = category.name;
    selectEl.appendChild(opt);
  }
  selectEl.value = state.activeCategoryId;
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
  window.addEventListener(
    "scroll",
    () => {
      const galleryView = document.getElementById("gallery-view");
      if (!galleryView || galleryView.hidden) return;
      if (!loadMoreBtn || loadMoreBtn.hidden) return;

      const rect = loadMoreBtn.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 600) {
        triggerNextBatch();
      }
    },
    { passive: true }
  );
}

function applyFilters() {
  renderedCount = 0;
  renderCards();
}

/**
 * Create one card for a media item. The selected state is restored
 * from the global selection map, so a card keeps its state across
 * search / filter / Load More re-renders.
 */
function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = item.id;
  card.dataset.image = item.image; // kept for tooling/tests
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", "false");

  const image = document.createElement("img");
  // Item ids are shaped like "<categoryId>/<image>", which is exactly
  // the file path under assets/ — one folder per category.
  image.src = `assets/${item.id}`;
  image.alt = item.title;
  image.loading = "lazy";
  image.addEventListener("error", () => markImageUnavailable(card, item));

  const sizeLine = document.createElement("div");
  sizeLine.className = "card-size";
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "size-label";
  sizeLabel.textContent = "الحجم:";
  const sizeValue = document.createElement("span");
  sizeValue.className = "card-value";
  sizeValue.textContent = formatSize(item.sizeGB);
  sizeLine.append(sizeLabel, sizeValue);

  const name = document.createElement("p");
  name.className = "card-name";
  name.textContent = item.title;

  const check = document.createElement("span");
  check.className = "check-badge";
  check.textContent = "✓";

  card.append(image, sizeLine, name, check);
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
  card.prepend(badge);
  console.warn(`Missing image: ${item.image}`);
}

function setCardSelected(card, item, selected) {
  card.classList.toggle("selected", selected);
  card.setAttribute("aria-pressed", selected ? "true" : "false");
}

/**
 * Toggle an item in the global selection (insertion order =
 * selection order). Returns true when the item is now selected.
 */
function toggleSelection(item) {
  if (state.selectedItems.has(item.id)) {
    state.selectedItems.delete(item.id);
  } else {
    const isFull = state.driveCapacityGB > 0 && calculateTotal() + item.sizeGB > state.driveCapacityGB;
    if (isFull) {
      shakeCard(document.querySelector(`.card[data-id="${CSS.escape(item.id)}"]`));
      return false;
    }
    state.selectedItems.set(item.id, item);
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

function updateSummary() {
  const total = calculateTotal();
  const selectedCountEl = document.getElementById("selected-count");
  selectedCountEl.textContent = String(state.selectedItems.size);

  if (state.selectedItems.size > 0) {
    document.getElementById("continue-warning").hidden = true;
  }

  // Drive meter (only meaningful once a drive size is chosen).
  const driveBarFill = document.getElementById("drive-bar-fill");
  const driveBar = document.getElementById("drive-bar");
  const driveRemaining = document.getElementById("drive-remaining");
  const driveFullWarning = document.getElementById("drive-full-warning");
  if (state.driveCapacityGB > 0) {
    const pct = Math.min(100, (total / state.driveCapacityGB) * 100);
    driveBarFill.style.width = `${Math.round(pct * 100) / 100}%`;
    driveBarFill.classList.toggle("full", pct >= 100);
    driveBar.setAttribute("aria-valuenow", String(Math.round(pct)));
    driveRemaining.textContent = `متبقٍ: ${formatSize(Math.max(0, state.driveCapacityGB - total))}`;
    driveFullWarning.hidden = total < state.driveCapacityGB;

    // Desktop sidebar sync (Phase 1)
    const sidebarCap = document.getElementById("sidebar-drive-capacity");
    if (sidebarCap) {
      sidebarCap.textContent = formatSize(state.driveCapacityGB);
    }
    const sidebarFill = document.getElementById("sidebar-drive-fill");
    const sidebarUsed = document.getElementById("sidebar-drive-used");
    const sidebarRem = document.getElementById("sidebar-drive-remaining");
    const sidebarCount = document.getElementById("sidebar-selected-count");
    if (sidebarFill) {
      sidebarFill.style.width = `${Math.round(pct * 100) / 100}%`;
      sidebarFill.classList.toggle("full", pct >= 100);
    }
    if (sidebarUsed) sidebarUsed.textContent = `${formatSize(total)} مستخدم`;
    if (sidebarRem) sidebarRem.textContent = `${formatSize(Math.max(0, state.driveCapacityGB - total))} متبقٍ`;
    if (sidebarCount) sidebarCount.textContent = String(state.selectedItems.size);
  }
}

// ============================================================
// Latest-items banner — rotating showcase at the top of the site.
// Fed by banner/data.json (edit banner/source.xlsx, then run
// `npm run banner-excel-to-json`, images live in banner/assets/).
// Slides crossfade every 3 seconds.
// ============================================================

const BANNER_ROTATE_MS = 3000;

const bannerState = {
  items: [],
  index: 0,
  timer: null,
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
    if (image === "" || !image.endsWith(".jpg")) continue;
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
    img.addEventListener("error", () => img.remove());

    const caption = document.createElement("div");
    caption.className = "banner-caption";
    const title = document.createElement("h3");
    title.className = "banner-title";
    title.textContent = item.title;
    const size = document.createElement("span");
    size.className = "banner-size";
    size.textContent = formatSize(item.sizeGB);
    caption.append(title, size);

    slide.append(img, caption);
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

  startBannerRotation();
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
// Drive size question — first screen.
// ============================================================

// Value of the "custom size" option in the drive dropdown.
const CUSTOM_DRIVE_SIZE_VALUE = "custom";

// Parse a user-typed drive size in GB (integer, >= 1). Returns 0 when invalid.
function parseDriveSizeGB(raw) {
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function renderDriveOptions() {
  const selectEl = document.getElementById("drive-select");
  const startBtn = document.getElementById("start-selection-btn");
  const customRow = document.getElementById("custom-size-row");
  const customInput = document.getElementById("custom-size-input");
  const customPreview = document.getElementById("custom-size-preview");
  selectEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "اختر حجم القرص";
  placeholder.disabled = true;
  selectEl.appendChild(placeholder);

  for (const option of DRIVE_SIZES_GB) {
    const opt = document.createElement("option");
    opt.value = String(option.value);
    opt.textContent = option.label;
    selectEl.appendChild(opt);
  }

  const customOpt = document.createElement("option");
  customOpt.value = CUSTOM_DRIVE_SIZE_VALUE;
  customOpt.textContent = "حجم آخر… (مخصص)";
  selectEl.appendChild(customOpt);

  function syncCapacity() {
    if (selectEl.value === CUSTOM_DRIVE_SIZE_VALUE) {
      customRow.hidden = false;
      const value = parseDriveSizeGB(customInput.value);
      state.driveCapacityGB = value;
      customPreview.textContent = value > 0 ? "يعادل " + formatSize(value) : "";
    } else {
      customRow.hidden = true;
      customPreview.textContent = "";
      state.driveCapacityGB = parseDriveSizeGB(selectEl.value);
    }
    startBtn.disabled = state.driveCapacityGB <= 0;
    updateSummary();
  }

  selectEl.addEventListener("change", syncCapacity);
  customInput.addEventListener("input", syncCapacity);

  // Default: the first fixed size (320 GB) is preselected so the customer can
  // start immediately. No "change" event fires on page load, so sync once.
  if (!selectEl.value) {
    selectEl.value = String(DRIVE_SIZES_GB[0].value);
  }
  syncCapacity();
}

function enterGallery() {
  if (!state.driveCapacityGB) return;
  document.getElementById("drive-capacity-label").textContent = formatSize(state.driveCapacityGB);
  updateSummary();
  showView("gallery");
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

  document.getElementById("apply-filter-btn").addEventListener("click", () => {
    const min = parseBound(minInput.value);
    const max = parseBound(maxInput.value);
    minInput.setAttribute("aria-invalid", minInput.value !== "" && min === null ? "true" : "false");
    maxInput.setAttribute("aria-invalid", maxInput.value !== "" && max === null ? "true" : "false");
    if (minInput.value !== "" && min === null) {
      document.getElementById("filter-error").textContent = "أدخل رقمًا صالحًا.";
    } else if (maxInput.value !== "" && max === null) {
      document.getElementById("filter-error").textContent = "أدخل رقمًا صالحًا.";
    } else if (min !== null && max !== null && min > max) {
      document.getElementById("filter-error").textContent = "الحد الأدنى أكبر من الحد الأقصى.";
    } else {
      state.sizeFilter = { min, max };
      updateActiveFilterChip();
      applyFilters();
    }
  });

  document.getElementById("clear-filter-btn").addEventListener("click", clearSizeFilter);

  document.getElementById("clear-filter-active-btn").addEventListener("click", clearSizeFilter);
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
    list.appendChild(header);
    for (const item of catItems) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = item.title;
      const size = document.createElement("span");
      size.className = "row-value-text";
      size.textContent = formatSize(item.sizeGB);
      li.append(name, size);
      list.appendChild(li);
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
// ============================================================

async function sendOrderToTelegram() {
  const { blob, fileName } = createOrderFile();
  const file = new File([blob], fileName, { type: "text/plain" });

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("document", file);
  form.append("caption", telegramCaption());

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
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
    showView("form");
  });

  document.getElementById("clear-all-btn").addEventListener("click", () => {
    state.selectedItems.clear();
    document.querySelectorAll(".card.selected").forEach((card) => setCardSelected(card, null, false));
    updateSummary();
  });

  document.getElementById("load-more-btn").addEventListener("click", () => {
    renderNextBatch();
  });

  document.getElementById("back-to-gallery-btn").addEventListener("click", () => showView("gallery"));
  document.getElementById("back-to-form-btn").addEventListener("click", () => showView("form"));

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
      showView("success");
    } catch (err) {
      console.error(err);
      sendStatus.textContent = "حدث خطأ أثناء الإرسال، حاول مرة أخرى.";
      sendStatus.classList.add("send-status-error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "تأكيد وإرسال الطلب";
    }
  });

  document.getElementById("new-order-btn").addEventListener("click", startNewOrder);
}

function startNewOrder() {
  state.selectedItems.clear();
  state.searchTerm = "";
  state.sizeFilter = { min: null, max: null };
  state.activeCategoryId = state.categories[0] ? state.categories[0].id : null;
  document.getElementById("search-input").value = "";
  const minInput = document.getElementById("filter-min-input");
  const maxInput = document.getElementById("filter-max-input");
  if (minInput) minInput.value = "";
  if (maxInput) maxInput.value = "";
  document.getElementById("filter-error").textContent = "";
  updateActiveFilterChip();
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
// Shortcut tiles + bottom navigation (Phase 1)
// ============================================================

function bindShortcutTiles() {
  const tiles = document.querySelectorAll(".shortcut-tile");
  tiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      const catId = tile.getAttribute("data-category");
      if (catId) {
        selectCategory(catId);
        const libEl = document.getElementById("media-library");
        if (libEl) {
          libEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });
}

function bindBottomNav() {
  const navItems = document.querySelectorAll(".bottom-nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

// ============================================================
// Init
// ============================================================

function init() {
  renderDriveOptions();
  bindSearch();
  bindSizeFilter();
  bindForm();
  bindFlow();
  bindShortcutTiles();
  bindBottomNav();
  initInfiniteScroll();
  showView("drive");
  loadBanner();
  loadData().then(() => {
    state.activeCategoryId = state.categories[0] ? state.categories[0].id : null;
    renderCategoryBar();
    document.getElementById("category-select").addEventListener("change", () => {
      selectCategory(document.getElementById("category-select").value);
    });
    applyFilters();
    updateActiveFilterChip();
    updateSummary();
  });
}

init();

// Test hooks (harmless in production).
if (typeof window !== "undefined") {
  window.__t = {
    get categories() { return state.categories; },
    get selectedItems() { return state.selectedItems; },
    get state() { return state; },
    calculateTotal,
    formatSize,
    generateOrderText,
    createOrderFile,
    normalizeLibrary,
    validateLibrary,
  };
}
