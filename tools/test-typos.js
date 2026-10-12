"use strict";
// Typo tolerance and the digit/letter boundary.
//
// Every case here came from a real library folder that failed to resolve.
// The two rules they pin down pull in opposite directions and both are
// needed: "2K19" is one word, "ptototype2" is two.
//
// Usage: node tools/test-typos.js

const { cleanTitle, coversAllTokensFuzzy, nearMiss } = require("./lib/match");

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

// --- Where a digit/letter boundary is, and where it is not ------------
// "2K19" is a model number and stays whole. Splitting it gave
// "WWE 2 K 19", which matches nothing, and cost WWE 2K19, NBA 2K22 and
// every other 2K title.
check("a model number stays whole", cleanTitle("WWE 2K19"), "WWE 2K19");
check("2K22 stays whole", cleanTitle("NBA 2K22"), "NBA 2K22");
check("F1 22 keeps its space", cleanTitle("F1 22"), "F1 22");
check("an all-caps code stays whole", cleanTitle("MW2CR"), "MW2CR");

// A trailing number is a sequel marker and must come off the word.
check("a trailing sequel number splits", cleanTitle("ptototype2"), "ptototype 2");
check("a two-letter sequel splits", cleanTitle("IGI2"), "IGI 2");
check("Doom3 splits", cleanTitle("Doom3"), "Doom 3");

// A capital after a lowercase is a new word.
check("a new word after lowercase splits", cleanTitle("91Days"), "91 Days");
check("6Underground splits", cleanTitle("6Underground"), "6 Underground");

// Real titles that end in a number must survive.
check("2049 is part of the title", cleanTitle("blade runner 2049"), "blade runner 2049");
check("1917 is all title", cleanTitle("1917"), "1917");
check("300 is all title", cleanTitle("300"), "300");

// --- Word distances --------------------------------------------------
check("silient / silent", nearMiss("silient", "silent") <= 2, true);
check("enhanched / enhanced", nearMiss("enhanched", "enhanced") <= 2, true);
check("oblivian / oblivion", nearMiss("oblivian", "oblivion") <= 2, true);
check("spee / speed", nearMiss("spee", "speed") <= 2, true);
check("obs / ops", nearMiss("obs", "ops") <= 2, true);
check("a real difference is refused", nearMiss("payne", "silent") <= 2, false);

// --- Titles recovered by tolerating one typo -------------------------
const RECOVERED = [
  ["silent hill f", "Silent Hill f"],
  ["Grand Theft Auto V Enhanched Edition", "Grand Theft Auto V Enhanced Edition"],
  ["Need for Spee  ProStreet", "Need for Speed ProStreet"],
  ["mechwarior 5", "MechWarrior 5"],
  ["little nghtmare 3", "Little Nightmares III"],
  ["call of duty black obs 6", "Call of Duty Black Ops 6"],
  ["ptototype2", "Prototype 2"],
];
for (const [query, candidate] of RECOVERED) {
  check(`"${query}" -> "${candidate}"`, coversAllTokensFuzzy(query, candidate), true);
}

// --- Titles that must NOT be rescued ---------------------------------
// One-word folders stay exact: "Leo" is not "Lee", and a shelf of these
// is where a fuzzy rule does the most damage.
check("Leo is not Lee", coversAllTokensFuzzy("Leo", "Lee"), false);
check("Sing is not the Singing Ringing Tree", coversAllTokensFuzzy("Sing", "The Singing Ringing Tree"), false);
check("Leo is not Leon", coversAllTokensFuzzy("Leo", "Leon The Professional"), false);

// Two differences are not one typo.
check(
  "oblivion remake is not remastered",
  coversAllTokensFuzzy("The Elder Scrolls oblivian REMAK", "The Elder Scrolls Oblivion Remastered"),
  false,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;