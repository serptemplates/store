import { setTimeout as sleep } from "node:timers/promises";

import logger from "@/lib/logger";

// Keep webhook latency bounded; Stripe will retry on failures.
const ENTITLEMENTS_GRANT_MAX_ATTEMPTS = 2;
const ENTITLEMENTS_GRANT_RETRY_DELAY_MS = 500;
const ENTITLEMENTS_GRANT_TIMEOUT_MS = 5_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429]);

export type SerpAuthEntitlementsContext = {
  provider?: "stripe";
  providerEventId?: string | null;
  providerSessionId?: string | null;
};

export type SerpAuthEntitlementsMetadata = Record<string, unknown>;

export type SerpAuthEntitlementsGrantInput = {
  email: string;
  entitlements: string[];
  metadata?: SerpAuthEntitlementsMetadata;
  context?: SerpAuthEntitlementsContext;
};

export type SerpAuthEntitlementsGrantResult =
  | {
      status: "skipped";
      reason: "missing_internal_secret" | "missing_email_or_entitlements";
    }
  | {
      status: "failed";
      httpStatus: number | null;
      error?: { message: string; name?: string } | null;
      responseBody?: string | null;
    }
  | {
      status: "succeeded";
      httpStatus: number;
    };

function getBaseUrl(): string {
  const raw = process.env.SERP_AUTH_BASE_URL ?? "https://auth.serp.co";
  return raw.replace(/\/+$/, "");
}

function getInternalSecret(): string | null {
  const secret =
    process.env.INTERNAL_ENTITLEMENTS_TOKEN ??
    process.env.SERP_AUTH_INTERNAL_SECRET ??
    "";
  return secret.trim().length > 0 ? secret.trim() : null;
}

function normalizeEntitlements(entitlements: string[]): string[] {
  const unique = new Set<string>();
  for (const entitlement of entitlements) {
    const trimmed = entitlement.trim();
    if (!trimmed) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status) || status >= 500;
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("name" in error && typeof error.name === "string" && error.name === "AbortError") return true;
  if ("name" in error && typeof error.name === "string" && error.name === "TypeError") return true;
  return false;
}

