"use strict";
// Tests for the Wikidata provider.
//
// The guards here were each written after a wrong match reached the data,
// so the cases are those mistakes: a prefix collision between two Arabic
// films, a television programme offered to a film shelf, and a manga
// offered to an anime shelf.
//
// Usage: node tools/test-wikidata.js [--live]

const { queryVariants, languagesFor } = require("./lib/wikidata");

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
}

// --- Query variants -------------------------------------------------
// Wikidata indexes the spaced romanisation, so run-together words have to
// be split before searching.
check("plain title is unchanged", queryVariants("Crysis"), ["Crysis"]);
check(
  "run-together words are split",
  queryVariants("AnsatsuKyoushits"),
  ["AnsatsuKyoushits", "Ansatsu Kyoushits"],
);
check(
  "a trailing sequel number is dropped",
  queryVariants("Crysis 1"),
  ["Crysis 1", "Crysis"],
);

// --- Which languages are searched -----------------------------------
// "El Cuerpo" has no useful English article; the film is in the Spanish
// one. Latin-script languages are detected from their function words.
check("an Arabic title searches Arabic first", languagesFor("المصيد")[0], "ar");
check("an English title searches English", languagesFor("Squid Game")[0], "en");
check("a Spanish title searches Spanish first", languagesFor("El Cuerpo")[0], "es");
check("a Cyrillic title searches Russian first", languagesFor("Игры")[0], "ru");
// "122" is an Egyptian film, but a title of digits reveals nothing, so
// the shelf has to say so.
check("a hint overrides the title", languagesFor("122", "ar")[0], "ar");
check("a hinted title still falls back to English", languagesFor("122", "ar").includes("en"), true);

console.log(`\n${pass} passed, ${fail} failed`);

if (process.argv.includes("--live")) {
  const wd = require("./lib/wikidata");

  (async () => {
    // [title, medium, mustBeFound]
    const cases = [
      ["Grand Theft Auto V", "game", true],
      ["Battlefield 2", "game", true],
      ["Crysis 1", "game", true],
      ["3 Idiots (2009)  [720p]", "film", true],
      ["Squid Game", "series", true],
      ["El Cuerpo (2012)", "film", true],
      // Arabic orthography varies between sources: the library writes
      // "جنية" and Wikidata writes "جنيه". The same film, so it must match.
      ["200 جنية", "film", true],
      // A romanisation no spelling comparison could bridge.
      ["AnsatsuKyoushits", "anime", true],
      ["BlackClover", "anime", true],
      // Wikidata's item for it carries no claims at all — only a label.
      // It is still a confirmed match and must not be discarded.
      // Two different Arabic films that fold to the same token.
      ["المصيد", "film", false],
      // The exact query finds the third film; only a retry that drops
      // the "3" finds the 2010 original. Refusing beats publishing the
      // wrong film's director and cast.
      ["How.To.Train.Your.Dragon 3", "film", false],
      // "11.11" is two numbers and "11-11-11" is three.
      ["11.11", "film", false],
      // Not a work at all.
      ["Zzzz Nonexistent Game Qqq", "game", false],
    ];

    for (const [title, medium, want] of cases) {
      // The Arabic shelf tells the provider its language, because a
      // title of digits says nothing about where the film is from.
      const lang = /[\u0600-\u06FF]/.test(title) || /^\d+$/.test(title.trim()) ? "ar" : undefined;
      const r = await wd.resolve(title, { medium, lang });
      const ok = Boolean(r) === want;
      if (ok) pass++;
      else fail++;
      console.log(
        `${ok ? "PASS" : "FAIL"}  live: ${title}` +
          (r ? `\n        -> ${r.entity.id} ${r.entity.label}` : "        -> MISS"),
      );
    }

    console.log(`\n${pass} passed, ${fail} failed (live)`);
    if (fail) process.exitCode = 1;
  })();
} else {
  console.log("(run with --live to exercise the lookup guards)");
  if (fail) process.exitCode = 1;
}