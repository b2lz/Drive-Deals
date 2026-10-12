"use strict";
// Tests for the SystemRequirementsLab provider's matching guards.
//
// The site has ~19,000 slugs, so the guards below are what stand between
// a library title and somebody else's game. Every case here is a real
// near-miss that a similarity score alone got wrong.
//
// Usage: node tools/test-systemrequirementslab.js

const { toSlug } = require("./lib/systemrequirementslab");
const guards = require("./lib/systemrequirementslab");
const { decodeEntities, romanValue } = require("./lib/systemrequirementslab");

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

// --- Slug normalisation ---------------------------------------------
check("plain title", toSlug("Grand Theft Auto V"), "grand-theft-auto-v");
check("dots become dashes", toSlug("Assassins.Creed.Valhalla"), "assassins-creed-valhalla");
check("edition words are dropped", toSlug("Dying Light The Following EE"), "dying-light-the-following");
// Scene releases abbreviate words in the name ("FF7"). The expansion
// happens in the title, so the slug carries the short form too.
check("an abbreviation is expanded", toSlug("CRISIS CORE - FF7 - REUNION"), "crisis-core-fantasy-7-reunion");
check("braces are dropped", toSlug("Fifa 26  {HV}"), "fifa-26");

// The page heading is HTML-escaped. "Assassin&#x27;s Creed Valhalla" would
// never match an article, so entities must be resolved before the name is
// passed to another source.
check(
  "html entities are decoded",
  decodeEntities("Assassin&#x27;s Creed &quot;Dishonored&quot; &#8212; &amp; Sons"),
  "Assassin's Creed \"Dishonored\" — & Sons",
);
check("a hex entity is decoded", decodeEntities("Tom Clancy&#39;s"), "Tom Clancy's");

// The library writes "FF7" and the site writes "vii"; both are the
// number seven, so numerals are compared by value.
check("roman numerals are valued", romanValue("vii"), 7);
check("subtractive numerals are valued", romanValue("iv"), 4);
check("plain numbers are valued", romanValue("10"), 10);
check("a word is not a numeral", romanValue("reunion"), null);
check("an unknown entity is left alone", decodeEntities("A &bogus; B"), "A &bogus; B");

// A trailing "Part 2" is part of the name, but cleanTitle removes it as a
// file-name artefact ("12 Strong_1"). The provider puts it back so the
// two Harry Potter films cannot be confused.
check(
  "a part number survives slug normalisation",
  toSlug("Harry Potter And The Deathly Hallows Part 1"),
  "harry-potter-and-the-deathly-hallows-part-1",
);
check(
  "part two is kept distinct from part one",
  toSlug("Harry Potter And The Deathly Hallows Part 2"),
  "harry-potter-and-the-deathly-hallows-part-2",
);

// --- The guards need the live sitemap, so they run separately -------
// The matching guards are what stand between a library title and another
// game's page. They need the sitemap, so they are exercised by
// tools/srl-audit.js (--live below) rather than in this offline suite.

check("provider exports the slug builder", typeof toSlug, "function");
check("provider exports resolve", typeof guards.resolve, "function");
check("provider exports parsePage", typeof guards.parsePage, "function");

if (process.argv.includes("--live")) {
  const LIVE = [
    // title,                      must resolve to
    ["Grand Theft Auto V", "grand-theft-auto-v"],
    ["Assassins.Creed.Valhalla", "assassins-creed-valhalla"],
    ["CRISIS CORE - FF7 - REUNION", "crisis-core-final-fantasy-vii-reunion"],
    // A bare numeral is noise when the series has an unnumbered base.
    ["Crysis 1", "crysis"],
    ["Dead Space 1", "dead-space"],
    // ...but it identifies the entry when the series is numbered.
    ["Witcher 3", "the-witcher-3-wild-hunt"],
    ["Metal Gear Solid V", "metal-gear-solid-v-ground-zeroes"],
    // A year is honoured, in full or as the marketed season.
    ["FIFA 2013", "fifa-13"],
    ["FIFA 2018", "fifa-18"],
    // A part number separates two films of the same name.
    ["Harry Potter And The Deathly Hallows Part 1", "harry-potter-and-the-deathly-hallows-part-1"],
    ["Harry Potter And The Deathly Hallows Part 2", "harry-potter-and-the-deathly-hallows-part-2"],
    // Wrong game, no such entry, and an invented title: all refused.
    ["Fifa 26  {HV}", null],
    ["Zzzz Nonexistent Game Qqq", null],
  ];

  (async () => {
    for (const [title, want] of LIVE) {
      const hit = await guards.resolve(title);
      check(`live: ${title}`, hit && hit.slug, want);
    }
    console.log(`\n${pass} passed, ${fail} failed (live)`);
    if (fail) process.exitCode = 1;
  })();
} else {
  console.log(`\n${pass} passed, ${fail} failed`);
  console.log("(run with --live to exercise the sitemap guards)");
  if (fail) process.exitCode = 1;
}