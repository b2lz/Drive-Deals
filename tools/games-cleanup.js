"use strict";
// Clean-up pass for the mechanical defects found in the review. These are
// formatting problems, not facts: a list pasted into a single-value field,
// a flag left set after the field got filled, markdown the page prints raw.
//
// Nothing here guesses a fact or rewrites a fact.
//
// Usage: node tools/games-cleanup.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

const counts = {
  listSplit: 0,
  flagCleared: 0,
  markdownStripped: 0,
  deadSteamId: 0,
};

/** Turn Steam's multi-value list into a readable one-line string. */
function joinList(value) {
  return value
    .split("\n")
    .map((s) => s.replace(/^\s*[*\-•]\s*/, "").trim())
    .filter(Boolean)
    .join(" / ");
}

// --- 1. Lists stuffed into single-value fields --------------------------
for (const rec of Object.values(parsed.items)) {
  if (!rec || typeof rec !== "object") continue;
  for (const key of ["developer", "publisher"]) {
    if (typeof rec[key] === "string" && rec[key].includes("\n")) {
      rec[key] = joinList(rec[key]);
      counts.listSplit++;
    }
  }
}

// --- 2. Flags left set even though the field now has a value ------------
// needsSummary / needsRequirements are read by item.js to print a warning.
// A record that has a summary must not still claim it has none.
for (const rec of Object.values(parsed.items)) {
  if (!rec || typeof rec !== "object") continue;
  if (rec.needsSummary && (rec.summaryAr || rec.summaryEn)) {
    delete rec.needsSummary;
    counts.flagCleared++;
  }
  if (
    rec.needsRequirements &&
    rec.requirements &&
    (rec.requirements.minimum || rec.requirements.recommended)
  ) {
    delete rec.needsRequirements;
    counts.flagCleared++;
  }
}

// --- 3. Markdown the page prints verbatim -------------------------------
// Steam descriptions carry ** and [label](url). item.js sets textContent,
// so the asterisks and brackets would show up raw in the page.
for (const rec of Object.values(parsed.items)) {
  if (!rec || typeof rec !== "object") continue;
  for (const key of ["summaryAr", "summaryEn"]) {
    const s = rec[key];
    if (typeof s !== "string" || !/[*`\]\(]|\[[^\]]*\]\(/.test(s)) continue;
    rec[key] = s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    counts.markdownStripped++;
  }
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(
  `قوائم مقسّمة: ${counts.listSplit} · أعلام ممسوحة: ${counts.flagCleared} · ` +
    `markdown نظيف: ${counts.markdownStripped} ${DRY ? "(dry run)" : ""}`,
);