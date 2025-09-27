#!/usr/bin/env node

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

// Pages to test
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/shop', name: 'Shop' },
  { path: '/shop/products/demo-ecommerce-product', name: 'Product Page' },
  { path: '/demo-ecommerce-product', name: 'Hybrid Product' },
  { path: '/blog', name: 'Blog' }
];

async function runLighthouse(url, options = {}) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const runnerResult = await lighthouse(url, {
    logLevel: 'error',
    output: 'json',
    port: chrome.port,
    ...options
  });

  await chrome.kill();
  return runnerResult;
}

async function testAllPages() {
  console.log('🔍 Running Lighthouse Mobile Tests\n');
  console.log('=' .repeat(50));

  const results = [];

  for (const page of PAGES_TO_TEST) {
    const url = `http://localhost:3000${page.path}`;
    console.log(`\nTesting ${page.name}...`);

    try {
      const result = await runLighthouse(url, {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        },
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2
        }
      });

      const scores = {
        name: page.name,
        url: url,
        performance: Math.round(result.lhr.categories.performance.score * 100),
        accessibility: Math.round(result.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(result.lhr.categories['best-practices'].score * 100),
        seo: Math.round(result.lhr.categories.seo.score * 100),

        // Mobile specific audits
        viewport: result.lhr.audits.viewport?.score === 1,
        fontSizes: result.lhr.audits['font-size']?.score === 1,
        tapTargets: result.lhr.audits['tap-targets']?.score === 1,
        contentWidth: result.lhr.audits['content-width']?.score === 1,

        // Performance metrics
        fcp: result.lhr.audits['first-contentful-paint']?.numericValue,
        lcp: result.lhr.audits['largest-contentful-paint']?.numericValue,
        cls: result.lhr.audits['cumulative-layout-shift']?.numericValue,

        // Issues
        issues: []
      };

      // Collect mobile-specific issues
      if (!scores.viewport) {
        scores.issues.push('❌ Missing proper viewport meta tag');
      }
      if (!scores.fontSizes) {
        scores.issues.push('❌ Font sizes too small for mobile');
      }
      if (!scores.tapTargets) {
        const tapTargetDetails = result.lhr.audits['tap-targets']?.details?.items || [];
        scores.issues.push(`❌ ${tapTargetDetails.length} tap targets too small`);
      }
      if (!scores.contentWidth) {
        scores.issues.push('❌ Content wider than viewport');
      }

      // Check accessibility issues
      const a11yAudits = ['color-contrast', 'image-alt', 'label', 'button-name'];
      a11yAudits.forEach(audit => {
        if (result.lhr.audits[audit]?.score !== 1) {
          scores.issues.push(`⚠️  ${result.lhr.audits[audit]?.title}`);
        }
      });

      results.push(scores);

      // Display immediate results
      console.log(`  📱 Performance: ${scores.performance}%`);
      console.log(`  ♿ Accessibility: ${scores.accessibility}%`);
      console.log(`  ✅ Best Practices: ${scores.bestPractices}%`);
      console.log(`  🔍 SEO: ${scores.seo}%`);

      if (scores.issues.length > 0) {
        console.log('  Issues:');
        scores.issues.slice(0, 3).forEach(issue => console.log(`    ${issue}`));
      }

    } catch (error) {
      console.error(`  ❌ Error testing ${page.name}: ${error.message}`);
      results.push({
        name: page.name,
        url: url,
        error: error.message
      });
    }
  }

  // Generate summary report
  console.log('\n' + '=' .repeat(50));
  console.log('📊 MOBILE RESPONSIVENESS SUMMARY');
  console.log('=' .repeat(50) + '\n');

  // Calculate averages
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const avgPerformance = Math.round(validResults.reduce((sum, r) => sum + r.performance, 0) / validResults.length);
    const avgAccessibility = Math.round(validResults.reduce((sum, r) => sum + r.accessibility, 0) / validResults.length);
    const avgBestPractices = Math.round(validResults.reduce((sum, r) => sum + r.bestPractices, 0) / validResults.length);
    const avgSEO = Math.round(validResults.reduce((sum, r) => sum + r.seo, 0) / validResults.length);

    console.log('Average Scores:');
    console.log(`  📱 Performance: ${avgPerformance}%`);
    console.log(`  ♿ Accessibility: ${avgAccessibility}%`);
    console.log(`  ✅ Best Practices: ${avgBestPractices}%`);
    console.log(`  🔍 SEO: ${avgSEO}%`);

    // Mobile readiness check
    console.log('\n📱 Mobile Readiness:');
    const mobileReady = validResults.every(r =>
      r.viewport &&
      r.fontSizes &&
      r.contentWidth &&
      r.accessibility >= 90 &&
      r.seo >= 90
    );

    if (mobileReady) {
      console.log('  ✅ All pages are mobile-friendly!');
    } else {
      console.log('  ⚠️  Some pages need mobile improvements:');
      validResults.forEach(r => {
        if (r.issues.length > 0) {
          console.log(`\n  ${r.name}:`);
          r.issues.slice(0, 3).forEach(issue => console.log(`    ${issue}`));
        }
      });
    }

    // Performance recommendations
    console.log('\n💡 Recommendations:');
    if (avgPerformance < 90) {
      console.log('  • Optimize images (use WebP, lazy loading)');
      console.log('  • Reduce JavaScript bundle size');
      console.log('  • Enable text compression');
    }
    if (!validResults.every(r => r.tapTargets)) {
      console.log('  • Increase tap target sizes to at least 48x48px');
    }
    if (avgAccessibility < 95) {
      console.log('  • Improve color contrast ratios');
      console.log('  • Add proper ARIA labels');
    }
  }

  // Save detailed report
  fs.writeFileSync('lighthouse-mobile-report.json', JSON.stringify(results, null, 2));
  console.log('\n📁 Detailed report saved to: lighthouse-mobile-report.json');

  // Generate HTML summary
  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile Responsiveness Report</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .page-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .scores { display: flex; gap: 20px; margin: 20px 0; }
    .score { text-align: center; padding: 15px; border-radius: 8px; flex: 1; }
    .score.good { background: #d4edda; color: #155724; }
    .score.ok { background: #fff3cd; color: #856404; }
    .score.poor { background: #f8d7da; color: #721c24; }
    .issues { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .metric { display: inline-block; margin-right: 20px; }
  </style>
</head>
<body>
  <h1>📱 Mobile Responsiveness Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>

  ${results.map(r => `
    <div class="page-card">
      <h2>${r.name}</h2>
      <div class="scores">
        <div class="score ${r.performance >= 90 ? 'good' : r.performance >= 50 ? 'ok' : 'poor'}">
          <strong>Performance</strong><br>${r.performance}%
        </div>
        <div class="score ${r.accessibility >= 90 ? 'good' : r.accessibility >= 50 ? 'ok' : 'poor'}">
          <strong>Accessibility</strong><br>${r.accessibility}%
        </div>
        <div class="score ${r.bestPractices >= 90 ? 'good' : r.bestPractices >= 50 ? 'ok' : 'poor'}">
          <strong>Best Practices</strong><br>${r.bestPractices}%
        </div>
        <div class="score ${r.seo >= 90 ? 'good' : r.seo >= 50 ? 'ok' : 'poor'}">
          <strong>SEO</strong><br>${r.seo}%
        </div>
      </div>

      ${r.issues?.length > 0 ? `
        <div class="issues">
          <strong>Issues to address:</strong>
          <ul>
            ${r.issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : '<p>✅ No major mobile issues detected!</p>'}

      <div style="margin-top: 15px;">
        <span class="metric">FCP: ${r.fcp ? (r.fcp/1000).toFixed(1) + 's' : 'N/A'}</span>
        <span class="metric">LCP: ${r.lcp ? (r.lcp/1000).toFixed(1) + 's' : 'N/A'}</span>
        <span class="metric">CLS: ${r.cls ? r.cls.toFixed(3) : 'N/A'}</span>
      </div>
    </div>
  `).join('')}
</body>
</html>
  `;

  fs.writeFileSync('lighthouse-mobile-report.html', htmlReport);
  console.log('📄 HTML report saved to: lighthouse-mobile-report.html');
}

// Run the tests
testAllPages().catch(console.error);