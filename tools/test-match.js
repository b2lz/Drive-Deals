"use strict";
const {
  cleanTitle,
  similarity,
  pickBest,
  extractYear,
  isDlc,
} = require("./lib/match");

// query, candidate, should-accept, candidateReleaseYear (null = unknown)
const cases = [
  // Scene-title junk must still resolve to the real work.
  ["3 Idiots (2009)  [720p]", "3 Idiots", true],
  ["Baazigar [1993].[1080p]", "Baazigar", true],
  ["12 Strong_1", "12 Strong", true],
  ["Bargain 720p_1", "Bargain", true],
  ["Monsters At Work    [ENGLISH]", "Monsters at Work", true],
  ["6Underground 2019", "6 Underground", true],
  ["47 Meters Down (2017) [YTS.AG]", "47 Meters Down", true],
  ["28 Years Later The Bone Temple", "28 Years Later", true],
  ["Abo.Khashem", "Abo Khashem", true],
  ["91Days", "91 Days", true],
  ["SpongeBob. SquarePants", "SpongeBob SquarePants", true],
  ["Marvel Spider Man", "Marvel's Spider-Man", true],

  // Must be rejected: wrong title, or a bundle standing in for the game.
  ["A Total War Rome 2", "Total War: ROME II - Hannibal at the Gates Campaign Pack", false],
  ["Death Stranding 2", "Mafia III", false],
  ["invisable", "Invisible", false],

  // Script / transliteration folding.
  ["Ertugrul", "Diriliş: Ertuğrul", true],
  ["cukur", "Çukur", true],
  ["المؤسس عثمان", "المؤسس عثمان", true],
  ["المصيد", "المصيد", true],

  // Numbers that are part of the title, not release metadata.
  ["1917", "1917", true, 1919],
  ["2012", "2012", true, 2009],
  ["300 1+2", "300", false, 2006],
  ["Blade Runner 2049", "Blade Runner 2049", true, 2017],
  // The 1982 film is a different film — must not match.
  ["Blade Runner 2049", "Blade Runner", false, 1982],

  // A colon subtitle is the same work; a spin-off or sequel is not.
  ["Ace Combat 7", "ACE COMBAT 7: SKIES UNKNOWN", true],
  ["A Total War Rome 2", "Total War: ROME II", true],
  ["A Total War Rome 2", "Total War: ROME II - Emperor Edition", true],
  ["Dune", "Dune: Part Two", false],
  ["Rocky", "Rocky Balboa", false],
  ["Interstellar", "Interstellar", true],

  // Arabic: the article, the ta-marbuta and Wikipedia's "(مسلسل)"
  // qualifier must not sink an otherwise exact title.
  ["المصيد", "المصيد (مسلسل)", true],
  ["المؤسس عثمان", "المؤسس عثمان (الموسم الرابع)", true],
  ["الست موناليزا", "الست موناليزا (مسلسل)", true],
  ["200 جنية (2021)", "200 جنيه", true],
  ["المصيد", "مصيدة فئران (مسلسل)", false],

  // Scene cruft: file sizes and scene tags must not defeat a match
  // against the real store title.
  // Scene cruft must not defeat a match against the real store title.
  ["Aragami 2016  2Gb_1", "Aragami", true, 2016],
  ["Bayonetta  8.3GB_1", "Bayonetta", true],
  ["Atomic Heart  {HV}", "Atomic Heart", true],
  ["Atomic Heart  {HV}", "Atomic Heart", true],
  ["Batman Arkham Asylum GotY", "Batman: Arkham Asylum GOTY", true],
  // Orthographic variants that must not block a match.
  ["اللون الازرق", "اللون الأزرق (مسلسل)", true],
  ["55 اسعاف", "55 إسعاف (فلم)", true],
  // Known limitation, documented rather than hidden: "الحب الاعمى"
  // (Love Blind) and "حب أعمى" (Love Deeper) are genuinely different
  // Arabic series that differ by one letter, and score 0.71 — just
  // under the floor, so they are rejected rather than conflated.
  ["الحب الاعمى", "حب أعمى", false],
];

let pass = 0;
for (const [q, c, want, candYear] of cases) {
  const got = similarity(q, c, extractYear(q), candYear ?? null);
  // DLC is filtered before scoring in the providers (steam.resolve drops
  // anything isDlc() flags), so an add-on listing can never reach here
  // with a real result. Mirror that: a DLC candidate always counts as
  // rejected, whatever the raw score says.
  const ok = isDlc(c) ? false : got >= 0.72;
  const mark = ok === want ? "PASS" : "FAIL";
  if (ok === want) pass++;
  console.log(
    `${mark}  ${got.toFixed(2)}  ${JSON.stringify(q)} -> ${JSON.stringify(c)}` +
      (candYear ? ` (${candYear})` : "") +
      (isDlc(c) ? "  [dlc — filtered]" : ""),
  );
}

console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exitCode = 1;

console.log("\npickBest should choose the strongest of several:");
const ranked = pickBest("Death Stranding 2", [
  { title: "Mafia III", id: 1 },
  { title: "DEATH STRANDING 2: ON THE BEACH", id: 2 },
  { title: "Death Stranding", id: 3 },
]);
console.log("  ->", ranked.best && ranked.best.title, ranked.score.toFixed(2), ranked.accepted);

console.log("\ncleanTitle samples:");
for (const q of ["3 Idiots (2009)  [720p]", "Monsters At Work    [ENGLISH]", "12 Strong_1"]) {
  console.log("  ", JSON.stringify(q), "->", JSON.stringify(cleanTitle(q)));
}

