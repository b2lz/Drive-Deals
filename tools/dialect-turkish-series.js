const fs = require('fs');
const path = require('path');

const targetFile = 'details/turkish-series.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 7 عناصر بالعامية المصرية الطبيعية بدون حرق، جملة أو جملتين
const updates = {
  "turkish-series/Price of Passion.jpg":
    "دراما رومانسية وأكشن مشوقة عن دكتورة جراحة بتلاقي نفسها مجبرة تتجوز قاتل محترف عشان تحمي أخوها وتنقذ حياته.",

  "turkish-series/السلطان عبد الحميد.jpg":
    "مسلسل تاريخي بيحكي عن فترة حكم السلطان عبد الحميد الثاني وأواخر أيام الدولة العثمانية، والصراعات والمؤامرات السياسية اللي واجهها عشان يحافظ على دولته.",

  "turkish-series/عمر.jpg":
    "ملحمة تاريخية درامية بتتناول سيرة الفاروق عمر بن الخطاب من بدايات الإسلام، وترصد محطات مهمة في تأسيس الدولة والفتوحات.",

  "turkish-series/محمد الفاتح.jpg":
    "مسلسل تاريخي وأكشن بيتناول قصة حياة السلطان العثماني الشاب محمد الفاتح وطموحه العسكري وخطته لفتح القسطنطينية.",

  "turkish-series/احمد بن حنبل.jpg":
    "عمل تاريخي ديني بيرصد سيرة الإمام أحمد بن حنبل ومواقفه وثباته في مواجهة محنة خلق القرآن وصراعات عصره.",

  "turkish-series/زمن الخيانة.jpg":
    "دراما اجتماعية بتناقش تفكك العلاقات الأسرية ومشاكل الجواز لما يدخل بينهم الطمع والخيانة والصراعات على الفلوس.",

  "turkish-series/طائر الصباح.jpg":
    "سنام بنت بسيطة بتشتغل في بقالة أبوها، وبتحاول تلاقي شغل عشان تهرب من ضغوط الجواز، ولما بتشتغل في شركة إعلانات مع أختها بتدخل في قصة حب ومواقف كوميدية مع مديرها."
};

let count = 0;
for (const [key, newSummary] of Object.entries(updates)) {
  if (j.items[key]) {
    j.items[key].summaryAr = newSummary;
    count++;
  } else {
    console.warn('Key not found:', key);
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log(`Updated ${count} items in ${targetFile}`);
