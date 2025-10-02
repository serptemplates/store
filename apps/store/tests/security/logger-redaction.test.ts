import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Logger PII Redaction", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.NODE_ENV = "production";
    process.env.REDACT_LOGS = "true";
  });

  it("should redact email addresses in logs", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.error("test.error", {
      email: "customer@example.com",
      message: "Contact customer@example.com",
    });

    const logOutput = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.email).toBe("[REDACTED]");
    expect(parsed.context.message).toContain("[EMAIL_REDACTED]");
    expect(parsed.context.message).not.toContain("customer@example.com");
  });

  it("should redact phone numbers in logs", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.info("test.info", {
      phone: "555-123-4567",
      message: "Call 555-123-4567",
    });

    const logOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.phone).toBe("[REDACTED]");
    expect(parsed.context.message).toContain("[PHONE_REDACTED]");
    expect(parsed.context.message).not.toContain("555-123-4567");
  });

  it("should redact passwords in logs", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.error("test.error", {
      password: "super-secret-password",
      apiKey: "sk_test_12345",
    });

    const logOutput = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.password).toBe("[REDACTED]");
    expect(parsed.context.apiKey).toBe("[REDACTED]");
  });

  it("should redact bearer tokens in logs", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.error("test.error", {
      authorization: "Bearer sk_live_abc123xyz",
    });

    const logOutput = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.authorization).toContain("[REDACTED]");
    expect(parsed.context.authorization).not.toContain("sk_live_abc123xyz");
  });

  it("should handle nested objects with PII", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.info("test.nested", {
      user: {
        email: "user@test.com",
        phone: "555-0000",
        name: "John Doe",
      },
    });

    const logOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.user.email).toBe("[REDACTED]");
    expect(parsed.context.user.phone).toBe("[REDACTED]");
    expect(parsed.context.user.name).toBe("John Doe"); // Name is ok
  });

  it("should handle arrays with PII", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.info("test.array", {
      emails: ["test1@example.com", "test2@example.com"],
    });

    const logOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.emails[0]).toContain("[EMAIL_REDACTED]");
    expect(parsed.context.emails[1]).toContain("[EMAIL_REDACTED]");
  });

  it("should not redact in development mode", async () => {
    process.env.NODE_ENV = "development";
    process.env.REDACT_LOGS = "false";
    
    vi.resetModules();
    const { default: logger } = await import("@/lib/logger");
    
    logger.info("test.dev", {
      email: "dev@example.com",
    });

    const logOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.email).toBe("dev@example.com");
  });

  it("should handle credit card patterns", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.error("test.card", {
      message: "Card 4532-1234-5678-9010 declined",
    });

    const logOutput = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.message).toContain("[CARD_REDACTED]");
    expect(parsed.context.message).not.toContain("4532-1234-5678-9010");
  });

  it("should preserve non-PII data", async () => {
    const { default: logger } = await import("@/lib/logger");
    
    logger.info("test.preserve", {
      orderId: "order_123",
      amount: 9900,
      currency: "USD",
      status: "completed",
    });

    const logOutput = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);
    
    expect(parsed.context.orderId).toBe("order_123");
    expect(parsed.context.amount).toBe(9900);
    expect(parsed.context.currency).toBe("USD");
    expect(parsed.context.status).toBe("completed");
  });
});
