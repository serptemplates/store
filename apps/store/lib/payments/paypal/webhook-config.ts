import { PAYMENT_ACCOUNTS, getPayPalEnvVarCandidates } from "@/config/payment-accounts";
import type { PayPalMode } from "@/lib/payments/paypal/api";

export type WebhookCandidate = {
  alias: string | null;
  mode: PayPalMode;
  webhookId: string;
};

function readEnvValue(envNames: string[]): string | null {
  for (const envName of envNames) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function buildPayPalWebhookCandidates(): WebhookCandidate[] {
  const entries: WebhookCandidate[] = [];
  const aliases = Object.keys(PAYMENT_ACCOUNTS.paypal);
  for (const alias of aliases) {
    (['live', 'test'] as const).forEach((mode) => {
      const { values } = getPayPalEnvVarCandidates(alias, "webhookId", mode);
      const webhookId = readEnvValue(values);
      if (webhookId) {
        entries.push({
          alias,
          mode,
          webhookId,
        });
      }
    });
  }

  if (entries.length === 0) {
    const defaultAlias = null;
    (['live', 'test'] as const).forEach((mode) => {
      const { values } = getPayPalEnvVarCandidates(defaultAlias, "webhookId", mode);
      const webhookId = readEnvValue(values);
      if (webhookId) {
        entries.push({
          alias: defaultAlias,
          mode,
          webhookId,
        });
      }
    });
  }

  return entries;
}
