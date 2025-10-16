export type CheckoutOrderBump = {
  id: string;
  title: string;
  description?: string;
  price: number;
  priceDisplay: string;
  defaultSelected: boolean;
  points: string[];
  stripePriceId: string;
  stripeTestPriceId?: string;
  terms?: string;
};

export type CheckoutProduct = {
  slug: string;
  name: string;
  title: string;
  price: number;
  originalPrice?: number;
  priceDisplay: string;
  originalPriceDisplay?: string;
  currency?: string;
  note?: string;
  badge?: string;
  orderBump?: CheckoutOrderBump;
};
