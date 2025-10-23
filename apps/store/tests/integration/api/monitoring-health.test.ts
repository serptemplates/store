import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/monitoring", () => ({
  evaluateCheckoutHealth: vi.fn(),
  sendCheckoutHealthAlert: vi.fn(),
}));

import { GET } from "@/app/api/monitoring/health/route";
import { evaluateCheckoutHealth, sendCheckoutHealthAlert } from "@/lib/monitoring";

const evaluateCheckoutHealthMock = vi.mocked(evaluateCheckoutHealth);
const sendCheckoutHealthAlertMock = vi.mocked(sendCheckoutHealthAlert);

function buildRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "GET",
    headers,
  });
}

describe("GET /api/monitoring/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONITORING_TOKEN = "secret-token";
    evaluateCheckoutHealthMock.mockResolvedValue({
      metrics: {
        pendingCheckoutSessions: 0,
        pendingWebhookLogs: 0,
        recentErroredWebhookLogs: 0,
        recentOrders: 5,
        recentOrdersLookbackHours: 24,
        lastOrderAt: null,
      },
      issues: [],
    });
  });

  afterEach(() => {
    delete process.env.MONITORING_TOKEN;
  });

  it("requires auth token when configured", async () => {
    const response = await GET(buildRequest("http://localhost/api/monitoring/health"));
    expect(response.status).toBe(401);
  });

  it("returns ok status when there are no issues", async () => {
    const response = await GET(
      buildRequest("http://localhost/api/monitoring/health", {
        authorization: "Bearer secret-token",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });

  it("sends alert when requested and issues present", async () => {
    evaluateCheckoutHealthMock.mockResolvedValue({
      metrics: {
        pendingCheckoutSessions: 1,
        pendingWebhookLogs: 0,
        recentErroredWebhookLogs: 0,
        recentOrders: 0,
        recentOrdersLookbackHours: 24,
        lastOrderAt: null,
      },
      issues: [
        { key: "pending_checkout_sessions", message: "Stripe latency high", severity: "alert" },
      ],
    });

    const response = await GET(
      buildRequest("http://localhost/api/monitoring/health?alert=1", {
        authorization: "Bearer secret-token",
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { status: string };
    expect(payload.status).toBe("alert");
    expect(sendCheckoutHealthAlertMock).toHaveBeenCalledWith(
      expect.stringContaining("Checkout monitor status"),
      expect.objectContaining({ status: "alert" }),
    );
  });
});
