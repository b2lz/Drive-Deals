/**
 * translate-all-categories.js
 * 
 * يترجم ويعرّب كل العناصر التي لها ملخص إنجليزي في باقي الأقسام
 * (أنمي، أفلام عربي/أجنبي/هندي، مسلسلات عربي/أجنبي/تركي/كوري، كرتون)
 * ويحولها إلى ملخصات بالعامية المصرية السلسة مع الحفظ التلقائي لكل ملف.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DETAILS_DIR = path.resolve(__dirname, '..', 'details');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchTranslation(text) {
  return new Promise((resolve, reject) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const url = 'https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=ar&dt=t&q=' + encodeURIComponent(cleanText);
    
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const translated = parsed[0].map(x => x[0]).join('');
          resolve(translated);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function toEgyptian(text) {
  if (!text) return text;
  let s = text;

  // 1. التراكيب والعبارات المركبة
  s = s.replace(/تجري أحداثها/g, 'بتدور أحداثها');
  s = s.replace(/تدور أحداثها/g, 'بتدور أحداثها');
  s = s.replace(/تدور أحداث/g, 'بتدور أحداث');
  s = s.replace(/تدور القصة/g, 'بتدور القصة');
  s = s.replace(/تدور اللعبة/g, 'القصة بتدور');
  s = s.replace(/يدور المسلسل/g, 'المسلسل بيدور');
  s = s.replace(/تدور السلسلة/g, 'السلسلة بتدور');
  s = s.replace(/يدور الفيلم/g, 'الفيلم بيدور');
  s = s.replace(/في وقت حقيقي/g, 'في الوقت الحقيقي');
  s = s.replace(/بالإضافة إلى ذلك/g, 'وكمان');
  s = s.replace(/يجد نفسه/g, 'بيلاقي نفسه');
  s = s.replace(/تجد نفسها/g, 'بتلاقي نفسها');
  s = s.replace(/يجدون أنفسهم/g, 'بيلاقوا نفسهم');
  s = s.replace(/تنقلب حياته/g, 'بتتقلب حياته');
  s = s.replace(/تنقلب حياتها/g, 'بتتقلب حياتها');
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

  // 2. المفردات البسيطة مع حدود الكلمات
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(الذي)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(التي)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(الذين)([\s،.؛!؟()«»"']|$)/g, '$1اللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(والذي)([\s،.؛!؟()«»"']|$)/g, '$1واللي$3');
  s = s.replace(/(^|[\s،.؛!؟()«»"'])(والتي)([\s،.؛!؟()«»"']|$)/g, '$1واللي$3');
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

  // تنظيف أي تكرار
  s = s.replace(/بببتدور أحداثها/g, 'بتدور أحداثها');
  s = s.replace(/ببتدور أحداثها/g, 'بتدور أحداثها');

  return s;
}

const CATEGORY_FILES = [
  'turkish-series.json',
  'korean-series.json',
  'indian-films.json',
  'cartoon-series.json',
  'cartoon-films.json',
  'foreign-film-series.json',
  'foreign-series.json',
  'arabic-series.json',
  'arabic-films.json',
  'foreign-films.json',
  'anime.json'
];

async function main() {
  console.log('==================================================');
  console.log('  بدء تعريب وتحويل كافة الأقسام إلى اللهجة المصرية');
  console.log('==================================================\n');

  let totalAllTranslated = 0;

  for (const fileName of CATEGORY_FILES) {
    const filePath = path.join(DETAILS_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = fileData.items || {};

    const queue = [];
    for (const [key, item] of Object.entries(items)) {
      const hasArabic = item.summaryAr && /[\u0600-\u06FF]/.test(item.summaryAr);
      const textEn = item.summaryEn || (!hasArabic && item.summaryAr ? item.summaryAr : null);
      if (!hasArabic && textEn) {
        if (!item.summaryEn && item.summaryAr) item.summaryEn = item.summaryAr;
        queue.push({ key, item, textEn });
      }
    }

    if (queue.length === 0) {
      console.log(`[✓] ${fileName}: مكتمل بالفعل ولا يحتاج ترجمة.`);
      continue;
    }

    console.log(`\n[بدء] ${fileName}: جاري تعريب ${queue.length} عنصر...`);

    let count = 0;
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      let retries = 3;
      let translated = null;

      while (retries > 0 && !translated) {
        try {
          translated = await fetchTranslation(entry.textEn);
        } catch (err) {
          retries--;
          await sleep(1500);
        }
      }

      if (translated) {
        const egyptian = toEgyptian(translated);
        entry.item.summaryAr = egyptian;
        count++;
        totalAllTranslated++;
      } else {
        console.warn(`  [!] تعذر ترجمة: ${entry.key}`);
      }

      // حفظ دوري كل 25 عنصر وفي نهاية الملف
      if ((i + 1) % 25 === 0 || i === queue.length - 1) {
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
        console.log(`  - تم إنجاز ${i + 1} من أصل ${queue.length} في ${fileName}... (حفظ تلقائي ✓)`);
      }

      await sleep(200);
    }
  }

  console.log('\n==================================================');
  console.log(`  اكتملت العملية بنجاح تام! إجمالي ما تم تعريبه: ${totalAllTranslated} عنصر.`);
  console.log('==================================================');
}

main().catch(err => {
  console.error('حدث خطأ غير متوقع:', err);
  process.exit(1);
});
