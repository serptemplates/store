import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const warnMock = vi.fn();
const infoMock = vi.fn();
const errorMock = vi.fn();
const debugMock = vi.fn();

vi.mock("@/lib/logger", () => ({
  default: {
    warn: warnMock,
    info: infoMock,
    error: errorMock,
    debug: debugMock,
  },
}));

const ORIGINAL_ENV = { ...process.env };

describe("stripe environment helpers", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    warnMock.mockClear();
    infoMock.mockClear();
    errorMock.mockClear();
    debugMock.mockClear();
    if (consoleWarnSpy) {
      consoleWarnSpy.mockRestore();
    }
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
  });

  it("falls back to live mode when test credentials are missing", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.STRIPE_SECRET_KEY = "sk_live_fallback";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_fallback";
    delete process.env.STRIPE_SECRET_KEY_TEST;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;

    const {
      resolveStripeMode,
      requireStripeSecretKey,
      requireStripePublishableKey,
    } = await import("@/lib/payments/stripe-environment");

    expect(resolveStripeMode()).toBe("live");
    expect(requireStripeSecretKey()).toBe("sk_live_fallback");
    expect(requireStripePublishableKey()).toBe("pk_live_fallback");

    expect(consoleWarnSpy).toHaveBeenCalled();
    const [message, payload] = consoleWarnSpy.mock.calls[0];
    expect(message).toContain("Missing Stripe test credentials; defaulting to live mode.");
    expect(payload).toMatchObject({
      missingTestSecret: true,
      missingTestPublishableKey: true,
      fallbackMode: "live",
    });
  });
});
