#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function ensureChromeDependencies() {
  const chromePathFromEnv = process.env.AXE_CHROME_PATH;
  const chromedriverPathFromEnv = process.env.AXE_CHROMEDRIVER_PATH;
  if (chromePathFromEnv || chromedriverPathFromEnv) {
    return {
      chromePath: chromePathFromEnv,
      chromedriverPath: chromedriverPathFromEnv,
    };
  }

  const chromeVersionResult = spawnSync('google-chrome', ['--version'], {
    encoding: 'utf8',
  });

  if (chromeVersionResult.status !== 0) {
    console.warn(
      'Unable to determine installed Chrome version; proceeding with default axe configuration.',
    );
    return {};
  }

  const versionMatch = chromeVersionResult.stdout.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (!versionMatch) {
    console.warn(
      `Unable to parse Chrome version from output: ${chromeVersionResult.stdout}`,
    );
    return {};
  }

  const chromeVersion =
    process.env.AXE_CHROME_VERSION ?? versionMatch[1].split('.')[0];

  console.log(
    `Ensuring Chrome/ChromeDriver version ${chromeVersion} via browser-driver-manager...`,
  );
  const installResult = spawnSync(
    getNpxCommand(),
    ['--yes', 'browser-driver-manager', 'install', `chrome@${chromeVersion}`],
    { encoding: 'utf8' },
  );

  if (installResult.error || installResult.status !== 0) {
    console.warn(
      'browser-driver-manager failed to install matching Chrome/ChromeDriver; falling back to defaults.',
    );
    if (installResult.stdout) {
      process.stdout.write(installResult.stdout);
    }
    if (installResult.stderr) {
      process.stderr.write(installResult.stderr);
    }
    return {};
  }

  if (installResult.stdout) {
    process.stdout.write(installResult.stdout);
  }
  if (installResult.stderr) {
    process.stderr.write(installResult.stderr);
  }

  const chromePathMatch = installResult.stdout.match(
    /CHROME_TEST_PATH="([^"]+)"/,
  );
  const chromedriverPathMatch = installResult.stdout.match(
    /CHROMEDRIVER_TEST_PATH="([^"]+)"/,
  );

  if (!chromePathMatch || !chromedriverPathMatch) {
    console.warn(
      'Unable to determine Chrome or Chromedriver path from browser-driver-manager output.',
    );
    return {};
  }

  return {
    chromePath: chromePathMatch[1],
    chromedriverPath: chromedriverPathMatch[1],
  };
}

const baseUrl =
  process.env.AXE_BASE_URL ??
  process.env.TEST_BASE_URL ??
  'http://127.0.0.1:3000';

const paths = (process.env.AXE_PATHS ?? '/,/loom-video-downloader')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!paths.length) {
  console.error('No paths provided for axe run (AXE_PATHS).');
  process.exit(1);
}

const axeBin = require.resolve('@axe-core/cli/dist/src/bin/cli.js');
const { chromePath, chromedriverPath } = ensureChromeDependencies();

if (chromePath && !process.env.CHROME_BIN) {
  process.env.CHROME_BIN = chromePath;
}

let hasFailure = false;

for (const path of paths) {
  const url = new URL(path, baseUrl).toString();
  console.log(`\n🔍 Running axe-core on ${url}`);

  const axeArgs = [axeBin, url, '--tags', 'wcag2a,wcag2aa', '--exit'];
  if (chromedriverPath) {
    axeArgs.push('--chromedriver-path', chromedriverPath);
  }
  if (chromePath) {
    axeArgs.push('--chrome-path', chromePath);
  }

  const result = spawnSync(process.execPath, axeArgs, { stdio: 'inherit' });

  if (result.error) {
    console.error(`axe CLI failed for ${url}: ${result.error.message}`);
    hasFailure = true;
    continue;
  }

  if (result.status !== 0) {
    console.error(`axe reported violations on ${url} (exit code ${result.status}).`);
    hasFailure = true;
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log('\n✅ axe checks completed with no blocking violations.');
