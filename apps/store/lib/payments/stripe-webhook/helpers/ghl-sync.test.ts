import { beforeEach, describe, expect, it, vi } from "vitest";

const { syncOrderWithGhlMock } = vi.hoisted(() => ({
  syncOrderWithGhlMock: vi.fn(),
}));

const { loggerWarnMock } = vi.hoisted(() => ({
  loggerWarnMock: vi.fn(),
}));

vi.mock("node:timers/promises", () => {
  const setTimeoutMock = vi.fn().mockResolvedValue(undefined);
  return {
    setTimeout: setTimeoutMock,
    default: { setTimeout: setTimeoutMock },
  };
});

vi.mock("@/lib/ghl-client", () => {
  class MockGhlRequestError extends Error {
    status?: number;
    body?: string;

    constructor(message: string, status: number, body?: string) {
      super(message);
      this.name = "GhlRequestError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    syncOrderWithGhl: syncOrderWithGhlMock,
    GhlRequestError: MockGhlRequestError,
    RETRYABLE_STATUS_CODES: new Set([408, 429, 500, 502, 503, 504]),
  };
});

import {
  GHL_SYNC_RETRY_DELAY_MS,
  MAX_GHL_SYNC_ATTEMPTS,
  syncOrderWithGhlWithRetry,
} from "./ghl-sync";
import { GhlRequestError } from "@/lib/ghl-client";
import { setTimeout as sleep } from "node:timers/promises";

vi.mock("@/lib/logger", () => ({
  default: {
    warn: loggerWarnMock,
  },
}));

const sleepMock = vi.mocked(sleep);

describe("syncOrderWithGhlWithRetry", () => {
  const context = {
    offerId: "demo-offer",
    offerName: "Demo Offer",
    customerEmail: "buyer@example.com",
    stripePaymentIntentId: "pi_test_123",
  };

  beforeEach(() => {
    syncOrderWithGhlMock.mockReset();
    loggerWarnMock.mockReset();
    sleepMock.mockClear();
  });

  it("retries when GHL responds with retryable errors and eventually succeeds", async () => {
    const retryError = new GhlRequestError("try again", 500, "body");
    syncOrderWithGhlMock
      .mockRejectedValueOnce(retryError)
      .mockResolvedValueOnce({ contactId: "contact_123" });

    const result = await syncOrderWithGhlWithRetry(undefined, context);

    expect(result).toEqual({ contactId: "contact_123" });
    expect(syncOrderWithGhlMock).toHaveBeenCalledTimes(2);
    expect(loggerWarnMock).toHaveBeenCalledWith("ghl.sync_retry", expect.objectContaining({
      attempt: 1,
      maxAttempts: MAX_GHL_SYNC_ATTEMPTS,
      delayMs: GHL_SYNC_RETRY_DELAY_MS,
      offerId: context.offerId,
      paymentIntentId: context.stripePaymentIntentId,
    }));
    expect(sleepMock).toHaveBeenCalledWith(GHL_SYNC_RETRY_DELAY_MS);
  });

  it("throws immediately for non-retryable errors", async () => {
    const fatalError = new Error("bad request");
    syncOrderWithGhlMock.mockRejectedValueOnce(fatalError);

    await expect(syncOrderWithGhlWithRetry(undefined, context)).rejects.toBe(fatalError);
    expect(syncOrderWithGhlMock).toHaveBeenCalledTimes(1);
    expect(loggerWarnMock).not.toHaveBeenCalled();
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it("stops after max attempts on repeated retryable errors", async () => {
    const retryError = new GhlRequestError("still failing", 503, "body");
    syncOrderWithGhlMock.mockRejectedValue(retryError);

    await expect(syncOrderWithGhlWithRetry(undefined, context)).rejects.toBe(retryError);

    expect(syncOrderWithGhlMock).toHaveBeenCalledTimes(MAX_GHL_SYNC_ATTEMPTS);
    expect(loggerWarnMock).toHaveBeenCalledTimes(MAX_GHL_SYNC_ATTEMPTS - 1);

    const expectedDelays = Array.from({ length: MAX_GHL_SYNC_ATTEMPTS - 1 }, (_, index) => GHL_SYNC_RETRY_DELAY_MS * 2 ** index);
    const actualDelays = sleepMock.mock.calls.map((call) => call[0]);
    expect(actualDelays).toEqual(expectedDelays);
  });
});
