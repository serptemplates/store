// Standalone script to capture screenshots via ScreenshotOne API
// Usage:
//   node scripts/screenshotone-batch.mjs
// Optional env:
//   SCREENSHOTONE_ACCESS_KEY=your_key
// Optional CLI flags:
//   --out=./screenshotone-output --concurrency=3 --format=jpg

import fs from 'node:fs/promises';
import path from 'node:path';

// Parse CLI args once
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v = ''] = arg.replace(/^--/, '').split('=');
    return [k, v === '' ? true : v];
  }),
);

// Auth: prefer CLI flag, then env, then default
const ACCESS_KEY = String(
  args.access_key || process.env.SCREENSHOTONE_ACCESS_KEY || 'AvuEmIr7rAYwTw'
);
const SECRET_KEY = String(
  args.secret || process.env.SCREENSHOTONE_SECRET_KEY || ''
);

const OUTPUT_DIR = path.resolve(process.cwd(), args.out || 'screenshotone-output');
const CONCURRENCY = Math.max(1, Number(args.concurrency || 3));
const FORMAT = (args.format || 'jpg').toLowerCase(); // png|jpg|webp
const IMAGE_QUALITY = String(args.image_quality || 80);
const IGNORE_HOST_ERRORS = String(args.ignore_host_errors ?? 'true');
const MAX_PER_MINUTE = Math.max(1, Number(args.rpm || 18)); // rate limit safety
const DELAY = String(args.delay ?? '0');
const REPORT_PATH = path.resolve(process.cwd(), args.report || path.join(OUTPUT_DIR, 'screenshotone-report.json'));
const LIST_PATH = args.list ? path.resolve(process.cwd(), String(args.list)) : null;
const RETRY_FROM = args.retry_failures_from ? path.resolve(process.cwd(), String(args.retry_failures_from)) : null;

