import { findCheckoutSessionByStripeSessionId } from "@/lib/checkout";

interface WaitForGhlSyncOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

type CheckoutSessionRecord = Awaited<ReturnType<typeof findCheckoutSessionByStripeSessionId>>;
type ResolvedCheckoutSession = NonNullable<CheckoutSessionRecord>;

function toRecordMetadata(record: CheckoutSessionRecord | null): Record<string, unknown> {
  return (record?.metadata ?? {}) as Record<string, unknown>;
}

export async function waitForGhlSync(
  sessionId: string,
  options: WaitForGhlSyncOptions = {},
): Promise<ResolvedCheckoutSession> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;

  const deadline = Date.now() + timeoutMs;
  let lastRecord: CheckoutSessionRecord | null = null;

  while (Date.now() < deadline) {
    const record = await findCheckoutSessionByStripeSessionId(sessionId);
    lastRecord = record;

    const metadata = toRecordMetadata(record);
    const syncError = typeof metadata.ghlSyncError === "string" ? metadata.ghlSyncError : null;

    if (syncError && syncError.length > 0) {
      throw new Error(`GHL sync error: ${syncError}`);
    }

    const syncedAt = typeof metadata.ghlSyncedAt === "string" ? metadata.ghlSyncedAt : null;
    if (record?.status === "completed" && syncedAt && syncedAt.length > 0) {
      return record as ResolvedCheckoutSession;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const lastMetadata = JSON.stringify(toRecordMetadata(lastRecord));
  throw new Error(
    `Timed out waiting for GHL sync on session "${sessionId}" (last metadata: ${lastMetadata})`,
  );
}
