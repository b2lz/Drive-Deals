"use strict";
// Owner-supplied fields, 2026-10-18.
//
// 1. LIMBO — an Arabic summary replacing the 39-character fragment that was
//    the only field actually missing on this record.
//
// 2. Atomfall — a recommended tier as supplied. These are the same numbers the
//    store publishes as its minimum; the store lists no recommended tier, so
//    the record stays flagged.
//
// 3. Trails In The Sky 2nd Chapter — a recommended tier as supplied. The
//    values are Windows Vista era with 1 GB of RAM and DirectX 9.0c, which is
//    what the 2004 original runs on; the store lists this 2026 sequel as
//    needing Windows 10/11, a Ryzen 5 1600 and DirectX 11. Written as
//    supplied, and flagged so the conflict is visible on the page.

module.exports = {
  "games/LIMBO.jpg": {
    summaryAr:
      "لعبة ألغاز ومغامرات بأسلوب المنصات ذات طابع فني فريد ومظلم بالأبيض والأسود. تدور القصة حول طفل صغير يجد نفسه في عالم سحيق ومخيف يبحث عن أخته المفقودة، وأثناء رحلته يواجه العديد من الأخطار من الفخاخ المميتة والعناكب العملاقة، بالإضافة إلى أطفال آخرين يحاولون إيذائه. تتميز الأجواء بالهدوء المخيف والغموض العميق دون وجود أي نصوص أو حوارات سردية مباشرة.",
  },

  "games/Atomfall.jpg": {
    requirements: {
      recommended: {
        os: "Windows 10 أو أحدث (64 بت)",
        cpu: "Intel Core i5-9400F أو ما يعادله",
        ram: "ذاكرة عشوائية 16 GB",
        gpu: "Nvidia GeForce RTX 2060 بسعة 6 GB أو ما يعادله",
        directx: "الإصدار 12",
        storage: "60 GB متاحة",
      },
    },
    note:
      "المتجر لا ينشر توصية، والقيم هنا مطابقة لما نشره كحد أدنى. أُضيفت كما وردت من المالك ولا تمثل توصية مستقلة.",
    flag: "requirements",
  },

  "games/Trails In The Sky 2nd Chapter.jpg": {
    requirements: {
      recommended: {
        os: "Windows Vista أو 7 أو 8 أو أحدث",
        cpu: "Intel Core 2 Duo بسرعة 2.0 GHz أو أعلى",
        ram: "ذاكرة عشوائية 1 GB",
        gpu: "كارت بذاكرة 64 MB يدعم 3D Accelerator و DirectX 9.0c",
        storage: "5 GB متاحة",
      },
    },
    note:
      "تحذير: هذه القيم مطابقة لمواصفات الجزء الأول سنة 2004، بينما الجزء الثاني الجديد يحتاج نظام Windows 10 أو 11 ومعالج من فئة Ryzen 5 1600 وDirectX 11 حسب المتجر. القيم مكتوبة كما وردت من المالك وتحتاج تأكيد قبل الاعتماد عليها.",
    flag: "requirements",
  },
};