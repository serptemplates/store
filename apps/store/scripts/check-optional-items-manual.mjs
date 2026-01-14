/* eslint-disable */
/* eslint-disable no-console */
import fs from 'fs';
import stripJsonComments from 'strip-json-comments';
import path from 'path';

const productsDir = path.resolve('./apps/store/data/products');

function readJSONSync(file) {
  const raw = fs.readFileSync(file, { encoding: 'utf8' });
  return JSON.parse(stripJsonComments(raw));
}

function findProducts() {
  const files = fs.readdirSync(productsDir).filter((f) => f.endsWith('.json'));
  const products = {};
  for (const f of files) {
    const file = path.join(productsDir, f);
    try {
      const data = readJSONSync(file);
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

function indexByStripeProductId(products) {
  const map = new Map();
  for (const [, p] of Object.entries(products)) {
    if (p.stripeProductId) map.set(p.stripeProductId, p);
  }
  return map;
}

function runCheck() {
  const products = findProducts();
  const stripeIndex = indexByStripeProductId(products);
  const issues = [];
  const externalReferences = [];
  for (const [, p] of Object.entries(products)) {
    if (!p.raw || p.status !== 'live') continue; // only check live products
    const optionalItems =
      (p.raw.payment && p.raw.payment.stripe && p.raw.payment.stripe.optional_items)
      || (p.raw.stripe && p.raw.stripe.optional_items)
      || [];
    if (!optionalItems || optionalItems.length === 0) continue;
    for (const opt of optionalItems) {
      const optProductId = opt.product_id;
      if (!optProductId) {
        issues.push({ file: p.file, slug: p.slug, issue: 'optional item missing product_id', optional: opt });
        continue;
      }
      const target = stripeIndex.get(optProductId);
      if (!target) {
        externalReferences.push({ file: p.file, slug: p.slug, optionalProductId: optProductId });
      } else {
        // product exists in repo
        if (target.status === 'pre_release') {
          // allowed
          continue;
        }
        if (!target.hasPriceId) {
          issues.push({ file: p.file, slug: p.slug, issue: `optional item references a repo product without price_id: ${optProductId}`, optional: opt });
        }
      }
    }
  }
  console.log(`Checked ${Object.keys(products).length} products; stripe products indexed: ${stripeIndex.size}`);
  if (externalReferences.length > 0) {
    console.log('\nExternal optional item product references (not tracked in repo; verify Stripe product exists and has price):');
    for (const r of externalReferences) {
      console.log(`- ${r.slug} (${r.file}) references external Stripe product ${r.optionalProductId}`);
    }
  } else {
    console.log('\nNo external optional item references found.');
  }
  if (issues.length > 0) {
    console.log('\nIssues found:');
    for (const i of issues) {
      console.log(`- ${i.slug} (${i.file}): ${i.issue}`);
    }
    process.exitCode = 2;
  } else {
    console.log('\nNo issues found regarding repo-tracked optional items.');
    process.exitCode = 0;
  }
}

runCheck();
