import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { createAccountSession, parseAccountSession } from "@/lib/account/auth";

const ORIGINAL_SECRET = process.env.ACCOUNT_SESSION_SECRET;

describe("account session helpers", () => {
  beforeEach(() => {
    process.env.ACCOUNT_SESSION_SECRET = "test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    if (ORIGINAL_SECRET) {
      process.env.ACCOUNT_SESSION_SECRET = ORIGINAL_SECRET;
    } else {
      delete process.env.ACCOUNT_SESSION_SECRET;
    }
    vi.useRealTimers();
  });

  it("creates and parses a valid session token", () => {
    const session = createAccountSession("account-123");

    expect(session).not.toBeNull();
    expect(session?.token).toBeDefined();
    expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const parsed = parseAccountSession(session?.token ?? "");
    expect(parsed).not.toBeNull();
    expect(parsed?.accountId).toBe("account-123");
  });

  it("returns null when secret is missing", () => {
    delete process.env.ACCOUNT_SESSION_SECRET;
    const session = createAccountSession("account-123");
    expect(session).toBeNull();
    expect(parseAccountSession("token")).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const session = createAccountSession("account-456");
    expect(session).not.toBeNull();

    const forged = `${session?.token}invalid`;
    expect(parseAccountSession(forged)).toBeNull();
  });

  it("expires tokens after 30 days", () => {
    const session = createAccountSession("account-789");
    expect(session).not.toBeNull();

    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

    expect(parseAccountSession(session?.token ?? "")).toBeNull();
  });
});
