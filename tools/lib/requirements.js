"use strict";
// Turning Steam's free-text PC requirements into structured fields.
//
// Steam publishes requirements as one HTML blob per preset, e.g.
//   "Minimum:<br>OS: Windows 10 64-bit<br>Processor: Intel Core i5-8400<br>
//    Memory: 8 GB RAM<br>Graphics: NVIDIA GTX 1650<br>Storage: 60 GB"
//
// item.js renders requirements from discrete keys (os / cpu / ram /
// gpu / storage / directx / note), so the text has to be split back
// into labelled rows. Steam's Arabic locale emits the same labels in
// Arabic, so both label sets are recognised here.
//
// Anything we cannot confidently label is preserved in `note` rather
// than dropped — losing "Storage: 60 GB available space" would leave
// the user unable to judge whether the game fits their disk.

/**
 * Label patterns -> item.js field names.
 *
 * Note the lookahead instead of `\b`: JavaScript defines `\w` as ASCII
 * only, so `\b` after an Arabic word ("نظام التشغيل:") never matches
 * because both sides count as non-word characters. The lookahead lets
 * us require a colon, or end of line, which is what actually separates
 * a label from its value in both Steam locales.
 */
const LABEL_END = "(?=\\s*:|\\s*$)";
const LABELS = [
  { field: "os", re: new RegExp(`^(?:نظام التشغيل|تشغيل\\s+النظام|operating system|os)${LABEL_END}`, "i") },
  { field: "cpu", re: new RegExp(`^(?:المعالج|معالج|processor|cpu)${LABEL_END}`, "i") },
  { field: "ram", re: new RegExp(`^(?:الذاكرة|ذاكرة(?: الوصول(?: العشوائي)?)?|memory|ram)${LABEL_END}`, "i") },
  {
    field: "gpu",
    re: new RegExp(
      `^(?:كارت الشاشة|كارت|الرسوميات|بطاقة الرسوميات|graphics(?: card)?|gpu|videocard|video card)${LABEL_END}`,
      "i",
    ),
  },
  { field: "directx", re: new RegExp(`^(?:directx|dx)${LABEL_END}`, "i") },
  { field: "storage", re: new RegExp(`^(?:مساحة التخزين|التخزين|storage|disk space|hard disk|available space)${LABEL_END}`, "i") },
  { field: "notes", re: new RegExp(`^(?:ملاحظة|ملاحظات|notes?|additional requirements|additional notes)${LABEL_END}`, "i") },
];

// Lines that are boilerplate around the real requirement rows.
const NOISE = [
  /^(?:minimum|recommended|minimum requirements|recommended requirements)\s*:?\s*$/i,
  /^(?:الحد الأدنى|الحد الادنى|الموصى بها|موصى بها|التوصيات)\s*:?\s*$/,
  /^(?:متطلبات|requirements)\s*:?\s*$/i,
  // "Requires a 64-bit processor and operating system" style boilerplate.
  /^(?:تتطلب|يتطلب|requires?|needs?)\b/i,
  /^(?:تشغيل|needs?)\b.*\b64[- ]?bits?\b/i,
];

/**
 * When a game lists requirements as bare unlabelled lines, Steam emits
 * them in this fixed order. Used only as a fallback when no row carried
 * a recognisable label.
 */
const POSITIONAL_ORDER = ["os", "cpu", "ram", "directx", "gpu", "storage"];

/**
 * True for the per-game boilerplate Steam repeats across a whole
 * category: the preset heading, the "needs 64-bit OS" warning, and the
 * trailing "Internet connection required" line.
 */
function isBoilerplate(row) {
  if (NOISE.some((re) => re.test(row))) return true;
  // A preset heading that swallowed the rest of the line.
  if (/^(?:minimum|recommended|الحد الأدنى|الحد الادنى|الموصى بها)\s*:/i.test(row)) return true;
  // Bare requirements of connectivity / peripherals.
  if (/\b(?:internet(?:\s+connection)?|internet access|network connection)\b/i.test(row) && row.length < 60) {
    return true;
  }
  return false;
}

