#!/usr/bin/env node
/**
 * Audits graphic.* i18n keys:
 *  - keys referenced in code but missing from en.ts or uk.ts → error
 *  - graphic.* keys in en.ts that are unused anywhere in code → error (orphan)
 *
 * Referenced keys are those exported as constants in keys.ts
 * plus any literal 'graphic.*' string passed to i18n.t() in source files.
 */
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

// ── Walk helper ───────────────────────────────────────────────────────────────

async function walkTs(dir, files = []) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) await walkTs(p, files);
    else if (name.endsWith('.ts')) files.push(p);
  }
  return files;
}

// ── 1. Collect referenced keys ────────────────────────────────────────────────

const referencedKeys = new Set();

// 1a. Values exported as constants from keys.ts (the typed constant layer)
const keysFilePath = join(root, 'packages/graphic-editor/src/i18n/keys.ts');
const keysFileText = await readFile(keysFilePath, 'utf8');
for (const m of keysFileText.matchAll(/'(graphic\.[^']+)'/g)) {
  referencedKeys.add(m[1]);
}

// 1b. Scan all .ts files for direct i18n.t('graphic.*') string literals.
//     Matches both single and double quoted keys inside i18n.t() calls.
//     Skips pure comment lines (// … or * …).
const DIRECT_RE = /i18n\s*\.\s*t\s*\(\s*['"]?(graphic\.[a-zA-Z][a-zA-Z0-9.\-]*)/g;
const COMMENT_LINE_RE = /^\s*(\/\/|\*)/;

const searchDirs = [
  join(root, 'packages'),
  join(root, 'src'),
  join(root, 'shared'),
];

for (const dir of searchDirs) {
  let files;
  try {
    files = await walkTs(dir);
  } catch {
    continue; // directory may not exist
  }
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const line of text.split('\n')) {
      if (COMMENT_LINE_RE.test(line)) continue;
      for (const m of line.matchAll(DIRECT_RE)) {
        referencedKeys.add(m[1]);
      }
    }
  }
}

// ── 2. Parse locale files ─────────────────────────────────────────────────────

function extractLocaleKeys(text) {
  const keys = new Set();
  for (const m of text.matchAll(/'(graphic\.[^']+)'\s*:/g)) {
    keys.add(m[1]);
  }
  return keys;
}

const enText = await readFile(join(root, 'packages/core/src/i18n/locales/en.ts'), 'utf8');
const ukText = await readFile(join(root, 'packages/core/src/i18n/locales/uk.ts'), 'utf8');
const enKeys = extractLocaleKeys(enText);
const ukKeys = extractLocaleKeys(ukText);

// ── 3. Compare and report ─────────────────────────────────────────────────────

const missing = [];   // referenced in code but absent from a locale
const orphans = [];   // present in en.ts but never referenced in code

for (const key of referencedKeys) {
  if (!enKeys.has(key)) missing.push({ key, locale: 'en' });
  if (!ukKeys.has(key)) missing.push({ key, locale: 'uk' });
}
for (const key of enKeys) {
  if (!referencedKeys.has(key)) orphans.push(key);
}

let ok = true;

if (missing.length) {
  ok = false;
  console.error('check-graphic-i18n: missing translations:\n');
  for (const { key, locale } of missing) {
    console.error(`  [${locale}] '${key}'`);
  }
  console.error('');
}

if (orphans.length) {
  ok = false;
  console.error('check-graphic-i18n: orphan graphic.* keys in en.ts (not referenced in code):\n');
  for (const key of orphans) {
    console.error(`  '${key}'`);
  }
  console.error('');
}

if (ok) {
  console.log(
    `check-graphic-i18n: ok (${referencedKeys.size} referenced, ${enKeys.size} in en, ${ukKeys.size} in uk)`,
  );
} else {
  process.exit(1);
}
