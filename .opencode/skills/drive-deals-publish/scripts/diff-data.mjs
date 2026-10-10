#!/usr/bin/env node
/**
 * diff-data.mjs
 * -----------------------------------------------------------------------------
 * يقارن البيانات المحلية (data.json + banner/data.json + ملفات الصور) بالنسخة
 * الموجودة على GitHub (origin/main) ويطبع تقرير واضح بالorceadded/removed/changed.
 *
 * السبب: ملف data.json سطر واحد بحجم ~630KB، فـ `git diff` عليه غير مقروء.
 * هذا السكربت يعمل diff بنيوي (structural diff) على مستوى العنصر.
 *
 * الاستخدام:
 *   node .opencode/skills/drive-deals-publish/scripts/diff-data.mjs [projectRoot]
 *   node .opencode/skills/drive-deals-publish/scripts/diff-data.mjs --base <ref>
 *
 * options:
 *   --base <ref>   المرجع للمقارنة (default: origin/main)
 *   --json         اطبع التقرير كـ JSON بدل النص
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ---------------------------------------------------------------- CLI parsing
const argv = process.argv.slice(2);
let root = process.cwd();
let base = "origin/main";
let asJson = false;
const positional = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--base") base = argv[++i];
  else if (a === "--json") asJson = true;
  else if (a === "--root") root = argv[++i];
  else positional.push(a);
}
if (positional.length) root = positional[0];
root = path.resolve(root);

// ------------------------------------------------------------------ utilities
const GIT_CANDIDATES = [
  process.env.GIT_PATH,
  "git",
  "C:\\Program Files\\Git\\cmd\\git.exe",
  "C:\\Program Files\\Git\\bin\\git.exe",
  "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\Programs\\Git\\cmd\\git.exe`,
].filter(Boolean);

let gitBin = null;
for (const c of GIT_CANDIDATES) {
  try {
    execFileSync(c, ["--version"], { stdio: "ignore" });
    gitBin = c;
    break;
  } catch {
    /* try next */
  }
}
if (!gitBin) {
  console.error("ERROR: git غير متاح على هذا الجهاز. ثبّت Git for Windows ثم أعد المحاولة.");
  process.exit(2);
}

function git(args, { allowFail = false } = {}) {
  try {
    // core.quotepath=false يمنع git من تحويل أسماء الملفات العربية إلى أرقام ثمانية
    return execFileSync(gitBin, ["-c", "core.quotepath=false", ...args], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    }).replace(/\r?\n$/, "");
  } catch (err) {
    if (allowFail) return null;
    const detail = err.stderr ? String(err.stderr).trim() : err.message;
    throw new Error(`git ${args.join(" ")} فشل:\n${detail}`);
  }
}

