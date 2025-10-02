import asyncio
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

        # Test 2: Check for old dual-button setup (should NOT exist)
        print("\n2. Checking for old payment buttons...")

        # Check if old PayPal button exists (it shouldn't)
        paypal_buttons = await page.locator('button:has-text("Pay with PayPal")').count()
        print(f"   PayPal buttons on product page: {paypal_buttons}")

        # Check for old Stripe button
        stripe_buttons = await page.locator('button:has-text("Get Instant Access with Card")').count()
        print(f"   Old Stripe buttons: {stripe_buttons}")

        # Test 3: Check for new checkout link
        print("\n3. Looking for new checkout button/link...")
        checkout_links = await page.locator('a[href*="/checkout?product="]').count()
        print(f"   Checkout links found: {checkout_links}")

        if checkout_links > 0:
            # Get the first checkout link
            checkout_link = page.locator('a[href*="/checkout?product="]').first
            href = await checkout_link.get_attribute('href')
            print(f"   Link href: {href}")

            # Get button text
            button_text = await checkout_link.text_content()
            print(f"   Button text: '{button_text.strip()}'")

            # Test 4: Click checkout button
            print("\n4. Clicking checkout button...")
            await checkout_link.click()
            await page.wait_for_load_state('networkidle')

            # Test 5: Verify we're on checkout page
            current_url = page.url
            print(f"   Current URL: {current_url}")

            if '/checkout' in current_url:
                print("   ✅ Successfully navigated to checkout page")

                # Test 6: Check for payment toggles on checkout page
                print("\n5. Verifying checkout page elements...")

                # Wait a bit for page to fully load
                await page.wait_for_timeout(2000)

                stripe_toggle = await page.locator('button:has-text("Pay with Stripe")').count()
                paypal_toggle = await page.locator('button:has-text("Pay with PayPal")').count()

                print(f"   Stripe toggle button: {'Found' if stripe_toggle > 0 else 'Not found'}")
                print(f"   PayPal toggle button: {'Found' if paypal_toggle > 0 else 'Not found'}")

                # Check for Stripe iframe
                iframe = await page.locator('#checkout iframe').count()
                print(f"   Stripe checkout iframe: {'Found' if iframe > 0 else 'Not found'}")
            else:
                print("   ❌ Not on checkout page")

        # Test Summary
        print("\n=== Test Summary ===")
        if paypal_buttons == 0 and stripe_buttons == 0:
            print("✅ Old dual-button setup removed from product page")
        else:
            print("❌ Old payment buttons still exist on product page")

        if checkout_links > 0:
            print("✅ New checkout button/link implemented")
        else:
            print("❌ No checkout button/link found")

        await browser.close()

# Run the test
asyncio.run(test_checkout_flow())