/**
 * Stripe Environment Helpers
 *
 * Centralizes logic that determines which Stripe credentials to use based on
 * the active runtime environment. This lets us keep both live and test keys in
 * configuration while automatically selecting the safe option for development
 * and preview workloads.
 */

import logger from "@/lib/logger";

export type RuntimeEnvironment = "development" | "preview" | "production" | "test";
export type StripeMode = "live" | "test";
export type StripeModeInput = "auto" | StripeMode;

const RUNTIME_ENV_ALIASES: Record<string, RuntimeEnvironment> = {
  development: "development",
  dev: "development",
  local: "development",
  localhost: "development",
  preview: "preview",
  staging: "preview",
  preprod: "preview",
  production: "production",
  prod: "production",
  live: "production",
  test: "test",
  testing: "test",
  qa: "test",
};

const STRIPE_MODE_ALIASES: Record<string, StripeMode> = {
  live: "live",
  prod: "live",
  production: "live",
  test: "test",
  sandbox: "test",
  development: "test",
  dev: "test",
};

function normalizeRuntimeEnv(value: string | undefined | null): RuntimeEnvironment | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return RUNTIME_ENV_ALIASES[normalized] ?? null;
}

function normalizeStripeMode(value: string | undefined | null): StripeMode | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return STRIPE_MODE_ALIASES[normalized] ?? null;
}

function isServer(): boolean {
  return typeof window === "undefined";
}

