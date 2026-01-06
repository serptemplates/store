import logger from "@/lib/logger";
import {
  createVerificationToken,
  createEmailChangeToken,
  findAccountByEmail,
  findAccountById,
  findActiveEmailChangeByCode,
  findActiveVerificationByCode,
  findActiveVerificationByToken,
  markAccountVerified,
  markEmailChangeTokenUsed,
  markVerificationTokenUsed,
  updateAccountEmail,
  recordAccountLogin,
  upsertAccount,
  type AccountRecord,
} from "@/lib/account/store";
import {
  createAccountSession,
  getAccountSessionCookieName,
  getAccountSessionCookieOptions,
  parseAccountSession,
  clearAccountSessionCookieOptions,
} from "@/lib/account/auth";
import { sendVerificationEmail } from "@/lib/account/email";
import { syncAccountLicensesFromGhl } from "@/lib/account/license-sync";
import { updateCheckoutSessionsCustomerEmail, updateOrdersCustomerEmail } from "@/lib/checkout";
import { normalizeEmail } from "@/lib/checkout/utils";
import { updateSerpAuthEmail, type SerpAuthEmailUpdateResult } from "@/lib/serp-auth/account-email";

export interface PurchaseAccountContext {
  email: string | null | undefined;
  name?: string | null;
  offerId?: string | null;
}

