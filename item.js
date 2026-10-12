// ============================================================
// DRIVE DEALS — item details page
//
// Renders one item full-page: cover art, a short description,
// the company behind it (developer / publisher / director),
// and PC system requirements for games. The movies/series
// template reuses the same blocks with cast / rating /
// duration instead of developer + requirements.
//
// Data sources (all local, no backend, no API keys in the browser):
//   data.json          -> id, title, image, sizeGB, category
//   details/<cat>.json -> researched per-item details, keyed by the
//                         same item id
//
// The page degrades gracefully: if details/<cat>.json has no entry
// for the id (or the file does not exist yet), the basic item data
// still renders and the detail-only sections are hidden.
// ============================================================

"use strict";

/** Arabic labels for the system-requirement rows, in display order. */
const REQ_LABELS = {
  os: "نظام التشغيل",
  cpu: "المعالج",
  ram: "الذاكرة (RAM)",
  gpu: "كارت الشاشة",
  directx: "DirectX",
  storage: "مساحة التخزين",
  note: "ملاحظة",
  notes: "ملاحظة",
  vram: "VRAM",
};

/** Arabic labels for the "basic info" rows, in display order. */
const FACT_LABELS = {
  developer: "المطوّر",
  publisher: "الناشر",
  director: "المخرج / الإدارة",
  directors: "المخرجون",
  writer: "السيناريو",
  writers: "الكتّاب",
  releaseDate: "تاريخ الإصدار",
  platforms: "المنصات",
  genres: "التصنيف",
  modes: "أوضاع اللعب",
  engine: "محرك اللعبة",
  series: "السلسلة",
  ageRating: "التصنيف العمري",
  languages: "اللغات",
  duration: "المدة",
  cast: "طاقم التمثيل",
  rating: "التقييم",
  episodes: "عدد الحلقات",
  seasons: "عدد المواسم",
  studio: "الاستوديو",
  studios: "الاستوديوهات",
  networks: "شبكات البث",
  creators: "المؤلف / Creator",
  status: "الحالة",
};

/** Human-readable value for a release date that may be partial. */
function formatReleaseDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  // Already a full ISO date — render it in Arabic month form.
  const m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (m) {
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    const year = m[1];
    const month = months[Number(m[2]) - 1] || m[2];
    return m[3] ? `${Number(m[3])} ${month} ${year}` : `${month} ${year}`;
  }
  // Partial like "2018-02" — keep it as year + month.
  const p = s.match(/^(\d{4})-(\d{2})$/);
  if (p) {
    const months = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    return `${months[Number(p[2]) - 1] || p[2]} ${p[1]}`;
  }
  return s;
}

/** Join a list field into a readable Arabic string. */
function joinList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("، ");
  if (value && typeof value === "object") return Object.values(value).join("، ");
  return value || null;
}

/** Set the status region and stop loading. */
function setStatus(message, isError) {
  const box = document.getElementById("item-status");
  const detail = document.getElementById("item-detail");
  detail.hidden = true;
  box.hidden = false;
  box.classList.toggle("item-status-error", Boolean(isError));
  box.textContent = message;
}

/** Build one <dt>/<dd> pair inside a <dl>. */
function addFact(list, label, value) {
  if (value === null || value === undefined || value === "") return;
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = String(value);
  dd.setAttribute("dir", "auto");
  list.append(dt, dd);
}

/**
 * Render the system-requirements panel: one card per preset
 * (minimum / recommended), each listing os, cpu, ram, gpu, etc.
 */