function emitWarning(message: string, context?: Record<string, unknown>) {
  if (isServer()) {
    logger.warn("stripe.env_warning", { message, ...(context ?? {}) });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[stripe] ${message}`, context ?? {});
  }
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const explicitSources = [
    process.env.RUNTIME_ENV,
    process.env.APP_ENV,
    process.env.NEXT_PUBLIC_RUNTIME_ENV,
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.VERCEL_ENV,
  ];

  for (const source of explicitSources) {
    const normalized = normalizeRuntimeEnv(source);
    if (normalized) {
      return normalized;
    }
  }

  if (!isServer()) {
    const hostname = window.location.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("localhost:")
    ) {
      return "development";
    }

    const previewHostPatterns = [
      /\.vercel\.app$/i,
      /\.vercel\.dev$/i,
    ];
    if (previewHostPatterns.some((pattern) => pattern.test(hostname))) {
      return "preview";
    }

    const previewKeywords = ["-git-", "preview.", "staging."];
    if (previewKeywords.some((keyword) => hostname.includes(keyword))) {
      return "preview";
    }
  }

  const nodeEnv = normalizeRuntimeEnv(process.env.NODE_ENV);
  if (nodeEnv) {
    return nodeEnv;
  }

  return "development";
}

function getExplicitStripeMode(): StripeMode | null {
  const candidates = [
    process.env.STRIPE_MODE,
    process.env.STRIPE_ENV,
    process.env.STRIPE_ENVIRONMENT,
    process.env.NEXT_PUBLIC_STRIPE_MODE,
    process.env.NEXT_PUBLIC_STRIPE_ENV,
    process.env.NEXT_PUBLIC_STRIPE_ENVIRONMENT,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeStripeMode(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveStripeMode(mode: StripeModeInput = "auto"): StripeMode {
  if (mode !== "auto") {
    return mode;
  }

  const explicit = getExplicitStripeMode();
  if (explicit) {
    return explicit;
  }

  const runtime = getRuntimeEnvironment();
  const inferred = runtime === "production" ? "live" : "test";

  if (inferred === "test") {
    const testSecret = selectSecretKeyForMode("test");
    const testPublishable = selectPublishableKeyForMode("test");
    const liveSecret = selectSecretKeyForMode("live");
    const livePublishable = selectPublishableKeyForMode("live");

    const missingTestSecret = !testSecret;
    const missingTestPublishableKey = !testPublishable;

    if ((missingTestSecret || missingTestPublishableKey) && liveSecret && livePublishable) {
      emitWarning("Missing Stripe test credentials; defaulting to live mode.", {
        runtime,
        missingTestSecret,
        missingTestPublishableKey,
        fallbackMode: "live",
      });
      return "live";
    }
  }

  return inferred;
}

function selectSecretKeyForMode(mode: StripeMode): string | undefined {
  if (mode === "live") {
    if (process.env.STRIPE_SECRET_KEY_LIVE) {
      return process.env.STRIPE_SECRET_KEY_LIVE;
    }

    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      return process.env.STRIPE_SECRET_KEY;
    }

    return undefined;
  }

  if (process.env.STRIPE_SECRET_KEY_TEST) {
    return process.env.STRIPE_SECRET_KEY_TEST;
  }

  if (process.env.STRIPE_TEST_SECRET_KEY) {
    return process.env.STRIPE_TEST_SECRET_KEY;
  }

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    return process.env.STRIPE_SECRET_KEY;
  }

  return undefined;
}

function selectPublishableKeyForMode(mode: StripeMode): string | undefined {
  if (mode === "live") {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE) {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE;
    }

    if (
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_")
    ) {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    }

    return undefined;
  }

  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST) {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;
  }

  if (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_")
  ) {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }

  return undefined;
}

function selectWebhookSecretForMode(mode: StripeMode): string | undefined {
  if (mode === "live") {
    if (process.env.STRIPE_WEBHOOK_SECRET_LIVE) {
      return process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    }

    if (
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_WEBHOOK_SECRET !== process.env.STRIPE_WEBHOOK_SECRET_TEST
    ) {
      return process.env.STRIPE_WEBHOOK_SECRET;
    }

    return undefined;
  }

  if (process.env.STRIPE_WEBHOOK_SECRET_TEST) {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST;
  }

  if (process.env.STRIPE_TEST_WEBHOOK_SECRET) {
    return process.env.STRIPE_TEST_WEBHOOK_SECRET;
  }

  if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET_LIVE) {
    emitWarning(
      "Using STRIPE_WEBHOOK_SECRET for test mode. Configure STRIPE_WEBHOOK_SECRET_TEST to avoid ambiguity.",
    );
    return process.env.STRIPE_WEBHOOK_SECRET;
  }

  return undefined;
}

export function getOptionalStripeSecretKey(mode: StripeModeInput = "auto"): string | undefined {
  const resolved = resolveStripeMode(mode);
  return selectSecretKeyForMode(resolved);
}

export function requireStripeSecretKey(mode: StripeModeInput = "auto"): string {
  const resolved = resolveStripeMode(mode);
  const secret = selectSecretKeyForMode(resolved);

  if (!secret) {
    throw new Error(
      resolved === "live"
        ? "Missing Stripe live secret key. Set STRIPE_SECRET_KEY_LIVE or ensure STRIPE_SECRET_KEY contains an sk_live_* value."
        : "Missing Stripe test secret key. Set STRIPE_SECRET_KEY_TEST with an sk_test_* value."
    );
  }

  return secret;
}

export function getOptionalStripePublishableKey(mode: StripeModeInput = "auto"): string | undefined {
  const resolved = resolveStripeMode(mode);
  return selectPublishableKeyForMode(resolved);
}

export function requireStripePublishableKey(mode: StripeModeInput = "auto"): string {
  const resolved = resolveStripeMode(mode);
  const publishableKey = selectPublishableKeyForMode(resolved);

  if (!publishableKey) {
    throw new Error(
      resolved === "live"
        ? "Missing Stripe live publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE or provide a pk_live_* value in NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
        : "Missing Stripe test publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST with a pk_test_* value."
    );
  }

  return publishableKey;
}

export function getOptionalStripeWebhookSecret(mode: StripeModeInput = "auto"): string | undefined {
  const resolved = resolveStripeMode(mode);
  return selectWebhookSecretForMode(resolved);
}

export function getStripeMode(mode: StripeModeInput = "auto"): StripeMode {
  return resolveStripeMode(mode);
}

export function isStripeTestMode(): boolean {
  return resolveStripeMode("auto") === "test";
}

function selectPaymentConfigIdForMode(mode: StripeMode): string | undefined {
  if (mode === "live") {
    return process.env.STRIPE_PAYMENT_CONFIG_ID_LIVE ?? process.env.STRIPE_PAYMENT_CONFIG_ID ?? undefined;
  }

  return process.env.STRIPE_PAYMENT_CONFIG_ID_TEST ?? undefined;
}

export function getOptionalStripePaymentConfigId(mode: StripeModeInput = "auto"): string | undefined {
  const resolved = resolveStripeMode(mode);
  return selectPaymentConfigIdForMode(resolved);
}