export async function ensureAccountForPurchase(context: PurchaseAccountContext) {
  if (!context.email) {
    return null;
  }

  const account = await upsertAccount({
    email: context.email,
    name: context.name ?? null,
  });

  if (!account) {
    return null;
  }

  if (account.status === "active") {
    logger.debug("account.purchase_existing_active", {
      email: account.email,
      offerId: context.offerId,
    });
    return { account, verification: null };
  }

  const verification = await createVerificationToken(account.id).catch((error) => {
    logger.error("account.verification_create_failed", {
      email: account.email,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (!verification) {
    return { account, verification: null };
  }

  const emailResult = await sendVerificationEmail({
    email: account.email,
    code: verification.code,
    token: verification.token,
    expiresAt: verification.expiresAt,
    offerId: context.offerId ?? null,
    customerName: account.name,
  });

  if (!emailResult.ok) {
    logger.error("account.verification_email_failed", {
      email: account.email,
      offerId: context.offerId,
      reason: emailResult.error,
    });
  }

  return { account, verification };
}

export async function requestAccountVerification(email: string, options?: { offerId?: string | null; name?: string | null; }) {
  const account = await upsertAccount({ email, name: options?.name ?? null });

  if (!account) {
    throw new Error("Unable to create account for verification");
  }

  const verification = await createVerificationToken(account.id);

  if (!verification) {
    throw new Error("Unable to generate verification token");
  }

  const emailResult = await sendVerificationEmail({
    email: account.email,
    code: verification.code,
    token: verification.token,
    expiresAt: verification.expiresAt,
    offerId: options?.offerId ?? null,
    customerName: account.name,
  });

  if (!emailResult.ok) {
    logger.error("account.verification_email_failed", {
      email: account.email,
      offerId: options?.offerId ?? null,
      reason: emailResult.error,
    });

    throw new Error(emailResult.error);
  }

  return {
    account,
    expiresAt: verification.expiresAt,
  };
}

export interface VerificationResult {
  account: AccountRecord;
  sessionToken: string | null;
  sessionExpiresAt: Date | null;
}

async function createSessionForAccount(account: AccountRecord): Promise<VerificationResult> {
  const session = createAccountSession(account.id);

  if (!session) {
    return {
      account,
      sessionToken: null,
      sessionExpiresAt: null,
    };
  }

  await recordAccountLogin(account.id);

  return {
    account,
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  };
}

export async function verifyAccountWithCode(email: string, code: string): Promise<VerificationResult> {
  const account = await findAccountByEmail(email);

  if (!account) {
    throw new Error("Account not found");
  }

  const verification = await findActiveVerificationByCode(account.id, code);

  if (!verification) {
    throw new Error("Invalid or expired verification code");
  }

  await markVerificationTokenUsed(verification.id);
  await markAccountVerified(account.id);

  const refreshedAccount = await findAccountById(account.id);
  const accountForSync = refreshedAccount ?? account;

  await syncAccountLicensesFromGhl(accountForSync).catch((error) => {
    logger.warn("account.ghl_sync.error", {
      email: accountForSync.email,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return createSessionForAccount(accountForSync);
}

export async function verifyAccountWithToken(token: string): Promise<VerificationResult> {
  const verification = await findActiveVerificationByToken(token);

  if (!verification) {
    throw new Error("Invalid or expired verification link");
  }

  const account = await findAccountById(verification.accountId);

  if (!account) {
    throw new Error("Account not found for verification token");
  }

  await markVerificationTokenUsed(verification.id);
  await markAccountVerified(account.id);

  const refreshedAccount = await findAccountById(account.id);
  const accountForSync = refreshedAccount ?? account;

  await syncAccountLicensesFromGhl(accountForSync).catch((error) => {
    logger.warn("account.ghl_sync.error", {
      email: accountForSync.email,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return createSessionForAccount(accountForSync);
}

export function buildSessionCookie({ sessionToken, sessionExpiresAt }: VerificationResult) {
  if (!sessionToken || !sessionExpiresAt) {
    return null;
  }

  return {
    name: getAccountSessionCookieName(),
    value: sessionToken,
    options: getAccountSessionCookieOptions(sessionExpiresAt),
  };
}

export function buildSessionClearCookie() {
  return {
    name: getAccountSessionCookieName(),
    value: "",
    options: clearAccountSessionCookieOptions(),
  };
}

export async function getAccountFromSessionCookie(cookieValue: string | undefined | null) {
  const parsed = parseAccountSession(cookieValue);

  if (!parsed) {
    return null;
  }

  return findAccountById(parsed.accountId);
}

export class AccountEmailUpdateError extends Error {
  status: number;
  code:
    | "email_in_use"
    | "serp_auth_missing"
    | "serp_auth_not_found"
    | "serp_auth_failed"
    | "store_update_failed";

  constructor(message: string, code: AccountEmailUpdateError["code"], status = 400) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class AccountEmailVerificationError extends Error {
  status: number;
  code: "invalid_code" | "email_mismatch" | "verification_missing";

  constructor(message: string, code: AccountEmailVerificationError["code"], status = 400) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type AccountEmailUpdateResult =
  | {
      status: "unchanged";
      account: AccountRecord;
    }
  | {
      status: "updated";
      account: AccountRecord;
      ordersUpdated: number;
      sessionsUpdated: number;
      serpAuth: SerpAuthEmailUpdateResult;
    };

export async function requestAccountEmailChange(
  account: AccountRecord,
  nextEmail: string,
): Promise<{ status: "unchanged" | "verification_sent"; pendingEmail: string; expiresAt: Date }> {
  const normalizedCurrent = normalizeEmail(account.email);
  const normalizedNext = normalizeEmail(nextEmail);

  if (normalizedCurrent === normalizedNext) {
    return {
      status: "unchanged",
      pendingEmail: account.email,
      expiresAt: new Date(),
    };
  }

  const existing = await findAccountByEmail(normalizedNext);
  if (existing && existing.id !== account.id) {
    throw new AccountEmailUpdateError(
      "That email is already linked to another account.",
      "email_in_use",
      409,
    );
  }

  logger.info("account.email_change_requested", {
    accountId: account.id,
    previousEmail: normalizedCurrent,
    nextEmail: normalizedNext,
  });

  const verification = await createEmailChangeToken(account.id, normalizedNext);

  if (!verification) {
    logger.error("account.email_change_token_failed", {
      accountId: account.id,
      previousEmail: normalizedCurrent,
      nextEmail: normalizedNext,
    });
    throw new AccountEmailUpdateError("Unable to start email verification.", "store_update_failed", 500);
  }

  const emailResult = await sendVerificationEmail({
    email: normalizedNext,
    code: verification.code,
    token: verification.token,
    expiresAt: verification.expiresAt,
    customerName: account.name,
    purpose: "email_change",
    verificationPath: null,
  });

  if (!emailResult.ok) {
    logger.error("account.email_change_email_failed", {
      accountId: account.id,
      previousEmail: normalizedCurrent,
      nextEmail: normalizedNext,
      reason: emailResult.error,
    });
    throw new AccountEmailUpdateError(emailResult.error, "store_update_failed", 502);
  }

  logger.info("account.email_change_email_sent", {
    accountId: account.id,
    nextEmail: normalizedNext,
    expiresAt: verification.expiresAt.toISOString(),
  });

  return {
    status: "verification_sent",
    pendingEmail: normalizedNext,
    expiresAt: verification.expiresAt,
  };
}

export async function updateAccountEmailForAccount(
  account: AccountRecord,
  nextEmail: string,
): Promise<AccountEmailUpdateResult> {
  const normalizedCurrent = normalizeEmail(account.email);
  const normalizedNext = normalizeEmail(nextEmail);

  if (normalizedCurrent === normalizedNext) {
    return { status: "unchanged", account };
  }

  const existing = await findAccountByEmail(normalizedNext);
  if (existing && existing.id !== account.id) {
    throw new AccountEmailUpdateError(
      "That email is already linked to another account.",
      "email_in_use",
      409,
    );
  }

  logger.info("account.email_update_started", {
    accountId: account.id,
    previousEmail: normalizedCurrent,
    nextEmail: normalizedNext,
  });

  const serpAuthResult = await updateSerpAuthEmail({
    previousEmail: normalizedCurrent,
    nextEmail: normalizedNext,
  });

  if (serpAuthResult.status === "skipped") {
    const message =
      serpAuthResult.reason === "missing_d1_config"
        ? "Serp-auth configuration is missing for email updates."
        : "We couldn't find this email in the authentication database.";
    const code =
      serpAuthResult.reason === "missing_d1_config"
        ? "serp_auth_missing"
        : "serp_auth_not_found";
    throw new AccountEmailUpdateError(message, code, 500);
  }

  if (serpAuthResult.status === "failed") {
    const isConflict = serpAuthResult.code === "email_in_use";
    throw new AccountEmailUpdateError(
      isConflict ? "That email is already linked to another account." : "Unable to update authentication email.",
      isConflict ? "email_in_use" : "serp_auth_failed",
      isConflict ? 409 : 502,
    );
  }

  try {
    const updatedAccount = await updateAccountEmail(account.id, normalizedNext);
    if (!updatedAccount) {
      throw new Error("Account update returned no data.");
    }

    const ordersUpdated = await updateOrdersCustomerEmail(normalizedCurrent, normalizedNext);
    const sessionsUpdated = await updateCheckoutSessionsCustomerEmail(normalizedCurrent, normalizedNext);

    logger.info("account.email_update_store_succeeded", {
      accountId: account.id,
      previousEmail: normalizedCurrent,
      nextEmail: normalizedNext,
      ordersUpdated,
      sessionsUpdated,
    });

    return {
      status: "updated",
      account: updatedAccount,
      ordersUpdated,
      sessionsUpdated,
      serpAuth: serpAuthResult,
    };
  } catch (error) {
    logger.error("account.email_update_store_failed", {
      accountId: account.id,
      previousEmail: normalizedCurrent,
      nextEmail: normalizedNext,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });

    const rollback = await updateSerpAuthEmail({
      previousEmail: normalizedNext,
      nextEmail: normalizedCurrent,
    });

    if (rollback.status !== "succeeded") {
      logger.error("account.email_update_rollback_failed", {
        accountId: account.id,
        previousEmail: normalizedNext,
        nextEmail: normalizedCurrent,
        rollbackStatus: rollback.status,
        rollbackReason: rollback.status === "skipped" ? rollback.reason : rollback.code,
      });
    } else {
      logger.info("account.email_update_rollback_succeeded", {
        accountId: account.id,
        previousEmail: normalizedNext,
        nextEmail: normalizedCurrent,
      });
    }

    throw new AccountEmailUpdateError(
      "Unable to update account email at this time.",
      "store_update_failed",
      500,
    );
  }
}

export async function verifyAccountEmailChange(
  account: AccountRecord,
  params: { email: string; code: string },
): Promise<AccountEmailUpdateResult> {
  const normalizedEmail = normalizeEmail(params.email);

  if (!params.code?.trim()) {
    throw new AccountEmailVerificationError(
      "Verification code is required.",
      "verification_missing",
      400,
    );
  }

  const verification = await findActiveEmailChangeByCode(account.id, params.code.trim());

  if (!verification) {
    logger.warn("account.email_change_code_invalid", {
      accountId: account.id,
      nextEmail: normalizedEmail,
    });
    throw new AccountEmailVerificationError(
      "That verification code is invalid or expired.",
      "invalid_code",
      400,
    );
  }

  if (normalizeEmail(verification.email) !== normalizedEmail) {
    logger.warn("account.email_change_code_mismatch", {
      accountId: account.id,
      expectedEmail: verification.email,
      providedEmail: normalizedEmail,
    });
    throw new AccountEmailVerificationError(
      "That code was issued for a different email.",
      "email_mismatch",
      400,
    );
  }

  logger.info("account.email_change_verified", {
    accountId: account.id,
    nextEmail: normalizedEmail,
  });

  const result = await updateAccountEmailForAccount(account, normalizedEmail);

  try {
    await markEmailChangeTokenUsed(verification.id);
  } catch (error) {
    logger.warn("account.email_change_token_mark_failed", {
      accountId: account.id,
      tokenId: verification.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }

  return result;
}
