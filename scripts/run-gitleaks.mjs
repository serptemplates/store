#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const VERSION = process.env.GITLEAKS_VERSION || '8.18.4';
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const cacheDir = path.join(repoRoot, '.tmp', 'gitleaks', VERSION);
const binPath = path.join(cacheDir, 'gitleaks');

function getAssetName() {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === 'darwin' && arch === 'arm64') {
    return `gitleaks_${VERSION}_darwin_arm64.tar.gz`;
  }
  if (platform === 'darwin' && arch === 'x64') {
    return `gitleaks_${VERSION}_darwin_x64.tar.gz`;
  }
  if (platform === 'linux' && arch === 'x64') {
    return `gitleaks_${VERSION}_linux_x64.tar.gz`;
  }
  if (platform === 'linux' && arch === 'arm64') {
    return `gitleaks_${VERSION}_linux_arm64.tar.gz`;
  }
  throw new Error(`Unsupported platform ${platform} ${arch} for gitleaks.`);
}

function ensureBinary() {
  if (existsSync(binPath)) {
    return;
  }

  mkdirSync(cacheDir, { recursive: true });
  const asset = getAssetName();
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/${asset}`;
  const tarPath = path.join(cacheDir, asset);

  console.log(`Downloading gitleaks ${VERSION} from ${url}`);
  const curl = spawnSync('curl', ['-sSL', url, '-o', tarPath], { stdio: 'inherit' });
  if (curl.status !== 0) {
    throw new Error('Failed to download gitleaks archive with curl.');
  }

  const extract = spawnSync('tar', ['-xzf', tarPath, '-C', cacheDir], { stdio: 'inherit' });
  if (extract.status !== 0) {
    throw new Error('Failed to extract gitleaks archive.');
  }

  chmodSync(binPath, 0o755);
}

function run() {
  try {
    ensureBinary();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const result = spawnSync(binPath, process.argv.slice(2), {
    stdio: 'inherit',
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    console.error(result.error.message);
  }
  process.exit(1);
}

run();
