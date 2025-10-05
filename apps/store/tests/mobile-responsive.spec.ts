import { test, expect } from '@playwright/test';

// Pages to test for mobile responsiveness
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/demo-ecommerce-product', name: 'Demo Ecommerce Product' },
  { path: '/demo-landing-product', name: 'Demo Landing Product' },
  { path: '/blog', name: 'Blog Page' },
];

// Helper function to test mobile responsiveness
async function testMobileResponsiveness(page: any, pagePath: string, pageName: string) {
  // Navigate to the page
  await page.goto(`http://localhost:3000${pagePath}`);

  // Check viewport meta tag
  const viewportMeta = await page.$eval(
    'meta[name="viewport"]',
    (el: Element) => el.getAttribute('content')
  ).catch(() => null);

  expect(viewportMeta).toBeTruthy();
  expect(viewportMeta).toContain('width=device-width');

  // Check for horizontal scroll (should not exist)
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBeFalsy();

  // Check that all images are responsive
  const nonResponsiveImages = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > window.innerWidth;
    }).length;
  });
  expect(nonResponsiveImages).toBe(0);

  // Check text is readable (minimum font size)
  const tooSmallText = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter(el => {
      const styles = window.getComputedStyle(el);
      const fontSize = parseFloat(styles.fontSize);
      return fontSize > 0 && fontSize < 12 && el.textContent?.trim();
    }).length;
  });
  expect(tooSmallText).toBe(0);

  // Check for content overflow
  const overflowingElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.right > window.innerWidth || rect.left < 0;
    }).length;
  });
  expect(overflowingElements).toBe(0);

  // Check touch targets are adequate size (44x44px minimum)
  const smallTouchTargets = await page.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
    return interactive.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map(el => ({
      tag: el.tagName,
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
      text: el.textContent?.trim().substring(0, 20)
    }));
  });

  // Log small touch targets for debugging but don't fail
  if (smallTouchTargets.length > 0) {
    console.log(`Warning: ${pageName} has ${smallTouchTargets.length} small touch targets:`, smallTouchTargets.slice(0, 3));
  }
}

// Test each page
PAGES_TO_TEST.forEach(({ path, name }) => {
  test(`${name} should be mobile responsive`, async ({ page }) => {
    await testMobileResponsiveness(page, path, name);

    // Take screenshot for visual inspection
    await page.screenshot({
      path: `screenshots/mobile-${name.replace(/ /g, '-').toLowerCase()}.png`,
      fullPage: false
    });
  });
});

// Test specific viewport sizes
test.describe('Viewport Breakpoints', () => {
  const viewports = [
    { width: 320, height: 568, name: 'Mobile-S' },
    { width: 375, height: 667, name: 'Mobile-M' },
    { width: 768, height: 1024, name: 'Tablet' },
  ];

  viewports.forEach(viewport => {
    test(`Homepage adapts to ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000');

      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();

      // Check navigation menu (should be mobile menu on small screens)
      if (viewport.width < 768) {
        // Should have mobile menu button
        const mobileMenuButton = await page.$('[aria-label*="menu"], button:has(svg)');
        expect(mobileMenuButton).toBeTruthy();
      }

      // Check grid layouts adapt
      const gridElements = await page.evaluate(() => {
        const grids = Array.from(document.querySelectorAll('[class*="grid"]'));
        return grids.map(grid => {
          const styles = window.getComputedStyle(grid);
          return {
            columns: styles.gridTemplateColumns,
            width: grid.getBoundingClientRect().width
          };
        });
      });

      // Verify grids don't exceed viewport
      gridElements.forEach(grid => {
        expect(grid.width).toBeLessThanOrEqual(viewport.width);
      });

      await page.screenshot({
        path: `screenshots/viewport-${viewport.name}-homepage.png`,
        fullPage: false
      });
    });

    test(`Product page adapts to ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000/demo-ecommerce-product');

      // Check product images don't exceed viewport
      const imageWidths = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.getBoundingClientRect().width);
      });

      imageWidths.forEach(width => {
        expect(width).toBeLessThanOrEqual(viewport.width);
      });

      // Check buy button is visible and properly sized
      const buyButton = await page.$('button:has-text("Buy"), button:has-text("Add to Cart"), button:has-text("Purchase")');
      if (buyButton) {
        const buttonRect = await buyButton.boundingBox();
        expect(buttonRect).toBeTruthy();
        if (buttonRect) {
          expect(buttonRect.width).toBeGreaterThan(100);
          expect(buttonRect.height).toBeGreaterThanOrEqual(44);
        }
      }

      await page.screenshot({
        path: `screenshots/viewport-${viewport.name}-product.png`,
        fullPage: false
      });
    });
  });
});

// Test critical user interactions on mobile
test.describe('Mobile User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Should be able to navigate mobile menu', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Look for mobile menu button
    const menuButton = await page.$('button:has(svg), [aria-label*="menu"]');
    if (menuButton) {
      await menuButton.click();

      // Check if menu opened
      await page.waitForTimeout(500);
      const menuVisible = await page.$('nav[aria-expanded="true"], [data-state="open"]');
      expect(menuVisible).toBeTruthy();
    }
  });

  test('Should be able to view product on mobile', async ({ page }) => {
    await page.goto('http://localhost:3000/demo-ecommerce-product');

    // Find and check buy button
    const buyButton = await page.$('button:has-text("Buy"), button:has-text("Get Started"), a:has-text("Buy")');
    if (buyButton) {
      const isClickable = await buyButton.isVisible();
      expect(isClickable).toBeTruthy();

      // Check button size for touch
      const buttonBox = await buyButton.boundingBox();
      if (buttonBox) {
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Check that price is visible
    const priceElement = await page.$('text=/\\$[0-9]+/');
    expect(priceElement).toBeTruthy();
  });

  test('Forms should be mobile-friendly', async ({ page }) => {
    await page.goto('http://localhost:3000/demo-ecommerce-product');

    // Check all input fields
    const inputs = await page.$$('input, textarea, select');

    for (const input of inputs) {
      const box = await input.boundingBox();
      if (box) {
        // Input fields should be at least 32px tall for easy tapping
        expect(box.height).toBeGreaterThanOrEqual(32);

        // Should not exceed viewport width
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(box.width).toBeLessThanOrEqual(viewportWidth);
      }
    }
  });
});

// Test responsive images
test.describe('Responsive Images', () => {
  test('Images should use responsive sizing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height,
        loading: img.loading,
        srcset: img.srcset,
        sizes: img.sizes,
        naturalWidth: img.naturalWidth,
        className: img.className
      }));
    });

    images.forEach((img, index) => {
      // Images should not exceed viewport width
      expect(img.width).toBeLessThanOrEqual(375);

      // Log images that might benefit from optimization
      if (img.naturalWidth > 1200 && !img.srcset) {
        console.log(`Image ${index} could benefit from srcset: ${img.src.substring(img.src.lastIndexOf('/') + 1)}`);
      }
    });
  });
});

// Performance checks on mobile
test.describe('Mobile Performance', () => {
  test('Page should load quickly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();

    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded'
    });

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check for lazy loading on images
    const lazyImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img[loading="lazy"]'));
      return images.length;
    });

    console.log(`Found ${lazyImages} lazy-loaded images`);

    // Check for web fonts that might block rendering
    const fonts = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      let fontCount = 0;
      styles.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSFontFaceRule) {
              fontCount++;
            }
          });
        } catch (e) {
          // Cross-origin stylesheets will throw
        }
      });
      return fontCount;
    });

    console.log(`Found ${fonts} custom fonts loaded`);
  });
});
