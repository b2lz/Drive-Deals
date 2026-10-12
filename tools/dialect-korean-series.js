const fs = require('fs');
const path = require('path');

const targetFile = 'details/korean-series.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 5 عناصر بالعامية المصرية الطبيعية بدون حرق، جملة أو جملتين
const updates = {
  "korean-series/Goblin 720p.jpg":
    "جنرال محارب ملعون بالخلود وعايش بقاله مئات السنين، بيلف ويدوّر على عروسته البشرية الوحيدة اللي تقدر تشيل السيف المغروس في صدره عشان يرتاح.",

  "korean-series/Inheritors.jpg":
    "دراما رومانسية شبابية بتدور وسط طلاب مدرسة ثانوية راقية لأولاد العائلات الغنية وورثة الشركات، وخناقاتهم ومشاعر الحب المعقدة بينهم.",

  "korean-series/The First Responders.1&2.jpg":
    "أكشن وتشويق سريع بيجمع بين ظباط الشرطة ورجال الإطفاء والمسعفين، وهما شغالين مع بعض في الميدان عشان يحلوا الجرائم الصعبة وينقذوا أرواح الناس في أصعب اللحظات.",

  "korean-series/The K2 S01.jpg":
    "جندي ومرتزق سابق معروف بلقب K2 بيهرب بعد ما اتظلم في مقتل حبيبته، وبيشتغل حارس شخصي لبنت مرشح رئاسي في وسط لعبة سياسية مليانة مؤامرات وخيانة.",

  "korean-series/W Two Worlds Apart [2016].jpg":
    "دكتورة شابة بيختفي أبوها رسام الويبتون الشهير فجأة، فبتلاقي نفسها اتسحبت جوة عالم القصة المصورة اللي رسمها، وبتبدأ قصة حب غريبة بينها وبين بطل القصة كانغ تشول."
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