function readJsonFile(p) {
  try {
    // إزالة BOM حتى لو الملف اتحفظ من Excel/Notepad
    const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: تعذّر قراءة ${p}\n${err.message}`);
    process.exit(3);
  }
}

function readGitJson(rel) {
  const out = git(["show", `${base}:${rel}`], { allowFail: true });
  if (out === null) return null;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ------------------------------------------------------------- data extraction
const LOCAL_DATA = readJsonFile(path.join(root, "data.json"));
const LOCAL_BANNER = readJsonFile(path.join(root, "banner", "data.json"));
const REMOTE_DATA = readGitJson("data.json");
const REMOTE_BANNER = readGitJson("banner/data.json");

const hasBaseline = REMOTE_DATA !== null || REMOTE_BANNER !== null;

/** map: categoryId -> Map(itemKey -> item) */
function indexCategories(doc) {
  const map = new Map();
  if (!doc || !Array.isArray(doc.categories)) return map;
  for (const cat of doc.categories) {
    const items = new Map();
    for (const it of cat.items ?? []) {
      const key = it.id ?? `${cat.id}/${it.image ?? it.title}`;
      items.set(key, it);
    }
    map.set(cat.id, { name: cat.name, items });
  }
  return map;
}

function itemKey(it, fallback) {
  return it.id ?? it.image ?? it.title ?? fallback;
}

const oldCats = indexCategories(REMOTE_DATA);
const newCats = indexCategories(LOCAL_DATA);

const catIds = [...new Set([...oldCats.keys(), ...newCats.keys()])].sort();
const categoriesReport = [];
let totalAdded = 0;
let totalRemoved = 0;
let totalChanged = 0;

for (const id of catIds) {
  const o = oldCats.get(id);
  const n = newCats.get(id);
  const oItems = o?.items ?? new Map();
  const nItems = n?.items ?? new Map();

  const added = [];
  const removed = [];
  const changed = [];

  for (const [k, item] of nItems) {
    if (!oItems.has(k)) added.push(item);
    else {
      const prev = oItems.get(k);
      const fields = [];
      if (prev.title !== item.title) fields.push(`title: "${prev.title}" -> "${item.title}"`);
      if (prev.image !== item.image) fields.push(`image: "${prev.image}" -> "${item.image}"`);
      if (String(prev.sizeGB) !== String(item.sizeGB))
        fields.push(`sizeGB: ${prev.sizeGB} -> ${item.sizeGB}`);
      if (fields.length) changed.push({ item, fields });
    }
  }
  for (const [k, item] of oItems) if (!nItems.has(k)) removed.push(item);

  if (added.length || removed.length || changed.length || !o || !n) {
    categoriesReport.push({
      id,
      name: n?.name ?? o?.name ?? id,
      status: !o ? "new" : !n ? "deleted" : "changed",
      added,
      removed,
      changed,
    });
  }
  totalAdded += added.length;
  totalRemoved += removed.length;
  totalChanged += changed.length;
}

// ------------------------------------------------------------------- banner
function bannerList(doc) {
  const list = doc?.items;
  return Array.isArray(list) ? list : [];
}
const ob = bannerList(REMOTE_BANNER);
const nb = bannerList(LOCAL_BANNER);
const oMap = new Map(ob.map((x) => [itemKey(x), x]));
const nMap = new Map(nb.map((x) => [itemKey(x), x]));

const bannerAdded = [];
const bannerRemoved = [];
const bannerChanged = [];
for (const [k, item] of nMap) {
  if (!oMap.has(k)) bannerAdded.push(item);
  else {
    const prev = oMap.get(k);
    const fields = [];
    if (prev.title !== item.title) fields.push(`title: "${prev.title}" -> "${item.title}"`);
    if (prev.image !== item.image) fields.push(`image: "${prev.image}" -> "${item.image}"`);
    if (String(prev.sizeGB) !== String(item.sizeGB))
      fields.push(`sizeGB: ${prev.sizeGB} -> ${item.sizeGB}`);
    if (fields.length) bannerChanged.push({ item, fields });
  }
}
for (const [k, item] of oMap) if (!nMap.has(k)) bannerRemoved.push(item);

// ------------------------------------------------------------------- images
const IMAGE_DIRS = ["assets", "banner/assets"];

function localFiles(relDir) {
  const abs = path.join(root, relDir);
  const out = [];
  const walk = (dir, prefix) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === ".DS_Store" || e.name === ".git") continue;
      const p = path.join(dir, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p, rel);
      else {
        let size = 0;
        try {
          size = fs.statSync(p).size;
        } catch {
          /* ignore */
        }
        out.push({ path: `${relDir}/${rel}`, size });
      }
    }
  };
  walk(abs, "");
  return out;
}

function remoteFiles(relDir) {
  const out = git(["ls-tree", "-r", "--long", base, "--", relDir], { allowFail: true });
  if (!out) return null;
  const res = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    // <mode> <type> <object> <size>\t<path>
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const meta = line.slice(0, tab).split(/\s+/);
    const size = Number(meta[3]);
    res.push({ path: line.slice(tab + 1), size: Number.isFinite(size) ? size : 0 });
  }
  return res;
}

const imagesAdded = [];
const imagesRemoved = [];
for (const dir of IMAGE_DIRS) {
  const loc = localFiles(dir);
  const rem = remoteFiles(dir);
  if (rem === null) {
    for (const f of loc) imagesAdded.push(f);
    continue;
  }
  const remSet = new Set(rem.map((f) => f.path.replace(/\\/g, "/")));
  const locSet = new Set(loc.map((f) => f.path.replace(/\\/g, "/")));
  for (const f of loc) if (!remSet.has(f.path)) imagesAdded.push(f);
  for (const f of rem) if (!locSet.has(f.path.replace(/\\/g, "/"))) imagesRemoved.push(f);
}
imagesAdded.sort((a, b) => b.size - a.size);
imagesRemoved.sort((a, b) => b.size - a.size);

// -------------------------------------------------- warnings: missing images
const missingImages = [];
for (const [cid, cat] of newCats) {
  for (const [key, item] of cat.items) {
    const img = item.image;
    if (!img) {
      missingImages.push({ where: `data.json :: ${cid} :: ${key}`, reason: "الحقل image فاضي" });
      continue;
    }
    if (!fs.existsSync(path.join(root, "assets", cid, img)))
      missingImages.push({ where: `assets/${cid}/${img}`, reason: "الصورة غير موجودة" });
  }
}
for (const item of nb) {
  const img = item.image;
  if (!img) missingImages.push({ where: "banner :: title=" + item.title, reason: "الحقل image فاضي" });
  else if (!fs.existsSync(path.join(root, "banner", "assets", img)))
    missingImages.push({ where: `banner/assets/${img}`, reason: "الصورة غير موجودة" });
}

// ------------------------------------------------------------------- git info
let commitInfo = null;
if (hasBaseline) {
  const shortSha = git(["rev-parse", "--short", base], { allowFail: true });
  const subject = git(["log", "-1", "--format=%s", base], { allowFail: true });
  commitInfo = { ref: base, sha: shortSha, subject };
}

// -------------------------------------------------------------------- report
const report = {
  root,
  hasBaseline,
  commitInfo,
  categories: categoriesReport,
  totals: { added: totalAdded, removed: totalRemoved, changed: totalChanged },
  banner: {
    added: bannerAdded,
    removed: bannerRemoved,
    changed: bannerChanged,
  },
  images: { added: imagesAdded, removed: imagesRemoved },
  warnings: missingImages,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const L = [];
const line = (s = "") => L.push(s);

line("=".repeat(72));
line("  تقرير التغييرات — Drive Deals");
line(`  المرجع: ${hasBaseline ? `${base} (${commitInfo.sha} — ${commitInfo.subject})` : "لا يوجد"}`);
line("=".repeat(72));

if (!hasBaseline) {
  line();
  line("لا توجد نسخة سابقة على GitHub (origin/main غير موجود).");
  line("هذه أول عملية رفع — سيتم رفع المشروع بالكامل.");
  line();
}

const fmt = (n) => `${n}`;

line();
line("## 1) ملخص العناصر");
line(`   مضاف: ${fmt(totalAdded)}   |   محذوف: ${fmt(totalRemoved)}   |   معدّل: ${fmt(totalChanged)}`);

if (!categoriesReport.length) {
  line("   (لا توجد تغييرات في الأقسام)");
}

for (const c of categoriesReport) {
  const tag = c.status === "new" ? "قسم جديد" : c.status === "deleted" ? "قسم محذوف" : "";
  line();
  line(`   ▸ ${c.name}  [${c.id}] ${tag ? "— " + tag : ""}`);
  for (const it of c.added) line(`       + ${it.title}  (${it.sizeGB} GB)`);
  for (const it of c.removed) line(`       - ${it.title}  (${it.sizeGB} GB)`);
  for (const ch of c.changed) line(`       ~ ${ch.item.title}: ${ch.fields.join(" | ")}`);
}

line();
line("## 2) البانر العلوي");
const bCount = bannerAdded.length + bannerRemoved.length + bannerChanged.length;
if (!bCount) line("   (لا توجد تغييرات)");
for (const it of bannerAdded) line(`   + ${it.title}  (${it.sizeGB} GB)`);
for (const it of bannerRemoved) line(`   - ${it.title}  (${it.sizeGB} GB)`);
for (const ch of bannerChanged)
  line(`   ~ ${ch.item.title}: ${ch.fields.join(" | ")}`);

line();
line("## 3) ملفات الصور");
line(
  `   صور جديدة: ${imagesAdded.length}   |   صور محذوفة: ${imagesRemoved.length}`,
);
const SHOW = 40;
if (imagesAdded.length) {
  line(`   --- صور جديدة (أكبر ${Math.min(SHOW, imagesAdded.length)} من ${imagesAdded.length}) ---`);
  for (const f of imagesAdded.slice(0, SHOW))
    line(`     + ${f.path}  (${f.size > 1024 * 1024 ? mb(f.size) : kb(f.size)})`);
  if (imagesAdded.length > SHOW) line(`     ... و${imagesAdded.length - SHOW} ملف آخر`);
}
if (imagesRemoved.length) {
  line(`   --- صور محذوفة (أكبر ${Math.min(SHOW, imagesRemoved.length)} من ${imagesRemoved.length}) ---`);
  for (const f of imagesRemoved.slice(0, SHOW))
    line(`     - ${f.path}  (${f.size > 1024 * 1024 ? mb(f.size) : kb(f.size)})`);
  if (imagesRemoved.length > SHOW) line(`     ... و${imagesRemoved.length - SHOW} ملف آخر`);
}

line();
line("## 4) تحذيرات");
if (!missingImages.length) {
  line("   لا توجد صور مفقودة. ✔");
} else {
  line(`   !! ${missingImages.length} صورة مذكورة في البيانات لكن غير موجودة على القرص:`);
  for (const w of missingImages.slice(0, 30)) line(`      - ${w.where} (${w.reason})`);
  if (missingImages.length > 30) line(`      ... و${missingImages.length - 30} تحذير آخر`);
}

const bigFiles = [...imagesAdded].filter((f) => f.size > 90 * 1024 * 1024);
if (bigFiles.length) {
  line();
  line(`   !! ملفات أكبر من 90MB (GitHub سيرفضها):`);
  for (const f of bigFiles) line(`      - ${f.path} (${mb(f.size)})`);
}

line();
line("=".repeat(72));
console.log(L.join("\n"));