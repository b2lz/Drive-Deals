#!/usr/bin/env node
/**
 * translate-summaries-gemini.js
 * 
 * يترجم الملخصات الإنجليزية (summaryEn) في ملفات details/*.json
 * إلى ملخصات بالعامية المصرية الطبيعية والمشوقة (summaryAr)
 * باستخدام Google Gemini API.
 * 
 * الاستخدام:
 *   node tools/translate-summaries-gemini.js --key=YOUR_API_KEY
 * أو بعد وضع المفتاح في .env: GEMINI_API_KEY=xxx
 *   node tools/translate-summaries-gemini.js
 * 
 * خيارات إضافية:
 *   --file=games.json          (لتحديد ملف معين فقط بدلاً من كل الملفات)
 *   --limit=10                 (لتجربة عدد محدد من العناصر أولاً)
 *   --batch=5                  (حجم الدفعة في الطلب الواحد - الافتراضي 5)
 *   --dry-run                  (عرض الترجمة على الشاشة فقط دون حفظها في الملفات)
 *   --model=gemini-1.5-flash   (اختيار الموديل - الافتراضي gemini-1.5-flash)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// قراءة ملف .env إن وجد
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

// قراءة معاملات سطر الأوامر (CLI flags)
const args = process.argv.slice(2);
function getArg(name, def = null) {
  const found = args.find(a => a.startsWith(`--${name}=`));
  if (found) return found.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return def;
}
const hasFlag = (name) => args.includes(`--${name}`);

const apiKey = getArg('key') || process.env.GEMINI_API_KEY;
const targetFile = getArg('file');
const limit = getArg('limit') ? parseInt(getArg('limit'), 10) : Infinity;
const batchSize = Math.max(1, parseInt(getArg('batch', '5'), 10));
const dryRun = hasFlag('dry-run');
const model = getArg('model', 'gemini-1.5-flash');

if (!apiKey) {
  console.error('\x1b[31m[خطأ] لم يتم العثور على مفتاح Gemini API!\x1b[0m');
  console.error('يرجى تمرير المفتاح عبر:');
  console.error('  node tools/translate-summaries-gemini.js --key=AIzaSy...');
  console.error('أو بإنشاء ملف .env في مجلد المشروع ووضع:');
  console.error('  GEMINI_API_KEY=AIzaSy...');
  process.exit(1);
}

const DETAILS_DIR = path.resolve(__dirname, '..', 'details');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * استدعاء Gemini API عبر HTTPS
 */
function callGemini(promptText) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`API Error HTTP ${res.statusCode}: ${body}`));
        }
        try {
          const parsed = JSON.parse(body);
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error('رد فارغ من الموديل: ' + body));
          resolve(rawText);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * تجهيز الطلب وترجمة دفعة من العناصر
 */
