import { z } from "zod";

// Customer validation schema
export const customerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(100, "Email too long"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters")
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]+$/, "Invalid phone number format")
    .min(10, "Phone number too short")
    .max(32, "Phone number too long")
    .optional(),
});

// Coupon validation schema
export const couponSchema = z.object({
  code: z
    .string()
    .min(3, "Coupon code too short")
    .max(50, "Coupon code too long")
    .regex(/^[A-Z0-9_-]+$/i, "Invalid coupon format")
    .optional(),
});

// Checkout session request schema
export const checkoutSessionSchema = z.object({
  offerId: z
    .string()
    .min(1, "Offer ID is required")
    .max(100, "Offer ID too long")
    .regex(/^[a-z0-9-]+$/, "Invalid offer ID format"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum quantity is 10")
    .default(1),
  mode: z.enum(["payment", "subscription"]).optional(),
  uiMode: z.enum(["hosted", "embedded"]).default("hosted"),
  clientReferenceId: z
    .string()
    .max(200, "Client reference ID too long")
    .optional(),
  affiliateId: z
    .string()
    .min(1, "Affiliate ID cannot be empty")
    .max(100, "Affiliate ID too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid affiliate ID format")
    .optional(),
  metadata: z
    .record(z.string().max(500))
    .refine(
      (obj) => Object.keys(obj).length <= 50,
      "Too many metadata fields (max 50)"
    )
    .optional(),
  customer: customerSchema.optional(),
  couponCode: z.string().optional(),
});

// PayPal order validation
export const paypalOrderSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  price: z
    .string()
    .regex(/^\$?\d+(\.\d{2})?$/, "Invalid price format"),
  affiliateId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  couponCode: z.string().optional(),
});

// Webhook validation schemas
export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal("event"),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
});

export const paypalWebhookEventSchema = z.object({
  id: z.string(),
  event_version: z.string(),
  create_time: z.string(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string().optional(),
  resource: z.record(z.any()),
});

// Validation helper functions
export function validateCheckoutSession(data: unknown) {
  return checkoutSessionSchema.safeParse(data);
}

export function validateCustomer(data: unknown) {
  return customerSchema.safeParse(data);
}

export function validateCoupon(data: unknown) {
  return couponSchema.safeParse(data);
}

export function sanitizeInput(input: string): string {
  // Remove any HTML tags and script content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Rate limiting helpers
export const rateLimitSchema = z.object({
  ip: z.string(),
  endpoint: z.string(),
  timestamp: z.number(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type PayPalOrderInput = z.infer<typeof paypalOrderSchema>;