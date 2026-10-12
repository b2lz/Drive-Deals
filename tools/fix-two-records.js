"use strict";
// Two defects found in the final review, both from the same cause: the
// matcher resolved a folder onto a Steam entry that is a different game.
//
// 1. "Sniper Elite 2  2.87GB_1" was carrying the whole record of
//    Sniper Elite: Nazi Zombie Army 2 (app 247910) - the wrong summary, the
//    wrong date, the wrong requirements, the wrong Steam link. The real
//    game is Sniper Elite V2 (app 63380, 2010, third-person Berlin sniping).
//    Rebuilt from the Steam entry for 63380.
//
// 2. "Spider-Man Web of Shadows" had a developer field holding Steam's
//    multi-value list as one string with newlines and bullet asterisks.
//    Split into a readable list.
//
// Usage: node tools/fix-two-records.js [--dry]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const file = path.join(ROOT, "details", "games.json");

const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
let changed = 0;

// --- 1. Sniper Elite 2 -> the game actually in the folder ---------------
const elite = parsed.items["games/Sniper Elite 2  2.87GB_1.jpg"];
if (elite) {
  elite.canonicalTitle = "Sniper Elite V2";
  elite.releaseDate = "2010-03-02";
  elite.developer = "Rebellion";
  elite.publisher = "Rebellion";
  elite.genres = ["أكشن", "تصويب تكتيكي", "تسلل"];
  elite.modes = ["لاعب واحد"];
  elite.platforms = ["PC", "PlayStation 3", "Xbox 360"];
  elite.summaryEn =
    "In the dark days of the end of World War Two amidst the ruins of Berlin, " +
    "one bullet can change history. Sniper Elite V2 is an award-winning and " +
    "authentic World War II sniping experience. You are elite US sniper Karl " +
    "Fairburne, parachuted into Berlin amidst the Germans' final stand.";
  elite.summaryAr =
    "في الأيام المظلمة لنهاية الحرب العالمية الثانية بين أنقاض برلين، طلقة واحدة يمكن أن تغيّر التاريخ. " +
    "أنت القناص الأمريكي النخبة كارل فيربيرن، الذي أُنزل جواً في برلين في مواجهة " +
    "الوقوف النهائي لألمانيا، ومهمتك منع تسلّم تقنية برنامج الصواريخ النازية V2.";
  elite.requirements = {
    minimum: {
      os: "Windows Vista (SP2) أو Windows 7 أو Windows 8 (Windows XP غير مدعوم)",
      cpu: "معالج ثنائي النواة يدعم SSE3 (Intel Pentium D 3GHz / AMD Athlon 64 X2 4200) أو أفضل",
      ram: "2 GB",
      gpu: "كارت شاشة متوافق مع DirectX 10.0 بذاكرة 256 MB (NVIDIA GeForce 8800 / ATI Radeon HD 3870) أو أفضل",
      directx: "الإصدار 11.0",
      storage: "10 GB",
    },
    recommended: null,
  };
  elite.extra = {
    metacritic: "Metacritic 78/100",
    factsSource: "بحث يدوي",
    reviewNote:
      "السجل كان مربوطاً بالخطأ بلعبة Nazi Zombie Army 2؛ أُعيد بناؤه من صفحة Sniper Elite V2 على Steam",
  };
  elite.links = [{ label: "Steam", url: "https://store.steampowered.com/app/63380/" }];
  elite.confidence = "high";
  elite.source = "steam";
  elite.steamAppId = 63380;
  elite.matchScore = 1;
  changed++;
  console.log('  rebuilt "Sniper Elite 2  2.87GB_1" as Sniper Elite V2 (app 63380)');
}

// --- 2. Spider-Man Web of Shadows: multi-value developer string ----------
const spider = parsed.items["games/Spider-Man Web of Shadows.jpg"];
if (spider && typeof spider.developer === "string" && spider.developer.includes("\n")) {
  const studios = spider.developer
    .split("\n")
    .map((s) => s.replace(/^\s*\*\s*/, "").trim())
    .filter(Boolean);
  // item.js renders a single `developer` string, so the full credit list
  // goes there rather than into keys the page does not read.
  spider.developer = studios.join(" / ");
  changed++;
  console.log(`  split Spider-Man Web of Shadows developer into ${studios.length} studios`);
}

if (!DRY) fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n");
console.log(`\n${changed} record(s) fixed. ${DRY ? "(dry run)" : ""}`);