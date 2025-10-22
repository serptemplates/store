import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect";

describe("useCheckoutRedirect", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("does not redirect to the fallback when onError handler is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invalid coupon code",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    global.fetch = fetchMock as typeof global.fetch;

    const navigate = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useCheckoutRedirect({
        offerId: "test-offer",
        endpoint: "/api/checkout/session",
        fallbackUrl: "/product-details/product/test-offer",
        onError,
        navigate,
      }),
    );

    await act(async () => {
      await result.current.beginCheckout({
        couponCode: "INVALID",
      });
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects to the fallback when onError handler is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Service unavailable",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    global.fetch = fetchMock as typeof global.fetch;

    const navigate = vi.fn();

    const { result } = renderHook(() =>
      useCheckoutRedirect({
        offerId: "test-offer",
        endpoint: "/api/checkout/session",
        fallbackUrl: "/product-details/product/test-offer",
        navigate,
      }),
    );

    await act(async () => {
      await result.current.beginCheckout();
    });

    expect(navigate).toHaveBeenCalledWith("/product-details/product/test-offer");
  });
});
