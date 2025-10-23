  """Manual checkout smoke using Playwright.

  Run with: python scripts/manual-tests/test_checkout_with_playwright.py
  """

  import asyncio
  from urllib.parse import urlparse

  from playwright.async_api import async_playwright

  async def test_checkout_flow():
      async with async_playwright() as p:
          browser = await p.chromium.launch(headless=True)
          page = await browser.new_page()

          print("=== Testing Checkout Flow ===\n")

          # Test 1: Visit a product page
          print("1. Visiting product page (loom-video-downloader)...")
          await page.goto('http://localhost:3000/loom-video-downloader')
          await page.wait_for_load_state('networkidle')

          # Test 2: Ensure legacy checkout links are gone
          print("\n2. Checking for legacy checkout links...")
          legacy_links = await page.locator('a[href*="/checkout?product="]').count()
          print(f"   Legacy links found: {legacy_links}")

          # Test 3: Verify Stripe Payment Link CTA
          print("\n3. Verifying Stripe Payment Link CTA...")
          payment_links = page.locator("a[href^='https://buy.stripe.com']")
          payment_link_count = await payment_links.count()
          print(f"   Stripe Payment Link anchors: {payment_link_count}")

          if payment_link_count > 0:
              primary_cta = payment_links.first
              href = await primary_cta.get_attribute('href')
              text = (await primary_cta.text_content() or "").strip()
              print(f"   Primary CTA: '{text}' → {href}")

              # Click and capture new tab
              print("\n4. Opening Stripe Payment Link...")
              async with page.context.expect_page() as checkout_page_info:
                  await primary_cta.click()
              checkout_page = await checkout_page_info.value
              await checkout_page.wait_for_load_state('domcontentloaded')

              checkout_url = checkout_page.url
              print(f"   Checkout tab URL: {checkout_url}")

              parsed_url = urlparse(checkout_url)
              if parsed_url.hostname == "buy.stripe.com":
                  print("   ✅ Stripe Payment Link opened in new tab")
              else:
                  print("   ❌ Unexpected checkout destination")

              await checkout_page.close()
          else:
              print("   ❌ No Stripe Payment Link CTA found – verify product YAML configuration.")

          # Test Summary
          print("\n=== Test Summary ===")
          if legacy_links == 0:
              print("✅ Legacy /checkout links removed from product page")
          else:
              print("❌ Legacy checkout links still present on product page")

          if payment_link_count > 0:
              print("✅ Stripe Payment Link CTA detected and functional")
          else:
              print("❌ Stripe Payment Link CTA missing")

          await browser.close()

  # Run the test
  asyncio.run(test_checkout_flow())