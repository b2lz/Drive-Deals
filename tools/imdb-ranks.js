"use strict";
// Add vote counts to the IMDb index, so an ambiguous title can be
// resolved by prominence.
//
// The problem this solves: IMDb holds a film called "Sing" (1989), "Leo"
// (2000), "Sinbad" (1936) and "Us" (1991), and a shelf folder named
// "Sing" almost certainly holds the 2016 musical. Exact title matching
// alone picks whichever came first in the file, which is a coin toss.
// The vote count says which one people have heard of, which settles it.
//
// Only the existing index is touched — the 1.6 GB catalogue files are not
// read again.
//
// Usage: node tools/imdb-ranks.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, ".cache", "imdb");
const INDEX = path.join(ROOT, ".cache", "imdb-index.json");

async function download(name) {
  const file = path.join(DATA, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  const res = await fetch(`https://datasets.imdbws.com/${name}`, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  fs.mkdirSync(DATA, { recursive: true });
  const out = fs.createWriteStream(file);
  const { Readable } = require("stream");
  await new Promise((resolve, reject) => {
    Readable.fromWeb(res.body).pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
  });
  return file;
}

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

(async () => {
  const entries = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  // Looked up by id on every row, so it has to be a Map: a linear find
  // over 16,000 entries for each of ~9 million rows is not a plan.
  const byId = new Map(entries.map((e) => [e.tconst, e]));
  console.log(`${entries.length} indexed titles; fetching vote counts`);

  const file = await download("title.ratings.tsv.gz");
  const raw = fs.createReadStream(file);
  const stream = isGzipped(file) ? raw.pipe(zlib.createGunzip()) : raw;
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header = null;
  let seen = 0;
  let tagged = 0;

  for await (const line of rl) {
    if (!header) {
      header = line.split("\t");
      continue;
    }
    seen++;
    const parts = line.split("\t");
    const entry = byId.get(parts[0]);
    if (!entry) continue;
    entry.votes = parts[2] === "\\N" ? 0 : Number(parts[2]);
    entry.rating = parts[1] === "\\N" ? null : Number(parts[1]);
    tagged++;
  }

  fs.writeFileSync(INDEX, JSON.stringify(entries));
  console.log(`${seen.toLocaleString()} ratings scanned, ${tagged} matched`);
})();