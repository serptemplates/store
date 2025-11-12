import type { ProductData } from "./product-schema";

export function usesTrademarkedBrand(product?: Pick<ProductData, "trademark_metadata"> | null): boolean {
  return Boolean(product?.trademark_metadata?.uses_trademarked_brand);
}

export function formatUnofficialTitle(baseTitle: string, productName: string): string {
  const trimmedTitle = baseTitle.trim();
  const trimmedProductName = productName.trim();
  const lowercasedTitle = trimmedTitle.toLowerCase();

  if (!trimmedProductName) {
    return trimmedTitle || "(Unofficial)";
  }

  if (lowercasedTitle.includes("(unofficial)")) {
    return trimmedTitle || `${trimmedProductName} (Unofficial)`;
  }

  const unofficialPrefix = `${trimmedProductName} (Unofficial)`;
  const pipeIndex = trimmedTitle.indexOf("|");

  if (pipeIndex === -1) {
    const normalizedProductName = trimmedProductName.toLowerCase();
    if (normalizedProductName && lowercasedTitle.startsWith(normalizedProductName)) {
      const remainder = trimmedTitle.slice(trimmedProductName.length).trimStart();
      return `${unofficialPrefix}${remainder ? ` ${remainder}` : ""}`.trim();
    }

    return `${unofficialPrefix}${trimmedTitle ? ` | ${trimmedTitle}` : ""}`.trim();
  }

  const remainder = trimmedTitle.slice(pipeIndex + 1).trim();
  return remainder ? `${unofficialPrefix} | ${remainder}` : unofficialPrefix;
}

export function resolveSeoTitle(product: ProductData, baseTitle: string): string {
  return usesTrademarkedBrand(product) ? formatUnofficialTitle(baseTitle, product.name) : baseTitle.trim();
}

export function resolveSeoProductName(product: ProductData): string {
  const trimmed = product.name?.trim() ?? "";
  if (!trimmed) {
    return "(Unofficial)";
  }
  return usesTrademarkedBrand(product) ? formatUnofficialTitle(trimmed, trimmed) : trimmed;
}

const AUTHORIZED_USE_LINE = "Authorized-use only — download content you own or have permission to access.";

function stripExistingCompliance(base: string, complianceLine: string, productLabel: string): string {
  let remaining = base.trim();
  if (!remaining) {
    return remaining;
  }

  const variants = [
    complianceLine,
    `${productLabel} (Unofficial).`,
    AUTHORIZED_USE_LINE,
  ]
    .map((variant) => variant.trim())
    .filter(Boolean);

  const lowerVariants = variants.map((variant) => variant.toLowerCase());

  let changed = true;
  while (remaining && changed) {
    changed = false;
    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      const lowerVariant = lowerVariants[index];
      if (!variant) {
        continue;
      }

      const candidate = remaining.slice(0, variant.length).toLowerCase();
      if (candidate === lowerVariant) {
        remaining = remaining.slice(variant.length).trimStart();
        changed = true;
      }
    }
  }

  return remaining;
}

export function resolveSeoDescription(product: ProductData, baseDescription?: string): string {
  const normalizedBase =
    baseDescription?.trim() ||
    product.seo_description?.trim() ||
    product.tagline?.trim() ||
    "";

  if (!usesTrademarkedBrand(product)) {
    return normalizedBase || "Download content you own or have permission to access.";
  }

  const productLabel = product.name?.trim() || "This tool";
  const complianceLine = `${productLabel} (Unofficial). ${AUTHORIZED_USE_LINE}`.trim();

  const sanitizedBase = normalizedBase ? stripExistingCompliance(normalizedBase, complianceLine, productLabel) : "";

  return sanitizedBase ? `${complianceLine} ${sanitizedBase}` : complianceLine;
}
