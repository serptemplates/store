import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import logger from "@/lib/logger";
import { getOfferConfig } from "@/lib/products/offer-config";
import type { OfferConfig } from "@/lib/products/offer-config";
import { getStripeClient, resolvePriceForEnvironment } from "@/lib/payments/stripe";
import { getProductData } from "@/lib/products/product";

type CheckoutOptionalItem = {
  price: string;
  quantity: number;
  adjustable_quantity?: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity;
};

type OfferOptionalItem = {
  product_id: string;
  price_id?: string;
  quantity?: number;
};

type CheckoutSessionCreateParamsWithOptionalItems = Stripe.Checkout.SessionCreateParams & {
  optional_items?: CheckoutOptionalItem[];
};

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
    productSlug: slug,
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
    metadata.ghlTag = primaryGhlTag;
  }
  if (offer.ghl?.tagIds && offer.ghl.tagIds.length > 0) {
    const serialized = Array.from(new Set(offer.ghl.tagIds)).join(",");
    metadata.ghl_tag_ids = serialized;
    metadata.ghlTagIds = serialized;
  }

  // Resolve a usable price for the active Stripe environment (auto-clones live → test if needed)
  const resolvedPrice = await resolvePriceForEnvironment({
    id: slug,
    priceId: offer.stripePriceId,
    productName: offer.productName ?? null,
    productDescription: offer.productDescription ?? null,
    productImage: offer.productImage ?? null,
  });

  const adjustableQuantity: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity = {
    enabled: true,
    minimum: 0,
    maximum: Math.max(quantity, 99),
  };

  const optionalItems: CheckoutOptionalItem[] = [];
  
  // Load optional items from offer config
  if (offer.optionalItems && offer.optionalItems.length > 0) {
    for (const optionalItem of offer.optionalItems as OfferOptionalItem[]) {
      try {
        // Always fetch the product from live Stripe so we can attach names/descriptions
        // for metadata and to ensure the product exists.
        const liveStripe = getStripeClient("live");
        const product = await liveStripe.products.retrieve(optionalItem.product_id);

        // Determine which price id to use. If the product JSON explicitly sets a
        // `price_id`, prefer that override. Otherwise fall back to the product's
        // default_price set in Stripe.
  // Prefer per-offer price_id, then product.default_price. If neither is
  // available for an optional item, skip adding the optional item (no fallback).
  const priceIdFromOffer = optionalItem.price_id as string | undefined;

        const priceIdToResolve = priceIdFromOffer ??
          (typeof product.default_price === "string" ? product.default_price : product.default_price?.id);

        if (!priceIdToResolve) {
          logger.warn("checkout.optional_item_no_default_price", {
            slug,
            productId: optionalItem.product_id,
          });
          continue;
        }

        // resolvePriceForEnvironment will auto-create test versions if needed.
        // We `syncWithLiveProduct` here so the optional bundle is kept in sync.
        const optionalPrice = await resolvePriceForEnvironment(
          {
            id: optionalItem.product_id,
            priceId: priceIdToResolve,
            productName: product.name,
            productDescription: product.description || undefined,
            productImage: product.images?.[0] || undefined,
          },
          { syncWithLiveProduct: true },
        );

        optionalItems.push({
          price: optionalPrice.id,
          quantity: optionalItem.quantity ?? 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 1,
          },
        });
      } catch (error) {
        logger.warn("checkout.optional_item_price_unavailable", {
          slug,
          productId: optionalItem.product_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const params: CheckoutSessionCreateParamsWithOptionalItems = {
    mode: offer.mode,
    allow_promotion_codes: true,
    line_items: [
      {
        price: resolvedPrice.id,
        quantity,
        adjustable_quantity: adjustableQuantity,
      },
    ],
    success_url: offer.successUrl,
    cancel_url: offer.cancelUrl,
    metadata,
    consent_collection: {
      terms_of_service: "required",
    },
    customer_creation: "always",
  };

  if (optionalItems.length > 0) {
    params.optional_items = optionalItems;
  }

  if (customerEmail) {
    params.customer_email = customerEmail;
  }

  if (dubId) {
    params.client_reference_id = dubId;
  }

  // Also mirror metadata onto the PaymentIntent for downstream consumers
  if (offer.mode === "payment") {
    params.payment_intent_data = {
      metadata,
      description: offer.productName ?? undefined,
    };
  }
  if (offer.mode === "subscription") {
    params.subscription_data = {
      metadata,
    } as Stripe.Checkout.SessionCreateParams.SubscriptionData;
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(params);
    const url = session.url ?? null;
    if (!url) {
      return json({ error: "Stripe did not return a checkout URL" }, 500);
    }
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Do not redirect to Payment Link on failure; surface error for debugging.
    return json({ error: `stripe_session_create_failed: ${message}` }, 500);
  }
}

export const runtime = "nodejs";
