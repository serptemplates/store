/* eslint-disable */
/* eslint-disable no-console */
import { execSync } from "child_process";
import process from "process";

try {
  // Search for any references to STRIPE_OPTIONAL_BUNDLE_PRICE_ID in the repo
  const out = execSync("git grep -n --full-name \"STRIPE_OPTIONAL_BUNDLE_PRICE_ID\"", {
    stdio: ["pipe", "pipe", "ignore"],
    encoding: "utf8",
  });
  if (out && out.trim().length > 0) {
    const lines = out.trim().split('\n');
    // Exclude matches in this script itself to avoid false-positives
    const filtered = lines.filter((l) => !l.includes('apps/store/scripts/validate-no-optional-env.mjs'));
    if (filtered.length > 0) {
      console.error("Found references to STRIPE_OPTIONAL_BUNDLE_PRICE_ID in the repository:\n");
      console.error(filtered.join('\n'));
      console.error("Please remove environment-based optional item configuration and use product/offer JSON or per-offer price_id.");
      process.exit(1);
    }
    console.log("No references found for STRIPE_OPTIONAL_BUNDLE_PRICE_ID — good.");
    process.exit(0);
  } else {
    console.log("No references found for STRIPE_OPTIONAL_BUNDLE_PRICE_ID — good.");
    process.exit(0);
  }
} catch (err) {
  // git grep returns non-zero when no matches are found. Treat that as success.
  if (err.status === 1) {
    console.log("No references found for STRIPE_OPTIONAL_BUNDLE_PRICE_ID — good.");
    process.exit(0);
  }
  console.error("Error while checking for STRIPE_OPTIONAL_BUNDLE_PRICE_ID:", err.message || err);
  process.exit(2);
}
