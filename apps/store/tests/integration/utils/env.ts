import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

let loaded = false;

export function loadIntegrationEnv(metaUrl: string): void {
  if (loaded) {
    return;
  }

  const __filename = fileURLToPath(metaUrl);
  const __dirname = path.dirname(__filename);

  const candidateEnvFiles = Array.from(
    new Set([
      path.resolve(process.cwd(), ".env"),
      path.resolve(__dirname, "../../.env"),
      path.resolve(__dirname, "../../../.env"),
      path.resolve(__dirname, "../../../../.env"),
    ]),
  );

  for (const envPath of candidateEnvFiles) {
    if (fs.existsSync(envPath)) {
      loadEnv({ path: envPath, override: false });
    }
  }

  loaded = true;
}