function renderRequirements(requirements) {
  const grid = document.getElementById("item-req-grid");
  grid.textContent = "";

  const presets = [
    { key: "minimum", title: "المواصفات الدنيا" },
    { key: "recommended", title: "المواصفات الموصى بها" },
  ];

  let rendered = 0;
  for (const preset of presets) {
    const data = requirements && requirements[preset.key];
    if (!data || typeof data !== "object") continue;
    rendered++;

    const card = document.createElement("div");
    card.className = "item-req-card";

    const heading = document.createElement("h3");
    heading.className = "item-req-title";
    heading.textContent = preset.title;
    card.append(heading);

    const list = document.createElement("dl");
    list.className = "item-req-list";
    // Fixed order so the two cards line up when read side by side.
    for (const key of Object.keys(REQ_LABELS)) {
      const value = data[key];
      if (value === null || value === undefined || value === "") continue;
      addFact(list, REQ_LABELS[key], value);
    }
    card.append(list);
    grid.append(card);
  }

  // Any notes that sit beside the presets, not inside one.
  const notes = requirements && requirements.notes;
  if (notes) {
    const noteCard = document.createElement("div");
    noteCard.className = "item-req-card item-req-note";
    const heading = document.createElement("h3");
    heading.className = "item-req-title";
    heading.textContent = "ملاحظات";
    const body = document.createElement("p");
    body.textContent = notes;
    noteCard.append(heading, body);
    grid.append(noteCard);
    rendered++;
  }

  return rendered;
}

/** Create a tab button wired to its panel. */
function makeTab(panelId, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "item-tab";
  button.textContent = label;
  button.setAttribute("role", "tab");
  button.id = `tab-${panelId}`;
  button.setAttribute("aria-controls", panelId);
  button.setAttribute("aria-selected", "false");
  button.addEventListener("click", () => selectTab(panelId));
  return button;
}

/** Show exactly one tab panel and mark its button active. */
function selectTab(panelId) {
  const tabs = document.querySelectorAll(".item-tab");
  const panels = document.querySelectorAll(".item-panel");
  for (const panel of panels) panel.hidden = panel.id !== panelId;
  for (const tab of tabs) {
    const active = tab.id === `tab-${panelId}`;
    tab.setAttribute("aria-selected", String(active));
    tab.classList.toggle("is-active", active);
  }
}

/**
 * Fill the whole page from one item + its details record.
 * @param {{item: object, categoryName: string, details: object|null}} ctx
 */
