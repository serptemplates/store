import { getStripeClient } from "@/lib/payments/stripe";
import logger from "@/lib/logger";

function isEnabled(): boolean {
  return String(process.env.STRIPE_ENTITLEMENTS_ENABLED).toLowerCase() === "true";
}

function normalizeFeatureKeys(features: unknown): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (typeof v !== "string") return;
    const trimmed = v.trim();
    if (!trimmed) return;
    out.push(trimmed.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase());
  };
  if (Array.isArray(features)) {
    for (const f of features) add(f);
  } else {
    add(features);
  }
  return Array.from(new Set(out));
}

export async function grantCustomerFeatures(customerId: string, features: unknown): Promise<void> {
  if (!isEnabled()) return;
  const keys = normalizeFeatureKeys(features);
  if (!customerId || keys.length === 0) return;

  try {
    const client = getStripeClient();
    const entitlements = resolveEntitlementsApi(client);
    if (!entitlements?.grants?.create) {
      logger.warn("stripe.entitlements_api_unavailable", { customerId, features: keys });
      return;
    }

    for (const feature of keys) {
      try {
        await entitlements.grants.create({
          customer: customerId,
          feature,
        });
        logger.info("stripe.entitlement_granted", { customerId, feature });
      } catch (error) {
        logger.warn("stripe.entitlement_grant_failed", {
          customerId,
          feature,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
      }
    }
  } catch (error) {
    logger.warn("stripe.entitlements_grant_unexpected_error", {
      customerId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}

export async function revokeCustomerFeatures(customerId: string, features: unknown): Promise<void> {
  if (!isEnabled()) return;
  const keys = normalizeFeatureKeys(features);
  if (!customerId || keys.length === 0) return;

  try {
    const client = getStripeClient();
    const entitlements = resolveEntitlementsApi(client);
    if (!entitlements?.grants?.list || !entitlements?.grants?.revoke) {
      logger.warn("stripe.entitlements_api_unavailable", { customerId, features: keys });
      return;
    }

    for (const feature of keys) {
      try {
        // Find existing grants for the feature
        const list = await entitlements.grants.list({ customer: customerId, feature, limit: 100 });
        for (const grant of list?.data ?? []) {
          try {
            await entitlements.grants.revoke(grant.id);
            logger.info("stripe.entitlement_revoked", { customerId, feature, grantId: grant.id });
          } catch (error) {
            logger.warn("stripe.entitlement_revoke_failed", {
              customerId,
              feature,
              grantId: grant.id,
              error: error instanceof Error ? { message: error.message, name: error.name } : error,
            });
          }
        }
      } catch (error) {
        logger.warn("stripe.entitlement_list_failed", {
          customerId,
          feature,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
      }
    }
  } catch (error) {
    logger.warn("stripe.entitlements_revoke_unexpected_error", {
      customerId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}

// Minimal, type-safe accessors for the (optional) Entitlements API surface
type GrantsApi = {
  create?: (params: { customer: string; feature: string }) => Promise<unknown>;
  list?: (params: { customer: string; feature?: string; limit?: number }) => Promise<{ data?: Array<{ id: string }> }>;
  revoke?: (grantId: string) => Promise<unknown>;
};

type EntitlementsApi = { grants?: GrantsApi };

function resolveEntitlementsApi(raw: unknown): EntitlementsApi | null {
  if (!raw || typeof raw !== "object") return null;
  const entitlements = (raw as Record<string, unknown>)["entitlements"];
  if (!entitlements || typeof entitlements !== "object") return null;

  const grantsRaw = (entitlements as Record<string, unknown>)["grants"];
  if (!grantsRaw || typeof grantsRaw !== "object") return { grants: undefined };

  const grantsObj = grantsRaw as Record<string, unknown>;
  const grants: GrantsApi = {};

  if (typeof grantsObj["create"] === "function") {
    grants.create = grantsObj["create"] as GrantsApi["create"];
  }
  if (typeof grantsObj["list"] === "function") {
    grants.list = grantsObj["list"] as GrantsApi["list"];
  }
  if (typeof grantsObj["revoke"] === "function") {
    grants.revoke = grantsObj["revoke"] as GrantsApi["revoke"];
  }

  return { grants };
}

// Optional feature management surface
type FeaturesApi = {
  create?: (params: { name: string; lookup_key?: string }) => Promise<unknown>;
  list?: (params: { limit?: number }) => Promise<{ data?: Array<{ id: string; name?: string; lookup_key?: string }> }>;
};

type FullEntitlementsApi = EntitlementsApi & { features?: FeaturesApi };

function resolveFullEntitlementsApi(raw: unknown): FullEntitlementsApi | null {
  const base = resolveEntitlementsApi(raw);
  if (!base) return null;
  const entitlements = (raw as Record<string, unknown>)["entitlements"] as Record<string, unknown>;
  const featuresRaw = entitlements?.["features"];
  const features: FeaturesApi | undefined = typeof featuresRaw === "object" && featuresRaw
    ? {
        create: typeof (featuresRaw as Record<string, unknown>)["create"] === "function"
          ? ((featuresRaw as Record<string, unknown>)["create"] as FeaturesApi["create"])
          : undefined,
        list: typeof (featuresRaw as Record<string, unknown>)["list"] === "function"
          ? ((featuresRaw as Record<string, unknown>)["list"] as FeaturesApi["list"])
          : undefined,
      }
    : undefined;
  return { ...base, features };
}

function titleize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (_m, c: string) => c.toUpperCase());
}

export async function ensureFeaturesExist(features: unknown): Promise<void> {
  if (!isEnabled()) return;
  const keys = normalizeFeatureKeys(features);
  if (keys.length === 0) return;

  try {
    const client = getStripeClient();
    const entitlements = resolveFullEntitlementsApi(client);
    const api = entitlements?.features;
    if (!api?.create) {
      // Can’t manage features programmatically on this account/SDK; skip silently
      logger.debug("stripe.entitlements_features_api_unavailable", { keys });
      return;
    }

    // Best-effort pre-existence check (list may be limited)
    const existing = new Set<string>();
    try {
      if (api.list) {
        const page = await api.list({ limit: 100 });
        for (const f of page?.data ?? []) {
          const lk = (f.lookup_key || f.name || "").toLowerCase();
          if (lk) existing.add(lk);
        }
      }
    } catch {
      // ignore listing failures; we’ll create and rely on server-side idempotency/constraints
    }

    for (const key of keys) {
      const lookup = key.toLowerCase();
      if (existing.has(lookup)) continue;
      try {
        await api.create({ name: titleize(key), lookup_key: lookup });
        logger.info("stripe.feature_created", { feature: key });
      } catch (error) {
        // If it already exists or creation isn’t allowed, just log and continue
        logger.debug("stripe.feature_create_failed", {
          feature: key,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
      }
    }
  } catch (error) {
    logger.debug("stripe.ensure_features_exist_unexpected_error", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
