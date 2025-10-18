#!/usr/bin/env tsx

import path from "node:path";

import dotenv from "dotenv";
import Stripe from "stripe";

import type { CheckoutSessionPayload } from "../lib/checkout/session";

const dataDir = path.resolve(process.cwd(), "apps/store/data");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.join(dataDir, "..", ".env") });
dotenv.config({ path: path.join(dataDir, "../.env.local") });

process.env.PRODUCTS_ROOT = process.env.PRODUCTS_ROOT ?? dataDir;
process.env.SITE_CONFIG_PATH = process.env.SITE_CONFIG_PATH ?? path.join(dataDir, "site.config.json");
process.env.NEXT_PUBLIC_CHECKOUT_UI = process.env.NEXT_PUBLIC_CHECKOUT_UI ?? "hosted";

async function main() {
  const sessionModule = await import("../lib/checkout/session");
  const offerModule = await import("../lib/products/offer-config");
  const productModule = await import("../lib/products/product");
  const stripeModule = await import("../lib/payments/stripe");

  const { applyCouponIfPresent, createStripeCheckoutSession } = sessionModule;
  const { getOfferConfig } = offerModule;
  const { getProductData } = productModule;
  const { getStripeClient } = stripeModule;

  const offerId = "youtube-downloader";

  const payload: CheckoutSessionPayload = {
    offerId,
    quantity: 1,
    uiMode: "hosted",
    affiliateId: "metadata-check-affiliate",
    orderBump: {
      id: "serp-downloaders-bundle",
      selected: true,
    },
  };

  const initialMetadata: Record<string, string> = {
    landerId: offerId,
    checkoutSource: "stripe_checkout",
    termsAccepted: "true",
    termsAcceptedAt: new Date().toISOString(),
    termsAcceptedAtClient: new Date().toISOString(),
    termsAcceptedIp: "203.0.113.10",
    termsAcceptedUserAgent: "HostedMetadataAudit/1.0",
  };

  const offer = getOfferConfig(offerId);
  if (!offer) {
    throw new Error(`Offer ${offerId} not found`);
  }

  const product = getProductData(offerId);
  const couponResult = await applyCouponIfPresent(payload, initialMetadata);
  if (!couponResult.ok) {
    throw new Error(`Coupon validation failed: ${couponResult.message}`);
  }

  const stripeClient = getStripeClient();
  const sessionMetadata = { ...couponResult.metadata };

  const buildResult = await createStripeCheckoutSession(stripeClient, {
    offer,
    payload,
    metadata: couponResult.metadata,
    sessionMetadata,
    coupon: couponResult,
    product,
  });

  const { session } = buildResult;

  const retrieved = await stripeClient.checkout.sessions.retrieve(session.id, {
    expand: ["line_items"],
  });

  const output = {
    sessionId: retrieved.id,
    amountTotal: retrieved.amount_total,
    currency: retrieved.currency,
    metadata: retrieved.metadata,
    lineItems: retrieved.line_items?.data?.map((item) => ({
      price: item.price?.id,
      description: item.description,
      quantity: item.quantity,
      amountSubtotal: item.amount_subtotal,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
