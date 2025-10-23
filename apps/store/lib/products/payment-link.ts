import { isStripeTestMode } from "@/lib/payments/stripe-environment";
import type { ProductData } from "./product-schema";

export type ProductPaymentLink =
  | {
      url: string;
      linkId: string | null;
      provider: "stripe";
      variant: "live" | "test";
    }
  | {
      url: string;
      linkId: string | null;
      provider: "ghl";
      variant: "live";
    };

export function resolveProductPaymentLink(product: ProductData): ProductPaymentLink | null {
  const link = product.payment_link;
  if (!link) {
    return null;
  }

  if ("ghl_url" in link) {
    return {
      url: link.ghl_url,
      linkId: extractLinkIdentifier(link.ghl_url),
      provider: "ghl",
      variant: "live",
    };
  }

  const prefersTest = isStripeTestMode();

  if (prefersTest && link.test_url) {
    return {
      url: link.test_url,
      linkId: extractLinkIdentifier(link.test_url),
      provider: "stripe",
      variant: "test",
    };
  }

  const resolvedUrl = link.live_url ?? link.test_url;
  if (!resolvedUrl) {
    return null;
  }

  const isLive = Boolean(link.live_url);

  return {
    url: resolvedUrl,
    linkId: extractLinkIdentifier(resolvedUrl),
    provider: "stripe",
    variant: isLive ? "live" : "test",
  };
}

function extractLinkIdentifier(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const trimmedPath = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    return trimmedPath.length > 0 ? trimmedPath : null;
  } catch {
    return null;
  }
}
