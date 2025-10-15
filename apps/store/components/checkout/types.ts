export type CheckoutOrderBump = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  price: number;
  priceDisplay: string;
  originalPrice?: number;
  originalPriceDisplay?: string;
  note?: string;
  badge?: string;
  terms?: string;
  defaultSelected: boolean;
  points: string[];
  stripePriceId: string;
  stripeTestPriceId?: string;
};

export type CheckoutProduct = {
  slug: string;
  name: string;
  title: string;
  price: number;
  priceDisplay: string;
  originalPrice?: number;
  originalPriceDisplay?: string;
  currency?: string;
  note?: string;
  badge?: string;
  orderBump?: CheckoutOrderBump;
};
