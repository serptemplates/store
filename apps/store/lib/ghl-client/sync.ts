import logger from "@/lib/logger";

import {
  GHL_AUTH_TOKEN,
  GHL_LOCATION_ID,
} from "./config";
import {
  buildLicenseKeysPayload,
  buildPurchaseMetadata,
  renderTemplate,
  splitName,
} from "./context";
import {
  resolveContactCustomFieldIds,
} from "./custom-fields";
import {
  buildCustomFieldPayload,
  createOpportunity,
  triggerWorkflow,
  upsertContact,
} from "./contacts";
import type { GhlSyncConfig, GhlSyncContext, SyncOutcome } from "./types";

export async function syncOrderWithGhl(config: GhlSyncConfig | undefined, context: GhlSyncContext): Promise<SyncOutcome | null> {
  if (!config) {
    logger.debug("ghl.skip_no_config", { offerId: context.offerId });
    return null;
  }

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    logger.warn("ghl.skip_missing_credentials", { offerId: context.offerId });
    return null;
  }

  if (!context.customerEmail) {
    logger.warn("ghl.skip_missing_email", { offerId: context.offerId });
    return null;
  }

  const affiliateIdValue = context.metadata?.affiliateId ?? undefined;
  const { firstName, lastName } = splitName(context.customerName);
  const baseContext: Record<string, unknown> = {
    ...context,
    ...(context.metadata ?? {}),
    firstName,
    lastName,
    affiliateId: affiliateIdValue,
    amountDecimal: context.amountTotal != null ? context.amountTotal / 100 : undefined,
  };

  const purchaseMetadataJson = buildPurchaseMetadata(context);
  const licenseKeysJson = buildLicenseKeysPayload(context);

  const contactFieldContext: Record<string, unknown> = {
    ...baseContext,
    purchaseMetadataJson,
    licenseKeysJson,
  };

  const resolvedContactCustomFieldIds = await resolveContactCustomFieldIds(config.contactCustomFieldIds);

  const contactCustomFields = buildCustomFieldPayload(resolvedContactCustomFieldIds, contactFieldContext);

  const affiliateFieldId = process.env.GHL_AFFILIATE_FIELD_ID;
  if (affiliateFieldId && affiliateIdValue) {
    contactCustomFields.push({ id: affiliateFieldId, value: affiliateIdValue });
  }

  const contactSource = config.source ?? (context.provider === "paypal" ? "PayPal Checkout" : "Stripe Checkout");

  const contactResult = await upsertContact({
    email: context.customerEmail,
    firstName,
    lastName,
    phone: context.customerPhone ?? undefined,
    source: contactSource,
    tags: config.tagIds,
    customFields: contactCustomFields,
  });

  const contactId = contactResult?.contactId;
  if (!contactId) {
    logger.warn("ghl.contact_missing_id", {
      offerId: context.offerId,
      email: context.customerEmail,
    });
    return null;
  }

  logger.info("ghl.contact_upserted", {
    offerId: context.offerId,
    stripePaymentIntentId: context.stripePaymentIntentId ?? null,
    email: context.customerEmail,
    contactId,
  });

  const shouldCreateOpportunity = Boolean(config.pipelineId && config.stageId);

  if (shouldCreateOpportunity) {
    const opportunityName = renderTemplate(
      config.opportunityNameTemplate,
      {
        ...baseContext,
        contactFirstName: firstName,
        contactLastName: lastName,
      },
      `${context.offerName} Purchase`,
    );

    const opportunityCustomFields = buildCustomFieldPayload(config.opportunityCustomFieldIds, {
      ...baseContext,
      contactId,
    });

    const monetaryValue = typeof context.amountTotal === "number" ? Math.max(context.amountTotal / 100, 0) : undefined;

    await createOpportunity({
      contactId,
      pipelineId: config.pipelineId!,
      stageId: config.stageId!,
      name: opportunityName,
      monetaryValue,
      currency: context.currency ?? "USD",
      status: config.status ?? "open",
      source: config.source ?? "Stripe Checkout",
      tags: config.tagIds,
      customFields: opportunityCustomFields,
    });

    logger.info("ghl.opportunity_created", {
      offerId: context.offerId,
      contactId,
      pipelineId: config.pipelineId,
      stageId: config.stageId,
    });
  } else {
    logger.debug("ghl.skip_opportunity_creation", {
      offerId: context.offerId,
      reason: "missing_pipeline_or_stage",
    });
  }

  if (config.workflowIds && config.workflowIds.length > 0) {
    for (const workflowId of config.workflowIds) {
      if (!workflowId) continue;
      try {
        await triggerWorkflow(workflowId, contactId);
      } catch (error) {
        logger.error("ghl.trigger_workflow_failed", {
          workflowId,
          contactId,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
      }
    }
  }

  return { contactId, opportunityCreated: shouldCreateOpportunity };
}

