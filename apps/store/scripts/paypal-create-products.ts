import fs from "node:fs/promises";
import path from "node:path";

import { createPayPalPlan, createPayPalProduct, type PayPalMode } from "@/lib/payments/paypal/api";
import { normalizePayPalAccountAlias } from "@/config/payment-accounts";

interface InputProductConfig {
  slug: string;
  name: string;
  description?: string;
  amount_cents: number;
  currency?: string;
  interval_unit?: "MONTH" | "YEAR";
  interval_count?: number;
}

interface CliArgs {
  alias: string | null;
  modes: PayPalMode[];
  inputPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = "true";
    }
  }

  if (!args.input) {
    throw new Error("Missing --input <path> argument");
  }

  const rawModes = args.mode ?? args.modes;
  let modes: PayPalMode[] = ["live", "test"];
  if (rawModes) {
    const parsed = rawModes
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const allowed: PayPalMode[] = [];
    for (const mode of parsed) {
      if (mode === "live" || mode === "test") {
        allowed.push(mode);
      }
    }
    if (allowed.length > 0) {
      modes = allowed;
    }
  }

  return {
    alias: args.alias ? normalizePayPalAccountAlias(args.alias) : null,
    modes,
    inputPath: path.resolve(process.cwd(), args.input),
  };
}

function assertProductConfig(value: unknown): asserts value is InputProductConfig[] {
  if (!Array.isArray(value)) {
    throw new Error("Input file must be a JSON array");
  }
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Entry at index ${index} must be an object`);
    }
    if (typeof item.slug !== "string" || !item.slug.trim()) {
      throw new Error(`Entry at index ${index} is missing slug`);
    }
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error(`Entry at index ${index} is missing name`);
    }
    if (typeof item.amount_cents !== "number" || !Number.isFinite(item.amount_cents) || item.amount_cents <= 0) {
      throw new Error(`Entry at index ${index} must include amount_cents > 0`);
    }
  });
}

function centsToValue(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await fs.readFile(args.inputPath, "utf8");
  const json = JSON.parse(raw) as unknown;
  assertProductConfig(json);

  const results: Array<{
    slug: string;
    mode: PayPalMode;
    productId: string;
    planId: string;
    name: string;
  }> = [];

  for (const product of json) {
    const currency = (product.currency ?? "USD").toUpperCase();
    const intervalUnit = product.interval_unit ?? "MONTH";
    const intervalCount = product.interval_count ?? 1;

    for (const mode of args.modes) {
      const modeLabel = mode === "test" ? "(Sandbox)" : "";
      const productName = product.name + (modeLabel ? ` ${modeLabel}` : "");

      const { product: createdProduct } = await createPayPalProduct({
        payload: {
          name: productName,
          description: product.description ?? product.name,
          type: "DIGITAL_GOODS",
          category: "SOFTWARE",
        },
        accountAlias: args.alias,
        mode,
      });

      const { plan } = await createPayPalPlan({
        payload: {
          product_id: createdProduct.id,
          name: `${productName} Plan`,
          description: product.description ?? product.name,
          billing_cycles: [
            {
              frequency: {
                interval_unit: intervalUnit,
                interval_count: intervalCount,
              },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: {
                  value: centsToValue(product.amount_cents),
                  currency_code: currency,
                },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: "CANCEL",
            payment_failure_threshold: 1,
          },
        },
        accountAlias: args.alias,
        mode,
      });

      results.push({
        slug: product.slug,
        mode,
        productId: createdProduct.id,
        planId: plan.id,
        name: productName,
      });
    }
  }

  console.table(results);
  await fs.writeFile(
    path.resolve(process.cwd(), `paypal-products-output-${Date.now()}.json`),
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
}

main().catch((error) => {
  console.error("paypal:create-products failed", error);
  process.exit(1);
});
