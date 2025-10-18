export type CheckoutUiMode = "embedded" | "hosted";

function normalizeMode(value: string | undefined | null): CheckoutUiMode {
  if (!value) {
    return "hosted";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "embedded") {
    return "embedded";
  }

  if (normalized === "hosted" || normalized === "1") {
    return "hosted";
  }

  if (normalized === "2") {
    return "embedded";
  }

  return "hosted";
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
  if (normalized === "1" || normalized === "hosted") {
    return "hosted";
  }
  if (normalized === "2" || normalized === "embedded") {
    return "embedded";
  }
  return null;
}
