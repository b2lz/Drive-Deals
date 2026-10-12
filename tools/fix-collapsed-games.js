"use strict";
// Ten pairs of folders where both records had collapsed onto the same
// wrong Steam entry, so each was showing the other's title, date and
// description. Each folder below is re-pointed at the Steam app that
// actually matches its name.
//
// Where the correct app is a different game than what was stored, the whole
// body is refetched so the summary, date and requirements agree with the
// title. Where the stored entry was right and only the copy was wrong, the
// record is left alone.
//
// Usage: node tools/fix-collapsed-games.js [--dry] [--fetch]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const FETCH = process.argv.includes("--fetch");

const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// folder -> correct Steam app id, or null when the existing record is right
// and only needs the duplicate dropped.
const REPOINT = {
  "games/Call Of Duty 1.jpg": 42700,
  "games/Call Of Duty Modern Warfare 1.jpg": 2000950,
  "games/Call of Duty Modern Warfare 3 42GB.jpg": 3595270,
  "games/Call Of Duty Modern Warfare 3.jpg": 3595270,
  "games/Crysis 2 .jpg": 2096600,
  "games/Gears of War .jpg": 2523720,
  "games/INVINCIBLE .jpg": null,
  "games/Invincible VS.jpg": 2353060,
  "games/The Last of Us .jpg": 1888930,
  "games/The Last Of US Part 2.jpg": 2531310,
  "games/The Witcher 3 - Remastered .jpg": 292030,
  "games/The Walking Dead - Season 1.jpg": 207610,
  "games/The Walking Dead - Season 2.jpg": 261030,
  "games/Dead Space 1.jpg": 17470,
  "games/Dead Space Remake.jpg": 1693980,
};

function strip(html) {
  if (!html) return "";
  return html
    .replace(/<li>/g, "\n* ")
    .replace(/<\/li>/g, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

/** Pull a labelled requirement line out of Steam's HTML block. */
function pick(html, label) {
  const text = strip(html);
  const line = text
    .split("\n")
    .find((l) => l.toLowerCase().startsWith(`* ${label.toLowerCase()}:`));
  if (!line) return null;
  return line.replace(/^\*\s*[^:]+:\s*/, "").trim() || null;
}

function buildRequirements(min, rec) {
  const out = {};
  const m = {
    os: pick(min, "OS"),
    cpu: pick(min, "Processor"),
    ram: pick(min, "Memory"),
    gpu: pick(min, "Video Card"),
    directx: pick(min, "DirectX"),
    storage: pick(min, "Hard Drive") || pick(min, "Hard Disk Space"),
  };
  for (const [k, v] of Object.entries(m)) if (v) out[k] = v;
  if (rec?.requirements?.recommended) out.recommended = rec.requirements.recommended;
  return Object.keys(out).length ? out : null;
}

(async () => {
  let changed = 0;

  for (const [id, appId] of Object.entries(REPOINT)) {
    const rec = parsed.items[id];
    if (!rec) {
      console.log(`  no record: ${id}`);
      continue;
    }

    if (appId === null) {
      // The Invincible / Invincible VS pair: one folder is the base game
      // and the other the versus mode. Only VS has its own Steam entry.
      console.log(`  ${id}: keeping existing record (no distinct Steam entry)`);
      continue;
    }

    if (rec.steamAppId === appId) {
      console.log(`  ${id}: already on app ${appId}`);
      continue;
    }

    if (!FETCH) {
      console.log(`  ${id}: would repoint to app ${appId} (run with --fetch)`);
      continue;
    }

    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`,
    );
    const payload = await res.json();
    const data = payload[appId]?.data;
    if (!data) {
      console.log(`  ${id}: app ${appId} not available on Steam, left alone`);
      continue;
    }

    const oldCanon = rec.canonicalTitle;
    rec.canonicalTitle = data.name;
    rec.releaseDate = data.release_date?.date
      ? new Date(data.release_date.date).toISOString().slice(0, 10)
      : rec.releaseDate;
    if (Array.isArray(data.developers) && data.developers.length) {
      rec.developer = data.developers.join(" / ");
    }
    if (Array.isArray(data.publishers) && data.publishers.length) {
      rec.publisher = data.publishers.join(" / ");
    }
    if (Array.isArray(data.genres) && data.genres.length) {
      rec.genres = data.genres.map((g) => g.description);
    }
    if (data.short_description) rec.summaryEn = data.short_description;
    const reqs = buildRequirements(data.pc_requirements?.minimum, rec);
    if (reqs) rec.requirements = reqs;

    rec.links = [{ label: "Steam", url: `https://store.steampowered.com/app/${appId}/` }];
    rec.source = "steam";
    rec.steamAppId = appId;
    rec.matchScore = 1;
    rec.confidence = "high";
    if (oldCanon && oldCanon !== data.name) {
      rec.extra = {
        ...(rec.extra || {}),
        factsSource: "بحث يدوي",
        reviewNote: `السجل كان مربوطاً بالخطأ بـ«${oldCanon}»؛ أُعيد توجيهه إلى «${data.name}»`,
      };
    }

    changed++;
    console.log(`  ${id}\n      ${oldCanon}  ->  ${data.name} (app ${appId}, ${rec.releaseDate})`);
  }

  if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
  console.log(`\n${changed} record(s) repointed. ${DRY ? "(dry run)" : ""}`);
})();