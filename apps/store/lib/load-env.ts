import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

import logger from "@/lib/logger";

function tryLoad(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const result = dotenv.config({ path: filePath, override: false });
    if (result.parsed) {
      logger.info("env.file_loaded", { path: filePath });
    }
    return Boolean(result.parsed);
  } catch {
    return false;
  }
}

/**
 * Load environment variables from multiple .env files without overriding
 * already-defined values. Priority order (first wins):
 *
 * 1) apps/store/.env.local
 * 2) apps/store/.env
 * 3) apps/store/.env.production.local (when NODE_ENV=production)
 * 4) apps/store/.env.production (when NODE_ENV=production)
 * 5) repo-root/.env.local
 * 6) repo-root/.env
 */
export function loadMonorepoEnv(): void {
  const cwd = process.cwd();
  const appRoot = cwd; // expect to run inside apps/store
  const repoRoot = path.resolve(appRoot, "../..");
  const isProd = process.env.NODE_ENV === "production";

  // App-level envs
  tryLoad(path.join(appRoot, ".env.local"));
  tryLoad(path.join(appRoot, ".env"));

  if (isProd) {
    // Production-specific envs
    tryLoad(path.join(appRoot, ".env.production.local"));
    tryLoad(path.join(appRoot, ".env.production"));
  }

  // Repo root fallbacks
  tryLoad(path.join(repoRoot, ".env.local"));
  tryLoad(path.join(repoRoot, ".env"));
}
