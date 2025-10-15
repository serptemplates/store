#!/usr/bin/env node

const { structuredDataTestUrl } = require('structured-data-testing-tool');

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

  for (const path of paths) {
    const url = new URL(path, baseUrl).toString();
    console.log(`\n🔎 Validating structured data for ${url}`);
    try {
      const result = await structuredDataTestUrl(url);

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
    } catch (error) {
      hasFailure = true;
      console.error(`❌ Error running structured data test for ${url}: ${error.message}`);
    }
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
