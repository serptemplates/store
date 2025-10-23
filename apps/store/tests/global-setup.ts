import { request as playwrightRequest } from "@playwright/test";

async function waitForNextAssets(baseURL: string) {
  const request = await playwrightRequest.newContext({ baseURL });
  const maxAttempts = 15;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await request.get("/");
      if (response.ok()) {
        const text = await response.text();
        if (text && text.includes("</html>")) {
          break;
        }
      }
    } catch {
      // Ignore connection errors while Next.js is spinning up.
    }
    await delay(500);
  }

  const assets = [
    "/_next/static/chunks/main-app.js",
    "/_next/static/chunks/app-pages-internals.js",
    "/_next/static/chunks/app/page.js",
  ];

  for (const asset of assets) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await request.get(asset, { ignoreHTTPSErrors: true });
        if (response.ok()) {
          break;
        }
      } catch {
        // ignore and retry
      }
      await delay(500);
    }
  }

  await request.dispose();
}

async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3110";
  await waitForNextAssets(baseURL);
}

export default globalSetup;
