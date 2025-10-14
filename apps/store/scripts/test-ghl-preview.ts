#!/usr/bin/env tsx

import { requireGhlPreviewEnv, runGhlPreview } from "./ghl-preview-runner";

async function main() {
  const env = requireGhlPreviewEnv();

  console.log(`Posting webhook for ${env.email} (${env.offerId}) to ${env.url}`);
  const result = await runGhlPreview(env);
  console.log(`Generated payment id: ${result.paymentId}`);
  console.log(`Used DB override: ${result.usedDbOverride ? "yes" : "no"}`);
  console.log(`Webhook response: ${result.webhook.status}`, result.webhook.body);

  if (result.webhook.status !== 200 || (result.webhook.body as { ok?: boolean })?.ok !== true) {
    console.error("Webhook failed. Aborting account check.");
    process.exit(1);
  }

  if (!result.account) {
    console.error("Account impersonation skipped.");
    process.exit(1);
  }

  console.log(`Account impersonation status: ${result.account.status}`);

  if (result.account.status !== 200) {
    console.error("Account impersonation did not return 200.");
    process.exit(1);
  }

  console.log("Preview test completed successfully.");
}

main().catch((error) => {
  console.error("Preview test failed:", error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
