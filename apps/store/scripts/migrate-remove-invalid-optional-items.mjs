#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import stripJsonComments from 'strip-json-comments';

const productsDir = path.resolve('./apps/store/data/products');

function readJsonc(file) {
  const raw = fs.readFileSync(file, { encoding: 'utf8' });
  return JSON.parse(stripJsonComments(raw));
}

function writeJson(file, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(file, content, { encoding: 'utf8' });
}

function findProducts() {
  const files = fs.readdirSync(productsDir).filter((f) => f.endsWith('.json'));
  const products = {};
  for (const f of files) {
      const file = path.join(productsDir, f);
    try {
      const data = readJsonc(file);
      const stripe = (data.payment && data.payment.stripe) || data.stripe || {};
      const metadata = stripe.metadata || {};
      const stripeProductId = metadata.stripe_product_id || metadata.stripe_product_id || null;
      const slug = data.slug || data.id || f.replace('.json', '');
      products[slug] = {
        slug,
        file,
        status: data.status || null,
        stripeProductId,
        hasPriceId: !!(stripe.price_id || stripe.test_price_id || stripe.default_price),
        raw: data,
      };
    } catch (err) {
      console.warn(`Failed to parse ${file}: ${err.message}`);
    }
  }
  return products;
}

function run() {
  const products = findProducts();
  const indexByStripeProductId = new Map(Object.values(products).map((p) => [p.stripeProductId, p]));
  const toChange = [];
  for (const [, p] of Object.entries(products)) {
    if (!p.raw || p.status !== 'live') continue;
    const optionalItems =
      (p.raw.payment && p.raw.payment.stripe && p.raw.payment.stripe.optional_items)
      || (p.raw.stripe && p.raw.stripe.optional_items)
      || [];
    if (!optionalItems || optionalItems.length === 0) continue;
    const filtered = optionalItems.filter((opt) => {
      const id = opt.product_id;
      if (!id) return false;
      const target = indexByStripeProductId.get(id);
      if (!target) return true; // external references left as-is
      if (target.status === 'pre_release') return true; // allowed
      // keep only if target has price id
      return Boolean(target.hasPriceId);
    });
    if (filtered.length === optionalItems.length) continue; // no change
    toChange.push({ file: p.file, slug: p.slug, old: optionalItems, new: filtered });
  }

  if (toChange.length === 0) {
    console.log('No products require optional_items cleanup');
    return;
  }
  console.log(`Found ${toChange.length} product(s) that would change.`);
  const apply = process.argv.includes('--apply');
  if (!apply) {
    console.log('Run with --apply to write changes to files. Deleting problematic optional items will be written to disk.');
  }
  for (const change of toChange) {
    console.log(`\nProduct: ${change.slug} (${change.file})`);
    console.log(`- old optional_items: ${change.old.map((o) => o.product_id).join(', ')}`);
    console.log(`- new optional_items: ${change.new.map((o) => o.product_id).join(', ')}`);
    if (apply) {
      const data = readJsonc(change.file);
      if (!data.payment || typeof data.payment !== 'object') {
        data.payment = { provider: 'stripe' };
      }
      if (!data.payment.provider) {
        data.payment.provider = 'stripe';
      }
      if (!data.payment.stripe) {
        data.payment.stripe = data.stripe || {};
      }
      data.payment.stripe.optional_items = change.new;
      delete data.stripe;
      writeJson(change.file, data);
      console.log('  -> written');
    }
  }
}

run();
