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

    const ignoredConsolePatterns = [/appendChild/i, /Failed to load resource/i, /_vercel\/insights/i];
    const ignoredRequestPatterns = [/tawk\.to/i, /google-analytics\.com/i, /_vercel\/insights/i];

    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const text = m.text();
      if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
        return;
      }
      consoleErrors.push(text);
    });
    page.on("pageerror", (e) => {
      if (ignoredConsolePatterns.some((pattern) => pattern.test(e.message))) {
        return;
      }
      consoleErrors.push(e.message);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (/\b(favicon\.ico)\b/.test(url)) return;
      if (ignoredRequestPatterns.some((pattern) => pattern.test(url))) return;
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
    const buyButton = page.getByRole("link", { name: /Get (It|it) Now/i }).first();
    await expect(buyButton).toBeVisible();

    const newPagePromise = page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null);
    const navigationPromise = page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => null);

    await buyButton.click();

    const newPage = await newPagePromise;
    if (newPage) {
      await newPage.waitForLoadState("domcontentloaded");
      expect(
        newPage.url(),
        `Expected external checkout to open but saw ${newPage.url()}`
      ).toMatch(/https:\/\/(ghl\.serp\.co|checkout\.stripe\.com|apps\.serp\.co)\//);
      await newPage.close();
    } else {
      await navigationPromise;
      const currentUrl = page.url();
      if (!currentUrl.startsWith("http://127.0.0.1:3000") && !currentUrl.startsWith("http://localhost:3000")) {
        expect(
          currentUrl,
          "Expected checkout to redirect externally when no embedded frame is present"
        ).toMatch(/https:\/\/(ghl\.serp\.co|checkout\.stripe\.com|apps\.serp\.co)\//);
      } else {
        // Checkout frame embedded on the same page
        const checkoutFrame = page
          .frameLocator('iframe[name="embedded-checkout"], iframe[src*="checkout"], iframe[src*="link"]')
          .first();

        const emailInput = checkoutFrame.getByRole("textbox", { name: /email/i });
        await emailInput.waitFor({ state: "visible" });
        const uniqueEmail = `test+${Date.now()}@serp.co`;
        await emailInput.fill(uniqueEmail);

        const cardAccordionButton = checkoutFrame.getByTestId("card-accordion-item-button");
        await cardAccordionButton.waitFor({ state: "visible" });
        if ((await cardAccordionButton.getAttribute("aria-expanded")) === "false") {
          await cardAccordionButton.click();
        }

        await checkoutFrame.getByLabel(/card number/i).waitFor({ state: "visible" });
      }
    }

    // Diagnostics
    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
    expect(requestFailures, `Network failures:\n${requestFailures.join("\n")}`).toHaveLength(0);
  });
});
