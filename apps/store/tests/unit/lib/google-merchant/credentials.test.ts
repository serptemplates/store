import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadServiceAccountCredentials } from "@/lib/google-merchant/credentials";

function createTempKeyFile(contents: Record<string, unknown>): { filePath: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merchant-creds-"));
  const filePath = path.join(dir, "service-account.json");
  fs.writeFileSync(filePath, JSON.stringify(contents));
  return {
    filePath,
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("loadServiceAccountCredentials", () => {
  it("returns credentials directly from environment variables", () => {
    const result = loadServiceAccountCredentials({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "line1\\nline2",
    });

    expect(result.clientEmail).toBe("svc@example.com");
    expect(result.privateKey).toBe("line1\nline2");
  });

  it("falls back to reading a service account key file when variables are missing", () => {
    const { filePath, cleanup } = createTempKeyFile({
      client_email: "file@example.com",
      private_key: "file-private-key",
    });

    try {
      const result = loadServiceAccountCredentials({
        GOOGLE_SERVICE_ACCOUNT_KEY_PATH: filePath,
      });

      expect(result.clientEmail).toBe("file@example.com");
      expect(result.privateKey).toBe("file-private-key");
    } finally {
      cleanup();
    }
  });

  it("merges environment variables with file-based credentials", () => {
    const { filePath, cleanup } = createTempKeyFile({
      client_email: "file@example.com",
      private_key: "file-private-key",
    });

    try {
      const result = loadServiceAccountCredentials({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "env@example.com",
        GOOGLE_SERVICE_ACCOUNT_KEY_FILE: filePath,
      });

      expect(result.clientEmail).toBe("env@example.com");
      expect(result.privateKey).toBe("file-private-key");
    } finally {
      cleanup();
    }
  });
});
