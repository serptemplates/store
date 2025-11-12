import { getSiteConfig, type SiteConfig } from "@/lib/site-config";

export type TrademarkPolicy = {
  disclaimerTemplate: string;
  domainSuffix: string;
  fallbackLegalEntity: string | null;
};

function extractPolicyFromConfig(config: SiteConfig): Partial<TrademarkPolicy> {
  const policy = config.policy?.trademark ?? {};
  return {
    disclaimerTemplate: typeof policy.disclaimerTemplate === "string" ? policy.disclaimerTemplate : undefined,
    domainSuffix: typeof policy.domainSuffix === "string" ? policy.domainSuffix : undefined,
    fallbackLegalEntity:
      policy.fallbackLegalEntity === null
        ? null
        : typeof policy.fallbackLegalEntity === "string"
          ? policy.fallbackLegalEntity
          : undefined,
  };
}

const DEFAULT_TRADEMARK_POLICY: TrademarkPolicy = {
  disclaimerTemplate:
    "{{productName}} is an independent product not affiliated with or endorsed by {{brandName}}{{legalEntitySegment}} or any subsidiaries or affiliates. All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.",
  domainSuffix: ".com",
  fallbackLegalEntity: null,
};

export function getTrademarkPolicy(): TrademarkPolicy {
  const overrides = extractPolicyFromConfig(getSiteConfig());
  return {
    disclaimerTemplate: overrides.disclaimerTemplate ?? DEFAULT_TRADEMARK_POLICY.disclaimerTemplate,
    domainSuffix: overrides.domainSuffix ?? DEFAULT_TRADEMARK_POLICY.domainSuffix,
    fallbackLegalEntity:
      overrides.fallbackLegalEntity !== undefined
        ? overrides.fallbackLegalEntity
        : DEFAULT_TRADEMARK_POLICY.fallbackLegalEntity,
  };
}
