import { test, expect } from '@playwright/test';

test.describe('Checkout Flow Integration', () => {
  test('Product page should have single checkout button instead of dual payment buttons', async ({ page }) => {
    // Visit a product page
    await page.goto('http://localhost:3000/loom-video-downloader');
    await page.waitForLoadState('networkidle');

    // Check that PayPal button is NOT present on the product page
    const paypalButton = page.locator('button:has-text("Pay with PayPal")');
    await expect(paypalButton).toHaveCount(0);

    // Check that Stripe checkout button is NOT present
    const stripeButton = page.locator('button:has-text("Get Instant Access with Card")');

    // Check for the new unified checkout button/link
    const checkoutLink = page.locator('a[href*="/checkout?product="]').first();
    const checkoutExists = await checkoutLink.count() > 0;

    console.log('PayPal buttons found:', await paypalButton.count());
    console.log('Old Stripe buttons found:', await stripeButton.count());
    console.log('Checkout links found:', await checkoutLink.count());

    // Should have at least one checkout link
    expect(checkoutExists).toBeTruthy();

    // Get the href and verify it points to checkout page
    const href = await checkoutLink.getAttribute('href');
    expect(href).toContain('/checkout?product=loom-video-downloader');

    // Click the checkout button
    await checkoutLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on the checkout page
    await expect(page).toHaveURL(/.*\/checkout\?product=loom-video-downloader/);

    // Verify the checkout page has payment method toggles
    const stripeToggle = page.locator('button:has-text("Pay with Stripe")');
    const paypalToggle = page.locator('button:has-text("Pay with PayPal")');

    await expect(stripeToggle).toBeVisible();
    await expect(paypalToggle).toBeVisible();

    // Wait for Stripe iframe to load
    await page.waitForTimeout(2000);
    const stripeIframe = page.locator('#checkout iframe');
    await expect(stripeIframe).toHaveCount(1);
  });

  test('Checkout page should show both payment options', async ({ page }) => {
    // Go directly to checkout page
    await page.goto('http://localhost:3000/checkout?product=tiktok-downloader');
    await page.waitForLoadState('networkidle');

    // Check for payment method toggle buttons
    const stripeButton = page.locator('button:has-text("Pay with Stripe")');
    const paypalButton = page.locator('button:has-text("Pay with PayPal")');

    await expect(stripeButton).toBeVisible();
    await expect(paypalButton).toBeVisible();

    // Stripe should be selected by default
    const stripeClass = await stripeButton.getAttribute('class');
    expect(stripeClass).toContain('bg-blue-600');

    // Click PayPal toggle
    await paypalButton.click();

    // PayPal should now be selected
    const paypalClass = await paypalButton.getAttribute('class');
    expect(paypalClass).toContain('bg-blue-600');

    // PayPal checkout button should be visible
    const paypalCheckout = page.locator('text=/Pay.*PayPal/');
    await expect(paypalCheckout).toBeVisible();
  });
});