export async function grantSerpAuthEntitlements(
  input: SerpAuthEntitlementsGrantInput,
): Promise<SerpAuthEntitlementsGrantResult> {
  const secret = getInternalSecret();
  if (!secret) {
    logger.warn("serp_auth.entitlements_grant_skipped", {
      reason: "missing_internal_secret",
      email: input.email,
      entitlements: input.entitlements,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    });
    return { status: "skipped", reason: "missing_internal_secret" };
  }

  const entitlements = normalizeEntitlements(input.entitlements);
  if (!input.email || entitlements.length === 0) {
    logger.debug("serp_auth.entitlements_grant_skipped", {
      reason: "missing_email_or_entitlements",
      email: input.email,
      entitlements,
    });
    return { status: "skipped", reason: "missing_email_or_entitlements" };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/internal/entitlements/grant`;

  const metadata = input.metadata ?? undefined;

  for (let attempt = 1; attempt <= ENTITLEMENTS_GRANT_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENTITLEMENTS_GRANT_TIMEOUT_MS);

    logger.info("serp_auth.entitlements_grant_started", {
      url,
      attempt,
      maxAttempts: ENTITLEMENTS_GRANT_MAX_ATTEMPTS,
      email: input.email,
      entitlements,
      metadataKeys: metadata ? Object.keys(metadata) : null,
      timeoutMs: ENTITLEMENTS_GRANT_TIMEOUT_MS,
      provider: input.context?.provider,
      providerEventId: input.context?.providerEventId ?? null,
      providerSessionId: input.context?.providerSessionId ?? null,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-serp-internal-secret": secret,
        },
        body: JSON.stringify({
          email: input.email,
          entitlements,
          ...(metadata ? { metadata } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        const retryable = isRetryableStatus(response.status);

        if (retryable && attempt < ENTITLEMENTS_GRANT_MAX_ATTEMPTS) {
          const delay = ENTITLEMENTS_GRANT_RETRY_DELAY_MS * 2 ** (attempt - 1);
          logger.warn("serp_auth.entitlements_grant_retry", {
            url,
            attempt,
            maxAttempts: ENTITLEMENTS_GRANT_MAX_ATTEMPTS,
            delayMs: delay,
            status: response.status,
            statusText: response.statusText,
            email: input.email,
            entitlements,
            metadataKeys: metadata ? Object.keys(metadata) : null,
            provider: input.context?.provider,
            providerEventId: input.context?.providerEventId ?? null,
            providerSessionId: input.context?.providerSessionId ?? null,
          });
          await sleep(delay);
          continue;
        }

        logger.error("serp_auth.entitlements_grant_failed", {
          url,
          status: response.status,
          statusText: response.statusText,
          body: bodyText.slice(0, 1_000),
          email: input.email,
          entitlements,
          metadataKeys: metadata ? Object.keys(metadata) : null,
          provider: input.context?.provider,
          providerEventId: input.context?.providerEventId ?? null,
          providerSessionId: input.context?.providerSessionId ?? null,
        });
        return {
          status: "failed",
          httpStatus: response.status,
          responseBody: bodyText.slice(0, 1_000),
        };
      }

      logger.info("serp_auth.entitlements_grant_succeeded", {
        url,
        status: response.status,
        attempt,
        maxAttempts: ENTITLEMENTS_GRANT_MAX_ATTEMPTS,
        email: input.email,
        entitlements,
        metadataKeys: metadata ? Object.keys(metadata) : null,
        provider: input.context?.provider,
        providerEventId: input.context?.providerEventId ?? null,
        providerSessionId: input.context?.providerSessionId ?? null,
      });

      return { status: "succeeded", httpStatus: response.status };
    } catch (error) {
      const retryable = isRetryableError(error);

      if (retryable && attempt < ENTITLEMENTS_GRANT_MAX_ATTEMPTS) {
        const delay = ENTITLEMENTS_GRANT_RETRY_DELAY_MS * 2 ** (attempt - 1);
        logger.warn("serp_auth.entitlements_grant_retry", {
          url,
          attempt,
          maxAttempts: ENTITLEMENTS_GRANT_MAX_ATTEMPTS,
          delayMs: delay,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
          email: input.email,
          entitlements,
          metadataKeys: metadata ? Object.keys(metadata) : null,
          provider: input.context?.provider,
          providerEventId: input.context?.providerEventId ?? null,
          providerSessionId: input.context?.providerSessionId ?? null,
        });
        await sleep(delay);
        continue;
      }

      logger.error("serp_auth.entitlements_grant_failed", {
        url,
        error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
        email: input.email,
        entitlements,
        metadataKeys: metadata ? Object.keys(metadata) : null,
        provider: input.context?.provider,
        providerEventId: input.context?.providerEventId ?? null,
        providerSessionId: input.context?.providerSessionId ?? null,
      });

      return {
        status: "failed",
        httpStatus: null,
        error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    status: "failed",
    httpStatus: null,
    error: { message: "Entitlements grant exhausted retries" },
  };
}

export type SerpAuthEntitlementsRevokeInput = {
  email: string;
  entitlements: string[];
  metadata?: SerpAuthEntitlementsMetadata;
  context?: SerpAuthEntitlementsContext;
};

export type SerpAuthEntitlementsRevokeAllInput = {
  email: string;
  metadata?: SerpAuthEntitlementsMetadata;
  context?: SerpAuthEntitlementsContext;
};

export async function revokeSerpAuthEntitlements(input: SerpAuthEntitlementsRevokeInput): Promise<void> {
  const secret = getInternalSecret();
  if (!secret) {
    logger.debug("serp_auth.entitlements_revoke_skipped", {
      reason: "missing_internal_secret",
      email: input.email,
      entitlements: input.entitlements,
    });
    return;
  }

  const entitlements = normalizeEntitlements(input.entitlements);
  if (!input.email || entitlements.length === 0) {
    logger.debug("serp_auth.entitlements_revoke_skipped", {
      reason: "missing_email_or_entitlements",
      email: input.email,
      entitlements,
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/internal/entitlements/revoke`;

  const controller = new AbortController();
  const timeoutMs = 15_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const metadata = input.metadata ?? undefined;

  logger.info("serp_auth.entitlements_revoke_started", {
    url,
    email: input.email,
    entitlements,
    metadataKeys: metadata ? Object.keys(metadata) : null,
    timeoutMs,
    provider: input.context?.provider,
    providerEventId: input.context?.providerEventId ?? null,
    providerSessionId: input.context?.providerSessionId ?? null,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-serp-internal-secret": secret,
      },
      body: JSON.stringify({
        email: input.email,
        entitlements,
        ...(metadata ? { metadata } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logger.error("serp_auth.entitlements_revoke_failed", {
        url,
        status: response.status,
        statusText: response.statusText,
        body: bodyText.slice(0, 1_000),
        email: input.email,
        entitlements,
        metadataKeys: metadata ? Object.keys(metadata) : null,
        provider: input.context?.provider,
        providerEventId: input.context?.providerEventId ?? null,
        providerSessionId: input.context?.providerSessionId ?? null,
      });
      return;
    }

    logger.info("serp_auth.entitlements_revoke_succeeded", {
      url,
      status: response.status,
      email: input.email,
      entitlements,
      metadataKeys: metadata ? Object.keys(metadata) : null,
      provider: input.context?.provider,
      providerEventId: input.context?.providerEventId ?? null,
      providerSessionId: input.context?.providerSessionId ?? null,
    });
  } catch (error) {
    logger.error("serp_auth.entitlements_revoke_failed", {
      url,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
      email: input.email,
      entitlements,
      metadataKeys: metadata ? Object.keys(metadata) : null,
      provider: input.context?.provider,
      providerEventId: input.context?.providerEventId ?? null,
      providerSessionId: input.context?.providerSessionId ?? null,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function revokeAllSerpAuthEntitlements(
  input: SerpAuthEntitlementsRevokeAllInput,
): Promise<void> {
  const secret = getInternalSecret();
  if (!secret) {
    logger.debug("serp_auth.entitlements_revoke_all_skipped", {
      reason: "missing_internal_secret",
      email: input.email,
    });
    return;
  }

  if (!input.email) {
    logger.debug("serp_auth.entitlements_revoke_all_skipped", {
      reason: "missing_email",
      email: input.email,
    });
    return;
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/internal/entitlements/revoke`;

  const controller = new AbortController();
  const timeoutMs = 15_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const metadata = input.metadata ?? undefined;

  logger.info("serp_auth.entitlements_revoke_all_started", {
    url,
    email: input.email,
    metadataKeys: metadata ? Object.keys(metadata) : null,
    timeoutMs,
    provider: input.context?.provider,
    providerEventId: input.context?.providerEventId ?? null,
    providerSessionId: input.context?.providerSessionId ?? null,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-serp-internal-secret": secret,
      },
      body: JSON.stringify({
        email: input.email,
        ...(metadata ? { metadata } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logger.error("serp_auth.entitlements_revoke_all_failed", {
        url,
        status: response.status,
        statusText: response.statusText,
        body: bodyText.slice(0, 1_000),
        email: input.email,
        metadataKeys: metadata ? Object.keys(metadata) : null,
        provider: input.context?.provider,
        providerEventId: input.context?.providerEventId ?? null,
        providerSessionId: input.context?.providerSessionId ?? null,
      });
      return;
    }

    logger.info("serp_auth.entitlements_revoke_all_succeeded", {
      url,
      status: response.status,
      email: input.email,
      metadataKeys: metadata ? Object.keys(metadata) : null,
      provider: input.context?.provider,
      providerEventId: input.context?.providerEventId ?? null,
      providerSessionId: input.context?.providerSessionId ?? null,
    });
  } catch (error) {
    logger.error("serp_auth.entitlements_revoke_all_failed", {
      url,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
      email: input.email,
      metadataKeys: metadata ? Object.keys(metadata) : null,
      provider: input.context?.provider,
      providerEventId: input.context?.providerEventId ?? null,
      providerSessionId: input.context?.providerSessionId ?? null,
    });
  } finally {
    clearTimeout(timeout);
  }
}
