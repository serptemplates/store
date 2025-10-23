#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { parse } from "yaml";

import {
  buildPaymentLinkUpdatePayload,
  ensureTermsOfServiceRequired,
} from "../lib/stripe/payment-link-config";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PRODUCTS_DIR = path.join(REPO_ROOT, "apps/store/data/products");
const SUCCESS_REDIRECT_BASE =
  process.env.STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL ??
  "https://apps.serp.co/checkout/success";

type StripeMode = "live" | "test";

type ProductYaml = {
  slug?: unknown;
  payment_link?: {
    live_url?: unknown;
    test_url?: unknown;
    ghl_url?: unknown;
  } | null;
  ghl?: { tag_ids?: unknown };
  stripe?: {
    metadata?: Record<string, unknown> | null | undefined;
  };
};

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

function coerceSlug(candidate: unknown, fallback: string): string {
  if (isNonEmptyString(candidate)) {
    return candidate;
  }
  return fallback;
}

function coerceString(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }
  return value.trim();
}

function getPrimaryTag(data: ProductYaml): string | null {
  const tagIds = Array.isArray(data.ghl?.tag_ids) ? data.ghl?.tag_ids : [];
  const candidate = tagIds.find((tag) => isNonEmptyString(tag));
  return candidate ? (candidate as string).trim() : null;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

const consentWarnings = new Set<string>();

function loadPaymentLinks(): PaymentLinkTarget[] {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    throw new Error(`Products directory not found at ${PRODUCTS_DIR}`);
  }

  const entries = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".yaml"));

  const targets: PaymentLinkTarget[] = [];
  const seenUrls = new Set<string>();

  for (const file of entries) {
    const absolutePath = path.join(PRODUCTS_DIR, file);
    const raw = fs.readFileSync(absolutePath, "utf8");
    const data = parse(raw) as ProductYaml;

    const slug = coerceSlug(data.slug, file.replace(/\.ya?ml$/i, ""));
    const ghlTag = getPrimaryTag(data);
    if (!ghlTag) {
      continue;
    }
    const stripeProductId = coerceString(data.stripe?.metadata?.stripe_product_id);
    const productName = coerceString((data as Record<string, unknown>)?.name);

    const linkData = data.payment_link;
    if (!linkData || isNonEmptyString(linkData.ghl_url)) {
      continue;
    }

    const urlCandidate =
      (isNonEmptyString(linkData.live_url) ? linkData.live_url : null)
      ?? (isNonEmptyString(linkData.test_url) ? linkData.test_url : null);

    if (!urlCandidate) {
      continue;
    }

    const normalizedUrl = normalizeUrl(urlCandidate);
    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    targets.push({
      slug,
      url: urlCandidate,
      normalizedUrl,
      ghlTag,
      stripeProductId,
      productName: productName ?? slug,
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
      const tosResult = await ensureTermsOfServiceRequired(stripe, paymentLink.id);

      if (tosResult.status === "updated") {
        console.log("   ↳ Enabled Terms of Service consent requirement.");
      } else if (tosResult.status === "manual_required" && !consentWarnings.has(paymentLink.id)) {
        const reason = tosResult.reason ? ` Reason: ${tosResult.reason}` : "";
        console.warn(
          `   ↳ Stripe rejected the Terms of Service update for ${link.slug} (${paymentLink.id}); toggle “Terms of service → Required” manually in the dashboard.${reason}`,
        );
        consentWarnings.add(paymentLink.id);
      }

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