/** Split Steam's blob into clean single-line rows. */
function toRows(blob) {
  return String(blob || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&reg;/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Labels that appear *inline*, after punctuation, inside a value that
 * belongs to another field.
 *
 * Steam's Arabic store pages cram everything onto one line:
 *   "كارت الشاشة: GTX 1660، مساحة التخزين: 80 GB. متطلبات إضافية: SSD"
 * Row-by-row parsing swallows storage and extra notes into the graphics
 * card — exactly what then shows on the page. These markers are cut out
 * before a row is classified.
 */
const INLINE_MARKERS = [
  { field: "storage", label: /(?:مساحة التخزين|التخزين|Storage|Disk Space)/i },
  { field: "notes", label: /(?:متطلبات إضافية|ملاحظات|Additional Requirements|Notes)/i },
  { field: "directx", label: /DirectX/i },
];

/** Split a row at any inline marker that appears after position 0. */
function splitInlineLabels(row) {
  const hits = [];
  for (const { field, label } of INLINE_MARKERS) {
    const m = label.exec(row);
    if (m && m.index > 0) hits.push({ field, index: m.index, length: m[0].length });
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a.index - b.index);

  // The head is everything before the first marker.
  let head = row.slice(0, hits[0].index).replace(/[،.؛,.\s]+$/, "").trim();
  let headField = null;
  const headLabel = LABELS.find((l) => l.re.test(head));
  if (headLabel) {
    headField = headLabel.field;
    head = head.slice(head.indexOf(":") + 1).trim();
  }

  const segments = [];
  if (head) segments.push({ field: headField, value: head });

  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : row.length;
    const value = row
      .slice(start, end)
      .replace(/^[،.؛:\s]+/, "")
      .replace(/[،.؛:\s]+$/, "")
      .trim();
    if (value) segments.push({ field: hits[i].field, value });
  }

  return segments.length > 1 ? segments : null;
}

/**
 * Parse one preset (minimum or recommended).
 * @returns {object|null} keyed like item.js expects
 */
function parsePreset(blob) {
  const rows = toRows(blob);
  if (!rows.length) return null;

  const out = {};
  const leftovers = [];
  let current = null;

  for (const rawRow of rows) {
    if (NOISE.some((re) => re.test(rawRow))) continue;

    // One row can hide several fields, so expand it into segments first.
    const segments = splitInlineLabels(rawRow) || [{ field: null, value: rawRow }];

    for (const seg of segments) {
      const value = seg.value;
      if (!value) continue;

      const labelled = seg.field
        ? { field: seg.field }
        : LABELS.find((l) => l.re.test(value));

      if (labelled) {
        // A labelled segment still carries its own "Label:" prefix.
        const colon = value.indexOf(":");
        const clean =
          colon !== -1 && labelled.field
            ? value.slice(colon + 1).trim()
            : value;
        // Repeats are appended, not replaced, so alternates survive
        // ("GTX 1650 / RX 5700").
        out[labelled.field] = out[labelled.field]
          ? `${out[labelled.field]} / ${clean}`
          : clean;
        current = labelled.field;
        continue;
      }

      // An unlabelled line right after a labelled one is a continuation.
      if (current) {
        out[current] = `${out[current]}، ${value}`;
        continue;
      }
      leftovers.push(value);
    }
  }

  // Fallback: nothing was labelled, so Steam gave bare lines in its
  // fixed order. Assign them positionally rather than dumping the whole
  // thing into a note.
  if (leftovers.length && Object.keys(out).length === 0) {
    leftovers.forEach((row, i) => {
      const field = POSITIONAL_ORDER[i];
      if (field && !out[field]) out[field] = row;
    });
    return Object.keys(out).length ? out : null;
  }

  if (leftovers.length) {
    // Keep only leftovers that carry real information. Boilerplate like
    // "الحد الأدنى: يتطلب معالجًا ونظام تشغيل بقدرة 64 بت" is repeated
    // on every game, not a per-game note.
    const real = leftovers.filter((row) => !isBoilerplate(row));
    const note = real.join(" • ");
    if (note) out.note = out.note ? `${out.note} • ${note}` : note;
  }

  // item.js renders both "note" and "notes" under the same label, so
  // merging here keeps the page from showing the same row twice.
  if (out.notes && out.note) {
    out.note = `${out.note} • ${out.notes}`;
    delete out.notes;
  } else if (out.notes && !out.note) {
    out.note = out.notes;
    delete out.notes;
  }

  // A field that ends up duplicating another exactly is noise: Steam
  // sometimes repeats "SSD required" as both a note and a storage line.
  dedupeValues(out);

  return Object.keys(out).length ? out : null;
}

/**
 * Drop requirement rows that merely repeat another row's content, and
 * collapse bilingual (Arabic / English) duplicates of the same figure.
 *
 * Steam's Arabic pages repeat "SSD required" as both an extra-requirement
 * note and a trailing storage line, and the Arabic storage blob often
 * restates the English one ("مساحة متوفرة قدرها 80 GB / 80 GB available
 * space"). Both render as visible duplication on the page.
 */
function dedupeValues(out) {
  // 1) Exact duplicates: keep the named field, drop the note.
  const seen = new Map();
  for (const [key, value] of Object.entries(out)) {
    const norm = normaliseValue(value);
    if (!norm) continue;
    const prior = seen.get(norm);
    if (prior !== undefined) {
      if (key === "note" || key === "notes") delete out[key];
      else delete out[prior];
      continue;
    }
    seen.set(norm, key);
  }

  // 2) Bilingual halves of one value: "عربي / English" where both
  // sides describe the same figure. Keep the Arabic side.
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (typeof value !== "string" || !value.includes(" / ")) continue;
    const parts = value.split(" / ");
    const uniq = [];
    for (const part of parts) {
      const norm = normaliseValue(part);
      // A Latin part inside an Arabic value is the same figure restated
      // in the other language, unless it names a genuinely different
      // component (a different GPU model, say).
      if (uniq.some((u) => sharesFigure(u, part))) continue;
      uniq.push(part);
    }
    out[key] = uniq.join(" / ");
  }
}

