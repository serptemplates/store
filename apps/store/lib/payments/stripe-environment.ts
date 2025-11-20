/**
 * Stripe Environment Helpers
 *
 * Centralizes logic that determines which Stripe credentials to use based on
 * the active runtime environment. This lets us keep both live and test keys in
 * configuration while automatically selecting the safe option for development
 * and preview workloads.
 */

import logger from "@/lib/logger";
import { getEnvVarCandidates, normalizeStripeAccountAlias } from "@/config/payment-accounts";

export type RuntimeEnvironment = "development" | "preview" | "production" | "test";
export type StripeMode = "live" | "test";
export type StripeModeInput = "auto" | StripeMode;
export type StripeCredentialInput = StripeModeInput | { mode?: StripeModeInput; accountAlias?: string | null };

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

const SECRET_KEY_PREFIXES: Record<StripeMode, string[]> = {
  live: ["sk_live_", "rk_live_"],
  test: ["sk_test_", "rk_test_"],
};

const PUBLISHABLE_KEY_PREFIXES: Record<StripeMode, string[]> = {
  live: ["pk_live_"],
  test: ["pk_test_"],
};

const warnedAliasFallbacks = new Set<string>();

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

function getBrowserHostname(): string | null {
  try {
    if (typeof window !== "undefined") {
      const maybeHostname = (window as unknown as { location?: { hostname?: unknown } }).location?.hostname;
      return typeof maybeHostname === "string" ? maybeHostname : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function emitWarning(message: string, context?: Record<string, unknown>) {
  if (isServer()) {
    logger.warn("stripe.env_warning", { message, ...(context ?? {}) });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[stripe] ${message}`, context ?? {});
  }
}

function getAccountAlias(input?: string | null): string {
  return normalizeStripeAccountAlias(input ?? undefined);
}

function warnAliasFallback(requestedAlias: string | null | undefined, fallbackAlias: string) {
  const key = `${requestedAlias ?? "__default__"}->${fallbackAlias}`;
  if (warnedAliasFallbacks.has(key)) {
    return;
  }
  warnedAliasFallbacks.add(key);
  emitWarning("Unknown Stripe account alias; defaulting to fallback.", {
    requestedAlias: requestedAlias ?? null,
    fallbackAlias,
  });
}

function getEnvCandidatesForField(
  field: "secretKey" | "publishableKey" | "webhookSecret" | "paymentConfigId",
  mode: StripeMode,
  accountAlias?: string | null,
) {
  const { values, resolvedAlias, isFallback } = getEnvVarCandidates(accountAlias, field, mode);
  if (isFallback) {
    warnAliasFallback(accountAlias ?? null, resolvedAlias);
  }
  return values;
}

function resolveCredentialInput(
  input?: StripeCredentialInput,
): { mode: StripeMode; accountAlias: string | null } {
  if (typeof input === "string" || input === undefined) {
    return {
      mode: resolveStripeMode(input ?? "auto"),
      accountAlias: null,
    };
  }

  return {
    mode: resolveStripeMode(input.mode ?? "auto"),
    accountAlias: input.accountAlias ? getAccountAlias(input.accountAlias) : null,
  };
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
    // In some test environments window.location may be undefined or partial
    const rawHost = getBrowserHostname();
    const hostname = rawHost ? rawHost.toLowerCase() : "";
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
    if (hostname && previewHostPatterns.some((pattern) => pattern.test(hostname))) {
      return "preview";
    }

    const previewKeywords = ["-git-", "preview.", "staging."];
    if (hostname && previewKeywords.some((keyword) => hostname.includes(keyword))) {
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

function selectSecretKeyForMode(mode: StripeMode, accountAlias?: string | null): string | undefined {
  if (mode === "live") {
    const candidates = getEnvCandidatesForField("secretKey", mode, accountAlias);
    for (const envName of candidates) {
      const value = process.env[envName];
      if (typeof value === "string" && value.trim().length > 0) {
        const trimmed = value.trim();
        if (SECRET_KEY_PREFIXES[mode].some((prefix) => trimmed.startsWith(prefix))) {
          return trimmed;
        }
      }
    }
    return undefined;
  }

  const candidates = getEnvCandidatesForField("secretKey", mode, accountAlias);
  for (const envName of candidates) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      const trimmed = value.trim();
      if (SECRET_KEY_PREFIXES[mode].some((prefix) => trimmed.startsWith(prefix))) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function selectPublishableKeyForMode(mode: StripeMode, accountAlias?: string | null): string | undefined {
  const candidates = getEnvCandidatesForField("publishableKey", mode, accountAlias);
  for (const envName of candidates) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      const trimmed = value.trim();
      if (PUBLISHABLE_KEY_PREFIXES[mode].some((prefix) => trimmed.startsWith(prefix))) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function selectWebhookSecretForMode(mode: StripeMode, accountAlias?: string | null): string | undefined {
  const candidates = getEnvCandidatesForField("webhookSecret", mode, accountAlias);
  for (const envName of candidates) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      if (mode === "test" && envName === "STRIPE_WEBHOOK_SECRET") {
        emitWarning(
          "Using STRIPE_WEBHOOK_SECRET for test mode. Configure STRIPE_WEBHOOK_SECRET_TEST to avoid ambiguity.",
        );
      }
      return value.trim();
    }
  }
  return undefined;
}

export function getOptionalStripeSecretKey(input: StripeCredentialInput = "auto"): string | undefined {
  const { mode, accountAlias } = resolveCredentialInput(input);
  return selectSecretKeyForMode(mode, accountAlias);
}

export function requireStripeSecretKey(input: StripeCredentialInput = "auto"): string {
  const { mode, accountAlias } = resolveCredentialInput(input);
  const secret = selectSecretKeyForMode(mode, accountAlias);

  if (!secret) {
    throw new Error(
      mode === "live"
        ? "Missing Stripe live secret key. Set STRIPE_SECRET_KEY_LIVE or ensure STRIPE_SECRET_KEY contains an sk_live_* value."
        : "Missing Stripe test secret key. Set STRIPE_SECRET_KEY_TEST with an sk_test_* value."
    );
  }

  return secret;
}

export function getOptionalStripePublishableKey(input: StripeCredentialInput = "auto"): string | undefined {
  const { mode, accountAlias } = resolveCredentialInput(input);
  return selectPublishableKeyForMode(mode, accountAlias);
}

export function requireStripePublishableKey(input: StripeCredentialInput = "auto"): string {
  const { mode, accountAlias } = resolveCredentialInput(input);
  const publishableKey = selectPublishableKeyForMode(mode, accountAlias);

  if (!publishableKey) {
    throw new Error(
      mode === "live"
        ? "Missing Stripe live publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE or provide a pk_live_* value in NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
        : "Missing Stripe test publishable key. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST with a pk_test_* value."
    );
  }

  return publishableKey;
}

export function getOptionalStripeWebhookSecret(input: StripeCredentialInput = "auto"): string | undefined {
  const { mode, accountAlias } = resolveCredentialInput(input);
  return selectWebhookSecretForMode(mode, accountAlias);
}

export function getStripeMode(mode: StripeModeInput = "auto"): StripeMode {
  return resolveStripeMode(mode);
}

export function isStripeTestMode(): boolean {
  return resolveStripeMode("auto") === "test";
}

function selectPaymentConfigIdForMode(mode: StripeMode, accountAlias?: string | null): string | undefined {
  const candidates = getEnvCandidatesForField("paymentConfigId", mode, accountAlias);
  for (const envName of candidates) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function getOptionalStripePaymentConfigId(input: StripeCredentialInput = "auto"): string | undefined {
  const { mode, accountAlias } = resolveCredentialInput(input);
  return selectPaymentConfigIdForMode(mode, accountAlias);
}
