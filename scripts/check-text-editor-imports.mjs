#!/usr/bin/env node
/**
 * Fails if packages/text-editor imports the repo app tree (e.g. ../../../../src/...).
 * Allowed: @core, @text-editor, @shared, relative paths inside packages/text-editor.
 */
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const pkgRoot = join(root, 'packages', 'text-editor', 'src');

// `from "…" / '…' ` with `../` chain into top-level `src/` (no `/` in regex literal until we use [\/]).
const BAD = /from\s+(?:'|")(?:\.\.[\/])+src[\/]/;
const files = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p);
    else if (name.endsWith('.ts')) files.push(p);
  }
}

async function main() {
  await walk(pkgRoot);
  const hits = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const line of text.split('\n')) {
      if (BAD.test(line)) hits.push({ file: relative(root, file), line: line.trim() });
    }
  }
  if (hits.length) {
    console.error('check-text-editor-imports: disallowed import(s) into repo src/ from packages/text-editor:\n');
    for (const h of hits) console.error(`  ${h.file}: ${h.line}`);
    process.exit(1);
  }
  console.log('check-text-editor-imports: ok');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
