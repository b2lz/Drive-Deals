"use strict";
// Cache keys must not collide across scripts.
//
// The bug this covers: a key built with /[^\w.-]+/g looks correct and
// is not. In JavaScript `\w` is `[A-Za-z0-9_]`, so every Arabic or
// Japanese character becomes an underscore and a whole shelf of titles
// collapses onto a handful of files. One cached record is then served to
// every one of them — an Arabic film came to carry the director and cast
// of an unrelated one.
//
// Usage: node tools/test-cachekey.js

const { cacheFileName } = require("./lib/cachekey");

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

// The titles that collided in production.
const ARABIC = [
  "arabic-films/30 يوم في العز.jpg",
  "arabic-films/أحمد و أحمد.jpg",
  "arabic-films/أصحاب ولا أعز.jpg",
  "arabic-films/أمن دولت.jpg",
  "arabic-films/إطلعولي بره.jpg",
  "arabic-films/122.jpg",
];

const arabicKeys = ARABIC.map((id) => cacheFileName("arabic-films", id));
check(
  "arabic titles all get different keys",
  new Set(arabicKeys).size,
  ARABIC.length,
);

// The naive key that caused it: every Arabic title collapsed together.
const naive = ARABIC.map((id) => id.replace(/[^\w.-]+/g, "_"));
check(
  "the naive key did collide, which is why this exists",
  new Set(naive).size < ARABIC.length,
  true,
);

// Japanese and mixed-script titles too.
check(
  "cjk and arabic titles never share a key",
  new Set([
    cacheFileName("anime", "anime/AnsatsuKyoushits.jpg"),
    cacheFileName("anime", "anime/المصيد.jpg"),
    cacheFileName("anime", "anime/Sing.jpg"),
  ]).size,
  3,
);

// Two ids that normalise to the same readable text still differ.
check(
  "titles differing only in punctuation differ",
  cacheFileName("films", "a:b.jpg") === cacheFileName("films", "a-b.jpg"),
  false,
);

// The key has to stay a usable file name.
check(
  "the key is filesystem safe",
  /^[\w.-]+\.json$/.test(
    cacheFileName("arabic-films", "arabic-films/.some <bad>:name.jpg"),
  ),
  true,
);
check(
  "the key is stable across calls",
  cacheFileName("anime", "anime/BlackClover.jpg"),
  cacheFileName("anime", "anime/BlackClover.jpg"),
);
check(
  "the key is not too long for a filesystem",
  cacheFileName("games", "games/" + "x".repeat(500) + ".jpg").length < 120,
  true,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;