#!/usr/bin/env node

/**
 * Demonstration script showing how the account checkout fix resolves the issue.
 * 
 * This simulates the webhook flow and shows:
 * 1. Old behavior (broken) - creates duplicate orders
 * 2. New behavior (fixed) - properly updates existing order
 */

console.log("\n=== Account Checkout Fix Demonstration ===\n");

// Simulate the database state
const orders = [];
let orderIdCounter = 1;

// Helper to find order
function findOrder(criteria) {
  if (criteria.stripe_payment_intent_id) {
    return orders.find(o => o.stripe_payment_intent_id === criteria.stripe_payment_intent_id);
  }
  if (criteria.stripe_session_id) {
    return orders.find(o => o.stripe_session_id === criteria.stripe_session_id);
  }
  return null;
}

// OLD BEHAVIOR (Broken)
console.log("--- OLD BEHAVIOR (BROKEN) ---\n");

// Step 1: Insert initial order (payment intent might be null)
console.log("Step 1: Webhook creates initial order");
const oldOrder1 = {
  id: orderIdCounter++,
  stripe_session_id: "cs_test_123",
  stripe_payment_intent_id: null, // Often NULL initially!
  customer_email: "customer@example.com",
  offer_id: "pro-downloader",
  amount_total: 12900,
  metadata: {},
};
orders.push(oldOrder1);
console.log("  ✓ Order created:", { 
  id: oldOrder1.id, 
  email: oldOrder1.customer_email, 
  paymentIntent: oldOrder1.stripe_payment_intent_id 
});

// Step 2: License created
console.log("\nStep 2: License service creates license key");
const licenseKey = "SERP-PRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
console.log("  ✓ License created:", licenseKey);

// Step 3: OLD CODE - Try to upsert with only payment intent ID
console.log("\nStep 3: OLD CODE - Attempt to update order with license");
console.log("  Calling upsertOrder({ stripePaymentIntentId: null, metadata: { license } })");

// This is what the old code did - ON CONFLICT on NULL doesn't match!
const existingOrder = findOrder({ stripe_payment_intent_id: null });
if (!existingOrder) {
  // NULL != NULL in SQL, so INSERT happens instead of UPDATE!
  const oldOrder2 = {
    id: orderIdCounter++,
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    customer_email: null, // Missing!
    offer_id: null, // Missing!
    amount_total: null, // Missing!
    metadata: { license: { licenseKey } },
  };
  orders.push(oldOrder2);
  console.log("  ✗ BUG: Created NEW order instead of updating!");
  console.log("    New order ID:", oldOrder2.id);
  console.log("    Has license:", !!oldOrder2.metadata.license);
  console.log("    Has email:", !!oldOrder2.customer_email);
}

// Step 4: Account page queries by email
console.log("\nStep 4: Account page queries orders by email");
const oldCustomerOrders = orders.filter(o => o.customer_email === "customer@example.com");
console.log("  Found", oldCustomerOrders.length, "order(s)");
for (const order of oldCustomerOrders) {
  console.log("    Order", order.id + ":", {
    hasLicense: !!order.metadata.license,
    hasEmail: !!order.customer_email,
    offerId: order.offer_id,
  });
}
console.log("\n  ✗ PROBLEM: Order has no license key!");
console.log("  ✗ Customer sees purchase but no license\n");

// Clear orders for new test
orders.length = 0;
orderIdCounter = 1;

// NEW BEHAVIOR (Fixed)
console.log("\n--- NEW BEHAVIOR (FIXED) ---\n");

// Step 1: Insert initial order (same as before)
console.log("Step 1: Webhook creates initial order");
const newOrder1 = {
  id: orderIdCounter++,
  stripe_session_id: "cs_test_456",
  stripe_payment_intent_id: null, // Still NULL initially
  customer_email: "customer@example.com",
  offer_id: "pro-downloader",
  amount_total: 12900,
  metadata: {},
};
orders.push(newOrder1);
console.log("  ✓ Order created:", { 
  id: newOrder1.id, 
  email: newOrder1.customer_email, 
  paymentIntent: newOrder1.stripe_payment_intent_id 
});

// Step 2: License created (same)
console.log("\nStep 2: License service creates license key");
const newLicenseKey = "SERP-PRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
console.log("  ✓ License created:", newLicenseKey);

// Step 3: NEW CODE - Update with fallback
console.log("\nStep 3: NEW CODE - Update order with license (with fallback)");
console.log("  Calling updateOrderMetadata({");
console.log("    stripePaymentIntentId: null,");
console.log("    stripeSessionId: 'cs_test_456'");
console.log("  }, { license })");

// New function tries payment intent first, then falls back to session ID
let orderToUpdate = findOrder({ stripe_payment_intent_id: null });
if (!orderToUpdate) {
  console.log("  ℹ Payment intent lookup returned no results");
  console.log("  ✓ Falling back to session ID lookup...");
  orderToUpdate = findOrder({ stripe_session_id: "cs_test_456" });
}

if (orderToUpdate) {
  // Merge metadata
  orderToUpdate.metadata = {
    ...orderToUpdate.metadata,
    license: { licenseKey: newLicenseKey },
  };
  console.log("  ✓ SUCCESS: Updated existing order", orderToUpdate.id);
}

// Step 4: Account page queries by email
console.log("\nStep 4: Account page queries orders by email");
const newCustomerOrders = orders.filter(o => o.customer_email === "customer@example.com");
console.log("  Found", newCustomerOrders.length, "order(s)");
for (const order of newCustomerOrders) {
  console.log("    Order", order.id + ":", {
    hasLicense: !!order.metadata.license,
    hasEmail: !!order.customer_email,
    offerId: order.offer_id,
    licenseKey: order.metadata.license?.licenseKey || "none",
  });
}
console.log("\n  ✓ SUCCESS: Customer sees purchase with license key!");
console.log("  ✓ No duplicate orders created\n");

// Summary
console.log("=== SUMMARY ===\n");
console.log("OLD CODE:");
console.log("  - Created 2 orders (one with data, one with license)");
console.log("  - Customer sees order WITHOUT license");
console.log("  - Account page broken ✗\n");
console.log("NEW CODE:");
console.log("  - Properly updates the existing order");
console.log("  - Customer sees order WITH license");
console.log("  - Account page works correctly ✓\n");
