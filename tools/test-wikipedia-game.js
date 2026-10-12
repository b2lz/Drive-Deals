"use strict";
// Unit tests for the Wikipedia game provider's infobox parser.
//
// These run against captured wikitext, so they need no network. The
// cases are the real infobox shapes that break naive parsing: nested
// list templates, regional-publisher tags, truncated templates and
// values split across a <br />.
//
// Usage: node tools/test-wikipedia-game.js

const { parseInfobox, queryVariants } = require("./lib/wikipedia-game");

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

// --- A plain infobox ------------------------------------------------
check(
  "plain fields",
  pick(
    parseInfobox(`{{Infobox video game
| title = Portal
| developer = [[Valve Corporation|Valve]]
| publisher = [[Valve Corporation|Valve]]
| platforms = {{ubl|[[Microsoft Windows]]|[[macOS]]}}
| released = '''24 October 2007'''
| genre = Puzzle
}}`),
  ),
  // A piped link "[[Valve Corporation|Valve]]" must display as "Valve".
  { developer: "Valve", publisher: "Valve", platforms: ["PC", "macOS"] },
);

// --- Regional publisher tag: the region code is not a value ---------
check(
  "vgrelease region tag dropped",
  pick(
    parseInfobox(`{{Infobox video game
| publisher = [[Bandai Namco Entertainment]]{{vgrelease|JP|[[FromSoftware]]}}
| platforms = {{ubl|[[Microsoft Windows]]|[[PlayStation 5]]}}
}}`),
    ["developer", "publisher", "platforms"],
  ),
  {
    developer: null,
    publisher: "Bandai Namco Entertainment",
    platforms: ["PC", "PlayStation 5"],
  },
);

// --- A <br /> between values, and a nested list inside a list --------
check(
  "br separator and nested list",
  pick(
    parseInfobox(`{{Infobox video game
| developer = [[Nintendo EAD]]
| writer = {{Unbulleted list|Kazuhiro Hamatani|Masaru Yamamura}}
| engine = [[Unreal Engine 4|UE4]]
}}`),
    ["developer", "engine"],
  ),
  // "[[Unreal Engine 4|UE4]]" displays as "UE4" — that is correct.
  { developer: "Nintendo EAD", engine: "UE4" },
);

// --- A template truncated by the infobox boundary -------------------
check(
  "truncated template does not leak its name",
  pick(
    parseInfobox(`{{Infobox video game
| developer = FromSoftware
| director = Masaru Yamamura
| designer = {{vgrelease|JP|[[Somebody`),
    ["developer"],
  ),
  { developer: "FromSoftware" },
);

// --- Footnotes and citations are discarded --------------------------
// An <ref> carrying a {{cite web|title=...}} must not leak into the
// value, and must not invent a `title` field from the citation.
check(
  "refs and citations dropped",
  pick(
    parseInfobox(`{{Infobox video game
| developer = [[Crytek]]{{efn|[[Saber Interactive]] co-developed it.}}
| engine = [[Inon Zur]]<ref name="x">{{cite web|title=Y}}</ref>
| genres = {{Plainlist|Horror, First-person shooter}}
}}`),
    ["developer", "engine", "genres"],
  ),
  // The <ref> body is dropped but the value before it survives, and the
  // Plainlist genre list expands.
  { developer: "Crytek", engine: "Inon Zur", genres: ["رعب", "إطلاق نار من منظور أول"] },
);

// The citation's "title=Y" must not be mistaken for an infobox field.
check(
  "citation does not invent a title field",
  parseInfobox(`{{Infobox video game
| developer = [[Crytek]]
| engine = [[Inon Zur]]<ref name="x">{{cite web|title=Fake Title}}</ref>
}}`).title,
  null,
);

// --- A game with no infobox at all ----------------------------------
check(
  "no infobox",
  pick(parseInfobox("Just some prose, no template here."), ["developer", "platforms"]),
  { developer: null, platforms: null },
);

// --- Query variants for the messiest titles --------------------------
// The games shelf is full of run-together words and sequel numbers the
// article never carries. These retries rescue them without loosening the
// match rules — a candidate still has to cover every query word.
checkVariants("plain title needs no extra query", "Crysis Remastered", ["Crysis Remastered"]);
checkVariants("run-together words are split", "CallOfDutyModernWarfare", [
  "Call Of Duty Modern Warfare",
]);
checkVariants("trailing sequel number is dropped as a retry", "bioshock 1", ["bioshock"]);
checkVariants("a year that is part of the name is kept", "Hotline Miami 2", ["Hotline Miami 2"]);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;

/** Every variant must contain a usable query; none may be empty. */
function checkVariants(name, input, mustInclude) {
  const variants = queryVariants(input);
  const bad = variants.filter((v) => !v || !v.trim());
  const missing = mustInclude.filter((want) => !variants.includes(want));
  const ok = !bad.length && !missing.length;
  if (ok) pass++;
  else fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}\n        ${JSON.stringify(variants)}` +
      (missing.length ? `\n        missing: ${JSON.stringify(missing)}` : ""),
  );
}

/** Keep only the fields under test, so comparisons stay readable. */
function pick(parsed, keys) {
  const out = {};
  for (const key of keys || ["developer", "publisher", "platforms"]) {
    out[key] = parsed[key] === undefined ? null : parsed[key];
  }
  return out;
}