async function translateBatch(itemsBatch) {
  const systemInstruction = `أنت كاتب ومترجم محترف متخصص في صياغة ملخصات الألعاب والأفلام والمسلسلات والأنمي بالعامية المصرية السلسة والممتعة والمشوقة جداً (Egyptian Arabic).
المطلوب منك:
1. تحويل الملخصات الإنجليزية المعطاة إلى ملخص بالعامية المصرية الطبيعية البسيطة والذكية، بدون تكلف أو ترجمة حرفية ركيكة، مع الحفاظ الكامل على المعنى وأسماء الشخصيات.
2. أسلوب جذاب يشرح فكرة العمل أو اللعبة في جملتين إلى 3 جمل واضحة ومركزة.
3. الترجيع يجب أن يكون بتنسيق JSON حصراً بالشكل التالي:
[
  { "id": 1, "summaryAr": "الملخص بالمصري هنا..." }
]`;

  const inputList = itemsBatch.map((it, idx) => ({
    id: idx + 1,
    title: it.item.title || it.key,
    type: it.item.type || 'عمل',
    summaryEn: it.item.summaryEn
  }));

  const prompt = `${systemInstruction}\n\nترجم هذه القائمة الآن بالعامية المصرية:\n${JSON.stringify(inputList, null, 2)}`;

  let retries = 3;
  while (retries > 0) {
    try {
      const rawRes = await callGemini(prompt);
      const cleaned = rawRes.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('الرد ليس مصفوفة JSON');
      
      const map = new Map();
      for (const entry of parsed) {
        if (entry.id && entry.summaryAr) {
          map.set(entry.id, entry.summaryAr.trim());
        }
      }
      return map;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.warn(`  [تحذير] خطأ أثناء استدعاء API (${err.message})، جاري إعادة المحاولة بعد 3 ثواني...`);
      await sleep(3000);
    }
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`  مترجم الملخصات إلى العامية المصرية (Gemini API)`);
  console.log(`======================================================`);
  console.log(`الموديل: ${model}`);
  console.log(`حجم الدفعة: ${batchSize}`);
  if (limit !== Infinity) console.log(`الحد الأقصى للعناصر: ${limit}`);
  if (targetFile) console.log(`الملف المستهدف: ${targetFile}`);
  if (dryRun) console.log(`الوضع: تجريبي (Dry Run - لن يتم تعديل الملفات)`);
  console.log(`------------------------------------------------------\n`);

  const allFiles = fs.readdirSync(DETAILS_DIR).filter(f => f.endsWith('.json'));
  const filesToProcess = targetFile ? [targetFile] : allFiles;

  let totalProcessed = 0;

  for (const fileName of filesToProcess) {
    const filePath = path.join(DETAILS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`الملف غير موجود: ${filePath}`);
      continue;
    }

    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = fileData.items || {};
    
    // جمع العناصر التي تحتاج ترجمة أو تعريب (سواء summaryAr فارغ أو مكتوب بالإنجليزي)
    const candidates = [];
    for (const [key, item] of Object.entries(items)) {
      const hasArabic = item.summaryAr && /[\u0600-\u06FF]/.test(item.summaryAr);
      const englishText = item.summaryEn || (!hasArabic && item.summaryAr ? item.summaryAr : null);
      if (!hasArabic && englishText) {
        // تأكد من وجود summaryEn
        if (!item.summaryEn && item.summaryAr) item.summaryEn = item.summaryAr;
        candidates.push({ key, item });
      }
    }

    if (candidates.length === 0) {
      console.log(`[تخطي] ${fileName}: كل العناصر تحتوي بالفعل على ملخص عربي.`);
      continue;
    }

    const toProcess = candidates.slice(0, limit - totalProcessed);
    console.log(`\n[بدء] ${fileName}: يوجد ${candidates.length} عنصر بحاجة لترجمة (سيتم معالجة ${toProcess.length})...`);

    // تقسيم العناصر لدفعات
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      process.stdout.write(`  جاري ترجمة العناصر ${i + 1} إلى ${Math.min(i + batchSize, toProcess.length)} من أصل ${toProcess.length}... `);

      try {
        const resultMap = await translateBatch(batch);
        
        batch.forEach((cand, idx) => {
          const trans = resultMap.get(idx + 1);
          if (trans) {
            cand.item.summaryAr = trans;
            if (dryRun) {
              console.log(`\n    [العنوان]: ${cand.item.title || cand.key}`);
              console.log(`    [الملخص المصري]: ${trans}`);
            }
          }
        });

        if (!dryRun) {
          // حفظ الملف بعد كل دفعة لضمان حفظ التقدم وعدم فقدانه
          fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
        }

        process.stdout.write('\x1b[32mتم ✓\x1b[0m\n');
        totalProcessed += batch.length;

        if (totalProcessed >= limit) {
          console.log(`\nتم الوصول للحد الأقصى المطلوب (${limit} عنصر).`);
          break;
        }

        // انتظار بسيط لتجنب Rate Limits
        await sleep(1000);
      } catch (err) {
        process.stdout.write('\x1b[31mفشل ✗\x1b[0m\n');
        console.error(`  خطأ في الدفعة: ${err.message}`);
      }
    }

    if (totalProcessed >= limit) break;
  }

  console.log(`\n======================================================`);
  console.log(`  اكتملت العملية بنجاح! تم معالجة ${totalProcessed} عنصر.`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('\nحدث خطأ غير متوقع:', err);
  process.exit(1);
});
