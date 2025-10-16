import type { NextRequest } from "next/server";

import type { z } from "zod";

import { checkoutSessionSchema, sanitizeInput } from "@/lib/validation/checkout";
import logger from "@/lib/logger";

export type CheckoutSessionPayload = z.infer<typeof checkoutSessionSchema>;

export interface CheckoutRequestContext {
  body: CheckoutSessionPayload;
  metadata: Record<string, string>;
  clientIp?: string;
  userAgent?: string;
}

export type CheckoutRequestResult =
  | { ok: true; value: CheckoutRequestContext }
  | { ok: false; status: number; message: string };

function extractClientIp(request: NextRequest): { clientIp?: string; userAgent?: string } {
  const forwardedForHeader = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedForHeader?.split(",")[0]?.trim();
  const realIpHeader = request.headers.get("x-real-ip");
  const realIp = realIpHeader?.split(",")[0]?.trim();
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const vercelIp = vercelForwardedFor?.split(",")[0]?.trim();

  const clientIp = forwardedIp ?? realIp ?? vercelIp ?? undefined;
  const userAgentRaw = request.headers.get("user-agent") ?? undefined;
  const userAgent = userAgentRaw ? userAgentRaw.slice(0, 250) : undefined;

  return { clientIp, userAgent };
}

export async function parseCheckoutRequest(request: NextRequest): Promise<CheckoutRequestResult> {
  let requestPayload: unknown;

  try {
    requestPayload = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.debug("checkout.session.invalid_json", {
        error: error.message,
      });
      return { ok: false, status: 400, message: "Invalid request payload" };
    }
    throw error;
  }

  const parseResult = checkoutSessionSchema.safeParse(requestPayload);

  if (!parseResult.success) {
    const message = parseResult.error.issues.map((issue) => issue.message).join(", ");
    return { ok: false, status: 400, message };
  }

  const body = parseResult.data;

  const metadata: Record<string, string> = {
    ...(body.metadata ?? {}),
  };

  if (body.offerId) {
    body.offerId = sanitizeInput(body.offerId);
  }

  if (body.affiliateId) {
    body.affiliateId = sanitizeInput(body.affiliateId);
    metadata.affiliateId = body.affiliateId;
  }

  if (body.orderBump?.id) {
    body.orderBump.id = sanitizeInput(body.orderBump.id);
  }

  if (body.orderBump) {
    metadata.orderBumpId = body.orderBump.id;
    metadata.orderBumpSelected = body.orderBump.selected ? "true" : "false";
  } else if (!metadata.orderBumpSelected) {
    metadata.orderBumpSelected = "false";
  }

  const { clientIp, userAgent } = extractClientIp(request);

  const normalizedCheckoutSource = metadata.checkoutSource?.trim();
  if (!normalizedCheckoutSource) {
    metadata.checkoutSource = body.uiMode === "embedded" ? "custom_checkout_stripe" : "stripe_checkout";
  } else {
    metadata.checkoutSource = normalizedCheckoutSource;
  }

  if (metadata.termsAccepted !== undefined) {
    metadata.termsAccepted = String(metadata.termsAccepted === "true" || metadata.termsAccepted === "1");
  }

  if (metadata.termsAccepted !== "true") {
    metadata.termsAccepted = "true";
  }

  if (metadata.termsAcceptedAt && !metadata.termsAcceptedAtClient) {
    metadata.termsAcceptedAtClient = metadata.termsAcceptedAt;
  }

  metadata.termsAcceptedAt = new Date().toISOString();

  if (clientIp) {
    metadata.termsAcceptedIp = clientIp;
  }

  if (userAgent) {
    metadata.termsAcceptedUserAgent = userAgent;
  }

  return {
    ok: true,
    value: {
      body,
      metadata,
      clientIp,
      userAgent,
    },
  };
}
