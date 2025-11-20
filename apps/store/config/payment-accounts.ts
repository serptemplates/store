export type PaymentProviderId =
  | "stripe"
  | "whop"
  | "easy_pay_direct"
  | "lemonsqueezy"
  | "paypal";

export type PaymentMode = "live" | "test";

export type EnvVarCandidates = {
  live?: string[];
  test?: string[];
};

export type StripeAccountConfig = {
  alias: string;
  label?: string;
  provider: "stripe";
  env: {
    secretKey?: EnvVarCandidates;
    publishableKey?: EnvVarCandidates;
    webhookSecret?: EnvVarCandidates;
    paymentConfigId?: EnvVarCandidates;
  };
};

export type PayPalAccountConfig = {
  alias: string;
  label?: string;
  provider: "paypal";
  env: {
    clientId?: EnvVarCandidates;
    clientSecret?: EnvVarCandidates;
    webhookId?: EnvVarCandidates;
  };
};

export type PaymentAccountRegistry = {
  stripe: Record<string, StripeAccountConfig>;
  paypal: Record<string, PayPalAccountConfig>;
};

export const DEFAULT_STRIPE_ACCOUNT_ALIAS = "primary" as const;

const env = (names: string[] | undefined): string[] | undefined =>
  names?.filter((name) => typeof name === "string" && name.trim().length > 0);

