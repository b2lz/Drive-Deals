"use strict";
// Download the IMDb public datasets and keep only what the library needs.
//
// IMDb publishes its catalogue as plain TSV files, free and with no key.
// That matters here because the shelves that Wikipedia and TVMaze cannot
// reach are exactly the ones IMDb catalogues in the original script:
// six Turkish series and fifty-odd foreign films that have no article in
// any wiki we can search.
//
// The files are large — title.akas alone is a few hundred megabytes — so
// they are streamed line by line and discarded once read. Only rows that
// match a library title are kept.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");
const { Readable } = require("stream");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "imdb");
const OUT = path.join(ROOT, ".cache", "imdb-index.json");

const BASE = "https://datasets.imdbws.com";

/** Only these files are worth the bandwidth. */
const WANTED = ["title.basics.tsv.gz", "title.akas.tsv.gz"];

/**
 * Normalise a title for matching: same rules the rest of the project
 * uses, so "El Cuerpo (2012)" and "el cuerpo" land on the same key.
 */
function key(title) {
  return String(title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip Latin accents
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Titles worth looking for, grouped by shelf. */
function loadLibraryTitles() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
  const out = [];
  for (const cat of data.categories) {
    if (cat.id === "games") continue; // IMDb has no games
    for (const item of cat.items) out.push({ category: cat.id, id: item.id, title: item.title });
  }
  return out;
}

/** Download one gzipped TSV to the cache, skipping it if already there. */
async function download(name) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    console.log(`  ${name} already downloaded (${(fs.statSync(file).size / 1e6).toFixed(0)} MB)`);
    return file;
  }
  fs.mkdirSync(CACHE, { recursive: true });
  console.log(`  downloading ${name}...`);
  const res = await fetch(`${BASE}/${name}`, { signal: AbortSignal.timeout(600000) });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const out = fs.createWriteStream(file);
  await new Promise((resolve, reject) => {
    // Whatever the server sends is written as-is. Whether it needs
    // decompressing is decided at read time, from the first bytes.
    Readable.fromWeb(res.body).pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
  });
  console.log(`  ${name}: ${(fs.statSync(file).size / 1e6).toFixed(0)} MB`);
  return file;
}

/** True when the file starts with the gzip magic number. */
function isGzipped(file) {
  // Peeked through a separate handle on purpose. Sniffing the read stream
  // itself and unshifting the chunk looks equivalent but is not: the
  // stream stays in flowing mode after the one-shot listener fires, and
  // everything emitted before readline attaches is discarded. That silently
  // truncated the first chunk, so the header line never parsed and every
  // row shifted one column — 12.8 million rows scanned, zero matches.
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(2);
    const read = fs.readSync(fd, head, 0, 2, 0);
    return read === 2 && head[0] === 0x1f && head[1] === 0x8b;
  } finally {
    fs.closeSync(fd);
  }
}

/** Stream a TSV line by line, decompressing only if the file is gzipped. */
async function* rows(file) {
  // The datasets are published as .gz, but a download can arrive already
  // decompressed. Feeding plain text to a gunzip aborts the scan.
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
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = parts[i];
    yield obj;
  }
}

(async () => {
  const library = loadLibraryTitles();
  const wanted = new Map();
  for (const item of library) {
    const k = key(item.title);
    if (!k) continue;
    if (!wanted.has(k)) wanted.set(k, []);
    wanted.get(k).push(item);
  }
  console.log(`${library.length} library titles, ${wanted.size} distinct keys\n`);

  const index = new Map();

  for (const name of WANTED) {
    const file = await download(name);
    let seen = 0;
    let kept = 0;

    for await (const row of rows(file)) {
      seen++;
      const candidates = [];
      if (name === "title.basics.tsv.gz") {
        candidates.push(row.primaryTitle, row.originalTitle);
      } else {
        candidates.push(row.title);
      }
      for (const candidate of candidates) {
        const k = key(candidate);
        if (!k || !wanted.has(k)) continue;

        const entry = index.get(row.tconst) || {
          tconst: row.tconst,
          titleType: row.titleType,
          primaryTitle: row.primaryTitle || null,
          originalTitle: row.originalTitle || null,
          startYear: row.startYear && row.startYear !== "\\N" ? Number(row.startYear) : null,
          runtimeMinutes: row.runtimeMinutes && row.runtimeMinutes !== "\\N" ? Number(row.runtimeMinutes) : null,
          genres: row.genres && row.genres !== "\\N" ? row.genres.split(",") : [],
          aka: [],
        };

        if (name === "title.akas.tsv.gz") {
          if (row.region !== "\\N" && row.title !== row.primaryTitle) {
            entry.aka.push({ title: row.title, region: row.region, language: row.language });
          }
        }
        index.set(row.tconst, entry);
        kept++;
      }
      if (seen % 2000000 === 0) {
        process.stdout.write(`    ${name}: ${seen.toLocaleString()} rows, ${kept} matches\r`);
      }
    }
    process.stdout.write(`    ${name}: ${seen.toLocaleString()} rows scanned, ${kept} matches\n\n`);
  }

  const entries = [...index.values()];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(entries));

  console.log(`${entries.length} IMDb entries match a library title`);
  console.log(`written to .cache/imdb-index.json`);
})();