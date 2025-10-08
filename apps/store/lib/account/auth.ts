import { createHmac } from "node:crypto";

import logger from "@/lib/logger";

const SESSION_COOKIE_NAME = "store_account_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionPayload {
  accountId: string;
  issuedAt: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.ACCOUNT_SESSION_SECRET ?? process.env.SESSION_SECRET ?? null;

  if (!secret) {
    logger.error("account_session.missing_secret", {
      message: "ACCOUNT_SESSION_SECRET not configured; account sessions disabled",
    });
  }

  return secret;
}

function signPayload(payload: SessionPayload, secret: string): string {
  const base = `${payload.accountId}.${payload.issuedAt}`;
  return createHmac("sha256", secret).update(base).digest("base64url");
}

export interface AccountSession {
  token: string;
  expiresAt: Date;
  payload: SessionPayload;
}

export function createAccountSession(accountId: string): AccountSession | null {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const payload: SessionPayload = {
    accountId,
    issuedAt: Date.now(),
  };

  const signature = signPayload(payload, secret);
  const encoded = Buffer.from(`${payload.accountId}.${payload.issuedAt}.${signature}`).toString("base64url");

  return {
    token: encoded,
    expiresAt: new Date(payload.issuedAt + SESSION_TTL_MS),
    payload,
  };
}

export interface ParsedAccountSession {
  accountId: string;
  issuedAt: number;
}

export function parseAccountSession(token: string | undefined | null): ParsedAccountSession | null {
  if (!token) {
    return null;
  }

  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  let decoded: string;

  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch (error) {
    logger.warn("account_session.decode_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const [accountId, issuedAtRaw, signature] = decoded.split(".");

  if (!accountId || !issuedAtRaw || !signature) {
    return null;
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt)) {
    return null;
  }

  const expectedSignature = signPayload({ accountId, issuedAt }, secret);

  if (signature !== expectedSignature) {
    logger.warn("account_session.signature_mismatch", { accountId });
    return null;
  }

  if (issuedAt + SESSION_TTL_MS < Date.now()) {
    return null;
  }

  return { accountId, issuedAt };
}

export function getAccountSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getAccountSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    expires: expiresAt,
    path: "/",
  };
}

export function clearAccountSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    expires: new Date(0),
    path: "/",
  };
}
