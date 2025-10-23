"""Interactive helper to inspect checkout flows.

Run with: python scripts/manual-tests/inspect_checkout.py
"""

from urllib.parse import urlparse

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
            parsed = urlparse(request.url)
            host = parsed.hostname or ""
            is_stripe = host == "stripe.com" or host.endswith(".stripe.com")
            if is_stripe or 'checkout' in request.url:
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

        legacy_links = page.locator("a[href*='/checkout?product=']")
        legacy_count = legacy_links.count()
        print(f"   Legacy /checkout links: {legacy_count}")

        payment_link_buttons = page.locator("a[href^='https://buy.stripe.com']")
        payment_link_count = payment_link_buttons.count()
        print(f"   Stripe Payment Link CTAs: {payment_link_count}")

        if payment_link_count:
            first_cta = payment_link_buttons.first
            cta_text = first_cta.text_content().strip()
            cta_href = first_cta.get_attribute("href")
            print(f"   Primary CTA: '{cta_text}' → {cta_href}")

            print("\n3. Clicking Payment Link CTA (expecting new tab)...")
            with context.expect_page() as checkout_page_info:
                first_cta.click()
            checkout_page = checkout_page_info.value
            checkout_page.wait_for_load_state("domcontentloaded")
            time.sleep(2)

            checkout_url = checkout_page.url
            print(f"   ✓ Checkout tab URL: {checkout_url}")
            checkout_page.screenshot(path="2-stripe-payment-link.png", full_page=True)
            print("   ✓ Screenshot saved: 2-stripe-payment-link.png")

            if urlparse(checkout_url).hostname == "buy.stripe.com":
                print("   ✓ Confirmed Stripe Payment Link opened in new tab")
            else:
                print("   ❌ Unexpected checkout URL (expected buy.stripe.com)")

            checkout_page.close()
        else:
            print("\n❌ No Stripe Payment Link CTA detected – verify product configuration.")


        print("\n" + "="*60)
        print("TESTING MOBILE VIEW")
        print("="*60)

        # Set mobile viewport
        page.set_viewport_size({"width": 375, "height": 812})  # iPhone X
        page.goto("http://localhost:3000/loom-video-downloader", wait_until="networkidle")
        time.sleep(2)

        page.screenshot(path="4-product-page-mobile.png", full_page=True)
        print("\n✓ Mobile screenshot saved: 4-product-page-mobile.png")

        # Check mobile Payment Link button
        mobile_cta_locator = page.locator("a[href^='https://buy.stripe.com']")
        if mobile_cta_locator.count():
            mobile_text = mobile_cta_locator.first.text_content().strip()
            print(f"Mobile CTA: '{mobile_text}'")

            with context.expect_page() as mobile_checkout_info:
                mobile_cta_locator.first.click()
            mobile_checkout = mobile_checkout_info.value
            mobile_checkout.wait_for_load_state("domcontentloaded")
            time.sleep(2)

            mobile_checkout.screenshot(path="5-stripe-payment-link-mobile.png", full_page=True)
            print("✓ Mobile checkout screenshot saved: 5-stripe-payment-link-mobile.png")
            mobile_checkout.close()
        else:
            print("❌ No Stripe Payment Link CTA visible on mobile layout")

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
        print("  2-stripe-payment-link.png")
        print("  4-product-page-mobile.png")
        print("  5-stripe-payment-link-mobile.png")

        input("\nPress Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    inspect_checkout_flow()
