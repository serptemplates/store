// Publish homepage screenshots into product JSON files and media folders.
// - Prefers blurred images when available, falls back to original.
// - Converts to WebP and writes to /apps/store/public/media/products/{slug}/
// - Updates YAML: featured_image + screenshots[0]
//
// Usage:
//   node scripts/nsfw/publish-homepage-screenshots.mjs \
//     --src=./screenshots/shot-output \
//     --blurred=./screenshots/blurred \
//     --productsDir=./apps/store/data/products \
//     --mediaDir=./apps/store/public/media/products \
//     --maxWidth=1600

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

const SRC_DIR = path.resolve(process.cwd(), args.src || './screenshots/shot-output');
const BLURRED_DIR = path.resolve(process.cwd(), args.blurred || './screenshots/blurred');
const PRODUCTS_DIR = path.resolve(process.cwd(), args.productsDir || './apps/store/data/products');
const MEDIA_DIR = path.resolve(process.cwd(), args.mediaDir || './apps/store/public/media/products');
const MAX_WIDTH = Math.max(600, Number(args.maxWidth || 1600));

const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const EXCEPTIONS = new Map([
  ['webtoons', 'webtoon'],
  ['webtoon', 'webtoon'],
  ['istockphoto', 'istockphoto'],
  ['istock', 'istock'],
  ['youporn', 'youporn'],
]);

function parseFilename(file) {
  const base = path.basename(file).toLowerCase();
  const withoutExt = base.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const dashIdx = withoutExt.indexOf('-');
  const host = dashIdx >= 0 ? withoutExt.slice(dashIdx + 1) : withoutExt;
  const hostname = host.startsWith('www.') ? host.slice(4) : host;
  const root = hostname.split('.')[0];
  return { base, hostname, root };
}

function guessSlugRoot(root) {
  if (EXCEPTIONS.has(root)) return EXCEPTIONS.get(root);
  if (root.endsWith('s')) return root.slice(0, -1);
  return root;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listImages(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) continue;
    if (exts.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out.sort();
}

async function readProduct(file) {
  const txt = await fs.readFile(file, 'utf8');
  return JSON.parse(txt);
}

async function writeProduct(file, obj) {
  const txt = `${JSON.stringify(obj, null, 2)}\n`;
  await fs.writeFile(file, txt);
}

async function convertToWebp(srcPath, outPath) {
  const img = await Jimp.read(srcPath);
  if (img.bitmap.width > MAX_WIDTH) img.resize(MAX_WIDTH, Jimp.AUTO);
  await ensureDir(path.dirname(outPath));
  const out = outPath.replace(/\.(png|jpg|jpeg|webp)$/i, '.webp');
  await img.quality(85).write(out);
  return out;
}

async function run() {
  const images = (await fs.access(SRC_DIR).then(()=>true).catch(()=>false))
    ? await listImages(SRC_DIR) : [];
  if (!images.length) {
    console.error('No screenshots found in', SRC_DIR);
    return;
  }
  let updated = 0;
  let skipped = 0;
  for (const imgPath of images) {
    const { base, root } = parseFilename(imgPath);
    const rootGuess = guessSlugRoot(root);
    const slug = `${rootGuess}-downloader`;
    const productPath = path.join(PRODUCTS_DIR, `${slug}.json`);
    const productExists = await fs.access(productPath).then(()=>true).catch(()=>false);
    if (!productExists) { skipped++; continue; }

    const srcBlur = path.join(BLURRED_DIR, base);
    const usePath = await fs.access(srcBlur).then(()=>srcBlur).catch(()=>imgPath);

    const productMediaDir = path.join(MEDIA_DIR, slug);
    const featuredPath = path.join(productMediaDir, 'featured.webp');
    const homepagePath = path.join(productMediaDir, `${rootGuess}-homepage.webp`);
    const outFeatured = await convertToWebp(usePath, featuredPath);
    const outHomepage = await convertToWebp(usePath, homepagePath);

    const doc = await readProduct(productPath);
    if (typeof doc !== 'object' || doc === null) { skipped++; continue; }
    doc.featured_image = `/media/products/${slug}/featured.webp`;
    const altBase = doc.name ? `${doc.name} website homepage` : `${rootGuess} website homepage`;
    const shotEntry = { url: `/media/products/${slug}/${path.basename(outHomepage)}`, alt: altBase };
    if (!Array.isArray(doc.screenshots)) doc.screenshots = [];
    if (doc.screenshots.length) doc.screenshots[0] = shotEntry; else doc.screenshots.push(shotEntry);
    await writeProduct(productPath, doc);
    updated++;
    console.log(`Updated ${slug}`);
  }
  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
}

run().catch((e)=>{ console.error('Fatal:', e); process.exit(1); });
