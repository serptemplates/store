#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

async function jsonFetch(url, { method = 'GET', headers = {}, body } = {}) {
  const defaultHeaders = {
    'User-Agent': process.env.LICENSE_TEST_USER_AGENT || 'LicenseTesting/1.0',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const opts = { method, headers: { ...defaultHeaders, ...headers } };
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`Request failed with ${response.status}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function printJson(label, data) {
  console.log(`\n=== ${label} ===`);
  console.log(data ? JSON.stringify(data, null, 2) : 'null');
}

async function main() {
  loadEnv();

  const baseUrl = (process.env.LICENSE_BASE_URL || 'https://license.serp.co').replace(/\/$/, '');
  const adminApiKey = process.env.LICENSE_ADMIN_API_KEY || process.env.LICENSE_KEY_ADMIN_API_KEY;
  if (!adminApiKey) {
    console.error('Missing LICENSE_ADMIN_API_KEY / LICENSE_KEY_ADMIN_API_KEY');
    process.exit(1);
  }

  const adminHeaders = { Authorization: `Bearer ${adminApiKey}` };
  const testEmail = process.env.LICENSE_TEST_EMAIL || `node-test-${Date.now()}@example.com`;

  printJson('Configuration', { baseUrl, email: testEmail });

  const payload = {
    id: randomId('evt'),
    provider: 'node-script',
    providerObjectId: randomId('sub'),
    eventType: 'script.purchase',
    status: 'completed',
    amount: 0,
    currency: 'usd',
    userEmail: testEmail,
    tier: 'pro',
    entitlements: ['demo-feature'],
    features: { seats: 1 },
    expiresAt: null,
    metadata: { scriptRunAt: Date.now() },
    rawEvent: { source: 'license-remote-testing.js' },
  };

  const purchase = await jsonFetch(`${baseUrl}/admin/purchases`, {
    method: 'POST',
    headers: adminHeaders,
    body: payload,
  });
  printJson('Purchase response', purchase);

  const license = await jsonFetch(`${baseUrl}/admin/licenses?email=${encodeURIComponent(testEmail)}`, {
    method: 'GET',
    headers: adminHeaders,
  }).catch((error) => {
    if (error.status === 404) {
      return null;
    }
    throw error;
  });

  printJson('License lookup', license);

  if (!license) {
    console.error('No license returned for test email');
    process.exit(1);
  }

  const licenseKey = license.key || license.licenseKey || purchase.licenseKey;
  console.log(`\nLicense Key: ${licenseKey || 'N/A'}`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
