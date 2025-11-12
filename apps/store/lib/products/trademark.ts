import type { ProductData } from "./product-schema";
import { getTrademarkPolicy } from "@/lib/config/policy";

function buildBrandDomainLabel(tradeName: string, suffix: string): string {
  const compact = tradeName.replace(/[^a-z0-9]/gi, "");
  const label = compact.length > 0 ? compact : tradeName.replace(/\s+/g, "");
  return `${label}${suffix}`;
}

function sanitizeLegalEntity(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  const invalidIndicators = ["unknown", "unverified", "no verifiable", "n/a", "not provided", "unspecified"];
  if (invalidIndicators.some((phrase) => normalized.includes(phrase))) {
    return "";
  }
  return trimmed;
}

export function formatTrademarkDisclaimer(product: Pick<ProductData, "name" | "trademark_metadata">): string | null {
  const metadata = product.trademark_metadata;
  if (!metadata?.uses_trademarked_brand) {
    return null;
  }

  const tradeName = metadata.trade_name ?? product.name;
  if (!tradeName) {
    return null;
  }

  const productName = product.name ?? tradeName;
  if (!productName) {
    return null;
  }

  const policy = getTrademarkPolicy();
  const normalizedLegalEntity = sanitizeLegalEntity(metadata.legal_entity);
  const fallbackLegalEntity = sanitizeLegalEntity(policy.fallbackLegalEntity);
  const legalEntity = normalizedLegalEntity || fallbackLegalEntity;
  const hasLegalEntity = Boolean(legalEntity);
  const legalEntitySegment = hasLegalEntity ? `, ${legalEntity}` : "";
  const domainLabel = buildBrandDomainLabel(tradeName, policy.domainSuffix);

  return applyDisclaimerTemplate(policy.disclaimerTemplate, {
    productName,
    brandName: tradeName,
    tradeName,
    domain: domainLabel,
    legalEntity,
    legalEntitySegment,
  });
}

export function deriveTrademarkDomainLabel(tradeName: string): string {
  const { domainSuffix } = getTrademarkPolicy();
  return buildBrandDomainLabel(tradeName, domainSuffix);
}

type DisclaimerTemplateParams = {
  productName: string;
  brandName: string;
  tradeName: string;
  domain: string;
  legalEntity: string;
  legalEntitySegment: string;
};

function applyDisclaimerTemplate(template: string, params: DisclaimerTemplateParams): string {
  let output = template
    .replace(/{{\s*productName\s*}}/gi, params.productName)
    .replace(/{{\s*brandName\s*}}/gi, params.brandName)
    .replace(/{{\s*tradeName\s*}}/gi, params.tradeName)
    .replace(/{{\s*domain\s*}}/gi, params.domain)
    .replace(/{{\s*legalEntity\s*}}/gi, params.legalEntity)
    .replace(/{{\s*legalEntitySegment\s*}}/gi, params.legalEntitySegment);

  output = output.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
  return output;
}
