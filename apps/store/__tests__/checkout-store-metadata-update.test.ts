import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
const mockQuery = vi.fn();
const mockEnsureDatabase = vi.fn();

vi.mock("@/lib/database", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  ensureDatabase: () => mockEnsureDatabase(),
}));

describe("updateOrderMetadata", () => {
  let updateOrderMetadata: (
    lookupKey: { stripePaymentIntentId?: string | null; stripeSessionId?: string | null },
    metadata: Record<string, unknown>
  ) => Promise<boolean>;

  beforeEach(async () => {
    vi.resetModules();
    mockQuery.mockReset();
    mockEnsureDatabase.mockReset();
    
    // Import after mocks are set up
    const module = await import("@/lib/checkout/store");
    updateOrderMetadata = module.updateOrderMetadata;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when database is not ready", async () => {
    mockEnsureDatabase.mockResolvedValue(false);

    const result = await updateOrderMetadata(
      { stripePaymentIntentId: "pi_123" },
      { license: { key: "test-key" } }
    );

    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("updates order by payment intent ID when available", async () => {
    mockEnsureDatabase.mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ id: "order-uuid" }] });

    const result = await updateOrderMetadata(
      { stripePaymentIntentId: "pi_123", stripeSessionId: "cs_456" },
      { license: { key: "test-key" } }
    );

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Verify it tried payment intent ID first
    const call = mockQuery.mock.calls[0];
    const queryString = call[0].join("");
    expect(queryString).toContain("stripe_payment_intent_id");
  });

  it("falls back to session ID when payment intent ID doesn't match", async () => {
    mockEnsureDatabase.mockResolvedValue(true);
    
    // First call (payment intent) returns no rows
    // Second call (session ID) returns a row
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "order-uuid" }] });

    const result = await updateOrderMetadata(
      { stripePaymentIntentId: "pi_123", stripeSessionId: "cs_456" },
      { license: { key: "test-key" } }
    );

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    
    // Verify second call used session ID
    const secondCall = mockQuery.mock.calls[1];
    const queryString = secondCall[0].join("");
    expect(queryString).toContain("stripe_session_id");
  });

  it("uses only session ID when payment intent ID is null", async () => {
    mockEnsureDatabase.mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ id: "order-uuid" }] });

    const result = await updateOrderMetadata(
      { stripePaymentIntentId: null, stripeSessionId: "cs_456" },
      { license: { key: "test-key" } }
    );

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Should skip payment intent check and go straight to session ID
    const call = mockQuery.mock.calls[0];
    const queryString = call[0].join("");
    expect(queryString).toContain("stripe_session_id");
  });

  it("returns false when no lookup keys are provided", async () => {
    mockEnsureDatabase.mockResolvedValue(true);

    const result = await updateOrderMetadata(
      {},
      { license: { key: "test-key" } }
    );

    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns false when no orders match", async () => {
    mockEnsureDatabase.mockResolvedValue(true);
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await updateOrderMetadata(
      { stripePaymentIntentId: "pi_123", stripeSessionId: "cs_456" },
      { license: { key: "test-key" } }
    );

    expect(result).toBe(false);
  });

  it("merges metadata correctly with existing order metadata", async () => {
    mockEnsureDatabase.mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ id: "order-uuid" }] });

    const newMetadata = {
      license: {
        action: "created",
        licenseId: "lic_123",
        licenseKey: "SERP-TEST-KEY",
        updatedAt: "2025-01-01T00:00:00Z",
      },
    };

    await updateOrderMetadata(
      { stripePaymentIntentId: "pi_123" },
      newMetadata
    );

    // Verify the query includes COALESCE for merging
    const call = mockQuery.mock.calls[0];
    const queryString = call[0].join("");
    expect(queryString).toContain("COALESCE(orders.metadata");
    expect(queryString).toContain("::jsonb");
  });
});
