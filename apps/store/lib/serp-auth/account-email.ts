import logger from "@/lib/logger";

type D1Config = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

type D1QueryResponse = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{ results?: Array<Record<string, unknown>>; success?: boolean }>;
};

type SerpAuthEmailUpdateSuccess = {
  status: "succeeded";
  customerId: string;
  userId: string | null;
  previousEmail: string;
  nextEmail: string;
};

type SerpAuthEmailUpdateSkipped = {
  status: "skipped";
  reason: "missing_d1_config" | "missing_email" | "customer_not_found";
};

type SerpAuthEmailUpdateFailed = {
  status: "failed";
  code: "email_in_use" | "request_failed";
  error?: { message: string; name?: string } | null;
};

export type SerpAuthEmailUpdateResult =
  | SerpAuthEmailUpdateSuccess
  | SerpAuthEmailUpdateSkipped
  | SerpAuthEmailUpdateFailed;

function getD1Config(): D1Config | null {
  const accountId = process.env.SERP_AUTH_CF_ACCOUNT_ID ?? "";
  const databaseId = process.env.SERP_AUTH_CF_D1_DATABASE_ID ?? "";
  const apiToken = process.env.SERP_AUTH_CF_API_TOKEN ?? "";
  if (!accountId.trim() || !databaseId.trim() || !apiToken.trim()) {
    return null;
  }
  return {
    accountId: accountId.trim(),
    databaseId: databaseId.trim(),
    apiToken: apiToken.trim(),
  };
}

function maskValue(value: string, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "*".repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

type D1Param = string | number | null;

async function queryD1(
  config: D1Config,
  sql: string,
  params?: readonly D1Param[],
): Promise<Array<Record<string, unknown>>> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const body = params && params.length > 0 ? { sql, params } : { sql };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as D1QueryResponse | null;
  if (!response.ok || !payload || !payload.success) {
    const message = payload?.errors?.map((err) => err.message).filter(Boolean).join("; ");
    throw new Error(`D1 query failed (${response.status}): ${message || "unknown error"}`);
  }
  const result = payload.result?.[0];
  if (result?.success === false) {
    throw new Error("D1 query failed (result not successful).");
  }
  return result?.results ?? [];
}

export async function updateSerpAuthEmail({
  previousEmail,
  nextEmail,
}: {
  previousEmail: string;
  nextEmail: string;
}): Promise<SerpAuthEmailUpdateResult> {
  const config = getD1Config();
  if (!config) {
    logger.warn("serp_auth.email_update_skipped", {
      reason: "missing_d1_config",
      previousEmail,
      nextEmail,
    });
    return { status: "skipped", reason: "missing_d1_config" };
  }

  const normalizedPrevious = previousEmail.trim().toLowerCase();
  const normalizedNext = nextEmail.trim().toLowerCase();

  if (!normalizedPrevious || !normalizedNext) {
    logger.warn("serp_auth.email_update_skipped", {
      reason: "missing_email",
      previousEmail,
      nextEmail,
    });
    return { status: "skipped", reason: "missing_email" };
  }

  logger.info("serp_auth.email_update_started", {
    previousEmail: normalizedPrevious,
    nextEmail: normalizedNext,
    accountId: maskValue(config.accountId),
    databaseId: maskValue(config.databaseId),
  });

  try {
    const customerRows = await queryD1(
      config,
      "SELECT id, email, better_auth_user_id AS betterAuthUserId FROM customers WHERE email = ? LIMIT 1;",
      [normalizedPrevious],
    );

    const customer = customerRows[0];
    if (!customer?.id) {
      logger.warn("serp_auth.email_update_skipped", {
        reason: "customer_not_found",
        previousEmail: normalizedPrevious,
        nextEmail: normalizedNext,
      });
      return { status: "skipped", reason: "customer_not_found" };
    }

    const customerId = String(customer.id);
    const userId = customer.betterAuthUserId ? String(customer.betterAuthUserId) : null;

    const conflictRows = await queryD1(
      config,
      "SELECT id FROM customers WHERE email = ? LIMIT 1;",
      [normalizedNext],
    );
    if (conflictRows.length > 0 && String(conflictRows[0]?.id ?? "") !== customerId) {
      logger.warn("serp_auth.email_update_conflict", {
        previousEmail: normalizedPrevious,
        nextEmail: normalizedNext,
        customerId,
      });
      return {
        status: "failed",
        code: "email_in_use",
        error: { message: "Email already exists in serp-auth." },
      };
    }

    await queryD1(
      config,
      "UPDATE customers SET email = ? WHERE id = ?;",
      [normalizedNext, customerId],
    );

    if (userId) {
      await queryD1(
        config,
        "UPDATE user SET email = ?, updatedAt = datetime('now') WHERE id = ?;",
        [normalizedNext, userId],
      );
    }

    await queryD1(
      config,
      "UPDATE auth_events SET email = ? WHERE customer_id = ?;",
      [normalizedNext, customerId],
    );

    await queryD1(
      config,
      "UPDATE license_redemptions SET email = ? WHERE email = ?;",
      [normalizedNext, normalizedPrevious],
    );

    const verifyRows = await queryD1(
      config,
      "SELECT email FROM customers WHERE id = ? LIMIT 1;",
      [customerId],
    );
    const verifiedEmail = verifyRows[0]?.email ? String(verifyRows[0].email) : null;

    logger.info("serp_auth.email_update_succeeded", {
      customerId,
      userId,
      previousEmail: normalizedPrevious,
      nextEmail: normalizedNext,
      verifiedEmail,
    });

    return {
      status: "succeeded",
      customerId,
      userId,
      previousEmail: normalizedPrevious,
      nextEmail: normalizedNext,
    };
  } catch (error) {
    logger.error("serp_auth.email_update_failed", {
      previousEmail: normalizedPrevious,
      nextEmail: normalizedNext,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return {
      status: "failed",
      code: "request_failed",
      error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
    };
  }
}
