#!/usr/bin/env npx tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Stripe from "stripe";
import { config as loadEnv } from "dotenv";

import { grantSerpAuthEntitlements } from "@/lib/serp-auth/entitlements";
import { getProductDataAllowExcluded } from "@/lib/products/product";

function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveLiveStripeSecretKey(): string | null {
  const live =
    readEnv("STRIPE_SECRET_KEY_LIVE") ??
    ((readEnv("STRIPE_SECRET_KEY")?.startsWith("sk_live_") || readEnv("STRIPE_SECRET_KEY")?.startsWith("rk_live_"))
      ? readEnv("STRIPE_SECRET_KEY")
      : null);
  return live ?? null;
}

function resolveCustomerEmail(session: Stripe.Checkout.Session): string | null {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function resolveEntitlements(session: Stripe.Checkout.Session): string[] {
  const md = (session.metadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof md.licenseEntitlements === "string" ? md.licenseEntitlements : null) ??
    (typeof md.license_entitlements === "string" ? md.license_entitlements : null) ??
    (typeof md.offerId === "string" ? md.offerId : null) ??
    (typeof md.offer_id === "string" ? md.offer_id : null) ??
    null;

  if (raw) {
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const slug =
    (typeof md.product_slug === "string" ? md.product_slug.trim() : "") ||
    (typeof md.productSlug === "string" ? md.productSlug.trim() : "") ||
    null;

  if (!slug) return [];

  try {
    const product = getProductDataAllowExcluded(slug);
    const entitlements = product.license?.entitlements ?? [];
    const resolved = Array.isArray(entitlements)
      ? entitlements.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : typeof entitlements === "string" && entitlements.trim().length > 0
      ? [entitlements.trim()]
      : [];

    if (resolved.length > 0) {
      return resolved;
    }
  } catch {
    // fall through to default
  }

  return [slug];
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(scriptDir);

  // Load base env from repo root.
  loadEnv({ path: path.join(repoRoot, ".env"), override: false });

  // For local debugging, also load Vercel env exports (if present) so the script can run
  // without requiring you to copy secrets into shell history.
  const storeEnv = (readEnv("STORE_ENV") ?? "").toLowerCase();
  const preferredEnvFile =
    storeEnv === "production"
      ? path.join(repoRoot, ".env.vercel.production")
      : storeEnv === "staging"
      ? path.join(repoRoot, ".env.vercel.staging")
      : storeEnv === "preview"
      ? path.join(repoRoot, ".env.vercel.preview")
      : null;

  if (preferredEnvFile && fs.existsSync(preferredEnvFile)) {
    loadEnv({ path: preferredEnvFile, override: true });
  } else {
    const extraEnvFiles = [
      path.join(repoRoot, ".env.vercel.production"),
      path.join(repoRoot, ".env.vercel.staging"),
      path.join(repoRoot, ".env.vercel.preview"),
      path.join(repoRoot, ".env.local"),
    ];
    for (const file of extraEnvFiles) {
      if (fs.existsSync(file)) {
        loadEnv({ path: file, override: false });
      }
    }
  }

  const eventId = readEnv("STRIPE_EVENT_ID");
  if (!eventId) {
    console.error("Missing STRIPE_EVENT_ID (example: evt_...)");
    process.exitCode = 1;
    return;
  }

  const stripeKey = resolveLiveStripeSecretKey();
  if (!stripeKey) {
    console.error("Missing Stripe live key. Set STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY with an sk_live_* value).");
    process.exitCode = 1;
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

  console.log("replay stripe event → serp-auth entitlements grant");
  console.log(`eventId=${eventId}`);

  const event = await stripe.events.retrieve(eventId);
  console.log(`eventType=${event.type}`);
  console.log(`livemode=${event.livemode}`);

  if (event.type !== "checkout.session.completed") {
    console.error(`Unsupported event type: ${event.type} (expected checkout.session.completed)`);
    process.exitCode = 1;
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const paymentStatus = session.payment_status ?? null;
  const isPaid = paymentStatus === "paid" || paymentStatus === "no_payment_required";

  const email = resolveCustomerEmail(session);
  const entitlements = resolveEntitlements(session);

  console.log(`sessionId=${session.id ?? "unknown"}`);
  console.log(`paymentStatus=${paymentStatus ?? "unknown"}`);
  console.log(`email=${email ?? "missing"}`);
  console.log(`entitlements=${entitlements.join(",") || "missing"}`);

  if (!isPaid) {
    console.warn("skip: session is not paid");
    return;
  }
  if (!email || entitlements.length === 0) {
    console.warn("skip: missing email or entitlements");
    return;
  }

  await grantSerpAuthEntitlements({
    email,
    entitlements,
    metadata: {
      source: "stripe",
      env: event.livemode ? "production" : "test",
      paymentStatus,
      stripe: {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        created: event.created ?? null,
        checkoutSessionId: session.id ?? null,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      },
    },
    context: {
      provider: "stripe",
      providerEventId: event.id,
      providerSessionId: session.id ?? null,
    },
  });
}

main().catch((error) => {
  console.error("replay failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
