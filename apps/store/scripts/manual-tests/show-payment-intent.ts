#!/usr/bin/env -S pnpm exec tsx

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import Stripe from 'stripe';

function loadEnv() {
  const here = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = findRepoRoot(here);
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(repoRoot, '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
  }
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.resolve(dir, '../../..');
    if (fs.existsSync(path.join(candidate, 'pnpm-workspace.yaml'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir, '../../..');
}

function getStripeKey(): string {
  const k = process.env.STRIPE_SECRET_KEY_TEST
    || process.env.STRIPE_TEST_SECRET_KEY
    || (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? process.env.STRIPE_SECRET_KEY : undefined)
    || process.env.STRIPE_SECRET_KEY_LIVE
    || (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? process.env.STRIPE_SECRET_KEY : undefined);
  if (!k) throw new Error('Missing Stripe key. Set STRIPE_SECRET_KEY_TEST in .env');
  return k;
}

async function main() {
  loadEnv();
  const [, , intentId] = process.argv;
  if (!intentId) {
    console.error('Usage: pnpm --filter @apps/store exec tsx scripts/manual-tests/show-payment-intent.ts <pi_...>');
    process.exit(1);
  }
  const stripe = new Stripe(getStripeKey(), { apiVersion: '2024-04-10' });
  const pi = await stripe.paymentIntents.retrieve(intentId);
  // Charges are on the Charge resource; fetch latest if present
  const latestChargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined;
  const charge = latestChargeId ? await stripe.charges.retrieve(latestChargeId) : undefined;
  console.log(JSON.stringify({
    id: pi.id,
    status: pi.status,
    amount: pi.amount,
    currency: pi.currency,
    description: pi.description,
    metadata: pi.metadata,
    latest_charge: pi.latest_charge,
    charge_description: charge?.description,
  }, null, 2));
}

main().catch((e) => {
  console.error('Failed to fetch payment intent:', e?.message || e);
  process.exit(1);
});
