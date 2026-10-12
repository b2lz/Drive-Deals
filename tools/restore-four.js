"use strict";
// Restores the four records whose borrowed data was removed once they were
// found to belong to a different game. Every value here is read from a
// named source, not from recall:
//
//   Call of Duty (2003)      -> PCGamingWiki "Call of Duty" + Wikipedia
//   Modern Warfare (2007)    -> PCGamingWiki "Call of Duty 4: Modern Warfare"
//   Hulk (2003)               -> Wikipedia "Hulk (video game)"
//
// Hulk has no PCGamingWiki page and no Steam entry (it was released for
// console and Windows on physical media only), so it keeps the honest
// "needs specs" state rather than getting invented numbers.
//
// Usage: node tools/restore-four.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");
const parsed = JSON.parse(fs.readFileSync(file, "utf8"));

// --- Call of Duty (2003) — PCGamingWiki "Call of Duty" ----------------
const cod1 = parsed.items["games/Call Of Duty 1.jpg"];
if (cod1) {
  cod1.title = "Call Of Duty 1";
  cod1.canonicalTitle = "Call of Duty";
  delete cod1.wikiTitle;
  cod1.releaseDate = "2003-10-29";
  cod1.developer = "Infinity Ward";
  cod1.publisher = "Activision";
  cod1.genres = ["تصويب من منظور الشخص الأول", "حرب عالمية ثانية"];
  cod1.platforms = ["PC"];
  cod1.summaryAr =
    "أول لعبة في سلسلة Call of Duty، تصويب من منظور الشخص الأول تدور أحداثها في الحرب العالمية " +
    "الثانية على الجبهة الأوروبية بين 1942 و1945. بُنيت كتجربة قصصية تعمل بدون إنترنت مع جزء " +
    "للعب الجماعي منفصل، وتعتمد على الانتشار بين الأدوار والاستفادة من الأنفاق والنقاط " +
    "الضعيفة في السفن والعدادات.";
  cod1.summaryEn =
    "Call of Duty is a first-person shooter set in World War II, across the European " +
    "frontlines of 1942-1945. Built as an offline campaign experience with a " +
    "separate multiplayer component.";
  cod1.requirements = {
    minimum: {
      os: "Windows 98 / ME",
      cpu: "Intel Pentium III 600 MHz أو AMD Athlon 600 MHz (800 MHz مع United Offensive)",
      ram: "128 MB",
      vram: "32 MB",
      gpu: "كارت يدعم T&L مع تسريع عتاد ثلاثي الأبعاد",
      directx: "الإصدار 9.0b (9.0c مع United Offensive)",
      storage: "1.4 GB",
      note: "قرص 8x CD-ROM؛ اللعب الجماعي يحتاج مودم 56kbps على الأقل",
    },
    recommended: {
      os: "Windows 2000 / XP",
      cpu: "700 MHz",
      ram: "256 MB",
      gpu: "أي من ATI Radeon أو NVIDIA GeForce أو Matrox Parhelia",
      storage: "1.8 GB على 98/ME أو 2 GB على 2000/XP",
    },
  };
  cod1.needsReview = false;
  delete cod1.needsSummary;
  delete cod1.needsRequirements;
  delete cod1.needsReview;
  cod1.extra = {
    factsSource: "بحث يدوي",
    factsNote: "المواصفات من PCGamingWiki، والتاريخ من Wikipedia",
  };
  console.log("  Call Of Duty 1: restored from PCGamingWiki + Wikipedia");
}

