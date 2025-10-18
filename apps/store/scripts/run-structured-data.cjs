#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { structuredDataTest } = require('structured-data-testing-tool');

const baseUrl =
  process.env.STRUCTURED_DATA_BASE_URL ??
  process.env.TEST_BASE_URL ??
  'http://127.0.0.1:3000';

const paths = (process.env.STRUCTURED_DATA_PATHS ?? '/,/loom-video-downloader')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!paths.length) {
  console.error('No paths provided for structured data checks (STRUCTURED_DATA_PATHS).');
  process.exit(1);
}

async function run() {
  let hasFailure = false;
  const results = [];

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    for (const relativePath of paths) {
      const url = new URL(relativePath, baseUrl).toString();
      console.log(`\n🔎 Validating structured data for ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 10000 }).catch(() => {});
        const bodyHtml = await page.evaluate(() => document.body.innerHTML);
        const html = `<html><body>${bodyHtml}</body></html>`;
        const result = await structuredDataTest(html);

        const typesFromPassed = Array.from(
          new Set(
            result.passed.flatMap((item) => {
              if (!item.type) {
                return [];
              }
              return Array.isArray(item.type) ? item.type : [item.type];
            }),
          ),
        );
        const typesFromSchemas = Array.isArray(result.schemas) ? result.schemas : [];
        const typesFromStructuredData = [];

        const structuredData = result.structuredData ?? {};
        for (const value of Object.values(structuredData)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const key of Object.keys(value)) {
              if (typeof key === 'string') {
                typesFromStructuredData.push(
                  ...key
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean),
                );
              }
            }
          }
        }

        const detectedTypes = Array.from(new Set([...typesFromPassed, ...typesFromSchemas, ...typesFromStructuredData]));

        if (result.failed.length) {
          hasFailure = true;
          console.error(`❌ Structured data failures for ${url}:`);
          for (const failure of result.failed) {
            console.error(`- ${failure.title}: ${failure.description}`);
          }
        } else {
          console.log(`✅ No structured data failures detected for ${url}`);
        }

        if (result.warnings.length) {
          console.warn(`⚠ Warnings for ${url}:`);
          for (const warning of result.warnings) {
            console.warn(`- ${warning.title}: ${warning.description}`);
          }
        }

        results.push({
          path: relativePath,
          url,
          detectedTypes,
          passed: result.passed.map(({ title, description, type }) => ({ title, description, type })),
          failures: result.failed.map(({ title, description }) => ({ title, description })),
          warnings: result.warnings.map(({ title, description }) => ({ title, description })),
        });
      } catch (error) {
        hasFailure = true;
        console.error(`❌ Error running structured data test for ${url}: ${error.message}`);
        results.push({
          path: relativePath,
          url,
          error: error.message,
        });
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const reportPath =
    process.env.STRUCTURED_DATA_REPORT_PATH && process.env.STRUCTURED_DATA_REPORT_PATH.trim().length > 0
      ? process.env.STRUCTURED_DATA_REPORT_PATH
      : path.join(process.cwd(), 'tmp', 'structured-data-report.json');

  try {
    const reportDir = path.dirname(reportPath);
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📝 Structured data report saved to ${reportPath}`);
  } catch (error) {
    console.warn(`⚠ Failed to write structured data report: ${error.message}`);
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log('\n✅ Structured data checks completed successfully.');
}

run().catch((error) => {
  console.error('Unexpected error running structured data checks:', error);
  process.exit(1);
});
