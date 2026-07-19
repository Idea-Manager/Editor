#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

const webpack = spawnSync(
  'npx',
  ['webpack', '--config', 'webpack/webpack.lib.js'],
  { cwd: root, stdio: 'inherit' },
);
if (webpack.status !== 0) process.exit(webpack.status ?? 1);

mkdirSync(dist, { recursive: true });
cpSync(join(root, 'src/sdk/public-api.d.ts'), join(dist, 'index.d.ts'));

console.log('[build:lib] wrote dist/index.d.ts');
