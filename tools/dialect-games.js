const fs = require('fs');
const path = require('path');

const targetFile = 'details/games.json';
const jsonPath = path.resolve(__dirname, '..', targetFile);
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * تحويل الملخصات العربية في الألعاب إلى اللهجة المصرية المبسطة
 * وفقاً للقواعد والضوابط المحددة بدقة
 */
function dialectizeGameSummary(text) {
  if (!text || typeof text !== 'string') return text;
  // فحص إذا كان النص عربي أصلاً
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  // لو النص قصير جداً (أقل من 40 حرف) سيبه
  if (text.trim().length < 40) return text;

  let s = text;

  // 1. التراكيب والعبارات المركبة أولاً
  s = s.replace(/بالإضافة إلى ذلك/g, 'وكمان');
  s = s.replace(/في وقت حقيقي/g, 'في الوقت الحقيقي');
  s = s.replace(/تدور أحداثها/g, 'بتدور أحداثها');
  s = s.replace(/تدور أحداث/g, 'بتدور أحداث');
  s = s.replace(/تدور القصة/g, 'بتدور القصة');
  s = s.replace(/تنقلب حياته/g, 'بتتقلب حياته');
  s = s.replace(/تنقلب حياتها/g, 'بتتقلب حياتها');
  s = s.replace(/يجد نفسه/g, 'بيلاقي نفسه');
  s = s.replace(/تجد نفسها/g, 'بتلاقي نفسها');
  s = s.replace(/يجدون أنفسهم/g, 'بيلاقوا نفسهم');
  s = s.replace(/تأخذك إلى/g, 'بتاخدك لـ');
  s = s.replace(/تأخذك في/g, 'بتاخدك في');
  s = s.replace(/يجب أن/g, 'لازم');
  s = s.replace(/عليك أن/g, 'لازم');
  s = s.replace(/إذا كان/g, 'لو كان');
  s = s.replace(/إذا كانت/g, 'لو كانت');
  s = s.replace(/ليس هناك/g, 'مفيش');
  s = s.replace(/لا يوجد/g, 'مفيش');
  s = s.replace(/لا توجد/g, 'مفيش');
  s = s.replace(/لم يعد/g, 'مبقاش');

  // 2. الكلمات المفردة مع حدود الكلمات العربية لعدم تخريب السوابق واللواحق
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(الذي)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(التي)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(الذين)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(اللواتي)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(والذي)([\s،.؛!؟()«»"']|$)/g, '$1واللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(والتي)([\s،.؛!؟()«»"']|$)/g, '$1واللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(والذين)([\s،.؛!؟()«»"']|$)/g, '$1واللي$3');

  s = s.replace(/(^|[\s،.؛!؟()«»"'])(حيث)([\s،.؛!؟()«»"']|$)/g, '$1وفيه$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(أيضاً|أيضا)([\s،.؛!؟()«»"']|$)/g, '$1برضه$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(جداً|جدا)([\s،.؛!؟()«»"']|$)/g, '$1أوي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(فقط)([\s،.؛!؟()«»"']|$)/g, '$1بس$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(لكن|ولكن)([\s،.؛!؟()«»"']|$)/g, '$1بس$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(الآن)([\s،.؛!؟()«»"']|$)/g, '$1دلوقتي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(حينئذٍ|حينها)([\s،.؛!؟()«»"']|$)/g, '$1وقتها$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(أخيراً|أخيرا)([\s،.؛!؟()«»"']|$)/g, '$1آخر حاجة$3');

  s = s.replace(/(^|[\s،.؛!؟()«»"'])(يمكنك)([\s،.؛!؟()«»"']|$)/g, '$1تقدر$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(يمكنهم)([\s،.؛!؟()«»"']|$)/g, '$1يقدروا$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(يمكنه)([\s،.؛!؟()«»"']|$)/g, '$1يقدر$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(يمكنها)([\s،.؛!؟()«»"']|$)/g, '$1تقدر$3');

  return s;
}

let modifiedCount = 0;
let totalArabicSummaries = 0;

for (const [key, item] of Object.entries(j.items)) {
  if (item.summaryAr && /[\u0600-\u06FF]/.test(item.summaryAr)) {
    totalArabicSummaries++;
    const original = item.summaryAr;
    const transformed = dialectizeGameSummary(original);
    if (transformed !== original) {
      item.summaryAr = transformed;
      modifiedCount++;
    }
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log(`Processed games: ${totalArabicSummaries} Arabic summaries found, ${modifiedCount} updated with Egyptian dialect nuances.`);
