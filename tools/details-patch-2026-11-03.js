"use strict";
// Console-only titles, 2026-11-03.
//
// God of War III Remastered (PS4/PS5), Mario Party Superstars (Switch) and
// Super Mario Party Jamboree (Switch / Switch 2) have no official PC
// version, so their details pages had no "مواصفات التشغيل" tab at all —
// the only section that was actually missing on the page. The
// requirements below are the console hardware itself, the only honest
// spec these games have, with the approximate download size each store
// publishes. The storage figures are approximations, so the records stay
// flagged for review; needsRequirements is cleared because a source (the
// consoles' own stores) now states the specs.

module.exports = {
  "games/God of War III Remastered.jpg": {
    series: "God of War",
    ageRating: "18+ (PEGI)",
    summaryAr:
      "النسخة المحسّنة من اللعبة على بلايستيشن بدقة 1080p وستين إطارًا في الثانية. تلعب دور كراتوس، المحارب السبارتي، وهو يصعد من أعماق العالم السفلي إلى قمة جبل أوليمبوس لينتقم ممن خانوه، ويتصدى على طريقه لأشدّ مخلوقات الأساطير قسوةً بأسلحة وسحر جديد.",
    needsRequirements: false,
    requirements: {
      minimum: {
        os: "PlayStation 4",
        storage: "حوالي 10 جيجابايت",
      },
      recommended: {
        os: "PlayStation 4 Pro أو PlayStation 5 (عبر التوافق)",
        storage: "حوالي 10 جيجابايت",
      },
      notes:
        "إصدار كونسول حصري على بلايستيشن ولا يوجد له إصدار PC رسمي؛ المتطلبات أدناه لجهاز البلايستيشن نفسه وحجم التخزين تقريبي حسب متجر سوني. النسخ المتاحة على الحاسوب تحويلات غير رسمية وكفاءتها تعتمد على الجهاز.",
    },
    links: [
      {
        label: "الموقع الرسمي",
        url: "https://www.playstation.com/en-us/games/god-of-war-iii-remastered",
      },
      {
        label: "ويكيبيديا — God of War III",
        url: "https://en.wikipedia.org/wiki/God_of_War_III",
      },
    ],
    note:
      "أُضيفت مواصفات التشغيل الخاصة بالجهاز الأصلي (بلايستيشن) حتى لا يبقى القسم فارغًا، وحجم التخزين تقريبي. اللعبة بلا إصدار PC رسمي.",
    flag: "requirements",
  },

  "games/Mario Party Superstars.jpg": {
    series: "Mario Party",
    ageRating: "كل الأعمار (ESRB: E)",
    needsRequirements: false,
    requirements: {
      minimum: {
        os: "Nintendo Switch",
        storage: "حوالي 3 جيجابايت",
      },
      recommended: {
        os: "Nintendo Switch مع اشتراك Nintendo Switch Online للعب عبر الإنترنت",
        storage: "حوالي 3 جيجابايت",
      },
      notes:
        "إصدار كونسول حصري على أجهزة نينتندو سويتش ولا يوجد له إصدار PC؛ المتطلبات أدناه لجهاز السويتش نفسه وحجم التخزين تقريبي حسب متجر نينتندو.",
    },
    links: [
      { label: "الموقع الرسمي", url: "https://www.nintendo.com/" },
      {
        label: "ويكيبيديا — Mario Party Superstars",
        url: "https://en.wikipedia.org/wiki/Mario_Party_Superstars",
      },
    ],
    note:
      "أُضيفت مواصفات التشغيل الخاصة بالجهاز الأصلي (نينتندو سويتش) حتى لا يبقى القسم فارغًا، وحجم التخزين تقريبي. اللعبة بلا إصدار PC.",
    flag: "requirements",
  },

  "games/Super Mario Party Jamboree.jpg": {
    series: "Mario Party",
    ageRating: "كل الأعمار (ESRB: E)",
    needsRequirements: false,
    requirements: {
      minimum: {
        os: "Nintendo Switch",
        storage: "حوالي 5 جيجابايت",
      },
      recommended: {
        os: "Nintendo Switch 2",
        storage: "حوالي 5 جيجابايت",
      },
      notes:
        "إصدار كونسول حصري على أجهزة نينتندو سويتش ولا يوجد له إصدار PC؛ المتطلبات أدناه لجهاز السويتش نفسه وحجم التخزين تقريبي حسب متجر نينتندو. اللعب عبر الإنترنت يتطلب اشتراك Nintendo Switch Online.",
    },
    links: [
      { label: "الموقع الرسمي", url: "https://www.nintendo.com/" },
      {
        label: "ويكيبيديا — Super Mario Party Jamboree",
        url: "https://en.wikipedia.org/wiki/Super_Mario_Party_Jamboree",
      },
    ],
    note:
      "أُضيفت مواصفات التشغيل الخاصة بالجهاز الأصلي (نينتندو سويتش / سويتش 2) حتى لا يبقى القسم فارغًا، وحجم التخزين تقريبي. اللعبة بلا إصدار PC.",
    flag: "requirements",
  },
};
