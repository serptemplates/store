#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenvPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

function loadModule(moduleName) {
  const localPath = path.resolve(__dirname, '..', 'apps', 'store', 'node_modules', moduleName);
  try {
    return require(localPath);
  } catch (error) {
    return require(moduleName);
  }
}

const { createClient } = loadModule('@vercel/postgres');

const connectionString =
  process.env.CHECKOUT_DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.CHECKOUT_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No database connection string found.');
  process.exit(1);
}

async function main() {
  const client = createClient({ connectionString });
  await client.connect();
  const orders = await client.sql`
    SELECT id,
           offer_id,
           customer_email,
           metadata,
           created_at
      FROM orders
     ORDER BY created_at DESC
     LIMIT 5;
  `;

  console.log(JSON.stringify(orders.rows, null, 2));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
