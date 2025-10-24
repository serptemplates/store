// Detect blank or failed screenshots by simple image heuristics.
// Usage:
//   node scripts/nsfw/detect-blanks.mjs --dir=./screenshots/blurred --out=./screenshots/blurred/blank-report.json
// Heuristics:
//  - unreadable / load error
//  - tiny file (<3KB)
//  - tiny dimensions (<100x100)
//  - very low luminance variance (mostly uniform)
//  - mostly white or mostly black with low variance

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

const DIR = path.resolve(process.cwd(), args.dir || './screenshots/blurred');
const OUT = path.resolve(process.cwd(), args.out || path.join(DIR, 'blank-report.json'));

const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function listImages(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const nested = await listImages(p);
      out.push(...nested);
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function luminance(r, g, b) {
  // Rec. 601 luma approximation
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function analyze(file) {
  const stat = await fs.stat(file).catch(() => null);
  const results = { file, reasons: [], meta: {} };
  if (!stat) {
    results.reasons.push('unreadable');
    return results;
  }
  results.meta.sizeBytes = stat.size;
  if (stat.size < 3_000) results.reasons.push('too_small_file');

  let img;
  try {
    img = await Jimp.read(file);
  } catch (e) {
    results.reasons.push('decode_error');
    return results;
  }

  const { width, height, data } = img.bitmap; // RGBA
  results.meta.width = width;
  results.meta.height = height;
  if (width < 100 || height < 100) results.reasons.push('too_small_dimensions');

  // Sample pixels on a grid up to ~128x128 samples for speed
  const maxSamplesPerDim = 128;
  const stepX = Math.max(1, Math.floor(width / maxSamplesPerDim));
  const stepY = Math.max(1, Math.floor(height / maxSamplesPerDim));

  let count = 0;
  let sum = 0;
  let sumSq = 0;
  let whiteish = 0;
  let blackish = 0;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = luminance(r, g, b);
      sum += lum;
      sumSq += lum * lum;
      if (lum > 245) whiteish++;
      if (lum < 10) blackish++;
      count++;
    }
  }

  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, (sumSq / count) - (mean * mean)) : 0;
  const stdev = Math.sqrt(variance);
  const whiteRatio = count ? whiteish / count : 0;
  const blackRatio = count ? blackish / count : 0;
  results.meta.meanLum = Number(mean.toFixed(2));
  results.meta.stdevLum = Number(stdev.toFixed(2));
  results.meta.whiteRatio = Number(whiteRatio.toFixed(3));
  results.meta.blackRatio = Number(blackRatio.toFixed(3));

  if (stdev < 3.0) results.reasons.push('low_variance');
  if (whiteRatio > 0.95 && stdev < 6.0) results.reasons.push('mostly_white');
  if (blackRatio > 0.95 && stdev < 6.0) results.reasons.push('mostly_black');

  return results;
}

async function run() {
  const exists = await fs.access(DIR).then(()=>true).catch(()=>false);
  if (!exists) {
    console.error('Directory not found:', DIR);
    process.exit(1);
  }
  const files = await listImages(DIR);
  if (!files.length) {
    console.log('No images found in', DIR);
    return;
  }
  const results = [];
  for (const f of files) {
    const r = await analyze(f);
    results.push(r);
  }

  const blanks = results.filter(r => r.reasons.length);
  await fs.writeFile(OUT, JSON.stringify({ dir: DIR, results, blanks }, null, 2));

  console.log(`Checked ${results.length} images. Suspect/blank: ${blanks.length}`);
  if (blanks.length) {
    console.log('Flagged files:');
    for (const b of blanks) {
      console.log(` - ${path.relative(DIR, b.file)} (${b.reasons.join(', ')})`);
    }
    console.log(`Report: ${OUT}`);
  }
}

run().catch((e)=>{ console.error('Fatal:', e); process.exit(1); });

