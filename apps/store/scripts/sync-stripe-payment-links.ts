/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";

import {
    buildPaymentLinkUpdatePayload,
  } from "../lib/stripe/payment-link-config";
import { getAllProducts } from "../lib/products/product";
import type { ProductData } from "../lib/products/product-schema";

  const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
  const REPO_ROOT = path.resolve(__dirname, "../../..");
  const SUCCESS_REDIRECT_BASE =
    process.env.STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL ??
    "https://apps.serp.co/checkout/success";

  type StripeMode = "live" | "test";

  type PaymentLinkTarget = {
    slug: string;
    url: string;
    normalizedUrl: string;
    ghlTag: string;
    stripeProductId: string | null;
    productName: string | null;
  };

  function loadEnvFiles() {
    const candidates = [
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), ".env"),
      path.join(REPO_ROOT, ".env.local"),
      path.join(REPO_ROOT, ".env"),
    ];

    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (!seen.has(candidate) && fs.existsSync(candidate)) {
        dotenv.config({ path: candidate });
        seen.add(candidate);
      }
    }
  }

  loadEnvFiles();

  function resolveStripeSecret(): string {
    const candidates = [
      process.env.STRIPE_SECRET_KEY_LIVE,
      process.env.STRIPE_SECRET_KEY,
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.startsWith("sk_live_")) {
        return candidate;
      }
    }

    throw new Error("Missing Stripe live secret key (expected STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY).");
  }

  function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  function getPrimaryTag(data: ProductData): string | null {
    const tagIds = Array.isArray(data.ghl?.tag_ids) ? data.ghl?.tag_ids : [];
    const candidate = tagIds.find((tag) => isNonEmptyString(tag));
    return candidate ? (candidate as string).trim() : null;
  }

  function normalizeUrl(url: string): string {
    return url.replace(/\/$/, "");
  }

function loadPaymentLinks(): PaymentLinkTarget[] {
    const targets: PaymentLinkTarget[] = [];
    const seenUrls = new Set<string>();

    const products = getAllProducts();

    for (const product of products) {
      const ghlTag = getPrimaryTag(product);
      if (!ghlTag) {
        continue;
      }

      const stripeProductIdValue = product.stripe?.metadata?.stripe_product_id;
      const stripeProductId =
        typeof stripeProductIdValue === "string" && stripeProductIdValue.trim().length > 0
          ? stripeProductIdValue.trim()
          : null;
      const productName =
        typeof product.name === "string" && product.name.trim().length > 0 ? product.name.trim() : null;

      const linkData = product.payment_link;
      if (!linkData) {
        continue;
      }

      if ("ghl_url" in linkData) {
        continue;
      }

      const liveUrl = typeof linkData.live_url === "string" ? linkData.live_url.trim() : "";
      const testUrl = typeof linkData.test_url === "string" ? linkData.test_url.trim() : "";
      const urlCandidate = liveUrl || testUrl;

      if (!urlCandidate) {
        continue;
      }

      const normalizedUrl = normalizeUrl(urlCandidate);
      if (seenUrls.has(normalizedUrl)) {
        continue;
      }

      seenUrls.add(normalizedUrl);
      targets.push({
        slug: product.slug,
        url: urlCandidate,
        normalizedUrl,
        ghlTag,
        stripeProductId,
        productName: productName ?? product.slug,
      });
    }

    return targets;
  }

  async function buildPaymentLinkDirectory(stripe: Stripe): Promise<Map<string, Stripe.PaymentLink>> {
    const directory = new Map<string, Stripe.PaymentLink>();
    let startingAfter: string | undefined;

    do {
      const response = await stripe.paymentLinks.list({ limit: 100, starting_after: startingAfter });
      for (const link of response.data) {
        const normalized = normalizeUrl(link.url);
        if (!directory.has(normalized)) {
          directory.set(normalized, link);
        }
      }
      startingAfter = response.has_more ? response.data[response.data.length - 1].id : undefined;
    } while (startingAfter);

    return directory;
  }

  async function syncPaymentLinks() {
    const stripeSecret = resolveStripeSecret();
    const stripe = new Stripe(stripeSecret, { apiVersion: API_VERSION });
    const links = loadPaymentLinks();
    const directory = await buildPaymentLinkDirectory(stripe);

    if (!links.length) {
      console.log("No Stripe Payment Links found to update.");
      return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const link of links) {
      const paymentLink = directory.get(link.normalizedUrl);
      if (!paymentLink) {
        skipped += 1;
        console.warn(`⚠️  Payment link for ${link.slug} not found in Stripe (url: ${link.url}); skipping.`);
        continue;
      }

      try {
        const mode: StripeMode = paymentLink.livemode ? "live" : "test";
        const updatePayload = buildPaymentLinkUpdatePayload({
          slug: link.slug,
          ghlTag: link.ghlTag,
          stripeProductId: link.stripeProductId,
          paymentLinkId: paymentLink.id,
          mode,
          baseUrl: SUCCESS_REDIRECT_BASE,
          productName: link.productName,
        });

        await stripe.paymentLinks.update(paymentLink.id, updatePayload);

        updated += 1;
        console.log(`✅ Updated payment link ${paymentLink.id} (${link.slug})`);
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;

        failed += 1;
        console.error(`❌ Failed to update payment link ${paymentLink.id} (${link.slug}).`);
        if (stripeError?.message) {
          console.error(`   Reason: ${stripeError.message}`);
        }
      }
    }

    console.log("");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  }

  syncPaymentLinks().catch((error) => {
    console.error("Failed to sync Stripe Payment Link settings.", error);
    process.exitCode = 1;
  });
