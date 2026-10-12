"use strict";
// Unit tests for the Wikipedia lead parser.
//
// The parser has to work across the languages the provider searches,
// and it must not over-read: a credit that trails into the next clause
// is a bug, and so is a year picked up from a sentence that merely
// mentions another year.
//
// Usage: node tools/test-wikipedia-media.js

const { parseLead, isMediaPage, isDisambiguationText } = require("./lib/wikipedia");

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

// --- Credits must stop at the end of the name ------------------------
check(
  "director credit is trimmed",
  parseLead("Big Stan is a 2007 American comedy film directed by Rob Schneider in his directorial debut.")
    .director,
  "Rob Schneider",
);
check(
  "trailing clause does not ride along",
  parseLead("Squid Game is a South Korean dystopian survival thriller drama television series created, written, and directed by Hwang Dong-hyuk for Netflix.")
    .director,
  "Hwang Dong-hyuk",
);

// --- Multi-language leads -------------------------------------------
check(
  "spanish lead",
  pick(parseLead("El cuerpo es una película española de 2012 dirigida por Oriol Paulo, nominado a la mejor dirección novel."), [
    "year", "kind", "director",
  ]),
  { year: 2012, kind: "film", director: "Oriol Paulo" },
);
check(
  "arabic lead",
  pick(parseLead("11:11 هو فيلم دراما مصري قادم من إخراج كريم أبو زيد وبطولة إياد نصار."), ["kind", "director"]),
  { kind: "film", director: "كريم أبو زيد" },
);

// --- The year must be the release year, not a cited one -------------
check(
  "release year is used",
  parseLead("Dune: Part Two is a 2024 American epic science fiction film directed by Denis Villeneuve.").year,
  2024,
);
check(
  "a year mentioned mid-sentence is not the release year",
  parseLead(
    "Cool Grey is a 1995 British crime film, a loose remake of the 1989 French film, directed by Bill Forsyth.",
  ).year,
  1995,
);

// --- A film lead that mentions a "series" is still a film -----------
// Regression: "Alita: Battle Angel is a 2019 American cyberpunk action
// film based on Yukito Kishiro's science fiction manga series" ends in
// the word "series", which used to classify it as television and get
// it rejected from the film shelf.
check(
  "manga series mention does not make it a tv series",
  parseLead(
    "Alita: Battle Angel is a 2019 American cyberpunk action film based on Yukito Kishiro's science fiction manga series.",
  ).kind,
  "film",
);
check(
  "book series mention does not make it a tv series",
  parseLead(
    "2 Guns is a 2013 American buddy cop action comedy film based on the novel series by T.R. Ragan.",
  ).kind,
  "film",
);
check(
  "a television series is still a series",
  parseLead("Squid Game is a South Korean dystopian survival thriller drama television series.").kind,
  "series",
);
check(
  "a film franchise is a film",
  parseLead("Resident Evil is a film series mainly produced by Constantin Film.").kind,
  "film",
);

// --- The medium comes from the opening, not the whole article ------
// Regression: Aladdin's extract ends with "an animated television
// series (1994-1995)" in its derived-works paragraph. Scanning the
// whole extract filed a 1992 animated film as a television series, and
// it then got rejected from the cartoon-films shelf.
check(
  "a derived television series later in the article does not change the medium",
  parseLead(
    'Aladdin is a 1992 American animated musical fantasy film based on the Middle Eastern folk tale "Aladdin". ' +
      "It was released to critical and commercial success and became the highest-grossing film of the year. " +
      "Aladdin's success led to derived works including two direct-to-video sequels; an animated television series (1994-1995); and a stage musical adaptation.",
  ).kind,
  "film",
);
check(
  "a sequel mentioned later does not change the medium",
  parseLead(
    "Dune: Part Two is a 2024 American epic science fiction film directed by Denis Villeneuve. " +
      "It is a sequel to Dune (2021) and the second film in a planned trilogy.",
  ).kind,
  "film",
);

// --- The medium guard across languages ------------------------------
check("english film page", isMediaPage("Dune: Part Two is a 2024 American epic science fiction film."), true);
check("arabic film page", isMediaPage("11:11 هو فيلم دراما مصري."), true);
check("spanish film page", isMediaPage("El cuerpo es una película española de 2012."), true);
check("numerology page", isMediaPage("In numerology, 11:11 is considered to be a significant moment in time."), false);
check("integer page", isMediaPage("122 is the natural number following 121 and preceding 123."), false);

// --- Disambiguation stubs in several languages -----------------------
check("english disambiguation", isDisambiguationText("12 Monkeys may refer to:\n\n12 Monkeys, a 1995 film."), true);
check("arabic disambiguation", isDisambiguationText("المصيد قد يشير إلى-film"), true);
check("spanish disambiguation", isDisambiguationText("El cuerpo puede referirse a:\n\nEl cuerpo, película de 2012."), true);
check("real article is not a stub", isDisambiguationText("Big Stan is a 2007 American comedy film."), false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;

/** Keep only the fields under test. */
function pick(parsed, keys) {
  const out = {};
  for (const k of keys) out[k] = parsed[k] === undefined ? null : parsed[k];
  return out;
}