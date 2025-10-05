#!/usr/bin/env npx tsx

/**
 * Mobile Responsiveness Test Suite
 *
 * Tests all page templates for mobile-friendliness
 * Checks viewport settings, responsive classes, and common mobile issues
 */

import { chromium, devices, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Mobile devices to test
const DEVICES_TO_TEST = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S21', device: devices['Galaxy S8'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] },
];

// Pages to test
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/demo-ecommerce-product', name: 'Demo Ecommerce Product' },
  { path: '/demo-landing-product', name: 'Demo Landing Product' },
  { path: '/blog', name: 'Blog Page' },
  { path: '/checkout/success', name: 'Checkout Success' },
];

// Viewport breakpoints to test
const VIEWPORT_SIZES = [
  { width: 320, height: 568, name: 'Mobile S' },
  { width: 375, height: 667, name: 'Mobile M' },
  { width: 425, height: 812, name: 'Mobile L' },
  { width: 768, height: 1024, name: 'Tablet' },
  { width: 1024, height: 768, name: 'Tablet Landscape' },
];

interface TestResult {
  page: string;
  device?: string;
  viewport?: string;
  issues: string[];
  warnings: string[];
  passed: boolean;
  metrics?: {
    horizontalScrollable: boolean;
    textReadability: boolean;
    touchTargetSize: boolean;
    viewportMeta: boolean;
    responsiveImages: boolean;
    fontSizes: boolean;
  };
}

