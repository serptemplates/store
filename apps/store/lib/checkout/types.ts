export type CheckoutSource = "stripe" | "paypal" | "ghl";

export type CheckoutSessionStatus = "pending" | "completed" | "failed" | "abandoned";

export interface CheckoutSessionRecord {
  id: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  offerId: string;
  landerId: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
  status: CheckoutSessionStatus;
  source: CheckoutSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutSessionUpsert {
  stripeSessionId: string;
  offerId: string;
  landerId?: string | null;
  paymentIntentId?: string | null;
  customerEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: CheckoutSessionStatus;
  source?: CheckoutSource;
}

export interface CheckoutOrderUpsert {
  checkoutSessionId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  offerId?: string | null;
  landerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  source?: CheckoutSource;
}

export interface OrderRecord {
  id: string;
  checkoutSessionId: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  offerId: string | null;
  landerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  amountTotal: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
  paymentStatus: string | null;
  paymentMethod: string | null;
  source: CheckoutSource;
  checkoutSessionStatus: CheckoutSessionStatus | null;
  checkoutSessionSource: CheckoutSource | null;
  createdAt: Date;
  updatedAt: Date;
}
