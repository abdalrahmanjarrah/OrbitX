import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const srcFile = path.resolve('favicon.png.jpg');
const publicDir = path.resolve('public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(srcFile)) {
  console.warn('[CopyIcons] Source favicon.png.jpg not found at root.');
  process.exit(0);
}

// Always ship the source as favicon (even in CI where Pillow may be missing).
fs.copyFileSync(srcFile, path.join(publicDir, 'favicon.png'));

const resize = (out, size) => {
  const target = path.join(publicDir, out);
  const py = `from PIL import Image; s=Image.open('${srcFile}').convert('RGBA'); s.resize((${size},${size}), Image.LANCZOS).save('${target}','PNG')`;
  execFileSync('python3', ['-c', py], { stdio: 'pipe' });
};

// Resize real PNG icons when Pillow is available; otherwise keep the
// already-committed properly-sized PNGs so the build never breaks in CI.
for (const [out, size] of [['pwa-192x192.png', 192], ['pwa-512x512.png', 512]]) {
  try {
    resize(out, size);
  } catch (e) {
    console.warn(`[CopyIcons] Pillow unavailable, keeping committed ${out}.`);
  }
}
console.log('[CopyIcons] Icons ready.');
