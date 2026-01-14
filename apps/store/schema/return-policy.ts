import type { MerchantReturnPolicySchema } from './types';

export const DEFAULT_MERCHANT_RETURN_POLICY: MerchantReturnPolicySchema = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'US',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
};