// --- Modern Warfare (2007) — PCGamingWiki "CoD 4: Modern Warfare" -----
const mw = parsed.items["games/Call Of Duty Modern Warfare 1.jpg"];
if (mw) {
  mw.title = "Call Of Duty Modern Warfare 1";
  mw.canonicalTitle = "Call of Duty 4: Modern Warfare";
  delete mw.wikiTitle;
  mw.releaseDate = "2007-11-12";
  mw.developer = "Infinity Ward";
  mw.publisher = "Activision";
  mw.genres = ["تصويب من منظور الشخص الأول", "أكشن عسكري"];
  mw.platforms = ["PC", "PlayStation 3", "Xbox 360", "Wii"];
  mw.summaryEn =
    "Call of Duty 4: Modern Warfare drops the player in the middle of a modern " +
    "conflict, following a squad through a fictional war-torn Middle Eastern " +
    "country as they pursue an insurgent leader.";
  mw.requirements = {
    minimum: {
      os: "Windows XP / Vista (64-bit)",
      cpu: "Intel Pentium 4 2.4 GHz أو AMD Athlon 64 2800+ أو ما يعادلهما",
      ram: "1 GB (2 GB مع كرت 64-بت)",
      gpu: "GeForce 7800 GT أو Radeon X1600 أو ما يعادلهما — 256 MB VRAM",
      directx: "الإصدار 9.0c",
      storage: "7 GB",
    },
    recommended: {
      os: "Windows XP / Vista (64-bit)",
      cpu: "Intel Core 2 Duo E8400 3.0 GHz أو AMD Athlon 64 X2 9400 2.8 GHz أو أفضل",
      ram: "2 GB",
      gpu: "GeForce 8800 GT أو Radeon HD 2900 أو ما يعادلهما — 256 MB VRAM",
      storage: "7 GB",
    },
  };
  delete mw.needsSummary;
  delete mw.needsRequirements;
  delete mw.needsReview;
  mw.extra = {
    factsSource: "بحث يدوي",
    factsNote: "المواصفات والتاريخ من PCGamingWiki",
  };
  console.log("  Call Of Duty Modern Warfare 1: restored from PCGamingWiki");
}

// --- Hulk (2003) — Wikipedia only -------------------------------------
const hulk = parsed.items["games/HULK [2003] 1.2GB_1.jpg"];
if (hulk) {
  hulk.title = "HULK [2003] 1.2GB_1";
  delete hulk.wikiTitle;
  hulk.releaseDate = "2003-06-24";
  hulk.developer = "Radical Entertainment";
  hulk.publisher = "Universal Interactive";
  hulk.genres = ["أكشن", "Beat 'em up", "تسلل"];
  hulk.platforms = ["PlayStation 2", "Xbox", "GameCube", "PC"];
  hulk.summaryAr =
    "لعبة أكشن من 2003 بطو Hulk. تجمع بين معارك الشوارع بأسلوب الضرب الجماعي " +
    "ومستويات تسلل يلعب فيها اللاعب شخصية بروس بانر بقدرته على التحويل. " +
    "تدور أحداثها بعد أحداث الفيلم بأعوام في مواجهة Arthritis وأتباعه.";
  hulk.summaryEn =
    "Hulk is a 2003 action game developed by Radical Entertainment and published " +
    "by Universal Interactive. It combines beat 'em up combat with stealth levels " +
    "played as Bruce Banner, and serves as a loose sequel to the 2003 film.";
  // No PCGamingWiki page and no Steam entry exist for this title, so the
  // requirements stay empty and the page says so instead of guessing.
  delete hulk.needsReview;
  hulk.needsRequirements = true;
  hulk.needsReview = true;
  hulk.extra = {
    factsSource: "بحث يدوي",
    factsNote: "المعلومات من Wikipedia",
    reviewNote:
      "اللعبة غير موجودة على Steam ولا في PCGamingWiki؛ لذا لا توجد مواصفات موثقة لها — تحتاج مصدراً آخر.",
  };
  console.log("  HULK [2003]: facts restored from Wikipedia; specs still unverified");
}

// --- Invincible: fix the summary field, keep the honest note ----------
const inv = parsed.items["games/INVINCIBLE .jpg"];
if (inv) {
  inv.title = "INVINCIBLE ";
  console.log("  INVINCIBLE: summary already cleared, requirements present");
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(DRY ? "(dry run)" : "done");