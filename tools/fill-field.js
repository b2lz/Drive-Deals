"use strict";
// Fill one field across the records that are missing it.
//
// The general fill run asks every provider for every gap and stops when
// none of them answers. That is right for "find me a record at all" but
// wasteful for a single question like "what year is this". Wikidata keeps
// publication dates for a great many shows that have no article, so this
// asks exactly that, for exactly the records that lack it.
//
// Nothing is overwritten: a record with the field already set is skipped,
// and hand research is never touched.
//
// Usage:
//   node tools/fill-field.js --category arabic-series --field releaseDate
//   node tools/fill-field.js --category games --field releaseDate
//   node tools/fill-field.js --category arabic-series --field releaseDate --dry

const fs = require("fs");
const path = require("path");
const wd = require("./lib/wikidata");

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".cache", "field");

const argVal = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const DRY = process.argv.includes("--dry");

const CATEGORY = argVal("--category", null);
const FIELD = argVal("--field", "releaseDate");
const LIMIT = Number(argVal("--limit", 0));

/** The language each shelf is in, where the title itself does not say. */
const LANG = {
  "arabic-films": "ar",
  "arabic-series": "ar",
  "turkish-series": "tr",
  "korean-series": "ko",
  anime: "ja",
};

/** Which Wikidata property answers each field, and under what medium. */
const SPEC = {
  releaseDate: { medium: null, property: "releaseDate" },
  developer: { medium: "game", property: "developer" },
  director: { medium: "film", property: "director" },
  cast: { medium: "film", property: "cast" },
};

const spec = SPEC[FIELD];
if (!spec) {
  console.error(`unknown field "${FIELD}". known: ${Object.keys(SPEC).join(", ")}`);
  process.exit(1);
}

const read = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return d;
  }
};

(async () => {
  const data = read(path.join(ROOT, "data.json"), null);
  const cats = data.categories.filter((c) => !CATEGORY || c.id === CATEGORY);

  let examined = 0;
  let filled = 0;
  let noSource = 0;
  let alreadyHad = 0;
  const t0 = Date.now();

  for (const cat of cats) {
    const file = path.join(ROOT, "details", `${cat.id}.json`);
    const parsed = read(file, null);
    if (!parsed) continue;

    let changed = 0;
    const medium = spec.medium || (cat.id === "games" ? "game" : "series");
    const lang = LANG[cat.id];

    for (const item of cat.items) {
      const rec = parsed.items[item.id];
      if (!rec || rec._miss) continue;
      // Hand research is left alone.
      if (!rec.source) continue;
      if (rec[FIELD]) {
        alreadyHad++;
        continue;
      }
      if (LIMIT && examined >= LIMIT) break;
      examined++;

      const cacheFile = path.join(
        CACHE,
        `${cat.id}__${item.id.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 70)}__${FIELD}.json`,
      );
      let hit = read(cacheFile, null);
      if (!hit) {
        const found = await wd.resolve(item.title, { medium, lang });
        hit = found ? { value: found.facts[spec.property] || null, label: found.entity.label } : { value: null };
        fs.mkdirSync(CACHE, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(hit));
      }

      if (!hit.value) {
        noSource++;
        continue;
      }

      rec[FIELD] = hit.value;
      rec.extra = { ...(rec.extra || {}), [FIELD + "Source"]: "Wikidata" };
      filled++;
      changed++;
      process.stdout.write(`  ${item.title.slice(0, 40).padEnd(42)} -> ${hit.value}\n`);
    }

    if (changed && !DRY) {
      parsed._meta = parsed._meta || {};
      parsed._meta.updatedAt = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
    }
    console.log(`${cat.id.padEnd(22)} examined=${examined} filled=${filled} no source=${noSource}`);
  }

  console.log(
    `\n${DRY ? "would fill" : "filled"} ${filled}, ${noSource} had no value anywhere, ` +
      `${alreadyHad} already had it. ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
})();