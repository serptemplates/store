#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { validateEnvironment } from "@/lib/env-validation";

function collectEnvPaths(preferredFile?: string): string[] {
  if (preferredFile) {
    const direct = path.resolve(process.cwd(), preferredFile);
    if (fs.existsSync(direct)) {
      return [direct];
    }
  }

  const envPaths: string[] = [];

  // Walk up from current working directory, collecting every .env encountered.
  let currentDir: string | null = process.cwd();
  while (currentDir) {
    const candidate = path.join(currentDir, ".env");
    if (fs.existsSync(candidate)) {
      envPaths.push(candidate);
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  // Load from top-most directory first so repo-level vars populate defaults,
  // letting package-level files override where necessary.
  return envPaths.reverse();
}

function hydrateEnvironmentFromFile(envPath: string): void {
  const contents = fs.readFileSync(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(equalsIndex + 1);
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function main(): void {
  const envFile = process.env.VALIDATE_ENV_FILE;
  const envPaths = collectEnvPaths(envFile);
  for (const pathName of envPaths) {
    hydrateEnvironmentFromFile(pathName);
  }

  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(warning);
    }
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Environment looks good ✅");
}

main();
