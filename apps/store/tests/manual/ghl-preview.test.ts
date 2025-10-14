import { describe, expect, it } from "vitest";
import { resolveGhlPreviewEnv, runGhlPreview } from "@/scripts/ghl-preview-runner";

const envResult = resolveGhlPreviewEnv();
const shouldRun = envResult.ok && process.env.RUN_GHL_PREVIEW_TEST === "true";

if (!shouldRun) {
  console.warn(
    envResult.ok
      ? "[ghl-preview.test] Skipping; set RUN_GHL_PREVIEW_TEST=true to enable this manual preview check."
      : `[ghl-preview.test] Skipping; missing env vars: ${envResult.missing.join(", ")}`,
  );
}

const describeFn = shouldRun ? describe : describe.skip;

describeFn("GHL payment link preview", () => {
  const env = envResult.ok ? envResult.env : null;

  it(
    "processes the webhook and impersonation flow against the configured preview target",
    async () => {
      if (!env) {
        throw new Error("GHL preview env is not available");
      }

      const result = await runGhlPreview(env);

      expect(result.webhook.status).toBe(200);
      const body = result.webhook.body as { ok?: boolean };
      expect(body?.ok).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.status).toBe(200);
    },
    30_000,
  );
});
