#!/usr/bin/env tsx
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

type OrderRecord = import("@/lib/checkout/store").OrderRecord;

let findRefundedOrdersFn: typeof import("@/lib/checkout/store").findRefundedOrders;
let updateOrderMetadataFn: typeof import("@/lib/checkout/store").updateOrderMetadata;
let markLicenseAsRefundedFn: typeof import("@/lib/license-service").markLicenseAsRefunded;
let clearContactCustomFieldFn: typeof import("@/lib/ghl-client").clearContactCustomField;
let getOfferConfigFn: typeof import("@/lib/products/offer-config").getOfferConfig;
let fetchContactLicensesByEmailFn: typeof import("@/lib/ghl-client").fetchContactLicensesByEmail;

type CommandLineOptions = {
  dryRun: boolean;
  email?: string;
  orderId?: string;
  limit?: number;
  includeGhl: boolean;
  includeDb: boolean;
};

const SCRIPT_NAME = "revoke-refunded-licenses";
const DEFAULT_LICENSE_FIELD_KEY = "contact.license_keys_v2";

function loadEnvironment() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..", "..", "..");
  const storeDir = path.resolve(scriptDir, "..");

  loadEnv({ path: path.join(repoRoot, ".env.local") });
  loadEnv({ path: path.join(repoRoot, ".env") });
  loadEnv({ path: path.join(storeDir, ".env.local") });
  loadEnv({ path: path.join(storeDir, ".env") });
  loadEnv({ path: path.join(process.cwd(), ".env.local") });
  loadEnv({ path: path.join(process.cwd(), ".env") });
}

function parseArgs(argv: string[]): CommandLineOptions {
  const options: CommandLineOptions = {
    dryRun: false,
    includeGhl: true,
    includeDb: true,
  };

  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--email=")) {
      options.email = arg.split("=", 2)[1]?.trim().toLowerCase();
      continue;
    }

    if (arg.startsWith("--order=")) {
      options.orderId = arg.split("=", 2)[1]?.trim();
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const raw = Number.parseInt(arg.split("=", 2)[1] ?? "", 10);
      if (Number.isFinite(raw) && raw > 0) {
        options.limit = raw;
      }
      continue;
    }

    if (arg === "--no-ghl") {
      options.includeGhl = false;
      continue;
    }

    if (arg === "--no-db") {
      options.includeDb = false;
      continue;
    }
  }

  return options;
}

function normalizeOfferId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalised = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalised || null;
}

function resolveOfferId(order: OrderRecord): string | null {
  if (order.offerId) {
    return order.offerId;
  }

  const metadata = order.metadata ?? {};
  const candidates = [
    metadata.offerId,
    metadata.productSlug,
    metadata.product_id,
    metadata.productSlug?.toString?.(),
  ];

  for (const candidate of candidates) {
    const resolved = normalizeOfferId(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

type LicenseConfig = {
  tier: string | null;
  entitlements: string[];
  features: Record<string, unknown>;
};

type LicenseTask =
  | {
      kind: "postgres";
      order: OrderRecord;
    }
  | {
      kind: "ghl";
      email: string;
      offerId: string | null;
      entitlements: string[];
      licenseKey: string | null;
      sourceField: string;
      issuedAt: string | null;
    };

function deriveLicenseConfig(order: OrderRecord): LicenseConfig {
  const metadata = order.metadata ?? {};
  const offerId = resolveOfferId(order);
  const entitlements = new Set<string>();
  const features: Record<string, unknown> = {};

  if (offerId) {
    entitlements.add(offerId);
  }

  const productMetadata = offerId ? getOfferConfigFn(offerId)?.metadata ?? {} : {};

  const metadataSources = [
    metadata,
    productMetadata,
  ];

  for (const source of metadataSources) {
    const rawEntitlements = (source as Record<string, unknown>).licenseEntitlements;
    if (Array.isArray(rawEntitlements)) {
      for (const entry of rawEntitlements) {
        const normalised = normalizeOfferId(entry);
        if (normalised) {
          entitlements.add(normalised);
        }
      }
    } else if (typeof rawEntitlements === "string") {
      rawEntitlements
        .split(/[,;|\s]+/)
        .map((part) => normalizeOfferId(part))
        .filter((slug): slug is string => Boolean(slug))
        .forEach((slug) => entitlements.add(slug));
    }

    const rawFeatures = (source as Record<string, unknown>).licenseFeatures;
    if (rawFeatures && typeof rawFeatures === "object" && !Array.isArray(rawFeatures)) {
      Object.assign(features, rawFeatures as Record<string, unknown>);
    } else if (typeof rawFeatures === "string") {
      try {
        const parsed = JSON.parse(rawFeatures) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          Object.assign(features, parsed);
        }
      } catch {
        // ignore malformed JSON
      }
    }
  }

  const tierCandidate =
    typeof metadata.licenseTier === "string" && metadata.licenseTier.trim().length > 0
      ? metadata.licenseTier.trim()
      : typeof productMetadata.licenseTier === "string" && productMetadata.licenseTier.trim().length > 0
        ? productMetadata.licenseTier.trim()
        : offerId;

  return {
    tier: tierCandidate ?? null,
    entitlements: Array.from(entitlements),
    features,
  };
}

function formatCurrency(amountCents: number | null | undefined): number | null {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) {
    return null;
  }
  return Number((amountCents / 100).toFixed(2));
}

function licenseAlreadyRevoked(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) {
    return false;
  }

  if (metadata.licenseRevokedAt != null) {
    return true;
  }

  const license = metadata.license;
  if (license && typeof license === "object" && !Array.isArray(license)) {
    const statusRaw =
      (license as Record<string, unknown>).status ??
      (license as Record<string, unknown>).action ??
      null;

    if (typeof statusRaw === "string") {
      const normalised = statusRaw.trim().toLowerCase();
      if (["revoked", "refunded", "cancelled", "canceled"].includes(normalised)) {
        return true;
      }
    }
  }

  return false;
}