function renderItem(ctx) {
  const { item, categoryName, details } = ctx;
  const d = details || {};

  document.title = `${d.canonicalTitle || item.title} — DRIVE DEALS`;

  // Category + cover
  document.getElementById("item-category").textContent = categoryName;
  const cover = document.getElementById("item-cover");
  cover.src = `assets/${item.id}`;
  cover.alt = item.title;

  // Title (+ the corrected/canonical title when it differs from the file name)
  document.getElementById("item-title").textContent = d.canonicalTitle || item.title;
  const subtitle = document.getElementById("item-subtitle");
  if (d.canonicalTitle && d.canonicalTitle !== item.title) {
    subtitle.textContent = `مسجّل في المكتبة باسم: ${item.title}`;
    subtitle.hidden = false;
  }

  // Chips: year + genres
  const chips = document.getElementById("item-chips");
  const year = (d.releaseDate || "").slice(0, 4);
  if (year) chips.append(makeChip(String(year), "item-chip-year"));
  for (const genre of d.genres || []) chips.append(makeChip(genre));

  // Quick facts shown right under the title
  const quick = document.getElementById("item-quickfacts");
  if (d.developer) addFact(quick, FACT_LABELS.developer, d.developer);
  if (d.publisher) addFact(quick, FACT_LABELS.publisher, d.publisher);
  if (d.releaseDate) addFact(quick, FACT_LABELS.releaseDate, formatReleaseDate(d.releaseDate));
  if (d.rating) addFact(quick, FACT_LABELS.rating, d.rating);
  if (d.studio) addFact(quick, FACT_LABELS.studio, d.studio);
  else if (d.studios) addFact(quick, FACT_LABELS.studio, joinList(d.studios));
  if (d.creators) addFact(quick, FACT_LABELS.creators, joinList(d.creators));

  // Size (always available — it comes from data.json)
  document.getElementById("item-size").textContent = `${item.sizeGB} GB`;

  // Summary
  const summary = d.summaryAr || d.summaryEn || "";
  document.getElementById("item-summary").textContent =
    summary || "لا يوجد وصف مفصل لهذا العنصر حتى الآن.";

  // Full basic-info list
  const facts = document.getElementById("item-facts");
  addFact(facts, FACT_LABELS.developer, d.developer);
  addFact(facts, FACT_LABELS.publisher, d.publisher);
  addFact(facts, FACT_LABELS.director, d.director);
  addFact(facts, FACT_LABELS.directors, joinList(d.directors));
  addFact(facts, FACT_LABELS.writer, d.writer);
  addFact(facts, FACT_LABELS.writers, joinList(d.writers));
  addFact(facts, FACT_LABELS.releaseDate, formatReleaseDate(d.releaseDate));
  addFact(facts, FACT_LABELS.platforms, joinList(d.platforms));
  addFact(facts, FACT_LABELS.genres, joinList(d.genres));
  addFact(facts, FACT_LABELS.modes, joinList(d.modes));
  addFact(facts, FACT_LABELS.engine, d.engine);
  addFact(facts, FACT_LABELS.series, d.series);
  addFact(facts, FACT_LABELS.ageRating, d.ageRating);
  addFact(facts, FACT_LABELS.languages, joinList(d.languages));
  addFact(facts, FACT_LABELS.duration, d.duration);
  addFact(facts, FACT_LABELS.cast, joinList(d.cast));
  addFact(facts, FACT_LABELS.rating, d.rating);
  addFact(facts, FACT_LABELS.episodes, d.episodes);
  addFact(facts, FACT_LABELS.seasons, d.seasons);
  addFact(facts, FACT_LABELS.studio, d.studio);
  addFact(facts, FACT_LABELS.studios, joinList(d.studios));
  addFact(facts, FACT_LABELS.networks, joinList(d.networks));
  addFact(facts, FACT_LABELS.creators, joinList(d.creators));
  addFact(facts, FACT_LABELS.status, d.status);

  // Anything the researcher parked under "extra" (notes, sales figures, …)
  const extraBlock = document.getElementById("extra-block");
  const extraList = document.getElementById("item-extra");
  const EXTRA_LABELS = {
    priceUsd: "السعر عند الإطلاق",
    steamReview: "تقييم Steam",
    metacritic: "تقييم Metacritic",
    needsRequirements: "ملاحظة المواصفات",
    needsSummary: "ملاحظة نبذة",
    requirementsSource: "مصدر المواصفات",
    salesNote: "المبيعات",
    budgetEur: "ميزانية التطوير",
    platformReleaseNotes: "تواريخ الإصدار حسب المنصة",
    performanceNote: "ملاحظة أداء",
    priceNote: "ملاحظة السعر",
    directors: "المخرجون",
    steamDeck: "Steam Deck",
    previousTitle: "الاسم السابق",
    publisherHistory: "تاريخ الناشر",
    originalGame: "اللعبة الأصلية",
    definitiveEdition: "النسخة Definitive",
    titleMismatch: "ملاحظة على العنوان",
    steamAppId: "رقم التطبيق على Steam",
    steamPeakPlayers: "أعلى عدد لاعبين متزامن",
    steamPeakDate: "تاريخ أعلى عدد لاعبين",
    note: "ملاحظة",
    dlc: "محتويات إضافية (DLC)",
    unratedEdition: "نسخة بدون تصنيف",
    vrEdition: "نسخة الواقع الافتراضي",
    publishersNote: "ملاحظة الناشر",
  };
  let extraCount = 0;
  for (const [key, value] of Object.entries(d.extra || {})) {
    if (value === null || value === undefined || value === "") continue;
    addFact(extraList, EXTRA_LABELS[key] || key, joinList(value));
    extraCount++;
  }

  // A record that has no system specs says so, rather than leaving the
  // reader wondering why the tab is missing.
  if (d.needsRequirements && !d.requirements) {
    addFact(
      extraList,
      EXTRA_LABELS.needsRequirements,
      "مواصفات التشغيل غير متاحة من مصدر موثوق لهذه اللعبة.",
    );
    extraCount++;
  }
  // Specs without a description: say which, rather than showing a page
  // that lists requirements and nothing else.
  if (d.needsSummary && !(d.summaryAr || d.summaryEn)) {
    addFact(
      extraList,
      EXTRA_LABELS.needsSummary,
      "المعلومات متاحة بالعنوان ومواصفات التشغيل فقط؛ لم يُعثر على نبذة موثوقة.",
    );
    extraCount++;
  }
  if (extraCount > 0) extraBlock.hidden = false;

  // Tabs — only the ones that have something to show
  const tabs = document.getElementById("item-tabs");
  const available = [{ id: "panel-overview", label: "نظرة عامة" }];
  const reqCount = renderRequirements(d.requirements);
  if (reqCount > 0) available.push({ id: "panel-requirements", label: "مواصفات التشغيل" });
  const links = document.getElementById("item-links");
  for (const link of d.links || []) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.url;
    a.textContent = link.label || link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.append(a);
    links.append(li);
  }
  if (links.children.length > 0) available.push({ id: "panel-sources", label: "المصادر" });

  for (const tab of available) tabs.append(makeTab(tab.id, tab.label));

  // The researcher's open questions, shown only with ?debug=1 so the
  // public page stays clean.
  if (new URLSearchParams(location.search).get("debug") === "1" && (d.needsReview || []).length) {
    const note = document.createElement("p");
    note.className = "item-debug";
    note.textContent = `يحتاج مراجعة: ${d.needsReview.join("، ")}`;
    document.getElementById("panel-overview").prepend(note);
  }

  document.getElementById("item-status").hidden = true;
  document.getElementById("item-detail").hidden = false;
  selectTab(available[0].id);
}

