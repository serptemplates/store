/**
 * Analytics and Tracking Contracts
 *
 * Ensures consistent data shapes for Google Analytics, GTM, and other tracking systems
 */

import { z } from 'zod';

// ============= Google Analytics 4 Contracts =============

/**
 * GA4 Enhanced Ecommerce Events
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */
export const GA4EventNameContract = z.enum([
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'add_payment_info',
  'purchase',
  'refund',
  'view_cart',
  'view_item_list',
]);

export const GA4ItemContract = z.object({
  item_id: z.string(),
  item_name: z.string(),
  affiliation: z.string().optional(),
  coupon: z.string().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  discount: z.number().optional(),
  index: z.number().optional(),
  item_brand: z.string().optional(),
  item_category: z.string().optional(),
  item_category2: z.string().optional(),
  item_category3: z.string().optional(),
  item_list_id: z.string().optional(),
  item_list_name: z.string().optional(),
  item_variant: z.string().optional(),
  location_id: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
});

export const GA4PurchaseEventContract = z.object({
  transaction_id: z.string(),
  value: z.number().min(0),
  currency: z.string().length(3).toUpperCase(),
  tax: z.number().optional(),
  shipping: z.number().optional(),
  coupon: z.string().optional(),
  items: z.array(GA4ItemContract),
  affiliation: z.string().optional(),
});

export const GA4BeginCheckoutEventContract = z.object({
  value: z.number().min(0),
  currency: z.string().length(3).toUpperCase(),
  items: z.array(GA4ItemContract),
  coupon: z.string().optional(),
});

// ============= Google Tag Manager Contracts =============

export const GTMDataLayerEventContract = z.object({
  event: z.string(),
  ecommerce: z.object({
    transaction_id: z.string().optional(),
    value: z.number().optional(),
    currency: z.string().optional(),
    items: z.array(z.record(z.unknown())).optional(),
  }).optional(),
  user_data: z.object({
    email: z.string().email().optional(),
    phone_number: z.string().optional(),
    address: z.record(z.string()).optional(),
  }).optional(),
  custom_parameters: z.record(z.unknown()).optional(),
});

// ============= Facebook Pixel Contracts =============

export const FacebookPixelEventContract = z.object({
  event_name: z.enum([
    'PageView',
    'ViewContent',
    'AddToCart',
    'InitiateCheckout',
    'Purchase',
    'Lead',
    'CompleteRegistration',
  ]),
  event_id: z.string(), // For deduplication
  event_time: z.number(), // Unix timestamp
  user_data: z.object({
    em: z.string().optional(), // Hashed email
    ph: z.string().optional(), // Hashed phone
    fn: z.string().optional(), // Hashed first name
    ln: z.string().optional(), // Hashed last name
    external_id: z.string().optional(),
  }).optional(),
  custom_data: z.object({
    value: z.number().optional(),
    currency: z.string().optional(),
    content_ids: z.array(z.string()).optional(),
    content_type: z.string().optional(),
    num_items: z.number().optional(),
  }).optional(),
});

// ============= Unified Analytics Event =============

export const UnifiedAnalyticsEventContract = z.object({
  eventType: z.enum(['pageview', 'conversion', 'engagement', 'error']),
  eventName: z.string(),
  userId: z.string().nullable(),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  properties: z.record(z.unknown()),
  context: z.object({
    page: z.object({
      url: z.string().url(),
      title: z.string(),
      referrer: z.string().optional(),
    }),
    device: z.object({
      type: z.enum(['desktop', 'mobile', 'tablet']),
      os: z.string().optional(),
      browser: z.string().optional(),
    }).optional(),
    campaign: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      name: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    }).optional(),
  }),
});

export type UnifiedAnalyticsEvent = z.infer<typeof UnifiedAnalyticsEventContract>;

// ============= Conversion Tracking Contracts =============

export const ConversionEventContract = z.object({
  conversionId: z.string(),
  conversionType: z.enum(['purchase', 'signup', 'lead', 'download', 'trial']),
  value: z.number().min(0),
  currency: z.string().length(3).toUpperCase(),
  source: z.enum(['organic', 'paid', 'social', 'email', 'direct', 'referral']),
  attributionModel: z.enum(['last_click', 'first_click', 'linear', 'time_decay', 'data_driven']).optional(),
  touchpoints: z.array(z.object({
    timestamp: z.string().datetime(),
    channel: z.string(),
    campaign: z.string().optional(),
    medium: z.string().optional(),
  })).optional(),
});

export type ConversionEvent = z.infer<typeof ConversionEventContract>;

// ============= Server-Side Tracking Contracts =============

export const ServerSideEventContract = z.object({
  api_version: z.string().default('1.0'),
  event_name: z.string(),
  event_time: z.number(), // Unix timestamp in seconds
  action_source: z.enum(['website', 'app', 'offline', 'system_generated']),
  user: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    external_id: z.string().optional(),
    client_ip_address: z.string().ip().optional(),
    client_user_agent: z.string().optional(),
  }),
  custom_data: z.record(z.unknown()),
  data_processing_options: z.array(z.string()).optional(),
});

// ============= Validation Functions =============

/**
 * Validates GA4 purchase event
 */
export function validateGA4Purchase(data: unknown): {
  isValid: boolean;
  errors?: string[];
  parsed?: z.infer<typeof GA4PurchaseEventContract>;
} {
  try {
    const result = GA4PurchaseEventContract.parse(data);
    return { isValid: true, parsed: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Builds GA4 purchase event from order data
 */
export function buildGA4PurchaseEvent(order: {
  id: string;
  amount: number;
  currency: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  coupon?: string;
  affiliateId?: string;
}): z.infer<typeof GA4PurchaseEventContract> {
  return {
    transaction_id: order.id,
    value: order.amount / 100, // Convert cents to dollars
    currency: order.currency.toUpperCase(),
    coupon: order.coupon,
    affiliation: order.affiliateId,
    items: order.items.map((item, index) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price / 100,
      quantity: item.quantity,
      index,
    })),
  };
}

/**
 * Builds GTM data layer push for purchase
 */
export function buildGTMPurchaseEvent(order: {
  id: string;
  amount: number;
  currency: string;
  email?: string;
  items: Array<{ id: string; name: string; price: number }>;
}): z.infer<typeof GTMDataLayerEventContract> {
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: order.id,
      value: order.amount / 100,
      currency: order.currency.toUpperCase(),
      items: order.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price / 100,
        quantity: 1,
      })),
    },
    user_data: order.email ? { email: order.email } : undefined,
  };
}

/**
 * Hashes user data for Facebook Pixel (SHA256)
 */
export async function hashUserData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates server-side tracking event
 */
export function validateServerSideEvent(data: unknown): boolean {
  try {
    ServerSideEventContract.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if GTM is loaded on page
 */
export function isGTMLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).dataLayer && Array.isArray((window as any).dataLayer);
}

/**
 * Checks if GA4 is loaded on page
 */
export function isGA4Loaded(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).gtag === 'function';
}