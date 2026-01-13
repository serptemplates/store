import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOfferConfig } from "@/lib/products/offer-config";
import type { OfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { createCheckoutSessionForOffer } from "@/lib/payments/payment-router";
import {
  canonicalizeStripeMetadataKeys,
  enforceStripeMetadataLimits,
} from "@/lib/metadata/stripe-metadata";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function coercePositiveInt(value: string | null, fallback = 1): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDubId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  return v.startsWith("dub_id_") ? v : `dub_id_${v}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug || typeof slug !== "string") {
    return json({ error: "Missing product slug" }, 400);
  }

  // Load product to enforce pre-release behavior and build offer config
  let productStatus: string | null = null;
  let waitlistUrl: string | null = null;
  try {
    const product = getProductData(slug);
    productStatus = product.status ?? null;
    waitlistUrl = typeof product.waitlist_url === "string" ? product.waitlist_url : null;
  } catch {}

  // Pre-release products should not launch checkout; redirect to waitlist or product page
  if (productStatus === "pre_release") {
    const fallbackUrl = waitlistUrl || `/product/${slug}#waitlist`;
    const absolute = new URL(fallbackUrl, req.nextUrl.origin).toString();
    return NextResponse.redirect(absolute, { status: 302 });
  }

  // Look up offer config from product data
  const offer = getOfferConfig(slug) as OfferConfig | null;
  if (!offer) {
    return json({ error: `Unknown or unconfigured product slug: ${slug}` }, 404);
  }

  const search = req.nextUrl.searchParams;
  const quantity = coercePositiveInt(search.get("qty"), 1);
  const customerEmail = search.get("email") || undefined;

  // Read Dub cookie for attribution
  const dubCookie = req.cookies.get("dub_id")?.value ?? null;
  const dubId = normalizeDubId(dubCookie);

  const metadata: Record<string, string> = {
    ...(offer.metadata ?? {}),
    product_slug: slug,
  };

  if (dubId) {
    metadata.dubCustomerExternalId = dubId;
    metadata.dubClickId = dubId;
  }
  if (!metadata.affiliateId && dubId) {
    metadata.affiliateId = dubId.replace(/^dub_id_/, "");
  }

  // Mirror GHL tags into metadata (for parity with Payment Link flows)
  const primaryGhlTag = offer.ghl?.tagIds?.[0];
  if (primaryGhlTag) {
    metadata.ghl_tag = primaryGhlTag;
  }

  const canonical = canonicalizeStripeMetadataKeys(metadata, {
    preserveKey: (key) => key === "affiliateId" || key.startsWith("dub"),
    dropKey: (key) =>
      key.startsWith("store") ||
      key.includes("store_serp_co") ||
      key.includes("storeSerpCo") ||
      key.includes("storeProductPageUrl") ||
      key.includes("store_product_page_url"),
  });

  const limited = enforceStripeMetadataLimits(canonical, {
    keepKeysFirst: [
      "product_slug",
      "offer_id",
      "lander_id",
      "product_name",
      "ghl_tag",
      "environment",
      "affiliateId",
      "dubCustomerExternalId",
      "dubClickId",
      "purchase_url",
      "serply_link",
      "success_url",
      "cancel_url",
      "product_page_url",
      "serp_co_product_page_url",
    ],
  }).metadata;

  try {
    const session = await createCheckoutSessionForOffer({
      offer,
      quantity,
      metadata: limited,
      customerEmail,
      clientReferenceId: dubId,
    });
    return NextResponse.redirect(session.redirectUrl, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Do not redirect to Payment Link on failure; surface error for debugging.
    return json({ error: `checkout_session_create_failed: ${message}` }, 500);
  }
}

export const runtime = "nodejs";
