// Blur a specific list of images with no classification step.
// Usage examples:
//   node scripts/nsfw/blur-files.mjs --src=./screenshots/shot-output --out=./screenshots/blurred \
//     --files="02-anysex.com.jpg,26-hdsex.org.jpg"
//   node scripts/nsfw/blur-files.mjs --src=./screenshots/shot-output --out=./screenshots/blurred --list=./to-blur.txt
// Options: --mode=gaussian|pixelate --radius=10 --pixel=8

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

const SRC = path.resolve(process.cwd(), args.src || './screenshots/shot-output');
const OUT = path.resolve(process.cwd(), args.out || path.join(SRC, '..', 'blurred'));
const MODE = (args.mode || 'gaussian').toLowerCase(); // gaussian|pixelate
const RADIUS = Math.max(2, Number(args.radius || 10));
const PIXEL = Math.max(2, Number(args.pixel || 8));

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readList(listPath) {
  const raw = await fs.readFile(listPath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function blurOne(rel) {
  const srcPath = path.join(SRC, rel);
  const outPath = path.join(OUT, rel);
  const img = await Jimp.read(srcPath);
  if (MODE === 'pixelate') img.pixelate(PIXEL);
  else img.gaussian(RADIUS);
  await ensureDir(path.dirname(outPath));
  await img.quality(85).write(outPath);
  return outPath;
}

async function run() {
  const exists = await fs.access(SRC).then(()=>true).catch(()=>false);
  if (!exists) {
    console.error(`Source dir not found: ${SRC}`);
    process.exit(1);
  }
  await ensureDir(OUT);

  let files = [];
  if (args.files) {
    files = String(args.files).split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (args.list) {
    const extra = await readList(path.resolve(process.cwd(), String(args.list)));
    files.push(...extra);
  }
  files = Array.from(new Set(files));
  if (!files.length) {
    console.error('No files provided; use --files or --list');
    process.exit(1);
  }

  let ok = 0, fail = 0;
  for (const f of files) {
    try {
      const out = await blurOne(f);
      console.log(`[BLURRED] ${f} -> ${out}`);
      ok++;
    } catch (e) {
      console.warn(`[FAILED] ${f}: ${e.message || e}`);
      fail++;
    }
  }
  console.log(`\nDone. Blurred ${ok}, failed ${fail}. Output: ${OUT}`);
}

run().catch((e)=>{ console.error('Fatal:', e); process.exit(1); });