export const PAYMENT_ACCOUNTS: PaymentAccountRegistry = {
  stripe: {
    [DEFAULT_STRIPE_ACCOUNT_ALIAS]: {
      alias: DEFAULT_STRIPE_ACCOUNT_ALIAS,
      label: "Primary Stripe",
      provider: "stripe",
      env: {
        secretKey: {
          live: env([
            "STRIPE_SECRET_KEY__primary__live",
            "STRIPE_SECRET_KEY_LIVE",
            "STRIPE_SECRET_KEY",
          ]),
          test: env([
            "STRIPE_SECRET_KEY__primary__test",
            "STRIPE_SECRET_KEY_TEST",
            "STRIPE_TEST_SECRET_KEY",
            "STRIPE_SECRET_KEY",
          ]),
        },
        publishableKey: {
          live: env([
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__primary__live",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          ]),
          test: env([
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__primary__test",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          ]),
        },
        webhookSecret: {
          live: env([
            "STRIPE_WEBHOOK_SECRET__primary__live",
            "STRIPE_WEBHOOK_SECRET_LIVE",
            "STRIPE_WEBHOOK_SECRET",
          ]),
          test: env([
            "STRIPE_WEBHOOK_SECRET__primary__test",
            "STRIPE_WEBHOOK_SECRET_TEST",
            "STRIPE_TEST_WEBHOOK_SECRET",
            "STRIPE_WEBHOOK_SECRET",
          ]),
        },
        paymentConfigId: {
          live: env([
            "STRIPE_PAYMENT_CONFIG_ID__primary__live",
            "STRIPE_PAYMENT_CONFIG_ID_LIVE",
            "STRIPE_PAYMENT_CONFIG_ID",
          ]),
          test: env([
            "STRIPE_PAYMENT_CONFIG_ID__primary__test",
            "STRIPE_PAYMENT_CONFIG_ID_TEST",
          ]),
        },
      },
    },
    secondary: {
      alias: "secondary",
      label: "SERP Apps - acct_1PAnSpDP7AOTRcvm",
      provider: "stripe",
      env: {
        secretKey: {
          live: env([
            "STRIPE_SECRET_KEY__secondary__live",
            "STRIPE_SECRET_KEY__secondary",
          ]),
          test: env([
            "STRIPE_SECRET_KEY__secondary__test",
            "STRIPE_SECRET_KEY__secondary",
          ]),
        },
        publishableKey: {
          live: env([
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__secondary__live",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__secondary",
          ]),
          test: env([
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__secondary__test",
            "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__secondary",
          ]),
        },
        webhookSecret: {
          live: env([
            "STRIPE_WEBHOOK_SECRET__secondary__live",
            "STRIPE_WEBHOOK_SECRET__secondary",
          ]),
          test: env([
            "STRIPE_WEBHOOK_SECRET__secondary__test",
            "STRIPE_WEBHOOK_SECRET__secondary",
          ]),
        },
        paymentConfigId: {
          live: env([
            "STRIPE_PAYMENT_CONFIG_ID__secondary__live",
            "STRIPE_PAYMENT_CONFIG_ID__secondary",
          ]),
          test: env([
            "STRIPE_PAYMENT_CONFIG_ID__secondary__test",
            "STRIPE_PAYMENT_CONFIG_ID__secondary",
          ]),
        },
      },
    },
  },
  paypal: {
    serpapps: {
      alias: "serpapps",
      label: "PayPal – SERP Apps",
      provider: "paypal",
      env: {
        clientId: {
          live: env([
            "PAYPAL_CLIENT_ID__serpapps__live",
            "PAYPAL_CLIENT_ID__serpapps",
          ]),
          test: env([
            "PAYPAL_CLIENT_ID__serpapps__test",
            "PAYPAL_CLIENT_ID__serpapps",
          ]),
        },
        clientSecret: {
          live: env([
            "PAYPAL_CLIENT_SECRET__serpapps__live",
            "PAYPAL_CLIENT_SECRET__serpapps",
          ]),
          test: env([
            "PAYPAL_CLIENT_SECRET__serpapps__test",
            "PAYPAL_CLIENT_SECRET__serpapps",
          ]),
        },
        webhookId: {
          live: env([
            "PAYPAL_WEBHOOK_ID__serpapps__live",
            "PAYPAL_WEBHOOK_ID__serpapps",
          ]),
          test: env([
            "PAYPAL_WEBHOOK_ID__serpapps__test",
            "PAYPAL_WEBHOOK_ID__serpapps",
          ]),
        },
      },
    },
  },
};

export function normalizeStripeAccountAlias(alias?: string | null): string {
  if (typeof alias === "string") {
    const trimmed = alias.trim();
    if (trimmed.length > 0) {
      return trimmed.toLowerCase();
    }
  }
  return DEFAULT_STRIPE_ACCOUNT_ALIAS;
}

export function getStripeAccountConfig(alias?: string | null): {
  config: StripeAccountConfig;
  resolvedAlias: string;
  isFallback: boolean;
} {
  const normalizedAlias = normalizeStripeAccountAlias(alias);
  const config = PAYMENT_ACCOUNTS.stripe[normalizedAlias];
  if (config) {
    return { config, resolvedAlias: normalizedAlias, isFallback: false };
  }
  return {
    config: PAYMENT_ACCOUNTS.stripe[DEFAULT_STRIPE_ACCOUNT_ALIAS],
    resolvedAlias: DEFAULT_STRIPE_ACCOUNT_ALIAS,
    isFallback: normalizedAlias !== DEFAULT_STRIPE_ACCOUNT_ALIAS,
  };
}

export function getEnvVarCandidates(
  alias: string | null | undefined,
  field: keyof StripeAccountConfig["env"],
  mode: PaymentMode,
): { values: string[]; resolvedAlias: string; isFallback: boolean } {
  const { config, resolvedAlias, isFallback } = getStripeAccountConfig(alias);
  const candidates = config.env[field]?.[mode] ?? [];
  const values = (candidates.filter((value) => Boolean(value)) as string[]) ?? [];
  return { values, resolvedAlias, isFallback };
}

export const DEFAULT_PAYPAL_ACCOUNT_ALIAS = "serpapps" as const;

export function normalizePayPalAccountAlias(alias?: string | null): string {
  if (typeof alias === "string") {
    const trimmed = alias.trim();
    if (trimmed.length > 0) {
      return trimmed.toLowerCase();
    }
  }
  return DEFAULT_PAYPAL_ACCOUNT_ALIAS;
}

export function getPayPalAccountConfig(alias?: string | null): {
  config: PayPalAccountConfig;
  resolvedAlias: string;
  isFallback: boolean;
} {
  const normalizedAlias = normalizePayPalAccountAlias(alias);
  const config = PAYMENT_ACCOUNTS.paypal[normalizedAlias];
  if (config) {
    return { config, resolvedAlias: normalizedAlias, isFallback: false };
  }
  return {
    config: PAYMENT_ACCOUNTS.paypal[DEFAULT_PAYPAL_ACCOUNT_ALIAS],
    resolvedAlias: DEFAULT_PAYPAL_ACCOUNT_ALIAS,
    isFallback: normalizedAlias !== DEFAULT_PAYPAL_ACCOUNT_ALIAS,
  };
}

export function getPayPalEnvVarCandidates(
  alias: string | null | undefined,
  field: keyof PayPalAccountConfig["env"],
  mode: PaymentMode,
): { values: string[]; resolvedAlias: string; isFallback: boolean } {
  const { config, resolvedAlias, isFallback } = getPayPalAccountConfig(alias);
  const candidates = config.env[field]?.[mode] ?? [];
  const values = (candidates.filter((value) => Boolean(value)) as string[]) ?? [];
  return { values, resolvedAlias, isFallback };
}
