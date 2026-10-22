import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

// Karakter Windows-1252 di rentang 0x80-0x9F -> nilai byte aslinya
const cp = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};
const toByte = (ch) => {
  const c = ch.codePointAt(0);
  if (c <= 0xFF) return c;
  return cp[c];
};
const specials = Object.keys(cp).map((c) => '\\u' + Number(c).toString(16).padStart(4, '0')).join('');
const pattern = new RegExp(`[\\u00C2-\\u00F4][\\u0080-\\u00BF${specials}]{1,3}`, 'g');

for (const file of process.argv.slice(2)) {
  const original = readFileSync(file, 'utf8');
  let fixed = 0;
  const result = original.replace(pattern, (match) => {
    const bytes = [...match].map(toByte);
    if (bytes.some((b) => b === undefined)) return match;
    const text = Buffer.from(bytes).toString('utf8');
    if (text.includes('\uFFFD')) return match; // bukan mojibake, biarkan
    fixed += 1;
    return text;
  });
  if (fixed) {
    copyFileSync(file, `${file}.bak`);
    writeFileSync(file, result, 'utf8');
  }
  console.log(`${file}: ${fixed} karakter diperbaiki${fixed ? ` (cadangan: ${file}.bak)` : ''}`);
}