async function readListFile(p) {
  const raw = await fs.readFile(p, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

const DEFAULT_URLS = [
  'https://anyporn.com',
  'https://anysex.com',
  'https://www.artstation.com',
  'https://www.ashemaletube.com',
  'https://audiomack.com',
  'https://bandcamp.com',
  'https://www.bbc.com',
  'https://www.beatport.com',
  'https://www.behance.net',
  'https://www.bitchute.com',
  'https://www.boyfriendtv.com',
  'https://www.cda.pl',
  'https://chaturbate.com',
  'https://coomer.su',
  'https://www.deezer.com',
  'https://www.deviantart.com',
  'https://www.dropbox.com',
  'https://www.edx.org',
  'https://einthusan.tv',
  'https://www.fandom.com',
  'https://fansly.com',
  'https://freesound.org',
  'https://www.futurelearn.com',
  'https://hanime.tv',
  'https://hclips.com',
  'https://hdsex.org',
  'https://hdzog.com',
  'https://hentaihaven.xxx',
  'https://www.hotstar.com',
  'https://www.imagefap.com',
  'https://indavideo.hu',
  'https://www.istockphoto.com',
  'https://www.iwara.tv',
  'https://javhd.com',
  'https://www.javhub.net',
  'https://www.kompoz.me',
  'https://www.luxuretv.com',
  'https://www.manyvids.com',
  'https://joinmastodon.org',
  'https://www.mediafire.com',
  'https://www.mixcloud.com',
  'https://motherless.com',
  'https://www.naver.com',
  'https://nhentai.net',
  'https://openload.co',
  'https://www.patreon.com',
  'https://www.perfectgirls.net',
  'https://www.pluralsight.com',
  'https://www.plurk.com',
  'https://www.pond5.com',
  'https://www.pornoxo.com',
  'https://www.pornpics.com',
  'https://porntrex.com',
  'https://www.porntube.com',
  'https://www.pornve.com',
  'https://www.reddit.com',
  'https://rule34.xxx',
  'https://sendvid.com',
  'https://www.shemalez.com',
  'https://shesfreaky.com',
  'https://www.shutterstock.com',
  'https://www.skillshare.com',
  'https://www.smule.com',
  'https://streamable.com',
  'https://tamilgun.cc',
  'https://www.ted.com',
  'https://thisvid.com',
  'https://www.tokyomotion.net',
  'https://www.txxx.com',
  'https://upornia.com',
  'https://videohive.net',
  'https://vsco.co',
  'https://www.webtoons.com',
  'https://www.weibo.com',
  'https://xfantazy.com',
  'https://www.yandex.com',
  'https://www.youjizz.com',
  'https://www.youku.com',
];

async function resolveUrls() {
  if (RETRY_FROM) {
    const data = JSON.parse(await fs.readFile(RETRY_FROM, 'utf8'));
    const failed = (data.failures || []).map((f) => f.url).filter(Boolean);
    if (!failed.length) {
      console.log(`No failures found in ${RETRY_FROM}`);
      process.exit(0);
    }
    return failed;
  }
  if (LIST_PATH) {
    return await readListFile(LIST_PATH);
  }
  return DEFAULT_URLS;
}

function sanitizeName(u, idx) {
  try {
    const { hostname } = new URL(u);
    return `${String(idx + 1).padStart(2, '0')}-${hostname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  } catch {
    return `${String(idx + 1).padStart(2, '0')}-invalid-url`;
  }
}

function buildParams(targetUrl) {
  const params = new URLSearchParams({
    access_key: ACCESS_KEY,
    url: targetUrl,
    format: FORMAT,
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_banners_by_heuristics: 'false',
    block_trackers: 'true',
    delay: DELAY,
    timeout: '60',
    response_type: 'by_format',
    image_quality: IMAGE_QUALITY,
    ignore_host_errors: IGNORE_HOST_ERRORS,
  });
  return params;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 65000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error('timeout')), timeout);
  try {
    const res = await fetch(resource, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function downloadScreenshot(u, index) {
  const params = buildParams(u);
  const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;
  const base = sanitizeName(u, index);
  const filename = `${base}.${FORMAT}`;
  const outPath = path.join(OUTPUT_DIR, filename);

  const res = await fetchWithTimeout(apiUrl, { method: 'GET', timeout: 65000 });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Heuristic: if API signals concurrency/rate limit, surface a typed error
    const isRateLimited = res.status === 429 || /concurrency_limit_reached/i.test(text);
    const err = new Error(`HTTP ${res.status} for ${u}: ${text}`);
    if (isRateLimited) err.rateLimit = true;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function run() {
  if (!ACCESS_KEY) {
    console.error('Missing SCREENSHOTONE_ACCESS_KEY');
    process.exit(1);
  }

  await ensureDir(OUTPUT_DIR);
  const URLS = await resolveUrls();
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total URLs: ${URLS.length}, concurrency: ${CONCURRENCY}, rpm: ${MAX_PER_MINUTE}`);

  let active = 0;
  let nextIndex = 0;
  let success = 0;
  const errors = [];
  const successes = [];
  const startTimes = []; // timestamps of request starts for rate limiting

  const awaitRateSlot = async () => {
    // Keep only timestamps within last 60s
    const now = Date.now();
    for (;;) {
      while (startTimes.length && now - startTimes[0] > 60_000) startTimes.shift();
      if (startTimes.length < MAX_PER_MINUTE) break;
      await new Promise((r) => setTimeout(r, 1000));
      const n2 = Date.now();
      while (startTimes.length && n2 - startTimes[0] > 60_000) startTimes.shift();
    }
    startTimes.push(Date.now());
  };

  const startNext = async () => {
    if (nextIndex >= URLS.length) return;
    const i = nextIndex++;
    active++;
    const target = URLS[i];
    const label = sanitizeName(target, i);

    const attempt = async (triesLeft) => {
      try {
        console.log(`[${i + 1}/${URLS.length}] ${label} -> start`);
        await awaitRateSlot();
        const file = await downloadScreenshot(target, i);
        console.log(`[${i + 1}/${URLS.length}] ${label} -> saved: ${file}`);
        success++;
        successes.push({ url: target, file: path.relative(process.cwd(), file) });
      } catch (err) {
        // Backoff more if rate limited
        if (err && err.rateLimit) {
          const backoffMs = 12_000; // generous backoff
          console.warn(`[${i + 1}/${URLS.length}] ${label} -> rate limited, backing off ${backoffMs}ms`);
          await new Promise((r) => setTimeout(r, backoffMs));
        } else if (triesLeft > 0) {
          console.warn(`[${i + 1}/${URLS.length}] ${label} -> retry (${triesLeft}) due to: ${err.message || err}`);
          await new Promise((r) => setTimeout(r, 1500));
          return attempt(triesLeft - 1);
        } else {
          // no more tries
        }
        const msg = String(err.message || err);
        console.error(`[${i + 1}/${URLS.length}] ${label} -> failed: ${msg}`);
        // Try to extract returned_status_code from API error JSON if present
        let returned_status_code = undefined;
        const m = msg.match(/"returned_status_code":(\d{3})/);
        if (m) returned_status_code = Number(m[1]);
        const rateLimited = /concurrency_limit_reached/i.test(msg) || /429/.test(msg);
        errors.push({ url: target, error: msg, returned_status_code, rateLimited });
      } finally {
        active--;
        await startNext();
      }
    };

    attempt(2);
  };

  // Kick off workers
  const starters = [];
  for (let w = 0; w < Math.min(CONCURRENCY, URLS.length); w++) {
    starters.push(startNext());
  }

  // Wait for completion
  while (nextIndex < URLS.length || active > 0) {
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone. Saved ${success}/${URLS.length}.`);
  try {
    await fs.writeFile(
      REPORT_PATH,
      JSON.stringify({ outputDir: OUTPUT_DIR, successes, failures: errors }, null, 2),
      'utf8',
    );
    console.log(`Report written: ${REPORT_PATH}`);
  } catch (e) {
    console.warn(`Could not write report: ${e.message || e}`);
  }
  if (errors.length) process.exitCode = 2;
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
