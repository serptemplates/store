import { z } from "zod";

/**
 * Schema describing the payload we POST to the universal license service.
 * This mirrors the `PurchaseProcessingInput` contract that the
 * `serp-license-key-management` backend expects (`backend/src/types/database.ts`).
 */
const expiresAtSchema = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null as number | null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const direct = Number(value);
    if (!Number.isNaN(direct)) {
      return direct;
    }

    if (typeof value === "string") {
      const parsedDate = Date.parse(value);
      if (!Number.isNaN(parsedDate)) {
        return Math.floor(parsedDate / 1000);
      }
    }

    return null;
  });

export const LicenseProviderPurchaseSchema = z.object({
  id: z.string().min(1, "id is required"),
  provider: z.string().min(1, "provider is required"),
  providerObjectId: z.string().min(1).nullable(),
  eventType: z.string().min(1),
  status: z.enum(["completed", "refunded", "cancelled", "failed"]),
  amount: z.number().finite().nullable(),
  currency: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toLowerCase())
    .nullable(),
  userEmail: z.string().email().nullable(),
  tier: z.string().min(1),
  entitlements: z.array(z.string().min(1)).default([]),
  features: z.record(z.unknown()).default({}),
  expiresAt: expiresAtSchema,
  metadata: z.record(z.unknown()).default({}),
  rawEvent: z.unknown(),
});

export type LicenseProviderPurchase = z.infer<typeof LicenseProviderPurchaseSchema>;

export const LicenseProviderResponseSchema = z.object({
  action: z.enum(["created", "updated", "none"]),
  licenseId: z.string().min(1).nullable(),
  licenseKey: z.string().min(1).nullable(),
});

export type LicenseProviderResponse = z.infer<typeof LicenseProviderResponseSchema>;

export function normaliseLicenseProviderPayload(payload: LicenseProviderPurchase): LicenseProviderPurchase {
  const parsed = LicenseProviderPurchaseSchema.parse(payload);
  return {
    ...parsed,
    entitlements: Array.from(new Set(parsed.entitlements.filter(Boolean))),
    features: parsed.features ?? {},
    metadata: parsed.metadata ?? {},
  };
}
