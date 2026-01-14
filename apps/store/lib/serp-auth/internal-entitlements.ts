export type EntitlementsLookupResult =
  | { status: "skipped"; reason: "missing_internal_secret" }
  | { status: "ok"; entitlements: string[]; customerExists: boolean }
  | { status: "error"; error: { message: string; name?: string } };

export type EntitlementsCatalogResult =
  | { status: "skipped"; reason: "missing_internal_secret" }
  | { status: "ok"; aliasMap: Map<string, string> }
  | { status: "error"; error: { message: string; name?: string } };

export type EntitlementAliasRow = {
  alias?: string | null;
  canonical?: string | null;
};

const ALIAS_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAliasMap: Map<string, string> | null = null;
let cachedAliasMapExpiresAt = 0;

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

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildAliasMap(aliases: EntitlementAliasRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of aliases) {
    const alias = typeof row.alias === "string" ? normalizeKey(row.alias) : "";
    const canonical = typeof row.canonical === "string" ? normalizeKey(row.canonical) : "";
    if (!alias || !canonical) continue;
    map.set(alias, canonical);
  }
  return map;
}

async function fetchEntitlementAliasMap(): Promise<EntitlementsCatalogResult> {
  const secret = getInternalSecret();
  if (!secret) {
    return { status: "skipped", reason: "missing_internal_secret" };
  }

  if (cachedAliasMap && Date.now() < cachedAliasMapExpiresAt) {
    return { status: "ok", aliasMap: cachedAliasMap };
  }

  const url = `${getBaseUrl()}/internal/entitlements/catalog`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "x-serp-internal-secret": secret,
      },
    });

    const text = await response.text().catch(() => "");
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : `HTTP ${response.status}`;
      return { status: "error", error: { message } };
    }

    const payload = (json && typeof json === "object" ? (json as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const aliasesRaw = Array.isArray(payload.aliases) ? payload.aliases : [];
    const aliasRows = aliasesRaw.filter((row): row is EntitlementAliasRow => Boolean(row && typeof row === "object"));
    const aliasMap = buildAliasMap(aliasRows);

    cachedAliasMap = aliasMap;
    cachedAliasMapExpiresAt = Date.now() + ALIAS_CACHE_TTL_MS;

    return { status: "ok", aliasMap };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
    };
  }
}

function canonicalizeEntitlements(entitlements: string[], aliasMap: Map<string, string>): string[] {
  const out = new Set<string>();
  for (const entitlement of entitlements) {
    if (typeof entitlement !== "string") continue;
    const normalized = normalizeKey(entitlement);
    if (!normalized) continue;
    const canonical = aliasMap.get(normalized) ?? normalized;
    out.add(canonical);
  }
  return Array.from(out);
}

export async function fetchSerpAuthEntitlementsByEmail(email: string): Promise<EntitlementsLookupResult> {
  const secret = getInternalSecret();
  if (!secret) {
    return { status: "skipped", reason: "missing_internal_secret" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { status: "ok", entitlements: [], customerExists: false };
  }

  const url = `${getBaseUrl()}/internal/entitlements/by-email`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-serp-internal-secret": secret,
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const text = await response.text().catch(() => "");
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        json && typeof json === "object" && "error" in json && typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : `HTTP ${response.status}`;
      return { status: "error", error: { message } };
    }

    const payload = (json && typeof json === "object" ? (json as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const entitlementsRaw = payload.entitlements;
    const entitlements = Array.isArray(entitlementsRaw)
      ? entitlementsRaw.filter((e): e is string => typeof e === "string").map((e) => e.trim()).filter(Boolean)
      : [];

    let canonicalEntitlements = entitlements;
    if (canonicalEntitlements.length > 0) {
      const aliasResult = await fetchEntitlementAliasMap();
      if (aliasResult.status === "ok" && aliasResult.aliasMap.size > 0) {
        canonicalEntitlements = canonicalizeEntitlements(canonicalEntitlements, aliasResult.aliasMap);
      }
    }

    const customerExists = payload.customerExists === true;

    return { status: "ok", entitlements: canonicalEntitlements, customerExists };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
    };
  }
}
