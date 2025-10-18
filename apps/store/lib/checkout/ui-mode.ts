export type CheckoutUiMode = "embedded" | "hosted";

function normalizeMode(value: string | undefined | null): CheckoutUiMode {
  if (!value) {
    return "embedded";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "hosted") {
    return "hosted";
  }

  return "embedded";
}

const DEFAULT_CHECKOUT_MODE: CheckoutUiMode = normalizeMode(
  process.env.NEXT_PUBLIC_CHECKOUT_UI ?? process.env.CHECKOUT_UI,
);

export function getCheckoutUiMode(): CheckoutUiMode {
  return DEFAULT_CHECKOUT_MODE;
}

export function isHostedCheckoutEnabled(): boolean {
  return DEFAULT_CHECKOUT_MODE === "hosted";
}

export function resolveCheckoutUiModeOverride(raw: string | undefined | null): CheckoutUiMode | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "embedded" || normalized === "hosted") {
    return normalized;
  }

  return null;
}
