"use strict";
// Print every string literal in a file that mixes Arabic with another script,
// or contains a stray non-Arabic fragment inside Arabic text.
//
// Arabic written through tooling often picks up Latin/CJK/Thai fragments
// mid-sentence. This catches them so they can be patched with \uXXXX escapes.
//
// Usage: node tools/_scan.js <file> [file...]

const fs = require("fs");

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN = /[A-Za-z]/;
const OTHER = /[^\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0000-\u007F]/;

/** Latin words that legitimately appear inside Arabic copy. */
const ALLOWED = new Set([
  "GB", "MB", "TB", "GB.", "PC", "TV", "2D", "3D", "4K", "FPS", "SSD", "HDD",
  "RTX", "RX", "GTX", "VRAM", "RAM", "CPU", "GPU", "DirectX", "NVIDIA", "AMD",
  "Intel", "Windows", "Linux", "macOS", "Nintendo", "Switch", "PlayStation",
  "Sony", "Xbox", "LEGO", "NINJAGO", "Pinhead", "Ouroboros", "Orbment",
  "Disco", "Elysium", "Ghostrunner", "Trails", "Falcom", "Nihon", "Director's",
  "Cut", "Overworld", "Minecraft", "Dungeons", "Hellraiser", "Clive", "Barker",
  "Revival", "Party", "Jamboree", "Super", "Mario", "Warriors", "DYNASTY",
  "ZERO", "PARADES", "ZA", "UM", "One", "More", "Level", "Lyrical", "Games",
  "Rebellion", "SMG", "Studio", "Fictions", "Mojang", "Double", "Eleven",
  "Santa", "Monica", "NDcube", "KOEI", "TECMO", "Atomic", "Atomfall",
  "Hellraiser:", "Verbal", "L", "III", "III:", "Remastered", "Complete",
  "Edition", "Config", "NINJAGO®", "®", "™", "Gear", "Hades", "Olympus",
]);

function scan(text, label) {
  const findings = [];
  // Every quoted string in the file, in order.
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    const value = raw.replace(/\\(.)/g, "$1");
    if (!ARABIC.test(value)) continue;

    // Split on spaces and look at each token.
    for (const token of value.split(/\s+/)) {
      const clean = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!clean) continue;
      const hasArabic = ARABIC.test(clean);
      const hasLatin = LATIN.test(clean);
      const hasOther = OTHER.test(clean);
      if (!hasArabic && !hasLatin && !hasOther) continue;

      const suspicious =
        (hasArabic && hasLatin) || // mixed word — almost always corruption
        (hasArabic && hasOther) || // Arabic + CJK/Thai/Cyrillic
        (hasLatin && hasOther) ||
        (hasOther && !hasArabic && !hasLatin) ||
        /\bsouth\b|[^\s]?[A-Za-z]{2,}\.[A-Za-z]{2,}/.test(clean) ||
        /[\\^_{}|]/.test(clean);

      if (suspicious && !ALLOWED.has(clean)) {
        findings.push({ label, clean, token });
      }
    }
    // Control characters or replacement chars anywhere.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(value)) {
      findings.push({ label, clean: "<control/FFFD>", token: raw });
    }
  }
  return findings;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("الاستخدام: node tools/_scan.js <file> [file...]");
  process.exit(1);
}

let total = 0;
for (const file of files) {
  const findings = scan(fs.readFileSync(file, "utf8"), file);
  if (!findings.length) {
    console.log(`  ✔ ${file} — مفيش مشاكل`);
    continue;
  }
  console.log(`\n  ✗ ${file} — ${findings.length} مشكل��:`);
  for (const f of findings) console.log(`      ${f.clean}`);
  total += findings.length;
}
console.log(`\n  الإجمالي: ${total}`);