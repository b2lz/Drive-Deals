"use strict";
// Unit tests for bundle-title handling. No network: these cover the
// title surgery and the guards, which is where the bugs were.
//
// Usage: node tools/test-collection.js

const { isBundle, baseOf, isFilmSeries } = require("./lib/collection");
const { coversAllTokens } = require("./lib/match");

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

// --- Bundle detection ----------------------------------------------
check("1+2 is a bundle", isBundle("300 1+2"), true);
check("collection is a bundle", isBundle("Harry poter collection"), true);
check("bluray collection", isBundle("Home Alone Collection Bluray"), true);
check("plain film is not", isBundle("Dune Part Two"), false);
check("series word", isBundle("Fast and Furious series"), true);

// --- Base-name extraction ------------------------------------------
check("base of 1+2", baseOf("300 1+2"), "300");
check("base of 1+2+3", baseOf("Fantastic Beasts 1+2 + 3"), "Fantastic Beasts");
check("base of collection", baseOf("Harry poter collection"), "Harry poter");
check("base of bluray", baseOf("Home Alone Collection Bluray"), "Home Alone");
check("base keeps real words", baseOf("Big Hero 6"), "Big Hero 6");

// --- Film-series guard ---------------------------------------------
// A bundle must not be described by a franchise article that is about
// something else: "Harry Potter" without the qualifier is the novels.
check(
  "novel series rejected",
  isFilmSeries(
    "Harry Potter is a series of seven children's fantasy novels written by British author J. K. Rowling.",
  ),
  false,
);
check(
  "film series accepted",
  isFilmSeries(
    "Harry Potter is a film series based on the Harry Potter series of novels by J. K. Rowling.",
  ),
  true,
);
check("single film rejected", isFilmSeries("300 is a 2006 epic historical fantasy action film directed by Zack Snyder."), false);

// --- Full-coverage guard -------------------------------------------
check("candidate missing a word rejected", coversAllTokens("Harry Potter", "Harry"), false);
check("candidate with an extra word accepted", coversAllTokens("Harry Potter", "Harry Potter and the Chamber of Secrets"), true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;