async function collectRefundedOrders(options: CommandLineOptions): Promise<OrderRecord[]> {
  if (!options.includeDb) {
    return [];
  }

  const limit = options.limit ?? (options.email || options.orderId ? 200 : 1000);

  let fetched: OrderRecord[] = [];

  try {
    fetched = await findRefundedOrdersFn({
      limit,
      skipIfMetadataFlag: "licenseRevokedAt",
    });
  } catch (error) {
    console.warn(`[${SCRIPT_NAME}] Unable to query Postgres refunds:`, error);
    return [];
  }

  return fetched.filter((order) => {
    if (licenseAlreadyRevoked(order.metadata)) {
      return false;
    }
    if (options.email && order.customerEmail?.toLowerCase() !== options.email) {
      return false;
    }
    if (options.orderId && order.id !== options.orderId) {
      return false;
    }
    return true;
  });
}

type GhlTask = Extract<LicenseTask, { kind: "ghl" }>;

async function collectGhlRefundsFromRoster(options: CommandLineOptions): Promise<GhlTask[]> {
  const rosterPath = path.resolve(process.cwd(), "ghl-contacts-with-license-keys.json");

  if (!existsSync(rosterPath)) {
    return [];
  }

  try {
    const raw = await fs.readFile(rosterPath, "utf8");
    const data = JSON.parse(raw) as {
      contacts?: Array<{
        email?: string;
        licenseFields?: Array<{ uniqueKey?: string; value?: unknown; id?: string }>;
      }>;
    };

    const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
    const tasks: GhlTask[] = [];

    for (const contact of contacts) {
      const emailRaw = typeof contact.email === "string" ? contact.email.trim().toLowerCase() : null;
      if (!emailRaw) {
        continue;
      }

      if (options.email && emailRaw !== options.email) {
        continue;
      }

      const fields = Array.isArray(contact.licenseFields) ? contact.licenseFields : [];

      for (const field of fields) {
        if (!field || typeof field.value !== "string") {
          continue;
        }

        const trimmedValue = field.value.trim();
        if (!trimmedValue.startsWith("{")) {
          continue;
        }

        let payload: {
          key?: string;
          action?: string;
          status?: string;
          entitlements?: unknown;
          tier?: string | null;
        };

        try {
          payload = JSON.parse(trimmedValue) as typeof payload;
        } catch {
          continue;
        }

        const action = payload?.action?.toLowerCase() ?? "";
        const status = payload?.status?.toLowerCase() ?? "";
        if (
          !["revoked", "refunded"].includes(action) &&
          !["revoked", "refunded"].includes(status)
        ) {
          continue;
        }

        const entitlements = Array.isArray(payload?.entitlements)
          ? payload.entitlements.map((entry) => (typeof entry === "string" ? entry : null)).filter(
              (entry): entry is string => Boolean(entry),
            )
          : [];

        const offerId = payload?.tier ?? entitlements[0] ?? null;

        tasks.push({
          kind: "ghl",
          email: emailRaw,
          offerId,
          entitlements,
          licenseKey: typeof payload?.key === "string" ? payload.key : null,
          sourceField: field.id ?? field.uniqueKey ?? "contact.license_keys_v2",
          issuedAt: null,
        });
      }
    }

    return tasks;
  } catch (error) {
    console.warn(`[${SCRIPT_NAME}] Unable to read ghl-contacts-with-license-keys.json:`, error);
    return [];
  }
}

