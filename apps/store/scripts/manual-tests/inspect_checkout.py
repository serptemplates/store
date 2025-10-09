"""Interactive helper to inspect checkout flows.

Run with: python scripts/manual-tests/inspect_checkout.py
"""

from playwright.sync_api import sync_playwright
import time

def inspect_checkout_flow():
    with sync_playwright() as p:
        # Launch browser in headed mode
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_video_dir="./videos"
        )

        # Enable console and network logging
        page = context.new_page()

        # Capture console logs
        console_logs = []
        def log_console(msg):
            log_entry = f"[{msg.type}] {msg.text}"
            console_logs.append(log_entry)
            print(f"Console: {log_entry}")
        page.on("console", log_console)

        # Capture network activity
        network_logs = []
        def log_request(request):
            if 'stripe.com' in request.url or 'paypal.com' in request.url or 'checkout' in request.url:
                log_entry = f"[{request.method}] {request.url[:100]}"
                network_logs.append(log_entry)
                print(f"Network: {log_entry}")
        page.on("request", log_request)

        # Capture errors
        def log_error(error):
            print(f"ERROR: {error}")
        page.on("pageerror", log_error)

        print("="*60)
        print("INSPECTING PRODUCT PAGE - DESKTOP VIEW")
        print("="*60)

        # Navigate to product page
        print("\n1. Loading: http://localhost:3000/loom-video-downloader")
        page.goto("http://localhost:3000/loom-video-downloader", wait_until="networkidle")
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="1-product-page-desktop.png")
        print("   ✓ Screenshot saved: 1-product-page-desktop.png")

        # Analyze buttons
        print("\n2. Analyzing buttons on product page:")

        # Check for PayPal buttons (should NOT exist)
        paypal_count = page.locator("button:has-text('PayPal')").count()
        print(f"   PayPal buttons: {paypal_count} {'❌ FOUND - Should be removed!' if paypal_count > 0 else '✓ None (correct)'}")

        # Check for old Stripe buttons
        stripe_count = page.locator("button:has-text('Card'), button:has-text('Stripe')").count()
        print(f"   Old payment buttons: {stripe_count}")

        # Check for checkout links
        checkout_links = page.locator("a[href*='/checkout?product=']").all()
        print(f"   Checkout links: {len(checkout_links)} found")

        for i, link in enumerate(checkout_links[:3]):
            href = link.get_attribute("href")
            text = link.text_content().strip()
            print(f"     Link {i+1}: '{text}' → {href}")

        # Click the checkout button
        if len(checkout_links) > 0:
            print("\n3. Clicking first checkout button...")
            checkout_links[0].click()
            page.wait_for_load_state("networkidle")
            time.sleep(3)

            print(f"   ✓ Navigated to: {page.url}")
            page.screenshot(path="2-checkout-page.png")
            print("   ✓ Screenshot saved: 2-checkout-page.png")

            # Analyze checkout page
            print("\n4. Analyzing checkout page:")

            # Check for payment method toggles
            stripe_toggle = page.locator("button:has-text('Pay with Stripe')").count()
            paypal_toggle = page.locator("button:has-text('Pay with PayPal')").count()

            print(f"   Stripe toggle: {'✓ Found' if stripe_toggle else '❌ Missing'}")
            print(f"   PayPal toggle: {'✓ Found' if paypal_toggle else '❌ Missing'}")

            # Check for Stripe iframe
            time.sleep(2)  # Wait for iframe to load
            iframe_count = page.locator("#checkout iframe").count()
            print(f"   Stripe checkout iframe: {'✓ Found' if iframe_count else '❌ Missing'}")

            # Click PayPal toggle
            if paypal_toggle > 0:
                print("\n5. Testing PayPal toggle...")
                page.locator("button:has-text('Pay with PayPal')").click()
                time.sleep(2)
                page.screenshot(path="3-checkout-paypal.png")
                print("   ✓ Screenshot saved: 3-checkout-paypal.png")

                # Check for PayPal button
                paypal_button = page.locator("button:has-text('Pay'), div:has-text('PayPal')").count()
                print(f"   PayPal checkout button: {'✓ Found' if paypal_button else '❌ Missing'}")

        print("\n" + "="*60)
        print("TESTING MOBILE VIEW")
        print("="*60)

        # Set mobile viewport
        page.set_viewport_size({"width": 375, "height": 812})  # iPhone X
        page.goto("http://localhost:3000/loom-video-downloader", wait_until="networkidle")
        time.sleep(2)

        page.screenshot(path="4-product-page-mobile.png", full_page=True)
        print("\n✓ Mobile screenshot saved: 4-product-page-mobile.png")

        # Check mobile buttons
        mobile_checkout = page.locator("a[href*='/checkout']").first
        if mobile_checkout:
            text = mobile_checkout.text_content().strip()
            print(f"Mobile checkout button: '{text}'")

            # Click to checkout
            mobile_checkout.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            page.screenshot(path="5-checkout-page-mobile.png", full_page=True)
            print("✓ Mobile checkout screenshot saved: 5-checkout-page-mobile.png")

        print("\n" + "="*60)
        print("NETWORK & CONSOLE SUMMARY")
        print("="*60)

        print(f"\nTotal console logs: {len(console_logs)}")
        if console_logs:
            print("Recent console messages:")
            for log in console_logs[-5:]:
                print(f"  {log}")

        print(f"\nTotal API calls captured: {len(network_logs)}")
        if network_logs:
            print("Recent API calls:")
            for log in network_logs[-5:]:
                print(f"  {log}")

        print("\n" + "="*60)
        print("INSPECTION COMPLETE")
        print("="*60)
        print("\nScreenshots saved:")
        print("  1-product-page-desktop.png")
        print("  2-checkout-page.png")
        print("  3-checkout-paypal.png")
        print("  4-product-page-mobile.png")
        print("  5-checkout-page-mobile.png")

        input("\nPress Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    inspect_checkout_flow()
