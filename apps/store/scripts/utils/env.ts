import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

export interface ScriptPathInfo {
  scriptDir: string
  storeDir: string
  repoRoot: string;
}

export interface LoadScriptEnvironmentOptions {
  /**
   * Additional directories that should be checked for `.env`/`.env.local` files.
   */
  extraRoots?: string[];
  /**
   * Include the current working directory in the search (defaults to true).
   */
  includeProcessCwd?: boolean;
}

export function resolveScriptPaths(scriptUrl: string): ScriptPathInfo {
  const scriptDir = path.dirname(fileURLToPath(scriptUrl));
  const storeDir = path.resolve(scriptDir, "..");
  const repoRoot = path.resolve(storeDir, "..", "..");

  return {
    scriptDir,
    storeDir,
    repoRoot,
  };
}

export function loadScriptEnvironment(
  scriptUrl: string,
  options: LoadScriptEnvironmentOptions = {},
): ScriptPathInfo {
  const paths = resolveScriptPaths(scriptUrl);

  const roots = new Set<string>();
  roots.add(paths.repoRoot);
  roots.add(paths.storeDir);

  if (options.extraRoots) {
    for (const root of options.extraRoots) {
      roots.add(root);
    }
  }

  if (options.includeProcessCwd ?? true) {
    roots.add(process.cwd());
  }

  // Single source of truth: prefer repo-root/.env only to avoid duplication
  if (paths.repoRoot) {
    loadEnv({ path: path.join(paths.repoRoot, ".env") });
  }

  return paths;
}