async function collectGhlRefunds(options: CommandLineOptions, baseOrders: OrderRecord[]): Promise<LicenseTask[]> {
  if (!options.includeGhl) {
    return [];
  }

  const emails = new Set<string>();

  for (const order of baseOrders) {
    if (order.customerEmail) {
      emails.add(order.customerEmail.toLowerCase());
    }
  }

  if (options.email) {
    emails.add(options.email.toLowerCase());
  }

  const seen = new Set<string>();
  const tasks: LicenseTask[] = [];

  const rosterTasks = await collectGhlRefundsFromRoster(options);
  for (const task of rosterTasks) {
    const key = `${task.email}|${task.offerId ?? "unknown"}`;
    if (!seen.has(key)) {
      seen.add(key);
      tasks.push(task);
      emails.add(task.email);
    }
  }

  for (const email of emails) {
    // eslint-disable-next-line no-await-in-loop
    const licenses = await fetchContactLicensesByEmailFn(email).catch(() => []);

    for (const license of licenses) {
      const status = license.action?.toLowerCase() ?? "";
      const statusField =
        typeof (license as unknown as { status?: string }).status === "string"
          ? (license as unknown as { status?: string }).status!.toLowerCase()
          : "";

      if (
        !["revoked", "refunded"].includes(status) &&
        !["revoked", "refunded"].includes(statusField)
      ) {
        continue;
      }

      const offerId = license.offerId ?? license.entitlements[0] ?? null;
      const key = `${email}|${offerId ?? "unknown"}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      tasks.push({
        kind: "ghl",
        email,
        offerId,
        entitlements: license.entitlements ?? [],
        licenseKey: license.key ?? null,
        sourceField: license.sourceField,
        issuedAt: license.issuedAt ?? null,
      });
    }
  }

  return tasks;
}

async function processPostgresTask(order: OrderRecord, options: CommandLineOptions): Promise<void> {
  const email = order.customerEmail?.trim().toLowerCase();
  if (!email) {
    console.warn(`[${SCRIPT_NAME}] Skipping order ${order.id} (missing customer email).`);
    return;
  }

  const offerId = resolveOfferId(order);
  if (!offerId) {
    console.warn(
      `[${SCRIPT_NAME}] Skipping order ${order.id} for ${email} (unable to determine offer/product slug).`,
    );
    return;
  }

  const licenseConfig = deriveLicenseConfig(order);
  const revocationTimestamp = new Date().toISOString();
  const providerObjectId = order.stripePaymentIntentId ?? order.stripeChargeId ?? order.stripeSessionId ?? order.id;
  const eventId = `refund-${order.id}`;
  const currency = order.currency ? order.currency.toLowerCase() : null;
  const amountMajorUnits = formatCurrency(order.amountTotal);

  console.log(
    `[${SCRIPT_NAME}] ${options.dryRun ? "[dry-run] " : ""}Revoking license for ${email} (${offerId}) – order ${order.id}`,
  );

  if (options.dryRun) {
    console.log(
      `[${SCRIPT_NAME}]   • Would mark license service purchase as refunded (provider: ${order.source}, event: ${eventId}).`,
    );
    console.log(
      `[${SCRIPT_NAME}]   • Would clear GHL field ${process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 ?? DEFAULT_LICENSE_FIELD_KEY}.`,
    );
    console.log(`[${SCRIPT_NAME}]   • Would update Postgres metadata with revoked status.`);
    return;
  }

  await markLicenseAsRefundedFn({
    eventId,
    provider: order.source,
    providerObjectId,
    userEmail: email,
    tier: licenseConfig.tier ?? undefined,
    entitlements: licenseConfig.entitlements,
    features: Object.keys(licenseConfig.features).length > 0 ? licenseConfig.features : undefined,
    amount: amountMajorUnits,
    currency,
    reason: "refund",
    originalEventId: order.stripePaymentIntentId ?? order.stripeSessionId ?? null,
    metadata: {
      orderId: order.id,
      offerId,
      stripeSessionId: order.stripeSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      refundProcessedAt: revocationTimestamp,
    },
    rawEvent: {
      source: `scripts.${SCRIPT_NAME}`,
      orderId: order.id,
    },
  }).catch((error) => {
    console.error(
      `[${SCRIPT_NAME}]   • Failed to notify license service for ${email} (${offerId}):`,
      error,
    );
  });

  await updateOrderMetadataFn(
    {
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeSessionId: order.stripeSessionId,
    },
    {
      license: {
        licenseKey: null,
        licenseId: null,
        status: "revoked",
        revokedAt: revocationTimestamp,
        reason: "refund",
      },
      licenseRevokedAt: revocationTimestamp,
      licenseRevokedReason: "refund",
      licenseFetchSuppressed: true,
    },
  );

  const fieldSpecifier = process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 ?? DEFAULT_LICENSE_FIELD_KEY;

  const clearResult = await clearContactCustomFieldFn(email, {
    fieldSpecifier,
    value: "",
  });

  if (!clearResult.success) {
    console.warn(
      `[${SCRIPT_NAME}]   • Unable to clear GHL field (${fieldSpecifier}) for ${email}; check credentials and field id.`,
    );
  } else {
    console.log(
      `[${SCRIPT_NAME}]   • Cleared GHL custom field ${clearResult.fieldId} for contact ${clearResult.contactId ?? "<unknown>"}.`,
    );
  }
}

async function processGhlTask(task: Extract<LicenseTask, { kind: "ghl" }>, options: CommandLineOptions): Promise<void> {
  const offers = task.entitlements.length > 0 ? task.entitlements : task.offerId ? [task.offerId] : [];
  const offerLabel = offers[0] ?? "unknown-offer";

  console.log(
    `[${SCRIPT_NAME}] ${options.dryRun ? "[dry-run] " : ""}Clearing GHL license field for ${task.email} (${offerLabel}) – source ${task.sourceField}`,
  );

  if (options.dryRun) {
    console.log(
      `[${SCRIPT_NAME}]   • Would send refund event to license service (provider: ghl, offerId: ${offerLabel}).`,
    );
    console.log(
      `[${SCRIPT_NAME}]   • Would clear GHL field ${process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 ?? DEFAULT_LICENSE_FIELD_KEY}.`,
    );
    return;
  }

  await markLicenseAsRefundedFn({
    eventId: `ghl-refund-${task.email}-${offerLabel}`,
    provider: "ghl",
    providerObjectId: task.sourceField,
    userEmail: task.email,
    tier: offerLabel,
    entitlements: offers,
    metadata: {
      offerId: task.offerId,
      ghlSourceField: task.sourceField,
      issuedAt: task.issuedAt,
    },
    reason: "refund",
    amount: null,
    currency: null,
  }).catch((error) => {
    console.error(
      `[${SCRIPT_NAME}]   • Failed to notify license service for ${task.email} (${offerLabel}):`,
      error,
    );
  });

  const fieldSpecifier = process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 ?? DEFAULT_LICENSE_FIELD_KEY;
  const clearResult = await clearContactCustomFieldFn(task.email, {
    fieldSpecifier,
    value: "",
  });

  if (!clearResult.success) {
    console.warn(
      `[${SCRIPT_NAME}]   • Unable to clear GHL field (${fieldSpecifier}) for ${task.email}; check credentials and field id.`,
    );
  } else {
    console.log(
      `[${SCRIPT_NAME}]   • Cleared GHL custom field ${clearResult.fieldId} for contact ${clearResult.contactId ?? "<unknown>"}.`,
    );
  }
}

async function processTask(task: LicenseTask, options: CommandLineOptions): Promise<void> {
  if (task.kind === "postgres") {
    await processPostgresTask(task.order, options);
    return;
  }

  await processGhlTask(task, options);
}

async function main() {
  loadEnvironment();

  const [
    checkoutStore,
    licenseService,
    ghlClient,
    productsModule,
  ] = await Promise.all([
    import("@/lib/checkout/store"),
    import("@/lib/license-service"),
    import("@/lib/ghl-client"),
    import("@/lib/products/offer-config"),
  ]);

  findRefundedOrdersFn = checkoutStore.findRefundedOrders;
  updateOrderMetadataFn = checkoutStore.updateOrderMetadata;
  markLicenseAsRefundedFn = licenseService.markLicenseAsRefunded;
  clearContactCustomFieldFn = ghlClient.clearContactCustomField;
  fetchContactLicensesByEmailFn = ghlClient.fetchContactLicensesByEmail;
  getOfferConfigFn = productsModule.getOfferConfig;

  const options = parseArgs(process.argv.slice(2));

  const postgresOrders = await collectRefundedOrders(options);
  const tasks: LicenseTask[] = postgresOrders.map((order) => ({ kind: "postgres", order }));

  const ghlTasks = await collectGhlRefunds(options, postgresOrders);
  tasks.push(...ghlTasks);

  if (tasks.length === 0) {
    console.log(`[${SCRIPT_NAME}] No refunded orders or GHL licenses found that require revocation.`);
    return;
  }

  console.log(
    `[${SCRIPT_NAME}] Processing ${tasks.length} refund${tasks.length === 1 ? "" : "s"}${
      options.dryRun ? " (dry run)" : ""
    }...`,
  );

  for (const task of tasks) {
    // eslint-disable-next-line no-await-in-loop
    await processTask(task, options);
  }

  console.log(`[${SCRIPT_NAME}] Completed.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT_NAME}] Fatal error`, error);
  process.exitCode = 1;
});
