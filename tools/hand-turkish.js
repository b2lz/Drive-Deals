"use strict";
// Build records for the Turkish shows the automated lookup could not
// reach, from Wikipedia articles it never tried.
//
// Each one is named differently from its library folder — the folder
// says "FERIHA" and the article is "Adını Feriha Koydum"; the folder says
// "السلطان عبد الحميد" and the article is "Payitaht Abdülhamid". No
// title comparison finds those, so the article is named here and the rest
// is read from it.
//
// Output is printed for review. Nothing is written by this script.
//
// Usage: node tools/hand-turkish.js [--write]

const { getJson } = require("./lib/http");

const fs = require("fs");
const path = require("path");

const ROOT = __dirname.replace(/[\\/]tools$/, "");

/**
 * The mapping, and what was checked to justify it.
 *
 * `check` records how the article was confirmed to be the same show, so
 * the claim can be re-examined rather than taken on trust.
 */
const TARGETS = [
  {
    folder: "FERIHA",
    article: "Adını Feriha Koydum",
    wiki: "en",
    // The article's own first line names the series and its dates.
    check: "lead opens 'I Named her Feriha ... first broadcast on Show TV'",
    released: "2011-01-14", // "first broadcast on Show TV from 14 January 2011"
    networks: ["Show TV"],
    genres: ["دراما"],
  },
  {
    folder: "السلطان عبد الحميد",
    article: "السلطان عبد الحميد الثاني وصراع الذئاب (مسلسل)",
    wiki: "ar",
    // The article gives the Turkish name in brackets — (Payitaht
    // Abdülhamid) — which is what confirms it is the same series the
    // Turkish article describes. The Arabic article is used because the
    // site is read in Arabic.
    check: "lead names the Turkish original Payitaht Abdülhamid; same series",
    released: "2017-02-24", // tr article: "24 Şubat 2017 ... TRT 1'de yayımlanmaya başlamıştır"
    networks: ["TRT 1"],
    genres: ["تاريخي", "دراما", "أكشن"],
  },
  {
    folder: "عمر",
    article: "عمر (مسلسل)",
    wiki: "ar",
    check: "lead names it a 2012 biographical historical series about Umar",
    released: "2012",
    networks: ["MBC", "تلفزيون قطر"],
    genres: ["تاريخي", "سيرة ذاتية", "دراما"],
    // The lead names both the writer and the director.
    director: "حاتم علي",
    writer: "وليد سيف",
    cast: ["سامر إسماعيل", "غسان مسعود", "ميهار خضور", "مي سكاف"],
  },
  {
    folder: "محمد الفاتح",
    article: "محمد: سلطان الفتوحات",
    wiki: "ar",
    // Ambiguous: a 2013 series of the same name was cancelled after five
    // episodes. The 2024 one is recorded; the alternative is noted so the
    // choice can be reversed if the folder turns out to hold the other.
    check: "lead: 2024 series, Mehmed: Fetihler Sultanı, first episode 27 Feb 2024",
    note: "نفس الموضوع عنده مسلسل تركي آخر اسمه «Fatih» (2013) أُلغي بعد خمس حلقات — لو المجلد بيحمل لده، راجع الاختيار",
    released: "2024-02-27",
    networks: ["MBC"],
    genres: ["تاريخي", "أكشن", "دراما", "مغامرات"],
    director: "شفق بال",
    cast: [],
    // Flagged, because two different Turkish series share this subject.
    needsReview: true,
  },
];

/** First paragraph of an article, trimmed to whole sentences. */
function leadSentence(text, limit = 420) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  // Always cut at a sentence end where one exists. Falling back to a hard
  // cut mid-word reads as broken text on the page.
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".، "));
  return at > 40 ? cut.slice(0, at + 1) : cut;
}

/** Read one article: its lead and the infobox rows worth keeping. */
async function readArticle(wiki, title) {
  const url =
    `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json` +
    `&prop=extracts|revisions&rvprop=content&rvslots=main` +
    `&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`;

  const j = await getJson(url);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;

  const wikitext = page.revisions && page.revisions[0] && page.revisions[0].slots.main["*"];

  // A few infobox fields, read straight off the wikitext. Only what is
  // reliably present is taken; anything else is left to the summary.
  const field = (name) => {
    if (!wikitext) return null;
    const m = new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n|]+)`, "i").exec(wikitext);
    return m ? m[1].trim() : null;
  };

  return {
    title: page.title,
    lead: page.extract || "",
    network: field("network"),
    released: field("released"),
    genre: field("genre"),
  };
}

(async () => {
  const WRITE = process.argv.includes("--write");
  const DETAILS = path.join(ROOT, "details", "turkish-series.json");
  const file = JSON.parse(fs.readFileSync(DETAILS, "utf8"));

  let written = 0;

  for (const target of TARGETS) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`folder : ${target.folder}`);
    console.log(`article: ${target.wiki}:${target.article}`);
    console.log(`check  : ${target.check}`);
    if (target.note) console.log(`caution: ${target.note}`);

    const article = await readArticle(target.wiki, target.article);
    if (!article) {
      console.log("ARTICLE NOT FOUND — skipping");
      continue;
    }

    const summary = leadSentence(article.lead);
    console.log(`resolved: ${article.title}`);
    console.log(`summary (${summary.length} chars):\n  ${summary}`);

    if (!WRITE) continue;

    // The library id carries the folder's file extension, so it is found
    // by title rather than assembled by hand.
    const library = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
    const shelf = library.categories.find((c) => c.id === "turkish-series");
    const item = shelf.items.find((i) => i.title === target.folder);

    if (!item) {
      console.log(`  no library folder titled "${target.folder}" — skipped`);
      continue;
    }
    const id = item.id;

    // The note is honest about how the folder was identified: the library
    // name is not the article name, so the mapping is a claim that can be
    // checked rather than an automatic match.
    const howFound = `بحث يدوي — المجلد «${target.folder}» والمقال «${article.title}» مختلفان`;

    const record = {
      title: target.folder,
      canonicalTitle: article.title,
      type: "series",
      releaseDate: target.released || null,
      genres: target.genres || null,
      networks: target.networks || null,
      director: target.director || null,
      writer: target.writer || null,
      cast: target.cast && target.cast.length ? target.cast : null,
      // The Arabic articles supply an Arabic lead; the English one an
      // English lead. Each is stored where the page will render it.
      summaryAr: target.wiki === "ar" ? summary : null,
      summaryEn: target.wiki === "ar" ? null : summary,
      links: [
        {
          label: "ويكيبيديا",
          url: `https://${target.wiki}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
        },
      ],
      confidence: target.needsReview ? "medium" : "high",
      extra: {
        note: howFound,
        ...(target.note ? { reviewNote: target.note } : {}),
      },
      // No `source` field. That absence is what marks a record as hand
      // research, and every fill script leaves such records alone.
    };
    if (target.needsReview) record.needsReview = true;

    file.items[id] = record;
    written++;
    console.log(`  written to ${id}`);
  }

  if (WRITE && written) {
    fs.writeFileSync(DETAILS, JSON.stringify(file, null, 2) + "\n");
    console.log(`\n${written} records written`);
  } else if (!WRITE) {
    console.log(`\n${"=".repeat(70)}`);
    console.log("review the above, then re-run with --write");
  }
})();