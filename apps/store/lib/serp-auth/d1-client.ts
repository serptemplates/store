import logger from "@/lib/logger";

export type SerpAuthConfig = {
  apiToken: string;
  accountId: string;
  databaseId: string;
};

export type UpsertEntitlementsParams = {
  email: string;
  entitlements: string[];
  context?: Record<string, unknown>;
};

export type UpsertEntitlementsResult = {
  ok: boolean;
  reason?: string;
  status?: number;
};

function readConfig(): SerpAuthConfig | null {
  const apiToken = process.env.SERP_AUTH_CF_API_TOKEN;
  const accountId = process.env.SERP_AUTH_CF_ACCOUNT_ID;
  const databaseId = process.env.SERP_AUTH_CF_D1_DATABASE_ID;

  if (!apiToken || !accountId || !databaseId) {
    logger.debug("serp_auth.d1_config_missing", {
      hasToken: Boolean(apiToken),
      hasAccountId: Boolean(accountId),
      hasDatabaseId: Boolean(databaseId),
    });
    return null;
  }

  return { apiToken, accountId, databaseId };
}

async function executeStatement(
  endpoint: string,
  apiToken: string,
  statement: string,
  params: string[],
): Promise<{ ok: boolean; status: number; errors?: unknown }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ sql: statement, params }),
  });

  const body = (await response.json().catch(() => null)) as { success?: boolean; errors?: unknown } | null;
  return { ok: Boolean(body?.success && response.ok), status: response.status, errors: body?.errors };
}

export async function upsertSerpAuthEntitlements(
  params: UpsertEntitlementsParams,
): Promise<UpsertEntitlementsResult> {
  const config = readConfig();
  const normalizedEmail = params.email.trim().toLowerCase();
  const entitlements = Array.from(new Set(params.entitlements.map((entry) => entry.trim()).filter(Boolean)));

  if (!normalizedEmail || entitlements.length === 0) {
    return { ok: false, reason: "missing_email_or_entitlements" };
  }

  if (!config) {
    logger.warn("serp_auth.d1_config_unset", {
      email: normalizedEmail,
      entitlements,
      context: params.context,
    });
    return { ok: false, reason: "config_missing" };
  }

  const endpoint = new URL(
    `/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
    "https://api.cloudflare.com",
  ).toString();

  try {
    const customerStmt =
      "INSERT INTO customers (id, email, status, verified_at, created_at, updated_at) " +
      "VALUES (lower(hex(randomblob(16))), lower(?), 'active', unixepoch(), unixepoch(), unixepoch()) " +
      "ON CONFLICT(email) DO UPDATE SET status='active', verified_at=COALESCE(verified_at, unixepoch()), updated_at=unixepoch();";

    const customerResult = await executeStatement(endpoint, config.apiToken, customerStmt, [normalizedEmail]);
    if (!customerResult.ok) {
      logger.warn("serp_auth.d1_upsert_failed", {
        email: normalizedEmail,
        entitlements,
        status: customerResult.status,
        errors: customerResult.errors,
        context: params.context,
      });
      return { ok: false, status: customerResult.status, reason: "request_failed" };
    }

    for (const entitlement of entitlements) {
      const entStmt =
        "INSERT INTO entitlements (customer_id, name, is_revoked, expires_at, created_at, updated_at) " +
        "VALUES ((SELECT id FROM customers WHERE lower(email)=lower(?)), ?, 0, NULL, unixepoch(), unixepoch()) " +
        "ON CONFLICT(customer_id, name) DO UPDATE SET is_revoked=0, expires_at=NULL, updated_at=unixepoch();";

      const entResult = await executeStatement(endpoint, config.apiToken, entStmt, [normalizedEmail, entitlement]);
      if (!entResult.ok) {
        logger.warn("serp_auth.d1_upsert_failed", {
          email: normalizedEmail,
          entitlements,
          failedEntitlement: entitlement,
          status: entResult.status,
          errors: entResult.errors,
          context: params.context,
        });
        return { ok: false, status: entResult.status, reason: "request_failed" };
      }
    }

    logger.info("serp_auth.d1_upsert_success", {
      email: normalizedEmail,
      entitlements,
      context: params.context,
    });
    return { ok: true };
  } catch (error) {
    logger.error("serp_auth.d1_upsert_exception", {
      email: normalizedEmail,
      entitlements,
      error: error instanceof Error ? error.message : String(error),
      context: params.context,
    });
    return { ok: false, reason: "exception" };
  }
}
