import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { getStripeClient } from "@/lib/payments/stripe";
import { getSiteConfig } from "@/lib/site-config";

const CreateSessionSchema = z.object({
  priceId: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
  mode: z.enum(["payment", "subscription"]).optional().default("payment"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  customerEmail: z.string().email().optional(),
  clientReferenceId: z.string().min(1).optional(),
  dubCustomerExternalId: z.string().min(1).optional(),
  dubClickId: z.string().min(1).optional(),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .transform((obj) => {
      if (!obj) return undefined;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        out[k] = String(v);
      }
      return out;
    }),
});

function defaultSuccessUrl(): string {
  const domain = getSiteConfig().site?.domain ?? "https://apps.serp.co";
  const base = domain.replace(/\/$/, "");
  return `${base}/checkout/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
}

function defaultCancelUrl(): string {
  const domain = getSiteConfig().site?.domain ?? "https://apps.serp.co";
  const base = domain.replace(/\/$/, "");
  return `${base}/checkout/cancel`;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof CreateSessionSchema>;
  try {
    const body = await req.json();
    payload = CreateSessionSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return json({ error: message }, 400);
  }

  const stripe = getStripeClient();

  const metadata: Record<string, string> = {
    ...(payload.metadata ?? {}),
  };

  if (payload.dubCustomerExternalId) {
    metadata.dubCustomerExternalId = payload.dubCustomerExternalId;
  }

  if (payload.dubClickId) {
    metadata.dubClickId = payload.dubClickId;
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: payload.mode,
    line_items: [
      {
        price: payload.priceId,
        quantity: payload.quantity ?? 1,
      },
    ],
    success_url: payload.successUrl ?? defaultSuccessUrl(),
    cancel_url: payload.cancelUrl ?? defaultCancelUrl(),
    metadata,
    // Enforce Terms of Service acceptance in Checkout
    consent_collection: {
      terms_of_service: "required",
    },
    // Ensure a Stripe Customer record exists even for one-time payments
    customer_creation: "always",
  };

  if (payload.customerEmail) {
    params.customer_email = payload.customerEmail;
  }

  if (payload.clientReferenceId) {
    params.client_reference_id = payload.clientReferenceId;
  }

  // Record affiliateId alongside Dub for analytics parity
  if (!("affiliateId" in metadata)) {
    const dubId = metadata.dubCustomerExternalId || metadata.dubClickId || payload.clientReferenceId || null;
    if (typeof dubId === "string" && dubId.trim()) {
      const affiliate = dubId.replace(/^dub_id_/, "");
      metadata.affiliateId = affiliate;
    }
  }

  // Mirror metadata onto underlying intent/subscription
  if (payload.mode === "payment") {
    (params as Stripe.Checkout.SessionCreateParams).payment_intent_data = {
      metadata,
    };
  } else if (payload.mode === "subscription") {
    (params as Stripe.Checkout.SessionCreateParams).subscription_data = {
      metadata,
    } as Stripe.Checkout.SessionCreateParams.SubscriptionData;
  }

  try {
    const session = await stripe.checkout.sessions.create(params);
    return json({ id: session.id, url: session.url ?? null, status: session.status ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
}

export const runtime = "nodejs";
