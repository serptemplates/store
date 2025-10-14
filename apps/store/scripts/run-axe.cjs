#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

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

const axeBin = require.resolve('@axe-core/cli/bin/axe.js');

let hasFailure = false;

for (const path of paths) {
  const url = new URL(path, baseUrl).toString();
  console.log(`\n🔍 Running axe-core on ${url}`);

  const result = spawnSync(
    process.execPath,
    [axeBin, url, '--tags', 'wcag2a,wcag2aa', '--exit'],
    { stdio: 'inherit' },
  );

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
