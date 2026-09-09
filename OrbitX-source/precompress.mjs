// Pre-compress static assets once at build time so the server can serve
// .br/.gz files directly with zero per-request CPU cost.
// (On-the-fly compression at quality levels high enough to matter pegs
// small cloud instances, so we trade a few extra build seconds instead.)
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { gzipSync, brotliCompressSync, constants as zc } from "zlib";

const targets = [".js", ".css", ".mjs", ".html", ".json", ".webmanifest", ".svg"];

const outDir = process.argv[2] || "dist";

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

let compressed = 0;
let skipped = 0;

for (const file of walk(outDir)) {
  const ext = file.slice(file.lastIndexOf("."));
  if (!targets.includes(ext)) {
    skipped++;
    continue;
  }
  const raw = readFileSync(file);

  const gzPath = `${file}.gz`;
  if (!existsSync(gzPath)) {
    writeFileSync(gzPath, gzipSync(raw, { level: 9 }));
  }

  const brPath = `${file}.br`;
  if (!existsSync(brPath)) {
    writeFileSync(brPath, brotliCompressSync(raw, {
      params: { [zc.BROTLI_PARAM_QUALITY]: 11 },
    }));
  }

  compressed++;
  if (compressed <= 5 || process.env.VERBOSE) {
    const gzPct = Math.round((statSync(gzPath).size / raw.length) * 100);
    const brPct = Math.round((statSync(brPath).size / raw.length) * 100);
    console.log(
      `[precompress] ${file.split(outDir + "/")[1]}  raw=${raw.length}  gz=${gzPct}%  br=${brPct}%`,
    );
  }
}

console.log(`[precompress] done: ${compressed} compressed, ${skipped} skipped`);
