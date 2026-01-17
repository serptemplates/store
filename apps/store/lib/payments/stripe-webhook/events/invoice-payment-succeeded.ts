import type Stripe from "stripe";

import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import logger from "@/lib/logger";
import { getStripeClient } from "@/lib/payments/stripe";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";
import { getOfferConfig } from "@/lib/products/offer-config";
import type { StripeWebhookContext } from "@/lib/payments/stripe-webhook/types";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type ProductNameResolution = {
  name: string | null;
  source: string | null;
};

const PRODUCT_NAME_METADATA_KEYS = ["product_name", "productName", "payment_description", "description"] as const;

function resolveProductNameFromMetadata(metadata: Stripe.Metadata | null | undefined): ProductNameResolution {
  if (!metadata) {
    return { name: null, source: null };
  }

  const record = metadata as Record<string, unknown>;
  for (const key of PRODUCT_NAME_METADATA_KEYS) {
    const value = asTrimmedString(record[key]);
    if (value) {
      return { name: value, source: `invoice.metadata.${key}` };
    }
  }

  return { name: null, source: null };
}

function resolveProductName(
  sessionRecord: Awaited<ReturnType<typeof findCheckoutSessionBySubscriptionId>>,
): string | null {
  if (!sessionRecord) {
    return null;
  }

  const metadata = sessionRecord.metadata ?? {};
  const fromMetadata =
    asTrimmedString(metadata["product_name"]) ??
    asTrimmedString(metadata["productName"]);
  if (fromMetadata) {
    return fromMetadata;
  }

  const offerConfig = getOfferConfig(sessionRecord.offerId);
  return asTrimmedString(offerConfig?.productName);
}

function collectInvoiceLineItemCandidates(invoice: Stripe.Invoice): Stripe.InvoiceLineItem[] {
  const lineItems = Array.isArray(invoice.lines?.data) ? invoice.lines.data : [];
  if (lineItems.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const candidates: Stripe.InvoiceLineItem[] = [];
  const push = (lineItem: Stripe.InvoiceLineItem) => {
    if (!lineItem?.id || seen.has(lineItem.id)) {
      return;
    }
    seen.add(lineItem.id);
    candidates.push(lineItem);
  };

  for (const lineItem of lineItems) {
    if (!lineItem.proration && lineItem.type === "subscription") {
      push(lineItem);
    }
  }
  for (const lineItem of lineItems) {
    if (!lineItem.proration) {
      push(lineItem);
    }
  }
  for (const lineItem of lineItems) {
    push(lineItem);
  }

  return candidates;
}

async function resolveProductNameFromPrice(
  stripe: Stripe,
  price: Stripe.Price | null,
  context: { invoiceId: string | null; paymentIntentId: string | null; subscriptionId: string },
): Promise<string | null> {
  if (!price) {
    return null;
  }

  const product = price.product;
  if (product && typeof product === "object" && "name" in product) {
    return asTrimmedString((product as Stripe.Product).name);
  }

  if (typeof product === "string") {
    try {
      const retrieved = await stripe.products.retrieve(product);
      return asTrimmedString(retrieved?.name);
    } catch (error) {
      logger.warn("stripe.invoice_product_lookup_failed", {
        invoiceId: context.invoiceId,
        subscriptionId: context.subscriptionId,
        paymentIntentId: context.paymentIntentId,
        productId: product,
        priceId: price.id ?? null,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  }

  return asTrimmedString(price.nickname);
}

async function resolveProductNameFromLineItems(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  context: { invoiceId: string | null; paymentIntentId: string | null; subscriptionId: string },
): Promise<ProductNameResolution> {
  const candidates = collectInvoiceLineItemCandidates(invoice);
  if (candidates.length === 0) {
    return { name: null, source: null };
  }

  for (const lineItem of candidates) {
    const resolved = await resolveProductNameFromPrice(stripe, lineItem.price ?? null, context);
    if (resolved) {
      return { name: resolved, source: "invoice.line_item.price" };
    }
  }

  for (const lineItem of candidates) {
    const description = asTrimmedString(lineItem.description);
    if (description) {
      return { name: description, source: "invoice.line_item.description" };
    }
  }

  return { name: null, source: null };
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  context?: StripeWebhookContext,
) {
  try {
    const subscriptionId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

    if (!subscriptionId) {
      return;
    }

    const sessionRecord = await findCheckoutSessionBySubscriptionId(subscriptionId);
    if (!sessionRecord) {
      logger.debug("stripe.invoice_succeeded_missing_session", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
      });
    }

    const offerId = sessionRecord?.offerId ?? null;
    const entitlements = resolveCheckoutEntitlements(sessionRecord);
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord)
      ?? invoice.customer_email
      ?? null;

    const paymentIntentId =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id ?? null;

    if (paymentIntentId) {
      const stripeMode = typeof invoice.livemode === "boolean" ? (invoice.livemode ? "live" : "test") : "auto";
      const stripe = getStripeClient({
        mode: stripeMode,
        accountAlias: context?.accountAlias ?? undefined,
      });

      const resolutionContext = {
        invoiceId: invoice.id ?? null,
        paymentIntentId,
        subscriptionId,
      };

      let productNameResolution: ProductNameResolution = {
        name: resolveProductName(sessionRecord),
        source: sessionRecord ? "checkout.session" : null,
      };

      if (!productNameResolution.name) {
        productNameResolution = resolveProductNameFromMetadata(invoice.metadata);
      }

      if (!productNameResolution.name) {
        productNameResolution = await resolveProductNameFromLineItems(stripe, invoice, resolutionContext);
      }

      if (!productNameResolution.name && sessionRecord?.offerId) {
        productNameResolution = { name: sessionRecord.offerId, source: "checkout.offer_id" };
      }

      if (productNameResolution.name) {
        try {
          const description = `Subscription - ${productNameResolution.name}`;
          await stripe.paymentIntents.update(paymentIntentId, { description });
          logger.info("stripe.payment_intent_description_updated", {
            paymentIntentId,
            description,
            productNameSource: productNameResolution.source,
            source: "invoice.payment_succeeded",
          });
        } catch (error) {
          logger.warn("stripe.payment_intent_description_update_failed", {
            paymentIntentId,
            error: error instanceof Error ? { message: error.message, name: error.name } : error,
            source: "invoice.payment_succeeded",
          });
        }
      } else {
        logger.warn("stripe.invoice_product_name_missing", {
          paymentIntentId,
          invoiceId: invoice.id ?? null,
          subscriptionId,
        });
      }
    }

    if (entitlements.length === 0 || !customerEmail) {
      logger.debug("serp_auth.entitlements_regrant_skipped_invoice_succeeded", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
        hasEmail: Boolean(customerEmail),
        entitlementsCount: entitlements.length,
      });
      return;
    }

    try {
      const { grantSerpAuthEntitlements } = await import("@/lib/serp-auth/entitlements");
      await grantSerpAuthEntitlements({
        email: customerEmail,
        entitlements,
        metadata: {
          source: "stripe",
          offerId,
          stripe: {
            eventType: "invoice.payment_succeeded",
            invoiceId: invoice.id ?? null,
            subscriptionId,
            customerId: typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null,
            paymentIntentId: typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent?.id ?? null,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: invoice.id ?? null,
          providerSessionId: sessionRecord?.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_regrant_on_invoice_succeeded_failed", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.invoice_payment_succeeded_handler_failed", {
      invoiceId: invoice?.id ?? null,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
