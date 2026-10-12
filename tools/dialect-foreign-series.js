const fs = require('fs');
const path = require('path');

const targetFile = 'details/foreign-series.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 10 عناصر بالعامية المصرية الطبيعية بدون حرق، جملة أو جملتين
const updates = {
  "foreign-series/The Day Of The Jackal 2024.jpg":
    "مطاردة دولية شرسة بين قاتل محترف غامض ودقيق جداً في شغله، وضابطة مخابرات بريطانية ذكية مصممة توقعه بأي تمن.",

  "foreign-series/The Undoing 2020.jpg":
    "دكتورة نفسية ناجحة بتعيش حياة مثالية في نيويورك، بس حياتها كلها بتتقلب بعد جريمة قتل بشعة وشكوك بتطول جوزها.",

  "foreign-series/Acer.jpg":
    "محتوى تقني وثائقي بيستعرض أجهزة شركة Acer التايوانية، وشاشاتها وتطور تقنياتها عبر السنين، ومش عمل درامي.",

  "foreign-series/Buffy.jpg":
    "بنت مراهقة بتكتشف إن قدرها تكون صائدة مصاصي الدماء، وبتدخل كل يوم في معارك ومغامرات مرعبة ضد الشياطين وقوى الشر عشان تحمي مدينتها.",

  "foreign-series/Guten Morgen Verônica 2020.jpg":
    "مسلسل جريمة وتشويق برازيلي عن موظفة شرطة بتشوف حادثة انتحار قدام عينيها، فبتبدأ تحقق وتكشف شبكتين خطيرتين للنصب والعنف الأسري.",

  "foreign-series/it welcome to darry.jpg":
    "مسلسل رعب بيكشف البدايات المرعبة لبلدة ديري والكيان الشرير اللي بيصحى كل كام سنة عشان يصطاد الأطفال قبل أحداث فيلم It.",

  "foreign-series/La Casa Depapel.jpg":
    "عقل مدبر وعبقري بيلقب نفسه بالبروفيسور بيجمع فريق لصوص محترفين بأسماء مدن، وبيخطط لأكبر عمليتين سرقة في تاريخ إسبانيا على دار صك العملة وبنك إسبانيا.",

  "foreign-series/Shogun 2024.jpg":
    "ملحمة تاريخية وسياسية فخمة بتدور في اليابان الإقطاعية سنة 1600، وصراع أمراء الحرب على السلطة والنفوذ لما توصل سفينة بحار إنجليزي لشواطئهم.",

  "foreign-series/The Handmad's Tale.jpg":
    "في مستقبل كئيب ونظام قمعي بيسيطر على أمريكا بعد أزمة إنجاب حادة، بتجبر الستات القادرات على الإنجاب يعيشوا كجواري لخدمة عائلات القادة.",

  "foreign-series/The West Wings.jpg":
    "دراما سياسية مشوقة بتدخل في كواليس البيت الأبيض، وترصد الشغل اليومي والمناورات والأزمات الحساسة اللي بيعيشها فريق عمل الرئيس الأمريكي."
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
