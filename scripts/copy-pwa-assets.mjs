import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

const filesToCopy = [
  'manifest.json',
  'service-worker.js',
  'icon-192.png',
  'icon-512.png',
  'icon.png',
  'favicon.ico',
];

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

if (!fs.existsSync(distDir)) {
  console.log('[pwa] dist/ not found, skipping copy');
  process.exit(0);
}

if (!fs.existsSync(publicDir)) {
  console.log('[pwa] public/ not found, skipping copy');
  process.exit(0);
}

for (const filename of filesToCopy) {
  const src = path.join(publicDir, filename);
  const dst = path.join(distDir, filename);
  if (!fs.existsSync(src)) continue;
  copyFile(src, dst);
  console.log(`[pwa] copied ${filename}`);
}

