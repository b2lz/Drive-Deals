const fs = require('fs');
const path = require('path');

const targetFile = 'details/indian-films.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 11 عنصر بالعامية المصرية الطبيعية بدون حرق، جملة أو جملتين
const updates = {
  "indian-films/Penance Lane [Z] (2020).jpg":
    "مجرم سابق بيشتغل في صيانة عمارة قديمة ومعزولة سمعتها وحشة، وبيكتشف أسرار مرعبة وحاجات غريبة ومخيفة مستخبية بين الحيطان.",

  "indian-films/Salaar (2023).jpg":
    "اتنين صحاب عمر وإخوات في الضهر بيتحولوا لأعداء ألدّاء، في حرب شوارع وصراع دموي طاحن على السيطرة والنفوذ في إمبراطورية عصابات خيالية.",

  "indian-films/vikram vedha2022.jpg":
    "ظابط شرطة متقاعد وصارم بيطارد زعيم عصابة ذكي ومراوغ عشان يرجع مجوهرات مسروقة، لكن مواجهاته معاه بتخليه يشك في مفهوم الحق والعدالة.",

  "indian-films/Brothers (2015).jpg":
    "أخين بينهم خلافات قديمة وقطع قطيعة بيتقابلوا وجهاً لوجه في حلبة قتال الفنون القتالية المختلطة، في مواجهة شرسة بتصفي حسابات العيلة.",

  "indian-films/Don  [2006].[1080p].jpg":
    "زعيم عصابة دولية خطير بيموت في السر، فتقوم الشرطة جايبة راجل غلبان شبهه بالظبط عشان يحل محله ويدخل وسط العصابة ويوقعهم.",

  "indian-films/Edge Of Extinction.jpg":
    "صراع ملحمي للبقاء على قيد الحياة في عالم مدمر بتواجه فيه البشرية كوارث بيئية ومخاطر فناء شامل.",

  "indian-films/Fan (2016).jpg":
    "شاب مهووس بممثله المفضل لدرجة الجنون، حبه بيتحول لكره أعمى ورغبة في الانتقام وتدمير النجم بعد ما يرفض يقابله ويهينه.",

  "indian-films/Like Stars on Earth (2007).jpg":
    "طفل صغير بيعاني من صعوبة القراءة والكتابة والكل فاكره بليد ومش فاهمينه، لحد ما بيجي مدرس رسم متفهم يكتشف موهبته ويغير حياته كلها.",

  "indian-films/Psycho Party Planner [Z].jpg":
    "تنظيم حفلة راقية بيقلب لكابوس مرعب ومطاردات نفسية ومخاطر بتلاحق أصحابها.",

  "indian-films/SULTAN.jpg":
    "بطل مصارعة حقق بطولات ومجد كبير بيخسر كل حاجة في لحظة بسبب غروره، وبيعافر من الصفر عشان يرجع للحلبة ويسترد كرامته وحب حياته.",

  "indian-films/Tanhaji The Unsung Warrior (2020) [1080p].jpg":
    "ملحمة تاريخية حقيقية عن القائد العسكري الشجاع تانهاجي مالوساري، ومعركته البطولية عشان يسترد حصن كونهاندا لصالح شعبه."
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
