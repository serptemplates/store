import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/database';
import { getOptionalStripeSecretKey, getStripeMode } from '@/lib/stripe-environment';

export async function GET() {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    stripe: 'unknown',
    paypal: 'unknown',
    ghl: 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    if (isDatabaseConfigured()) {
      const result = await query`SELECT 1 as test`;
      checks.database = result ? 'healthy' : 'unavailable';
    } else {
      checks.database = 'not_configured';
    }
  } catch (error) {
    checks.database = 'error';
  }

  // Check Stripe
  const activeStripeMode = getStripeMode();
  checks.stripe = getOptionalStripeSecretKey(activeStripeMode) ? 'configured' : 'not_configured';

  // Check PayPal
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    checks.paypal = 'configured';
  } else {
    checks.paypal = 'not_configured';
  }

  // Check GHL
  if (process.env.GHL_PAT_LOCATION && process.env.GHL_LOCATION_ID) {
    checks.ghl = 'configured';
  } else {
    checks.ghl = 'not_configured';
  }

  const allHealthy = Object.values(checks).every(
    v => v === 'healthy' || v === 'configured' || v.includes('T')
  );

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503
  });
}