/** Create one chip element. */
function makeChip(text, extraClass) {
  const span = document.createElement("li");
  span.className = `item-chip${extraClass ? " " + extraClass : ""}`;
  span.textContent = text;
  return span;
}

/** Fetch JSON, returning null instead of throwing on a 404. */
async function fetchJsonOrNull(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Could not load ${url}:`, err.message);
    return null;
  }
}

/** Find an item by id across every category in data.json. */
function findItem(data, id) {
  const categories = Array.isArray(data) ? [] : data.categories || [];
  // Legacy flat array — everything lives in one implicit category.
  if (Array.isArray(data)) {
    const item = data.find((it) => it.image === id.split("/").slice(1).join("/"));
    return item ? { item, categoryName: "المكتبة" } : null;
  }
  for (const category of categories) {
    const item = (category.items || []).find((it) => it.id === id);
    if (item) return { item, categoryName: category.name, categoryId: category.id };
  }
  return null;
}

/**
 * Read the item id from the URL.
 *
 * Both "?id=…" and "#id=…" are accepted. The hash form is what the
 * library links to: it survives static hosts and dev servers that
 * rewrite "/item.html" to "/item" and drop the query string, so the
 * details page never lands on a dead link.
 */
function readItemId() {
  const params = new URLSearchParams(location.search);
  if (params.get("id")) return params.get("id");
  const hash = location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);
  return hashParams.get("id");
}

/** Entry point: read the id, load both JSON files, render. */
async function main() {
  const id = readItemId();
  if (!id) {
    setStatus("لم يتم تحديد عنصر. اكتب العنوان في الرابط أو ارجع للمكتبة.", true);
    return;
  }

  const data = await fetchJsonOrNull("data.json");
  if (!data) {
    setStatus("تعذّر تحميل بيانات المكتبة. تأكد من وجود ملف data.json.", true);
    return;
  }

  const found = findItem(data, id);
  if (!found) {
    setStatus("العنصر المطلوب غير موجود في المكتبة.", true);
    return;
  }

  // Details are per-category and optional: a category with no details file
  // yet still renders its basic page.
  const categoryId = found.categoryId || found.item.categoryId || "games";
  const detailsFile = await fetchJsonOrNull(`details/${categoryId}.json`);
  const details = (detailsFile && detailsFile.items && detailsFile.items[id]) || null;

  if (!details) {
    console.info(`No researched details yet for: ${id}`);
  }

  renderItem({ item: found.item, categoryName: found.categoryName, details });
}

main();
