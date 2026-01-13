type EntitlementsLookupResult =
  | { status: "skipped"; reason: "missing_internal_secret" }
  | { status: "ok"; entitlements: string[]; customerExists: boolean }
  | { status: "error"; error: { message: string; name?: string } };

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

    const customerExists = payload.customerExists === true;

    return { status: "ok", entitlements, customerExists };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
    };
  }
}
