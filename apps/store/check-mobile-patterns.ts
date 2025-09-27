#!/usr/bin/env npx tsx

/**
 * Quick Mobile Pattern Checker
 *
 * Scans code for mobile-responsive patterns and potential issues
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileCheck {
  file: string;
  issues: string[];
  warnings: string[];
  goodPatterns: string[];
}

class MobilePatternChecker {
  private results: FileCheck[] = [];

  // Patterns that indicate good mobile practices
  private goodPatterns = {
    viewport: /<meta\s+name="viewport"\s+content="[^"]*width=device-width/,
    responsiveClasses: /\b(sm:|md:|lg:|xl:|2xl:)/,
    flexibleWidth: /\b(w-full|max-w-|min-w-|w-auto)\b/,
    flexibleHeight: /\b(h-full|max-h-|min-h-|h-auto)\b/,
    responsiveGrid: /\b(grid-cols-1|grid-cols-2|sm:grid-cols-|md:grid-cols-|lg:grid-cols-)\b/,
    responsiveFlex: /\b(flex-col|sm:flex-row|md:flex-row|flex-wrap)\b/,
    responsiveText: /\b(text-xs|text-sm|text-base|text-lg|sm:text-|md:text-|lg:text-)\b/,
    responsivePadding: /\b(p-\d|px-\d|py-\d|sm:p-|md:p-|lg:p-)\b/,
    responsiveMargin: /\b(m-\d|mx-\d|my-\d|sm:m-|md:m-|lg:m-)\b/,
    mobileFirst: /\b(block sm:hidden|hidden sm:block|sm:hidden|md:hidden)\b/,
    touchTargets: /\b(p-[3-9]|p-1[0-9]|py-[3-9]|px-[3-9])\b/, // Adequate padding for touch
  };

  // Patterns that might cause mobile issues
  private problemPatterns = {
    fixedWidth: /\b(w-\[?\d{3,}(px|rem|em)\]?)\b/, // Fixed widths over 100
    fixedHeight: /\b(h-\[?\d{3,}(px|rem|em)\]?)\b/, // Fixed heights over 100
    absolutePositioning: /\b(absolute|fixed)\b(?!.*\b(sm:|md:|lg:))/,
    largeFixedText: /\btext-\[?[3-9]\d+(px|rem|em)\]?\b/, // Text over 30px
    noWrap: /\bwhitespace-nowrap\b(?!.*\b(sm:|md:|lg:))/,
    overflow: /\boverflow-(?:hidden|scroll|auto)\b/,
    negativeMargin: /\b-m[xytblr]?-\d+\b/,
    highZIndex: /\bz-[5-9]\d+\b/,
    inlineStyles: /style=["'][^"']*(?:width|height):\s*\d{3,}px/,
    tableLayout: /<table\b(?!.*\bresponsive)/,
  };

  checkFile(filePath: string): FileCheck {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues: string[] = [];
    const warnings: string[] = [];
    const goodPatterns: string[] = [];

    // Check for good patterns
    Object.entries(this.goodPatterns).forEach(([name, pattern]) => {
      if (pattern.test(content)) {
        goodPatterns.push(name);
      }
    });

    // Check for problematic patterns
    Object.entries(this.problemPatterns).forEach(([name, pattern]) => {
      const matches = content.match(new RegExp(pattern, 'g'));
      if (matches && matches.length > 0) {
        const severity = this.getSeverity(name);
        const message = `${name}: found ${matches.length} instance(s)`;

        if (severity === 'error') {
          issues.push(message);
        } else {
          warnings.push(message);
        }
      }
    });

    // Specific checks for components
    if (filePath.includes('component')) {
      // Check if component has responsive variants
      if (!this.goodPatterns.responsiveClasses.test(content)) {
        warnings.push('Component lacks responsive breakpoint classes');
      }
    }

    // Check for viewport meta in layout files
    if (filePath.includes('layout.tsx') && !content.includes('viewport')) {
      issues.push('Layout missing viewport meta tag configuration');
    }

    // Check for image responsiveness
    const imgTags = content.match(/<img\b[^>]*>/g) || [];
    const nextImages = content.match(/<Image\b[^>]*>/g) || [];

    imgTags.forEach(img => {
      if (!img.includes('w-full') && !img.includes('max-w-')) {
        warnings.push('Found <img> tag without responsive width classes');
      }
    });

    // Check button/link sizes
    const buttons = content.match(/<(button|Button)\b[^>]*>/g) || [];
    buttons.forEach(btn => {
      if (!btn.match(/\b(p-[2-9]|py-[2-9]|px-[3-9])\b/)) {
        warnings.push('Button might be too small for touch targets');
      }
    });

    return {
      file: filePath.replace(process.cwd(), '.'),
      issues,
      warnings,
      goodPatterns
    };
  }

  getSeverity(patternName: string): 'error' | 'warning' {
    const errors = ['fixedWidth', 'inlineStyles', 'tableLayout'];
    return errors.includes(patternName) ? 'error' : 'warning';
  }

  scanDirectory(dir: string, extensions: string[] = ['.tsx', '.jsx']) {
    const files = this.getFiles(dir, extensions);

    console.log(`🔍 Scanning ${files.length} files for mobile patterns...\n`);

    files.forEach(file => {
      const result = this.checkFile(file);
      this.results.push(result);
    });
  }

  getFiles(dir: string, extensions: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        results = results.concat(this.getFiles(filePath, extensions));
      } else if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    });

    return results;
  }

  generateReport() {
    console.log('=' .repeat(60));
    console.log('📱 MOBILE PATTERN CHECK REPORT');
    console.log('=' .repeat(60) + '\n');

    const summary = {
      totalFiles: this.results.length,
      filesWithIssues: this.results.filter(r => r.issues.length > 0).length,
      filesWithWarnings: this.results.filter(r => r.warnings.length > 0).length,
      perfectFiles: this.results.filter(r => r.issues.length === 0 && r.warnings.length === 0 && r.goodPatterns.length > 3).length,
    };

    console.log('📊 Summary:');
    console.log(`   Total files scanned: ${summary.totalFiles}`);
    console.log(`   ✅ Perfect (no issues, good patterns): ${summary.perfectFiles}`);
    console.log(`   ⚠️  Files with warnings: ${summary.filesWithWarnings}`);
    console.log(`   ❌ Files with issues: ${summary.filesWithIssues}`);

    // Files with critical issues
    const criticalFiles = this.results.filter(r => r.issues.length > 0);
    if (criticalFiles.length > 0) {
      console.log('\n🚨 Files with Critical Issues:');
      criticalFiles.forEach(file => {
        console.log(`\n   ${file.file}`);
        file.issues.forEach(issue => {
          console.log(`      ❌ ${issue}`);
        });
      });
    }

    // Top warnings
    const allWarnings = new Map<string, number>();
    this.results.forEach(r => {
      r.warnings.forEach(w => {
        const key = w.split(':')[0];
        allWarnings.set(key, (allWarnings.get(key) || 0) + 1);
      });
    });

    if (allWarnings.size > 0) {
      console.log('\n⚠️  Most Common Warnings:');
      Array.from(allWarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([warning, count]) => {
          console.log(`   • ${warning}: ${count} files`);
        });
    }

    // Best practices found
    const goodPatternsCount = new Map<string, number>();
    this.results.forEach(r => {
      r.goodPatterns.forEach(p => {
        goodPatternsCount.set(p, (goodPatternsCount.get(p) || 0) + 1);
      });
    });

    console.log('\n✅ Good Mobile Patterns Found:');
    Array.from(goodPatternsCount.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([pattern, count]) => {
        const percentage = ((count / summary.totalFiles) * 100).toFixed(0);
        console.log(`   • ${pattern}: ${count} files (${percentage}%)`);
      });

    // Specific recommendations
    console.log('\n💡 Recommendations:');
    this.generateRecommendations();

    // Save detailed report
    fs.writeFileSync('mobile-patterns-report.json', JSON.stringify(this.results, null, 2));
    console.log('\n📁 Detailed report saved to: mobile-patterns-report.json');
  }

  generateRecommendations() {
    const recommendations: string[] = [];

    // Check for common issues
    const hasFixedWidth = this.results.some(r => r.issues.some(i => i.includes('fixedWidth')));
    const hasNoResponsive = this.results.some(r => r.warnings.some(w => w.includes('lacks responsive')));
    const hasSmallButtons = this.results.some(r => r.warnings.some(w => w.includes('too small for touch')));

    if (hasFixedWidth) {
      recommendations.push('Replace fixed widths with responsive classes (w-full, max-w-*, etc.)');
    }

    if (hasNoResponsive) {
      recommendations.push('Add responsive breakpoint variants (sm:, md:, lg:) to components');
    }

    if (hasSmallButtons) {
      recommendations.push('Ensure all touch targets are at least 44x44px (add p-3 or larger)');
    }

    // Check adoption of good patterns
    const responsiveClassAdoption = this.results.filter(r =>
      r.goodPatterns.includes('responsiveClasses')
    ).length;

    if (responsiveClassAdoption < this.results.length * 0.8) {
      recommendations.push('Increase use of responsive Tailwind classes across components');
    }

    if (recommendations.length === 0) {
      recommendations.push('Mobile patterns look good! Consider device testing for final validation');
    }

    recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
}

// Quick viewport check for critical pages
async function quickViewportCheck() {
  const critical = [
    'apps/store/app/layout.tsx',
    'apps/store/app/page.tsx',
    'apps/store/app/shop/products/[handle]/page.tsx',
  ];

  console.log('\n🔍 Quick Viewport Check:\n');

  critical.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasViewport = content.includes('viewport') || content.includes('Viewport');
      console.log(`   ${hasViewport ? '✅' : '❌'} ${file.split('/').pop()}`);
    }
  });
}

// Main execution
async function main() {
  const checker = new MobilePatternChecker();

  // Scan app directory
  checker.scanDirectory('app');

  // Scan components directory
  checker.scanDirectory('components');

  // Generate report
  checker.generateReport();

  // Quick viewport check
  await quickViewportCheck();

  console.log('\n✅ Mobile pattern check complete!');
}

main().catch(console.error);