import fs from "node:fs";
import path from "node:path";

export type ServiceAccountCredentials = {
  clientEmail?: string;
  privateKey?: string;
};

type MaybeEnv = Record<string, string | undefined>;

function readServiceAccountFile(filePath: string): ServiceAccountCredentials {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
  };

  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

export function loadServiceAccountCredentials(env: MaybeEnv): ServiceAccountCredentials {
  let clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const keyFile = env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if ((!clientEmail || !privateKey) && keyFile) {
    try {
      const fileCredentials = readServiceAccountFile(keyFile);
      clientEmail = clientEmail ?? fileCredentials.clientEmail;
      privateKey = privateKey ?? fileCredentials.privateKey;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      throw new Error(`Failed to load Google service account key file (${keyFile}): ${message}`);
    }
  }

  if (privateKey?.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return { clientEmail, privateKey };
}
