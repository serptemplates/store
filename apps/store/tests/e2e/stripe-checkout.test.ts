import { expect, test } from "@playwright/test";

// Make the page steady in automation
test.use({ viewport: { width: 1280, height: 1800 } });

test.describe.configure({ mode: "serial" });

test.describe("Checkout smoke", () => {
  test.beforeEach(async ({ page }) => {
    // 1) Block floating chat / trackers that constantly resize/layout
    await page.route("**/*tawk.to/**", r => r.abort());
    await page.route("**/*intercom*", r => r.abort());
    await page.route("**/*crisp.chat*", r => r.abort());
    await page.route("**/*hotjar*", r => r.abort());
    await page.route("**/*clarity.ms*", r => r.abort());

    // 2) Disable animations & smooth scrolling (prevents auto-scroll jitter)
    await page.addInitScript(() => {
      const css = `
        * { animation: none !important; transition: none !important; }
        html { scroll-behavior: auto !important; }
      `;
      const style = document.createElement("style");
      style.setAttribute("data-e2e", "disable-animations");
      style.textContent = css;
      document.documentElement.appendChild(style);
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("loads product page and triggers checkout redirect", async ({ page }) => {
    const consoleErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on("console", m => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", e => consoleErrors.push(e.message));
    page.on("requestfailed", req => {
      const url = req.url();
      if (/\b(favicon\.ico)\b/.test(url)) return;
      requestFailures.push(`${req.failure()?.errorText || "unknown error"} - ${url}`);
    });

    // Home -> product
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await page.goto("/loom-video-downloader", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /Loom Video Downloader/i })
    ).toBeVisible();

    // Click CTA
    const buyButton = page.getByRole("button", { name: /Get it Now/i }).first();
    await buyButton.click();

    // Checkout frame
    const checkoutFrame = page
      .frameLocator('iframe[name="embedded-checkout"], iframe[src*="checkout"], iframe[src*="link"]')
      .first();

    // Email
    const emailInput = checkoutFrame.getByRole("textbox", { name: /email/i });
    await emailInput.waitFor({ state: "visible" });
    const uniqueEmail = `test+${Date.now()}@serp.co`;
    await emailInput.fill(uniqueEmail);

    // Card section
    const cardAccordionButton = checkoutFrame.getByTestId("card-accordion-item-button");
    await cardAccordionButton.waitFor({ state: "visible" });
    if ((await cardAccordionButton.getAttribute("aria-expanded")) === "false") {
      await cardAccordionButton.click();
    }

    // Ensure card number field shows up
    await checkoutFrame.getByLabel(/card number/i).waitFor({ state: "visible" });

    // Diagnostics
    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
    expect(requestFailures, `Network failures:\n${requestFailures.join("\n")}`).toHaveLength(0);
  });
});