class MobileResponsivenessTest {
  private browser: Browser | null = null;
  private results: TestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched');
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  async testPage(context: BrowserContext, pagePath: string, deviceName?: string, viewportName?: string): Promise<TestResult> {
    const page = await context.newPage();
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Navigate to page
      await page.goto(`${this.baseUrl}${pagePath}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for content to be visible
      await page.waitForTimeout(2000);

      // Check viewport meta tag
      const viewportMeta = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta ? meta.getAttribute('content') : null;
      });

      if (!viewportMeta) {
        issues.push('Missing viewport meta tag');
      } else if (!viewportMeta.includes('width=device-width')) {
        issues.push('Viewport meta tag missing "width=device-width"');
      }

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        issues.push('Page has horizontal scroll on mobile');
      }

      // Check text readability (font sizes)
      const smallTextElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const small: string[] = [];
        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const fontSize = parseFloat(styles.fontSize);
          if (fontSize > 0 && fontSize < 12 && el.textContent?.trim()) {
            small.push(`${el.tagName}: ${fontSize}px`);
          }
        });
        return small.slice(0, 5); // Return first 5 instances
      });

      if (smallTextElements.length > 0) {
        warnings.push(`Found ${smallTextElements.length} elements with font size < 12px`);
      }

      // Check touch target sizes
      const smallTouchTargets = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
        const small: string[] = [];
        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            small.push(`${el.tagName}: ${rect.width}x${rect.height}`);
          }
        });
        return small.slice(0, 5);
      });

      if (smallTouchTargets.length > 0) {
        warnings.push(`Found ${smallTouchTargets.length} interactive elements smaller than 44x44px`);
      }

      // Check for fixed positioning issues
      const fixedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const fixed: string[] = [];
        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          if (styles.position === 'fixed') {
            fixed.push(el.className || el.tagName);
          }
        });
        return fixed;
      });

      if (fixedElements.length > 3) {
        warnings.push(`Many fixed position elements (${fixedElements.length}) may cause mobile issues`);
      }

      // Check images for responsiveness
      const nonResponsiveImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const nonResponsive: string[] = [];
        images.forEach(img => {
          const styles = window.getComputedStyle(img);
          if (styles.maxWidth !== '100%' && !img.className.includes('w-full')) {
            nonResponsive.push(img.src.substring(img.src.lastIndexOf('/') + 1));
          }
        });
        return nonResponsive.slice(0, 5);
      });

      if (nonResponsiveImages.length > 0) {
        warnings.push(`Found ${nonResponsiveImages.length} potentially non-responsive images`);
      }

      // Check for mobile-specific classes
      const hasMobileClasses = await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        return html.includes('sm:') || html.includes('md:') || html.includes('lg:');
      });

      if (!hasMobileClasses) {
        warnings.push('No responsive Tailwind classes detected');
      }

      // Check z-index stacking
      const highZIndexElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const high: string[] = [];
        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const zIndex = parseInt(styles.zIndex);
          if (zIndex > 100) {
            high.push(`${el.className || el.tagName}: z-${zIndex}`);
          }
        });
        return high;
      });

      if (highZIndexElements.length > 0) {
        warnings.push(`Found elements with very high z-index values`);
      }

      // Check for overflow issues
      const overflowElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const overflow: string[] = [];
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth) {
            overflow.push(el.className || el.tagName);
          }
        });
        return overflow.slice(0, 5);
      });

      if (overflowElements.length > 0) {
        issues.push(`Found ${overflowElements.length} elements extending beyond viewport`);
      }

      // Take screenshot for manual review
      const screenshotDir = 'mobile-screenshots';
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshotName = `${pagePath.replace(/\//g, '-')}-${deviceName || viewportName || 'default'}.png`.replace(/^-/, '');
      await page.screenshot({
        path: path.join(screenshotDir, screenshotName),
        fullPage: false
      });

      const result: TestResult = {
        page: pagePath,
        device: deviceName,
        viewport: viewportName,
        issues,
        warnings,
        passed: issues.length === 0,
        metrics: {
          horizontalScrollable: !hasHorizontalScroll,
          textReadability: smallTextElements.length === 0,
          touchTargetSize: smallTouchTargets.length === 0,
          viewportMeta: !!viewportMeta && viewportMeta.includes('width=device-width'),
          responsiveImages: nonResponsiveImages.length === 0,
          fontSizes: smallTextElements.length === 0,
        }
      };

      return result;

    } catch (error) {
      issues.push(`Error testing page: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        page: pagePath,
        device: deviceName,
        viewport: viewportName,
        issues,
        warnings,
        passed: false
      };
    } finally {
      await page.close();
    }
  }

  async runTests() {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call setup() first.');
    }

    console.log('🔍 Starting Mobile Responsiveness Tests\n');
    console.log('=' .repeat(50));

    // Test with real device emulation
    for (const device of DEVICES_TO_TEST) {
      console.log(`\n📱 Testing on ${device.name}`);
      const context = await this.browser.newContext({
        ...device.device
      });

      for (const pageInfo of PAGES_TO_TEST) {
        process.stdout.write(`  Testing ${pageInfo.name}... `);
        const result = await this.testPage(context, pageInfo.path, device.name);
        this.results.push(result);

        if (result.passed) {
          console.log('✅');
        } else {
          console.log(`❌ (${result.issues.length} issues)`);
        }
      }

      await context.close();
    }

    // Test with viewport sizes
    console.log(`\n📐 Testing viewport breakpoints`);
    for (const viewport of VIEWPORT_SIZES) {
      console.log(`\n  ${viewport.name} (${viewport.width}x${viewport.height})`);
      const context = await this.browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36'
      });

      for (const pageInfo of PAGES_TO_TEST) {
        process.stdout.write(`    Testing ${pageInfo.name}... `);
        const result = await this.testPage(context, pageInfo.path, undefined, viewport.name);
        this.results.push(result);

        if (result.passed) {
          console.log('✅');
        } else {
          console.log(`❌ (${result.issues.length} issues)`);
        }
      }

      await context.close();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MOBILE RESPONSIVENESS TEST REPORT');
    console.log('='.repeat(50) + '\n');

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      criticalIssues: new Set<string>(),
      commonWarnings: new Set<string>(),
    };

    // Collect unique issues and warnings
    this.results.forEach(result => {
      result.issues.forEach(issue => summary.criticalIssues.add(issue));
      result.warnings.forEach(warning => summary.commonWarnings.add(warning));
    });

    // Overall summary
    console.log('📈 Overall Results:');
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)`);

    // Critical issues
    if (summary.criticalIssues.size > 0) {
      console.log('\n🚨 Critical Issues Found:');
      Array.from(summary.criticalIssues).forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    // Common warnings
    if (summary.commonWarnings.size > 0) {
      console.log('\n⚠️  Common Warnings:');
      Array.from(summary.commonWarnings).slice(0, 5).forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    // Page-specific report
    console.log('\n📄 Page-by-Page Results:');
    const pageResults = new Map<string, { passed: number, failed: number, issues: Set<string> }>();

    this.results.forEach(result => {
      if (!pageResults.has(result.page)) {
        pageResults.set(result.page, { passed: 0, failed: 0, issues: new Set() });
      }
      const pageData = pageResults.get(result.page)!;
      if (result.passed) {
        pageData.passed++;
      } else {
        pageData.failed++;
        result.issues.forEach(issue => pageData.issues.add(issue));
      }
    });

    pageResults.forEach((data, page) => {
      const total = data.passed + data.failed;
      const passRate = ((data.passed / total) * 100).toFixed(0);
      const status = data.failed === 0 ? '✅' : '⚠️';
      console.log(`\n   ${status} ${page}`);
      console.log(`      Pass rate: ${passRate}% (${data.passed}/${total})`);
      if (data.issues.size > 0) {
        console.log(`      Issues:`);
        Array.from(data.issues).forEach(issue => {
          console.log(`        - ${issue}`);
        });
      }
    });

    // Recommendations
    console.log('\n💡 Recommendations:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    // Save detailed report
    const reportPath = 'mobile-responsiveness-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: mobile-screenshots/`);
  }

  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const issues = new Set<string>();

    this.results.forEach(r => {
      r.issues.forEach(i => issues.add(i));
    });

    if (issues.has('Page has horizontal scroll on mobile')) {
      recommendations.push('Add "overflow-x-hidden" to body or main container');
      recommendations.push('Check for elements with fixed widths that exceed mobile viewport');
    }

    if (Array.from(issues).some(i => i.includes('font size < 12px'))) {
      recommendations.push('Increase minimum font size to 14px for better mobile readability');
      recommendations.push('Use responsive font sizes (text-sm, text-base, etc.)');
    }

    if (Array.from(issues).some(i => i.includes('smaller than 44x44px'))) {
      recommendations.push('Increase touch target sizes to minimum 44x44px (Apple HIG recommendation)');
      recommendations.push('Add padding to small interactive elements');
    }

    if (Array.from(issues).some(i => i.includes('viewport meta'))) {
      recommendations.push('Ensure viewport meta tag is properly configured');
    }

    if (Array.from(issues).some(i => i.includes('non-responsive images'))) {
      recommendations.push('Add "max-w-full h-auto" or "w-full" classes to images');
      recommendations.push('Consider using Next.js Image component for automatic optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Mobile responsiveness looks good! Consider testing with real devices');
      recommendations.push('Monitor Core Web Vitals for mobile performance');
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const tester = new MobileResponsivenessTest();

  try {
    await tester.setup();
    await tester.runTests();
    tester.generateReport();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await tester.teardown();
  }
}

// Check if Playwright is installed
async function checkDependencies() {
  try {
    require('playwright');
    return true;
  } catch {
    console.log('📦 Installing Playwright...');
    const { execSync } = require('child_process');
    execSync('npm install -D playwright', { stdio: 'inherit' });
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    return true;
  }
}

// Run the test
checkDependencies().then(() => {
  main().catch(console.error);
});
