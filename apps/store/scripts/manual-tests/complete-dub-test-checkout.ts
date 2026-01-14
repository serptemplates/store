#!/usr/bin/env npx tsx

/**
 * Automated Dub attribution test using Playwright
 * Completes the Stripe checkout automatically
 */

import { chromium } from '@playwright/test';

const CHECKOUT_URL = process.argv[2];
const TEST_EMAIL = process.env.STRIPE_TEST_EMAIL || `test-${Date.now()}@serp.co`;
const TEST_NAME = process.env.STRIPE_TEST_NAME || 'Test User';

if (!CHECKOUT_URL) {
  console.error('Usage: tsx scripts/manual-tests/complete-dub-test-checkout.ts <checkout_url>');
  process.exit(1);
}

console.log('🤖 Automating Stripe checkout...\n');

async function completeCheckout() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logInputFields = async () => {
    const mainInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map((input) => ({
        name: input.getAttribute('name'),
        type: input.getAttribute('type'),
        autocomplete: input.getAttribute('autocomplete'),
        placeholder: input.getAttribute('placeholder'),
      }));
    });
    console.log('🔎 Main frame inputs:', mainInputs);

    for (const frame of page.frames()) {
      try {
        const inputs = await frame.evaluate(() => {
          return Array.from(document.querySelectorAll('input')).map((input) => ({
            name: input.getAttribute('name'),
            type: input.getAttribute('type'),
            autocomplete: input.getAttribute('autocomplete'),
            placeholder: input.getAttribute('placeholder'),
          }));
        });
        if (inputs.length > 0) {
          console.log(`🔎 Frame inputs (${frame.url()}):`, inputs);
        }
      } catch {
        // ignore cross-origin eval errors
      }
    }
  };

  try {
    console.log('1️⃣ Opening checkout page...');
    await page.goto(CHECKOUT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const fillField = async (selectors: string[], value: string) => {
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if (await locator.count()) {
          await locator.fill(value);
          return true;
        }
      }
      for (const frame of page.frames()) {
        for (const selector of selectors) {
          const locator = frame.locator(selector).first();
          if (await locator.count()) {
            await locator.fill(value);
            return true;
          }
        }
      }
      return false;
    };

    console.log('2️⃣ Filling contact info...');
    await fillField(
      ['input[type="email"]', 'input[autocomplete="email"]', 'input[name="email"]'],
      TEST_EMAIL,
    );

    console.log('3️⃣ Filling card details...');
    const cardOk = await fillField(
      [
        'input[autocomplete="cc-number"]',
        'input[name="cardNumber"]',
        'input[name="number"]',
        'input[placeholder*="1234"]',
      ],
      '4242424242424242',
    );
    const expOk = await fillField(
      [
        'input[autocomplete="cc-exp"]',
        'input[name="exp-date"]',
        'input[name="expiry"]',
        'input[name="expDate"]',
      ],
      '12/34',
    );
    const cvcOk = await fillField(
      [
        'input[autocomplete="cc-csc"]',
        'input[name="cvc"]',
        'input[name="cardCvc"]',
      ],
      '123',
    );

    if (!cardOk || !expOk || !cvcOk) {
      await logInputFields();
      throw new Error('Unable to locate Stripe card inputs for automated checkout.');
    }

    await fillField(
      ['input[autocomplete="cc-name"]', 'input[name="cardholder-name"]', 'input[name="cardholderName"]'],
      TEST_NAME,
    );

    const tosRoleCheckbox = page.getByRole('checkbox', { name: /I agree/i }).first();
    if (await tosRoleCheckbox.count()) {
      await tosRoleCheckbox.check();
    } else {
      const tosLabel = page.locator('label:has-text("I agree")').first();
      if (await tosLabel.count()) {
        await tosLabel.click();
      } else {
        const tosFallback = page.locator('[role="checkbox"]:has-text("I agree")').first();
        if (await tosFallback.count()) {
          await tosFallback.click();
        }
      }
    }

    console.log('4️⃣ Submitting payment...');
    const payButton = page.getByRole('button', { name: /^Pay/i });
    if (await payButton.count()) {
      await payButton.click();
    } else {
      await page.locator('button[type="submit"]').click();
    }

    console.log('5️⃣ Waiting for redirect to success page...');
    await page.waitForURL('**/checkout/success**', { timeout: 30000 });

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
