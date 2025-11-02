#!/usr/bin/env npx tsx

/**
 * Automated Dub attribution test using Playwright
 * Completes the Stripe checkout automatically
 */

import { chromium } from '@playwright/test';

const CHECKOUT_URL = process.argv[2];

if (!CHECKOUT_URL) {
  console.error('Usage: tsx scripts/manual-tests/complete-dub-test-checkout.ts <checkout_url>');
  process.exit(1);
}

console.log('🤖 Automating Stripe checkout...\n');

async function completeCheckout() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1️⃣ Opening checkout page...');
    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState('networkidle');

    console.log('2️⃣ Filling in test card details...');
    
    // Wait for and fill card number
    const cardFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    await cardFrame.locator('[name="number"]').fill('4242424242424242');
    
    console.log('3️⃣ Filling expiry and CVC...');
    await cardFrame.locator('[name="expiry"]').fill('1234');
    await cardFrame.locator('[name="cvc"]').fill('123');

    console.log('4️⃣ Submitting payment...');
    await page.locator('button[type="submit"]').click();

    console.log('5️⃣ Waiting for redirect to success page...');
    await page.waitForURL('**/success**', { timeout: 30000 });

    console.log('✅ Checkout completed successfully!\n');
    console.log('🎉 Check your webhook logs for the checkout.session.completed event');
    console.log('   The Dub Stripe app should now track this sale.\n');

    await page.screenshot({ path: 'checkout-success.png' });
    console.log('📸 Screenshot saved to checkout-success.png\n');

    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('❌ Error during checkout:', error);
    await page.screenshot({ path: 'checkout-error.png' });
    console.log('📸 Error screenshot saved to checkout-error.png');
  } finally {
    await browser.close();
  }
}

completeCheckout();
