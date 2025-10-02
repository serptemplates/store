import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.getByRole('button', { name: 'GET IT NOW' }).click();
  await page.locator('iframe[name="embedded-checkout"]').contentFrame().getByRole('textbox', { name: 'Email' }).click();
  await page.locator('iframe[name="embedded-checkout"]').contentFrame().getByRole('textbox', { name: 'Email' }).fill('test@serp.co');
  await page.locator('iframe[name="embedded-checkout"]').contentFrame().getByTestId('card-accordion-item-button').click();
  await page.getByText('error').click();
  await page.getByText('Hydration failed because the').click();
  await page.getByRole('dialog', { name: 'Console Error' }).press('Escape');
});