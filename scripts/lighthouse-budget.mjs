#!/usr/bin/env node
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
if (!baseUrl) {
  console.log('Skipping Lighthouse audit (set LIGHTHOUSE_BASE_URL to enable)');
  process.exit(0);
}

const productPath = process.env.LIGHTHOUSE_PRODUCT_PATH ?? '/linkedin-learning-downloader';
const lcpBudgetMs = Number(process.env.LIGHTHOUSE_BUDGET_LCP_MS ?? 3500);
const ttiBudgetMs = Number(process.env.LIGHTHOUSE_BUDGET_TTI_MS ?? 4000);
const bytesBudget = Number(process.env.LIGHTHOUSE_BUDGET_TOTAL_BYTES ?? 2_500_000);

const targets = [
  { name: 'home', url: baseUrl.replace(/\/$/, '') + '/' },
  { name: 'product', url: baseUrl.replace(/\/$/, '') + productPath },
];

async function runAudit(target) {
  const chrome = await launch({ chromeFlags: ['--headless'] });

  try {
    const runnerResult = await lighthouse(target.url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
    });

    const lhr = runnerResult.lhr;
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? Infinity;
    const tti = lhr.audits['interactive']?.numericValue ?? Infinity;
    const totalBytes = lhr.audits['total-byte-weight']?.numericValue ?? Infinity;

    const failures = [];
    if (lcp > lcpBudgetMs) {
      failures.push(`LCP ${Math.round(lcp)}ms > budget ${lcpBudgetMs}ms`);
    }
    if (tti > ttiBudgetMs) {
      failures.push(`TTI ${Math.round(tti)}ms > budget ${ttiBudgetMs}ms`);
    }
    if (totalBytes > bytesBudget) {
      failures.push(`Total bytes ${Math.round(totalBytes)} > budget ${bytesBudget}`);
    }

    if (failures.length > 0) {
      console.error(`\n✖ Performance regression on ${target.name}:\n - ${failures.join('\n - ')}`);
      process.exitCode = 1;
    } else {
      console.log(`✔ ${target.name} within budgets (LCP ${Math.round(lcp)}ms, TTI ${Math.round(tti)}ms, Bytes ${Math.round(totalBytes)})`);
    }
  } finally {
    await chrome.kill();
  }
}

(async () => {
  for (const target of targets) {
    await runAudit(target);
  }
  process.exit(process.exitCode ?? 0);
})();
