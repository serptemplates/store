#!/usr/bin/env npx tsx

/**
 * Automated Dub attribution test using Playwright
 * Completes the Stripe checkout automatically
 */

import { chromium } from '@playwright/test';

const CHECKOUT_URL = process.argv[2];
const TEST_EMAIL = process.env.STRIPE_TEST_EMAIL || `test-${Date.now()}@serp.co`;
const TEST_NAME = process.env.STRIPE_TEST_NAME || 'Test User';
const headless =
  process.env.PLAYWRIGHT_HEADLESS === '1' ||
  process.env.PLAYWRIGHT_HEADLESS === 'true' ||
  process.env.STRIPE_CHECKOUT_HEADLESS === '1' ||
  process.env.STRIPE_CHECKOUT_HEADLESS === 'true';

if (!CHECKOUT_URL) {
  console.error('Usage: tsx scripts/manual-tests/complete-dub-test-checkout.ts <checkout_url>');
  process.exit(1);
}

console.log('🤖 Automating Stripe checkout...\n');

async function completeCheckout() {
  const browser = await chromium.launch({ headless });
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
          try {
            const locator = frame.locator(selector).first();
            if (await locator.count()) {
              await locator.fill(value);
              return true;
            }
          } catch {
            // Ignore detached frames while Stripe swaps payment method iframes.
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

    const selectCardPaymentMethod = async () => {
      const payWithCardButton = page.getByRole('button', { name: /pay with card/i }).first();
      if (await payWithCardButton.isVisible().catch(() => false)) {
        await payWithCardButton.click();
        return;
      }
      const payWithCardTestId = page.locator('[data-testid="card-accordion-item-button"]').first();
      if (await payWithCardTestId.isVisible().catch(() => false)) {
        await payWithCardTestId.click();
        return;
      }
      const radio = page.getByRole('radio', { name: /card/i }).first();
      if (await radio.count()) {
        if (await radio.isChecked().catch(() => false)) {
          return;
        }
        await radio.check({ force: true });
        return;
      }
      const cardRow = page.locator('text=Card').first();
      if (await cardRow.count()) {
        await cardRow.click();
      }
    };

    const waitForCardInputs = async () => {
      const selectors = [
        'input[autocomplete="cc-number"]',
        'input[name="cardNumber"]',
        'input[name="number"]',
        'input[placeholder*="1234"]',
      ];
      for (let attempt = 0; attempt < 20; attempt += 1) {
        for (const selector of selectors) {
          if (await page.locator(selector).count()) return true;
        }
        for (const frame of page.frames()) {
          for (const selector of selectors) {
            try {
              if (await frame.locator(selector).count()) return true;
            } catch {
              // Ignore detached frames while Stripe swaps payment method iframes.
            }
          }
        }
        await page.waitForTimeout(500);
      }
      return false;
    };

    await selectCardPaymentMethod();
    await page.waitForTimeout(500);

    console.log('3️⃣ Filling card details...');
    const cardInputsReady = await waitForCardInputs();
    if (!cardInputsReady) {
      await logInputFields();
      throw new Error('Unable to locate Stripe card inputs for automated checkout.');
    }
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
    const submitPreferred = page
      .locator('button[type="submit"]')
      .filter({ hasText: /subscribe|pay|start|complete/i })
      .first();
    if (await submitPreferred.isVisible().catch(() => false)) {
      await submitPreferred.click();
    } else {
      const submitFallback = page.locator('button[type="submit"]').first();
      await submitFallback.click();
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