/** True when two fragments state the same size/capacity figure. */
function sharesFigure(a, b) {
  const fig = (s) => (s.match(/\d+(?:[.,]\d+)?\s*(?:gb|tb|mb)/i) || [])[0];
  const fa = fig(a);
  const fb = fig(b);
  if (fa && fb) return normaliseValue(fa) === normaliseValue(fb);
  // No figures: treat identical digit sequences as the same statement.
  const na = normaliseValue(a).replace(/[^\d]+/g, "");
  const nb = normaliseValue(b).replace(/[^\d]+/g, "");
  return Boolean(na) && na === nb;
}

/** Normalise a requirement value for duplicate detection. */
function normaliseValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim();
}

/**
 * Parse both presets from an English/Arabic Steam pc_requirements pair.
 *
 * Arabic is preferred field by field: Steam localises the requirement
 * labels but often leaves the CPU/GPU model strings in English, so the
 * Arabic blob usually wins on os/cpu/ram while the English blob is a
 * useful fallback for games with no Arabic translation at all.
 */
function parseRequirements(enMin, enRec, arMin, arRec) {
  const minimum = pick(parsePreset(arMin), parsePreset(enMin));
  const recommended = pick(parsePreset(arRec), parsePreset(enRec));
  if (!minimum && !recommended) return null;
  return { minimum, recommended };
}

/**
 * Field-by-field merge, preferring the Arabic variant.
 * Falls back per field so a partially-translated blob still helps.
 */
function pick(ar, en) {
  if (ar && !en) return ar;
  if (!ar && en) return en;
  if (!ar && !en) return null;
  const out = {};
  for (const key of new Set([...Object.keys(ar), ...Object.keys(en)])) {
    // Arabic blob only wins if it actually has Arabic letters in it;
    // Steam sometimes returns the English string under l=arabic.
    const a = ar[key];
    const e = en[key];
    out[key] = a && hasArabic(a) ? a : e || a;
  }
  return out;
}

function hasArabic(str) {
  return /[\u0600-\u06FF]/.test(String(str || ""));
}

module.exports = { parseRequirements, parsePreset, toRows };