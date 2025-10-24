// NSFW detection + blur for screenshots
// Usage examples:
//   pnpm -C scripts/nsfw i
//   node scripts/nsfw/nsfw-blur.mjs --dir=./screenshots/shot-output --out=./screenshots/blurred --overwrite=false --concurrency=2 --thresholdPorn=0.75 --thresholdSexy=0.9 --mode=gaussian
//   node scripts/nsfw/nsfw-blur.mjs --dir=./screenshots/shot-output --overwrite=true --mode=pixelate

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Heavy deps are kept isolated in this subpackage
import Jimp from 'jimp';

let tf;
async function loadTf() {
  try {
    tf = await import('@tensorflow/tfjs-node');
    return 'tfjs-node';
  } catch (e) {
    tf = await import('@tensorflow/tfjs');
    // Ensure a backend is ready
    if (tf.getBackend && tf.getBackend() !== 'cpu' && tf.setBackend) {
      await tf.setBackend('cpu');
    }
    if (tf.ready) await tf.ready();
    return 'tfjs';
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

const SRC_DIR = path.resolve(process.cwd(), args.dir || './screenshots/shot-output');
const OUT_DIR = args.overwrite === 'true' || args.overwrite === true ? null : path.resolve(process.cwd(), args.out || path.join(SRC_DIR, '..', 'blurred'));
const OVERWRITE = OUT_DIR === null;
const CONCURRENCY = Math.max(1, Number(args.concurrency || Math.max(1, Math.min(2, os.cpus().length - 1))));
const THRESH_PORN = Math.min(1, Math.max(0, Number(args.thresholdPorn || 0.75)));
const THRESH_SEXY = Math.min(1, Math.max(0, Number(args.thresholdSexy || 0.9)));
const THRESH_HENTAI = Math.min(1, Math.max(0, Number(args.thresholdHentai || 0.75)));
const MODE = (args.mode || 'gaussian').toLowerCase(); // 'gaussian' | 'pixelate'
const PIXELATE_SIZE = Math.max(2, Number(args.pixelSize || 8));
const GAUSSIAN_RADIUS = Math.max(2, Number(args.blurRadius || 10));
const DRY_RUN = args.dry === 'true' || args.dry === true;
const DOMAIN_ONLY = args.domain_only === 'true' || args.domain_only === true;
const ADULT_DOMAINS = new Set([
  'anyporn.com', 'anysex.com', 'ashemaletube.com', 'boyfriendtv.com', 'chaturbate.com',
  'coomer.su', 'fansly.com', 'hanime.tv', 'hclips.com', 'hdsex.org', 'hdzog.com',
  'hentaihaven.xxx', 'imagefap.com', 'iwara.tv', 'javhd.com', 'javhub.net', 'luxuretv.com',
  'manyvids.com', 'motherless.com', 'nhentai.net', 'perfectgirls.net', 'pornoxo.com',
  'pornpics.com', 'porntrex.com', 'porntube.com', 'pornve.com', 'rule34.xxx', 'shemalez.com',
  'shesfreaky.com', 'thisvid.com', 'tokyomotion.net', 'txxx.com', 'upornia.com', 'xfantazy.com',
  'youjizz.com'
]);

const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

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

function decideFlag(preds) {
  // preds: [{className, probability}]
  const map = Object.fromEntries(preds.map((p) => [p.className.toLowerCase(), p.probability]));
  const porn = map.porn || 0;
  const sexy = map.sexy || 0;
  const hentai = map.hentai || 0;
  const neutral = map.neutral || 0;
  const drawing = map.drawing || 0;
  const flagged = porn >= THRESH_PORN || sexy >= THRESH_SEXY || hentai >= THRESH_HENTAI;
  return { flagged, porn, sexy, hentai, neutral, drawing };
}

function decideFlagByDomain(filePath, srcRoot) {
  const rel = path.relative(srcRoot, filePath);
  const base = path.basename(rel).toLowerCase();
  const withoutExt = base.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const dashIdx = withoutExt.indexOf('-');
  const hostGuess = dashIdx >= 0 ? withoutExt.slice(dashIdx + 1) : withoutExt;
  const hostname = hostGuess.startsWith('www.') ? hostGuess.slice(4) : hostGuess;
  for (const d of ADULT_DOMAINS) {
    if (hostname.endsWith(d)) return { flagged: true, reason: `domain:${d}` };
  }
  return { flagged: false };
}

async function blurImage(srcPath, destPath) {
  const img = await Jimp.read(srcPath);
  if (MODE === 'pixelate') {
    img.pixelate(PIXELATE_SIZE);
  } else {
    img.gaussian(GAUSSIAN_RADIUS);
  }
  await ensureDir(path.dirname(destPath));
  await img.quality(85).write(destPath);
}

async function run() {
  const exists = await fs
    .access(SRC_DIR)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  if (!OVERWRITE) {
    await ensureDir(OUT_DIR);
  }

  console.log(`Source: ${SRC_DIR}`);
  console.log(`Mode: ${MODE}${OVERWRITE ? ' (overwrite)' : ` -> out: ${OUT_DIR}`}`);
  console.log(`Thresholds: porn>=${THRESH_PORN}, sexy>=${THRESH_SEXY}, hentai>=${THRESH_HENTAI}`);

  const files = await listImages(SRC_DIR);
  if (!files.length) {
    console.log('No images found.');
    return;
  }
  console.log(`Found ${files.length} images.`);

  let model = null;
  if (!DOMAIN_ONLY) {
    const backend = await loadTf();
    console.log(`Loading NSFW model (backend: ${backend})...`);
    const nsfw = await import('nsfwjs');
    model = await nsfw.load();
  } else {
    console.log('Domain-only mode: skipping model download/classification');
  }

  const report = [];
  let idx = 0;
  let active = 0;
  let processed = 0;
  let blurred = 0;

  const startNext = async () => {
    if (idx >= files.length) return;
    const i = idx++;
    const file = files[i];
    active++;
    try {
      let flagged = false;
      let porn = 0, sexy = 0, hentai = 0;
      if (DOMAIN_ONLY) {
        flagged = decideFlagByDomain(file, SRC_DIR).flagged;
      } else {
        const buf = await fs.readFile(file);
        let tensor;
        if (tf.node && tf.node.decodeImage) {
          tensor = tf.node.decodeImage(buf, 3);
        } else {
          const imgDecoded = await Jimp.read(buf);
          const { data, width, height } = imgDecoded.bitmap; // RGBA
          const rgb = new Uint8Array(width * height * 3);
          for (let i2 = 0, j2 = 0; i2 < data.length; i2 += 4, j2 += 3) {
            rgb[j2] = data[i2];
            rgb[j2 + 1] = data[i2 + 1];
            rgb[j2 + 2] = data[i2 + 2];
          }
          tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
        }
        const preds = await model.classify(tensor);
        tensor.dispose();
        ({ flagged, porn, sexy, hentai } = decideFlag(preds));
      }

      const rel = path.relative(SRC_DIR, file);
      const dest = OVERWRITE ? file : path.join(OUT_DIR, rel);

      if (flagged) {
        if (DRY_RUN) {
          console.log(`[NSFW] ${rel} (porn=${porn.toFixed(2)}, sexy=${sexy.toFixed(2)}, hentai=${hentai.toFixed(2)})`);
        } else {
          await blurImage(file, dest);
          console.log(`[BLURRED] ${rel}`);
        }
        blurred++;
      } else if (!OVERWRITE && !DRY_RUN) {
        // Copy as-is to out dir for completeness
        await ensureDir(path.dirname(dest));
        await fs.copyFile(file, dest);
      }

      report.push({ file: rel, flagged, scores: { porn, sexy, hentai } });
      processed++;
    } catch (err) {
      console.warn(`Failed ${file}: ${err.message || err}`);
      report.push({ file, error: String(err.message || err) });
    } finally {
      active--;
      await startNext();
    }
  };

  const starters = [];
  for (let c = 0; c < Math.min(CONCURRENCY, files.length); c++) starters.push(startNext());
  while (idx < files.length || active > 0) await new Promise((r) => setTimeout(r, 100));

  const reportPath = path.join(OVERWRITE ? SRC_DIR : OUT_DIR, 'nsfw-report.json');
  await fs.writeFile(reportPath, JSON.stringify({ processed, blurred, files: report }, null, 2));
  console.log(`\nDone. Processed ${processed}. Blurred ${blurred}. Report: ${reportPath}`);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
