"use strict";
// Look titles up in the local IMDb datasets, offline.
//
// The datasets are already downloaded, so this is a direct search of
// IMDb's whole catalogue with no network and no rate limit. It answers
// questions the automated pipeline cannot: "is this show in IMDb at all?"
// and "what is its real title?", which is how a folder named in one
// language gets matched to a work filed under another.
//
//   node tools/imdb-lookup.js "Ahmed bin Hanbel" "Zaman" "Tayyar Sabah"
//   node tools/imdb-lookup.js --type tvSeries --year 2018 "Zaman"
//   node tools/imdb-lookup.js --file titles.txt
//
// Options:
//   --type <types>   comma-separated title types to keep
//                    (movie, tvSeries, tvMiniSeries, tvEpisode, short, ...)
//   --year <year>    keep entries whose startYear equals this
//   --all            show every hit instead of the first few

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, ".cache", "imdb");

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const SHOW_ALL = process.argv.includes("--all");

/** Fold a title to a comparable key: accents, punctuation and case removed. */
function key(title) {
  return String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when the file starts with the gzip magic number. */
function isGzipped(file) {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(2);
    const read = fs.readSync(fd, head, 0, 2, 0);
    return read === 2 && head[0] === 0x1f && head[1] === 0x8b;
  } finally {
    fs.closeSync(fd);
  }
}

/** Stream a TSV line by line, decompressing only when it is gzipped. */
async function* rows(file) {
  const raw = fs.createReadStream(file);
  const stream = isGzipped(file) ? raw.pipe(zlib.createGunzip()) : raw;
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header = null;
  for await (const line of rl) {
    if (!header) {
      header = line.split("\t");
      continue;
    }
    if (!line) continue;
    const parts = line.split("\t");
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = parts[i];
    yield row;
  }
}

/** The titles to look for, from the command line or a file. */
function wantedTitles() {
  const file = arg("--file");
  if (file) {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  // Values that follow a flag are options, not queries. Without this,
  // "--type tvSeries" searches IMDb for the title "tvSeries".
  const WITH_VALUE = new Set(["--file", "--type", "--year"]);
  const out = [];
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
      if (WITH_VALUE.has(a)) i++;
      continue;
    }
    out.push(...a.split("|"));
  }
  return out;
}

(async () => {
  const titles = wantedTitles();
  if (!titles.length) {
    console.error("give at least one title, or --file <path>");
    process.exit(1);
  }

  const wantTypes = arg("--type");
  const types = wantTypes ? new Set(wantTypes.split(",").map((t) => t.trim())) : null;
  const wantYear = Number(arg("--year", 0)) || null;

  const wanted = new Map();
  for (const t of titles) {
    const k = key(t);
    if (!k) continue;
    if (!wanted.has(k)) wanted.set(k, []);
    wanted.get(k).push(t);
  }
  console.log(`looking for ${titles.length} title(s) across the local IMDb data\n`);

  const hits = [];

  // Pass one: the catalogue itself.
  const basics = path.join(DATA, "title.basics.tsv.gz");
  if (fs.existsSync(basics)) {
    for await (const row of rows(basics)) {
      for (const t of [row.primaryTitle, row.originalTitle]) {
        const k = key(t);
        if (!wanted.has(k)) continue;
        hits.push({
          tconst: row.tconst,
          titleType: row.titleType,
          primaryTitle: row.primaryTitle,
          originalTitle: row.originalTitle,
          startYear: row.startYear === "\\N" ? null : row.startYear,
          runtimeMinutes: row.runtimeMinutes === "\\N" ? null : row.runtimeMinutes,
          genres: row.genres === "\\N" ? [] : row.genres.split(","),
          matchedOn: t,
          region: "(catalogue)",
          aka: [],
        });
      }
    }
  }

  // Pass two: the regional titles, which is where a folder named in
  // Arabic or Turkish is found.
  const akas = path.join(DATA, "title.akas.tsv.gz");
  if (fs.existsSync(akas)) {
    const byId = new Map(hits.map((h) => [h.tconst, h]));
    for await (const row of rows(akas)) {
      const k = key(row.title);
      if (!wanted.has(k)) continue;
      const existing = byId.get(row.tconst);
      if (existing) {
        existing.aka.push({
          title: row.title,
          region: row.region === "\\N" ? null : row.region,
          language: row.language === "\\N" ? null : row.language,
        });
      } else {
        // A regional title that names a work the catalogue file lists
        // under another id still has to be findable.
        hits.push({
          tconst: row.tconst,
          matchedOn: row.title,
          region: row.region === "\\N" ? null : row.region,
          aka: [{ title: row.title, region: row.region, language: row.language }],
          partial: true,
        });
      }
    }
  }

  const kept = hits.filter((h) => {
    if (types && !types.has(h.titleType)) return false;
    if (wantYear && String(h.startYear) !== String(wantYear)) return false;
    return true;
  });

  for (const [k, originals] of wanted) {
    const mine = kept.filter((h) => originals.includes(h.matchedOn) || wanted.get(k).includes(h.matchedOn));
    console.log(`${"=".repeat(72)}`);
    console.log(`query: ${originals.join(" / ")}`);
    if (!mine.length) {
      console.log("  no match in IMDb");
      continue;
    }
    const shown = SHOW_ALL ? mine : mine.slice(0, 6);
    for (const h of shown) {
      console.log(
        `  ${h.tconst}  ${(h.titleType || "?").padEnd(13)} ${(h.startYear || "?").padEnd(6)} ${h.primaryTitle || "(aka only)"}`,
      );
      if (h.originalTitle && h.originalTitle !== h.primaryTitle) {
        console.log(`      original: ${h.originalTitle}`);
      }
      if (h.genres && h.genres.length) console.log(`      genres  : ${h.genres.join(", ")}`);
      if (h.runtimeMinutes) console.log(`      runtime : ${h.runtimeMinutes} min`);
      if (h.matchedOn) console.log(`      matched : "${h.matchedOn}"${h.region ? ` (${h.region})` : ""}`);
      for (const a of (h.aka || []).slice(0, 6)) {
        console.log(`      also    : "${a.title}"${a.region ? ` [${a.region}]` : ""}`);
      }
    }
    if (shown.length < mine.length) {
      console.log(`  ... and ${mine.length - shown.length} more (use --all)`);
    }
  }
})();