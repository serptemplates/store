// Offline heuristic NSFW/X-rated detector (no network, no ML weights)
// Uses skin-tone detection heuristics over RGB to estimate explicit imagery.
// Usage:
//   node scripts/nsfw/offline-heuristic.mjs --dir=./screenshots/shot-output --out=./screenshots/nsfw-offline-report.json
// Optional:
//   --maxSize=512 --skinThreshold=0.35 --possibleThreshold=0.18 --domainBoost=true

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

const SRC_DIR = path.resolve(process.cwd(), args.dir || './screenshots/shot-output');
const REPORT_PATH = path.resolve(process.cwd(), args.out || path.join(SRC_DIR, 'nsfw-offline-report.json'));
const MAX_SIZE = Math.max(128, Number(args.maxSize || 512));
const SKIN_THRESHOLD = Math.min(0.95, Math.max(0.0, Number(args.skinThreshold || 0.35))); // X-rated threshold
const POSSIBLE_THRESHOLD = Math.min(0.95, Math.max(0.0, Number(args.possibleThreshold || 0.18))); // possible threshold
const DOMAIN_BOOST = args.domainBoost === 'false' ? false : true;

const ADULT_DOMAINS = new Set([
  'anyporn.com','anysex.com','ashemaletube.com','boyfriendtv.com','chaturbate.com','coomer.su','fansly.com',
  'hanime.tv','hclips.com','hdsex.org','hdzog.com','hentaihaven.xxx','imagefap.com','iwara.tv','javhd.com',
  'javhub.net','luxuretv.com','manyvids.com','motherless.com','nhentai.net','perfectgirls.net','pornoxo.com',
  'pornpics.com','porntrex.com','porntube.com','pornve.com','rule34.xxx','shemalez.com','shesfreaky.com',
  'thisvid.com','tokyomotion.net','txxx.com','upornia.com','xfantazy.com','youjizz.com'
]);

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

function guessHostnameFromFilename(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath);
  const base = path.basename(rel).toLowerCase();
  const withoutExt = base.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const dashIdx = withoutExt.indexOf('-');
  const hostGuess = dashIdx >= 0 ? withoutExt.slice(dashIdx + 1) : withoutExt;
  const hostname = hostGuess.startsWith('www.') ? hostGuess.slice(4) : hostGuess;
  return hostname;
}

function isAdultDomain(hostname) {
  for (const d of ADULT_DOMAINS) if (hostname.endsWith(d)) return true;
  return false;
}

// Simple RGB skin detection (union of common rules)
function isSkinRGB(r, g, b) {
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  // Rule set 1 (classic)
  const rule1 = r > 95 && g > 40 && b > 20 && maxc - minc > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  // Rule set 2 (extended)
  const rule2 = r > 200 && g > 160 && b > 140 && Math.abs(r - g) <= 15 && r > b && g > b;
  // Rule set 3 (YCbCr approximate via thresholds)
  // quick approximate: typical skin hues have higher R and moderate G, lower B
  const rule3 = r > 110 && g > 50 && b < 135 && (r - g) >= 10 && (r - b) >= 20;
  return rule1 || rule2 || rule3;
}

async function analyzeImage(file, root) {
  const img = await Jimp.read(file);
  const { width, height } = img.bitmap;
  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  if (scale < 1) img.scale(scale);
  const data = img.bitmap.data; // RGBA
  let skin = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isSkinRGB(r, g, b)) skin++;
    total++;
  }
  const ratio = total ? skin / total : 0;
  const hostname = guessHostnameFromFilename(file, root);
  const adultHost = DOMAIN_BOOST && isAdultDomain(hostname);

  // Decision
  let label = 'NOT_ADULT';
  if (ratio >= SKIN_THRESHOLD) label = 'ADULT';
  else if (ratio >= POSSIBLE_THRESHOLD) label = adultHost ? 'ADULT' : 'POSSIBLE';
  else if (adultHost && ratio >= POSSIBLE_THRESHOLD * 0.7) label = 'POSSIBLE';

  return { file, width: img.bitmap.width, height: img.bitmap.height, skinRatio: Number(ratio.toFixed(3)), hostname, adultHost, label };
}

async function run() {
  const files = await listImages(SRC_DIR);
  if (!files.length) {
    console.error('No images found in', SRC_DIR);
    process.exit(1);
  }

  console.log(`Analyzing ${files.length} images (maxSize=${MAX_SIZE}, skinThreshold=${SKIN_THRESHOLD}, possibleThreshold=${POSSIBLE_THRESHOLD})...`);
  const results = [];
  for (const f of files) {
    try {
      const r = await analyzeImage(f, SRC_DIR);
      results.push(r);
      console.log(`${path.relative(SRC_DIR, f)} -> ${r.label} (skin=${(r.skinRatio*100).toFixed(1)}%${r.adultHost?`, domain=${r.hostname}`:''})`);
    } catch (e) {
      results.push({ file: f, error: String(e.message || e) });
      console.warn('Failed', f, e.message || e);
    }
  }

  const summary = {
    dir: SRC_DIR,
    params: { MAX_SIZE, SKIN_THRESHOLD, POSSIBLE_THRESHOLD, DOMAIN_BOOST },
    counts: {
      ADULT: results.filter(r => r.label === 'ADULT').length,
      POSSIBLE: results.filter(r => r.label === 'POSSIBLE').length,
      NOT_ADULT: results.filter(r => r.label === 'NOT_ADULT').length,
      ERROR: results.filter(r => r.error).length,
    },
    results,
  };
  await fs.writeFile(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(`\nReport written: ${REPORT_PATH}`);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

