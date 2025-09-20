#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const [, , siteSlugArg, repoArg] = process.argv;
const siteSlug = siteSlugArg || process.env.STATIC_SITE_SLUG || "serpdownloaders";
const repoTarget = repoArg || process.env.STATIC_SITE_REPO || "serpdownloaders/serpdownloaders.github.io";

if (!repoTarget) {
  console.error("⚠️  No target repository provided. Pass it as an argument or set STATIC_SITE_REPO.");
  process.exit(1);
}

const repoUrl = repoTarget.includes("://") || repoTarget.startsWith("git@")
  ? repoTarget
  : `git@github.com:${repoTarget}.git`;

const rootDir = process.cwd();
const distRoot = path.join(rootDir, "dist");
const exportDir = path.join(distRoot, siteSlug);
const siteManifest = path.join(rootDir, "sites", siteSlug, "site.config.json");

fs.mkdirSync(distRoot, { recursive: true });
fs.rmSync(exportDir, { recursive: true, force: true });

console.log(`\n📦 Building static export for ${siteSlug}...`);
const buildEnv = { ...process.env, STATIC_EXPORT: "1", PRODUCTS_ROOT: "../store/data" };
if (fs.existsSync(siteManifest)) {
  buildEnv.SITE_CONFIG_PATH = siteManifest;
  console.log(`Using site config: ${siteManifest}`);
} else {
  console.warn(`⚠️  No site manifest found at ${siteManifest}. Using default config.`);
}

execSync("pnpm --filter @apps/satellite build", {
  stdio: "inherit",
  env: buildEnv,
});

const nextOutDir = path.join(rootDir, "apps", "satellite", "out");

if (!fs.existsSync(nextOutDir)) {
  console.error(`❌ Expected Next export at ${nextOutDir}, but it was not found.`);
  process.exit(1);
}

fs.rmSync(exportDir, { recursive: true, force: true });
fs.mkdirSync(exportDir, { recursive: true });

for (const entry of fs.readdirSync(nextOutDir)) {
  fs.cpSync(path.join(nextOutDir, entry), path.join(exportDir, entry), { recursive: true });
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${siteSlug}-static-`));
console.log(`\n🚚 Cloning ${repoUrl} into ${tmpDir}`);
execSync(`git clone ${repoUrl} ${tmpDir}`, { stdio: "inherit" });

if (process.env.GIT_USER_NAME) {
  execSync(`git config user.name "${process.env.GIT_USER_NAME}"`, { cwd: tmpDir, stdio: "inherit" });
}
if (process.env.GIT_USER_EMAIL) {
  execSync(`git config user.email "${process.env.GIT_USER_EMAIL}"`, { cwd: tmpDir, stdio: "inherit" });
}

for (const entry of fs.readdirSync(tmpDir)) {
  if (entry === ".git") continue;
  fs.rmSync(path.join(tmpDir, entry), { recursive: true, force: true });
}

for (const entry of fs.readdirSync(exportDir)) {
  const src = path.join(exportDir, entry);
  const dest = path.join(tmpDir, entry);
  fs.cpSync(src, dest, { recursive: true });
}

console.log("\n📝 Committing changes...");
execSync("git add .", { cwd: tmpDir, stdio: "inherit" });

try {
  execSync(`git commit -m "Deploy ${siteSlug} ${new Date().toISOString()}"`, {
    cwd: tmpDir,
    stdio: "inherit",
  });
} catch (error) {
  console.log("No changes to commit.");
}

console.log("\n🚀 Pushing to remote...");
execSync("git push", { cwd: tmpDir, stdio: "inherit" });

console.log("\n✅ Deployment complete.");
