import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const appRoot = path.resolve(__dirname, "..");
const envFiles = [
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(appRoot, ".env.local"),
  path.join(appRoot, ".env"),
];

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      loadEnv({ path: file, override: false });
    }
  }

  envLoaded = true;
}

export type GhlPreviewEnv = {
  url: string;
  webhookSecret: string;
  adminToken: string;
  email: string;
  offerId: string;
  amount: string;
  currency: string;
  databaseUrl: string | null;
};

export type EnvResolution =
  | { ok: true; env: GhlPreviewEnv }
  | { ok: false; missing: string[] };

export function resolveGhlPreviewEnv(): EnvResolution {
  ensureEnvLoaded();

  const url = process.env.TEST_GHL_URL?.trim();
  const webhookSecret = process.env.TEST_GHL_SECRET?.trim();
  const adminToken = process.env.TEST_ACCOUNT_ADMIN_TOKEN?.trim();
  const email = process.env.TEST_GHL_EMAIL?.trim() ?? "inspect@example.com";
  const offerId = process.env.TEST_GHL_OFFER_ID?.trim() ?? "skool-video-downloader";
  const amount = process.env.TEST_GHL_AMOUNT?.trim() ?? "27.00";
  const currency = process.env.TEST_GHL_CURRENCY?.trim() ?? "usd";
  const databaseUrl =
    process.env.TEST_GHL_DATABASE_URL?.trim() ??
    process.env.CHECKOUT_DATABASE_URL?.trim() ??
    process.env.DATABASE_URL?.trim() ??
    null;

  const missing = [];
  if (!url) missing.push("TEST_GHL_URL");
  if (!webhookSecret) missing.push("TEST_GHL_SECRET");
  if (!adminToken) missing.push("TEST_ACCOUNT_ADMIN_TOKEN");

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    env: {
      url: url!,
      webhookSecret: webhookSecret!,
      adminToken: adminToken!,
      email,
      offerId,
      amount,
      currency,
      databaseUrl,
    },
  };
}

export function requireGhlPreviewEnv(): GhlPreviewEnv {
  const result = resolveGhlPreviewEnv();
  if (!result.ok) {
    throw new Error(`Missing required environment variables: ${result.missing.join(", ")}`);
  }

  return result.env;
}

export function generatePaymentId() {
  return `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function parseJson(body: string) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

export type WebhookResult = {
  status: number;
  body: unknown;
};

function shouldUseDatabaseOverride(env: GhlPreviewEnv): boolean {
  if (!env.databaseUrl) {
    return false;
  }

  try {
    const hostname = new URL(env.url).hostname;
    if (!hostname || hostname === "apps.serp.co") {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export async function postGhlWebhook(env: GhlPreviewEnv, paymentId: string): Promise<WebhookResult & { usedDbOverride: boolean }> {
  const payload = {
    status: "paid",
    payment: {
      id: paymentId,
      total_amount: env.amount,
      currency: env.currency,
      source: "stripe",
    },
    custom_data: {
      offer_id: env.offerId,
    },
    contact: {
      id: `contact_${paymentId}`,
      email: env.email,
      name: "Preview Test Buyer",
    },
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-webhook-secret": env.webhookSecret,
  };

  const useOverride = shouldUseDatabaseOverride(env);
  const requestUrl = new URL(`${env.url.replace(/\/$/, "")}/api/webhooks/ghl/payment`);
  if (useOverride && env.databaseUrl) {
    headers["x-preview-db-url"] = env.databaseUrl;
    headers["x-preview-db-token"] = env.adminToken;
    const encodedDatabaseUrl = Buffer.from(env.databaseUrl, "utf8").toString("base64");
    requestUrl.searchParams.set("previewDbOverride", encodedDatabaseUrl);
    requestUrl.searchParams.set("previewDbToken", env.adminToken);
    (payload.custom_data as Record<string, unknown>).__previewDbOverride = encodedDatabaseUrl;
    (payload.custom_data as Record<string, unknown>).__previewDbToken = env.adminToken;
    (payload as Record<string, unknown>).__previewDbOverride = encodedDatabaseUrl;
    (payload as Record<string, unknown>).__previewDbToken = env.adminToken;
  }

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();

  return {
    status: response.status,
    body: parseJson(bodyText),
    usedDbOverride: useOverride,
  };
}

export type AccountResult = {
  status: number;
};

export async function fetchGhlAccount(env: GhlPreviewEnv): Promise<AccountResult> {
  const response = await fetch(
    `${env.url.replace(/\/$/, "")}/account?impersonate=${encodeURIComponent(env.email)}&adminToken=${encodeURIComponent(env.adminToken)}`,
    { redirect: "manual" },
  );

  return { status: response.status };
}

export type PreviewRunResult = {
  paymentId: string;
  webhook: WebhookResult;
  account?: AccountResult;
  usedDbOverride: boolean;
};

export async function runGhlPreview(env: GhlPreviewEnv, options?: { skipAccountCheck?: boolean }): Promise<PreviewRunResult> {
  const paymentId = generatePaymentId();
  const webhook = await postGhlWebhook(env, paymentId);
  const { usedDbOverride, ...webhookResult } = webhook;

  if (options?.skipAccountCheck || webhookResult.status !== 200) {
    return { paymentId, webhook: webhookResult, usedDbOverride };
  }

  const account = await fetchGhlAccount(env);
  return { paymentId, webhook: webhookResult, account, usedDbOverride };
}
