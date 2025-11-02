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
 * Load environment variables from a single canonical file without overriding
 * already-defined values. We standardize on repo-root `/.env` only.
 * This avoids duplicate state between multiple files.
 */
export function loadMonorepoEnv(): void {
  const cwd = process.cwd();
  const appRoot = cwd; // expect to run inside apps/store
  const repoRoot = path.resolve(appRoot, "../..");

  // Single source of truth for local development and scripts
  tryLoad(path.join(repoRoot, ".env"));
}
