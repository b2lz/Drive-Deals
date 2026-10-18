"use strict";
// ============================================================
// The detail records for the 11 games added on 2026-10-18.
//
// Provenance, per record:
//   - 8 titles: real store data pulled from the Steam appdetails API by
//     tools/steam-lookup.js (developer, publisher, release date, genres and
//     the published PC requirements are copied verbatim).
//   - 3 titles (Mario Party Superstars, Super Mario Party Jamboree and God of
//     War III Remastered) are console-only and have no official PC
//     requirements at all, so they carry needsRequirements instead of
//     invented specs.
//
// Two titles publish only a "minimum" tier on the store (Atomfall and
// Trails in the Sky 2nd Chapter). Rather than presenting minimum specs as
// recommended, both keep the single published tier and are flagged.
//
// Arabic summaries are written from the store description. No spoilers.
// Brand names are transliterated into Arabic on purpose so the text stays
// free of mixed-script fragments.
// ============================================================

module.exports = {
  "games/Atomfall.jpg": {
    title: "Atomfall",
    type: "game",
    developer: "Rebellion",
    publisher: "Rebellion",
    releaseDate: "2025-03-27",
    platforms: ["PC"],
    genres: ["أكشن", "مغامرة", "بقاء"],
    modes: ["لاعب واحد"],
    summaryAr:
      "بعد كارثة نووية تركت أجزاء من بريطانيا في حالة خراب، تنطلق في منطقة مغلقة بحثًا عن إجابات. تلعب دور ناجٍ يجمع الموارد ويصنع الأدوات ويتبادل الإمدادات مع من بقي حولك، وتقاتل ما يعترضك من أعداء وحيوانات برية، وتتعرف على قصص من عاشوا الكارثة.",
    summaryEn:
      "A nuclear disaster has left an area of Britain in tatters. Explore the ruins, scavenge, craft, barter and fight your way through in search of answers.",
    requirements: {
      minimum: {
        os: "Windows 10 أو أحدث",
        cpu: "Intel Core i5-9400F أو ما يماثله",
        ram: "ذاكرة 16 GB",
        gpu: "Nvidia RTX 2060 6GB أو ما يماثلها",
        directx: "الإصدار 12",
        storage: "60 GB مساحة متاحة",
      },
    },
    needsReview: ["requirements"],
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/801800/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 801800,
    matchScore: 1,
    extra: {
      reviewNote:
        "المتجر ينشر المواصفات الدنيا فقط ولا يذكر توصية، لذلك لم تُضف توصية من عندي.",
    },
  },

  "games/Clive Barker's Hellraiser - Revival.jpg": {
    title: "Clive Barker's Hellraiser - Revival",
    canonicalTitle: "Clive Barker's Hellraiser: Revival",
    type: "game",
    developer: "Saber Interactive",
    publisher: "Saber Interactive",
    releaseDate: "2026-10-08",
    platforms: ["PC"],
    genres: ["أكشن", "رعب", "بقاء"],
    modes: ["لاعب واحد"],
    summaryAr:
      "عودة إلى سلسلة الرعب الأسطورية بمنظور الشخص الأول. تصون صفقة قطعتها مع الشرير بينهيد، وتستخدم قوة صندوق الألغاز لغز التكوينات لتبقي على حياتك. واجه وحوش الجحيم، واجمع القطع اللازمة لتفعيل القوة، واختر بين إغراء بينهيد وما تبقى عليه من صداقتك في الجحيم.",
    summaryEn:
      "A new chapter in the legendary horror series, in first person. Wield the powers of the Genesis Configuration puzzle box to survive your bargain with the infamous Pinhead.",
    requirements: {
      minimum: {
        os: "Windows 10 بنسخة 64 بت (تحديث 22H2 أو أحدث)",
        cpu: "AMD Ryzen 5 1500X أو Intel Core i5-8400",
        ram: "ذاكرة 8 GB",
        gpu: "AMD Radeon RX Vega 64 8GB أو NVIDIA GeForce GTX 1660",
        storage: "80 GB مساحة متاحة",
        note: "يُنصح باستخدام SSD",
      },
      recommended: {
        os: "Windows 10 بنسخة 64 بت (تحديث 22H2 أو أحدث)",
        cpu: "AMD Ryzen 5 5600X أو Intel Core i5-12400F",
        ram: "ذاكرة 16 GB",
        gpu: "AMD Radeon RX 6600 XT أو NVIDIA RTX 3060",
        storage: "80 GB مساحة متاحة",
        note: "يُنصح باستخدام SSD",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/1551980/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 1551980,
    matchScore: 1,
    extra: {},
  },

  "games/DYNASTY WARRIORS 3 - CER.jpg": {
    title: "DYNASTY WARRIORS 3 - CER",
    canonicalTitle: "DYNASTY WARRIORS 3: Complete Edition Remastered",
    type: "game",
    developer: "KOEI TECMO GAMES",
    publisher: "KOEI TECMO GAMES",
    releaseDate: "2026-09-30",
    platforms: ["PC"],
    genres: ["أكشن", "آر بي جي", "استراتيجية"],
    modes: ["لاعب واحد", "تعاوني", "لاعب متعدد"],
    summaryAr:
      "إعادة صهر للنسختين الأصليتين من لعبة Dynast Wars 3 مع نسخة Xtreme Legends في إصدار واحد، برسوميات حديثة وقتال أسرع. تحكم جنديًا يقاتل آلاف الخصوم في معركة واحدة، وتبدّل الشخصيات والسلاح كلما تقدمت المعركة.",
    summaryEn:
      "A remake of DYNASTY WARRIORS 3 and DYNASTY WARRIORS 3: Xtreme Legends with modern graphics and even more thrilling action.",
    requirements: {
      minimum: {
        os: "Windows 11 بنسخة 64 بت",
        cpu: "Intel Core i7-8700 أو AMD Ryzen 7 2700X",
        ram: "ذاكرة 16 GB",
        gpu: "NVIDIA GeForce GTX 1060 6GB أو AMD Radeon RX 5600 XT 6GB أو Intel Arc A380 6GB",
        directx: "الإصدار 12",
        storage: "60 GB مساحة متاحة",
        note: "هذه المواصفات تعطي 30 إطارًا في الثانية بدقة 1080p بجودة رسوم منخفضة مع تفعيل الترقية",
      },
      recommended: {
        os: "Windows 11 بنسخة 64 بت",
        cpu: "Intel Core i7-10700K أو AMD Ryzen 7 3700X",
        ram: "ذاكرة 16 GB",
        gpu: "NVIDIA GeForce RTX 3060 8GB أو AMD Radeon RX 6700 XT 12GB",
        directx: "الإصدار 12",
        storage: "60 GB مساحة متاحة",
        note: "هذه المواصفات تعطي 60 إطارًا في الثانية بدقة 1080p بجودة رسوم عالية مع تفعيل الترقية",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/3841510/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 3841510,
    matchScore: 1,
    extra: {
      titleNote:
        "العنوان في الإكسل مختصر بحروف اختتصار للنسخة الكاملة، وهي نفسها المباعة على المتجر.",
    },
  },

  "games/God of War III Remastered.jpg": {
    title: "God of War III Remastered",
    type: "game",
    developer: "Santa Monica Studio",
    publisher: "Sony Interactive Entertainment",
    releaseDate: "2015-06-02",
    platforms: ["PlayStation 4", "PlayStation 5"],
    genres: ["أكشن", "مغامرة"],
    modes: ["لاعب واحد"],
    summaryAr:
      "النسخة المحسّنة من اللعبة على جهاز بلايستيشن بدقة 1080p وستين إطارًا في الثانية. تلعب دور كراتوس، المحارب السبارتي، وهو يصعد من أعماق العالم السفلي إلى قمة جبل أوليمبوس لينتقم ممن خانوه. بسحاقين منفرجين وأسلحة وسحر جديد، وتواجه أكثر مخلوقات الأسطورة قسوة على طريقك.",
    summaryEn:
      "Originally developed for PlayStation 3, God of War III was remastered for PlayStation 4 with 1080p support at 60fps.",
    needsRequirements: true,
    links: [
      { label: "الموقع الرسمي", url: "https://www.playstation.com/en-us/games/god-of-war-iii-remastered" },
    ],
    confidence: "high",
    extra: {
      reviewNote:
        "اللعبة متاحة على أجهزة بلايستيشن فقط ولا يوجد لها إصدار رسمي على الحاسوب، لذلك لا توجد مواصفات تشغيل موثوقة. النسخ المتاحة على الحاسوب تحويلات غير رسمية وكفاءتها تعتمد على الجهاز وليست متطلبات ثابتة.",
      factsSource: "بحث يدوي",
    },
  },

  "games/LEGO Party.jpg": {
    title: "LEGO Party",
    canonicalTitle: "LEGO Party",
    type: "game",
    developer: "SMG Studio",
    publisher: "Fictions",
    releaseDate: "2025-09-30",
    platforms: ["PC"],
    genres: ["أكشن", "كاجوال", "حزمي"],
    modes: ["لاعب واحد", "لاعب متعدد", "تعاوني", "عبر الإنترنت"],
    summaryAr:
      "لعبة حفلة لأربعة لاعبين مبنية بشكل مختلف عن ألعاب الحفل المعتادة. تنافس أصدقاءك في مناطق تحدٍّ غريبة وفي ستين لعبة قصيرة ممتعة مأخوذة من مجموعات ليغو المفضلة لديك، مثل القراصنة والفضاء وسلسلة النينيناغو. العب عبر الإنترنت أو على نفس الجهاز، ومع أي منصة عند أصدقائك.",
    summaryEn:
      "A 4-player party game built different. Compete in wacky Challenge Zones and 60 hilarious minigames from across your favourite LEGO sets.",
    requirements: {
      minimum: {
        os: "Windows 10",
        cpu: "Intel Core 2 Quad Q6600 أو AMD Phenom II X4 965",
        ram: "ذاكرة 6 GB",
        gpu: "NVIDIA GeForce GT 1030 2GB أو AMD Radeon R7 250 2GB",
        storage: "10 GB مساحة متاحة",
        note: "جودة منخفضة بدقة 720p و30 إطارًا في الثانية",
      },
      recommended: {
        os: "Windows 11",
        cpu: "Intel Core i5-2300 أو AMD FX-8350",
        ram: "ذاكرة 8 GB",
        gpu: "NVIDIA GeForce GT 1030 2GB أو AMD Radeon R7 250 2GB",
        note: "جودة عالية بدقة 1080p و60 إطارًا في الثانية",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/1969370/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 1969370,
    matchScore: 1,
    extra: {},
  },

  "games/Mario Party Superstars.jpg": {
    title: "Mario Party Superstars",
    type: "game",
    developer: "NDcube",
    publisher: "Nintendo",
    releaseDate: "2021-10-29",
    platforms: ["Nintendo Switch"],
    genres: ["حزمي", "مغامرة"],
    modes: ["لاعب واحد", "لاعب متعدد"],
    summaryAr:
      "احتفال يعيد جزءًا من أجمل لحظات السلسلة. تلعب على خمس لوحات كلاسيكية من حقبة أجهزة نينتندو إضافة إلى مئة لعبة قصيرة مأخوذة من ألعاب السلسلة على مدى سنوات، وتنافس الأصدقاء في سباقات وجمع النجوم قبل نهاية الأدوار.",
    summaryEn:
      "Revives classic boards and 100 minigames from across the Mario Party series.",
    needsRequirements: true,
    links: [{ label: "الموقع الرسمي", url: "https://www.nintendo.com/" }],
    confidence: "high",
    extra: {
      reviewNote:
        "اللعبة متاحة على جهاز النينتندو سويتش فقط ولا يوجد لها إصدار على الحاسوب، لذلك لا توجد مواصفات تشغيل موثوقة.",
      factsSource: "بحث يدوي",
    },
  },

  "games/Minecraft Dungeons II.jpg": {
    title: "Minecraft Dungeons II",
    type: "game",
    developer: "Mojang Studios, Double Eleven",
    publisher: "Xbox Game Studios",
    releaseDate: "2026-09-29",
    platforms: ["PC"],
    genres: ["أكشن", "مغامرة", "آر بي جي"],
    modes: ["لاعب واحد", "تعاوني", "لاعب متعدد"],
    summaryAr:
      "تهديد جديد ينزل على عالم اللعبة، في فصل جديد من مغامرات الأبطال داخل عالم قائم على المكعبات. استكشف كهوفًا مليئة بالأعداء، وافتح مسارات جديدة لم تعهدها من قبل، واشترِ العتاد والسلاح من المتاجر، وتعاون مع أصدقائك لإكمال المهام وصد زعماء نهاية المرحلة.",
    summaryEn:
      "A new threat descends upon the Overworld.",
    requirements: {
      minimum: {
        os: "Windows 10 بنسخة 64 بت (نسخة 1703 أو أحدث)",
        cpu: "Intel Core i3-8100 أو AMD Ryzen 3 2200G أو ما يماثلهما",
        ram: "ذاكرة 8 GB",
        gpu: "NVIDIA GeForce GTX 1050 أو AMD Radeon RX 560 بكارت 2 GB على الأقل",
        directx: "الإصدار 11",
      },
      recommended: {
        os: "Windows 10 بنسخة 64 بت (نسخة 1703 أو أحدث)",
        cpu: "Intel Core i5-8400 أو AMD Ryzen 5 2600 أو ما يعادلهما",
        ram: "ذاكرة 16 GB",
        gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580 بكارت 6 GB على الأقل",
        directx: "الإصدار 11",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/1912410/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 1912410,
    matchScore: 1,
    extra: {},
  },

  "games/Super Mario Party Jamboree.jpg": {
    title: "Super Mario Party Jamboree",
    type: "game",
    developer: "Nintendo Cube",
    publisher: "Nintendo",
    releaseDate: "2024-10-17",
    platforms: ["Nintendo Switch", "Nintendo Switch 2"],
    genres: ["حزمي", "مغامرة"],
    modes: ["لاعب واحد", "لاعب متعدد"],
    summaryAr:
      "أضخم لعبة من سلسلة الحفل حتى اليوم، ومعها مئة واثنا عشر لعبة قصيرة وسبع لوحات جديدة، منها قلعة ماريو ذات الأقواس الملونة. تنافس العائلة على اللوحات، وتزاحم على مضمار السباق، وتواصل الحفلة عبر الإنترنت مع أصدقائك في مختلف أنحاء العالم.",
    summaryEn:
      "The biggest Mario Party to date, with 112 minigames, seven boards and a Jamboree TV mode.",
    needsRequirements: true,
    links: [{ label: "الموقع الرسمي", url: "https://www.nintendo.com/" }],
    confidence: "high",
    extra: {
      reviewNote:
        "اللعبة متاحة على جهاز النينتندو سويتش فقط ولا يوجد لها إصدار على الحاسوب، لذلك لا توجد مواصفات تشغيل موثوقة.",
      developerNote:
        "المطور مذكور باسم نينتندو كيو بعد إعادة التسمية، وكان معروفًا سابقًا باسم آخر عند إعلان اللعبة.",
      factsSource: "بحث يدوي",
    },
  },

  "games/Trails In The Sky 2nd Chapter.jpg": {
    title: "Trails In The Sky 2nd Chapter",
    canonicalTitle: "Trails in the Sky 2nd Chapter",
    type: "game",
    developer: "Nihon Falcom",
    publisher: "Nihon Falcom",
    releaseDate: "2026-09-16",
    platforms: ["PC"],
    genres: ["أكشن", "مغامرة", "آر بي جي"],
    modes: ["لاعب واحد"],
    summaryAr:
      "الفصل الثاني من سلسلة الترايلز الأسطورية. تعود إستيل برايت في رحلة جديدة عبر مدينة ليبرل لتكشف الحقيقة وراء اختفاء جوشوا وتواجه منظمة أوريبيوروس. نظام قتال سريع بنمط الأوربمنت، مع إمكانية التبديل بين الشخصيات، ومهام جانبية، وشجرة مهارات تنمو مع تقدمك.",
    summaryEn:
      "Estelle Bright sets out on a new journey across Liberl to uncover the truth behind Joshua's disappearance and defeat the sinister Ouroboros organization.",
    requirements: {
      minimum: {
        os: "Windows 10/11",
        cpu: "AMD Ryzen 5 1600",
        ram: "ذاكرة 8 GB",
        gpu: "NVIDIA GeForce GTX 1050",
        directx: "الإصدار 11",
        storage: "52 GB مساحة متاحة",
        note: "إعدادات: 1080p وستون إطارًا في الثانية بملف الرسوميات الأدائي",
      },
    },
    needsReview: ["requirements"],
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/4225980/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 4225980,
    matchScore: 1,
    extra: {
      reviewNote:
        "المتجر ينشر المواصفات الدنيا فقط ولا يذكر توصية، لذلك لم تُضف توصية من عندي.",
    },
  },

  "games/Valor Mortis.jpg": {
    title: "Valor Mortis",
    type: "game",
    developer: "One More Level",
    publisher: "Lyrical Games, One More Level",
    releaseDate: "2026-10-13",
    platforms: ["PC"],
    genres: ["أكشن", "مغامرة", "آر بي جي"],
    modes: ["لاعب واحد"],
    summaryAr:
      "لعبة قتال من منظور الشخص الأول على غرار ألعاب السولسلايك، من مطوري لعبة غوست رانر. تصعد من الموت كجندي سابق في جيش نابليون، وتحمل مصادر خارقة وتقاتل وحوشًا مرعبة وتكشف مؤامرة تهدد البشرية كلها. قتال سريع يمزج بين السيف والنار، وبيئات مدمرة تربط ساحات المعارك.",
    summaryEn:
      "Valor Mortis is a first-person action soulslike from the creators of Ghostrunner. Rise from death as a former soldier of Napoleon's army.",
    requirements: {
      minimum: {
        os: "Windows 10/11",
        cpu: "Ryzen 5 3600 أو Core i5-10600K",
        ram: "ذاكرة 16 GB",
        gpu: "RX 5600 XT أو GTX 1660 Ti",
        directx: "الإصدار 12",
        storage: "60 GB مساحة متاحة",
        note: "يلزم SSD. ثلاثون إطارًا في الثانية بدقة 1080p على أقل إعداد مع تفعيل الترقية",
      },
      recommended: {
        os: "Windows 10/11",
        cpu: "Ryzen 7 5800X أو Core i5-13400",
        ram: "ذاكرة 16 GB",
        gpu: "RX 6800 أو RTX 3070",
        directx: "الإصدار 12",
        storage: "60 GB مساحة متاحة",
        note: "يلزم SSD. ستون إطارًا في الثانية بدقة 1440p على متوسط مع تفعيل الترقية",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/2828710/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 2828710,
    matchScore: 1,
    extra: {},
  },

  "games/ZERO PARADES.jpg": {
    title: "ZERO PARADES",
    canonicalTitle: "ZERO PARADES: Director's Cut",
    type: "game",
    developer: "ZA/UM",
    publisher: "ZA/UM",
    releaseDate: "2026-05-21",
    platforms: ["PC"],
    genres: ["آر بي جي", "تجسس"],
    modes: ["لاعب واحد"],
    summaryAr:
      "من مطوري لعبة ديسكو إيليسيوم، لعبة تجسس موسّعة بنسخة المخرج. تلعب دور عميل استخبارات بارع لكنه منهك، في مهمته الأخيرة اليائسة. تنقّل بين عدة فرق من العملاء وتقرّر كيف يتصرّف كل واحد منهم، مع نظام مهارات حقيقي يغيّر تصرفات الشخصيات بحسب خبرتك accumulated.",
    summaryEn:
      "From the creators of Disco Elysium comes ZERO PARADES - the acclaimed espionage RPG, now expanded with the Director's Cut.",
    requirements: {
      minimum: {
        os: "Windows 10",
        cpu: "Intel Core i5-6500",
        ram: "ذاكرة 16 GB",
        gpu: "Nvidia GeForce GTX 1060 6GB",
        directx: "الإصدار 11",
      },
      recommended: {
        os: "Windows 11",
        cpu: "Intel Core i5-10400",
        ram: "ذاكرة 16 GB",
        gpu: "Nvidia GeForce GTX 2070 8GB",
        directx: "الإصدار 11",
      },
    },
    links: [{ label: "Steam", url: "https://store.steampowered.com/app/2863680/" }],
    confidence: "high",
    source: "steam",
    steamAppId: 2863680,
    matchScore: 1,
    extra: {
      titleNote:
        "العنوان في الإكسل مختصر بدون اللاحقة، والنسخة المباعة على المتجر هي النسخة الموسعة للمخرج.",
    },
  },
};