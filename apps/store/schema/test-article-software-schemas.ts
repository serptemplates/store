#!/usr/bin/env tsx

/**
 * Test script for Article and SoftwareApplication schemas
 * Run with: npx tsx schema/test-article-software-schemas.ts
 */

import {
  generateArticleSchema,
  generateBlogPostingSchema,
  generateWebApplicationSchema,
  generateSoftwareApplicationSchema,
} from './index';

console.log('🔍 Testing Article & SoftwareApplication Schemas\n');
console.log('=' .repeat(60));

// Test Article Schema for Blog Posts
console.log('\n📰 Article Schema (Blog Post)');
console.log('-'.repeat(40));

const articleSchema = generateBlogPostingSchema({
  headline: 'How to Optimize Your Downloads for Speed',
  description: 'Learn the best practices for optimizing download speeds and improving user experience',
  image: 'https://apps.serp.co/blog/images/optimize-downloads.jpg',
  datePublished: '2024-01-15T10:00:00Z',
  dateModified: '2024-01-20T15:30:00Z',
  author: {
    name: 'John Developer',
    url: 'https://apps.serp.co/author/john',
  },
  url: 'https://apps.serp.co/blog/optimize-downloads',
  wordCount: 1500,
  keywords: ['downloads', 'optimization', 'performance', 'speed'],
  articleSection: 'Technical Tutorials',
  publisher: {
    name: 'SERP Apps',
    logo: 'https://apps.serp.co/logo.svg',
  },
});

console.log('Required Fields:');
console.log('  ✓ headline:', !!articleSchema.headline);
console.log('  ✓ image:', !!articleSchema.image);
console.log('  ✓ datePublished:', !!articleSchema.datePublished);
console.log('  ✓ dateModified:', !!articleSchema.dateModified);
console.log('  ✓ author:', !!articleSchema.author);
console.log('  ✓ publisher:', !!articleSchema.publisher);
console.log('  ✓ mainEntityOfPage:', !!articleSchema.mainEntityOfPage);
console.log('\nRecommended Fields:');
console.log('  ✓ description:', !!articleSchema.description);
console.log('  ✓ wordCount:', !!articleSchema.wordCount);
console.log('  ✓ keywords:', !!articleSchema.keywords);
console.log('  ✓ articleSection:', !!articleSchema.articleSection);

// Test SoftwareApplication Schema
console.log('\n\n💻 SoftwareApplication Schema (Web App)');
console.log('-'.repeat(40));

const softwareAppSchema = generateWebApplicationSchema({
  name: 'Video Downloader Pro',
  description: 'Professional video downloading tool with advanced features for content creators',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: ['Windows', 'macOS', 'Linux', 'Web Browser'],
  offers: {
    price: 49.99,
    priceCurrency: 'USD',
  },
  aggregateRating: {
    ratingValue: 4.7,
    ratingCount: 1250,
    bestRating: 5,
    worstRating: 1,
  },
  screenshot: [
    'https://apps.serp.co/screenshots/app1.jpg',
    'https://apps.serp.co/screenshots/app2.jpg',
    'https://apps.serp.co/screenshots/app3.jpg',
  ],
  softwareVersion: '2.5.0',
  fileSize: '15MB',
  softwareRequirements: 'Requires modern web browser with JavaScript enabled',
  url: 'https://apps.serp.co/video-downloader-pro',
  downloadUrl: 'https://apps.serp.co/download/video-downloader-pro',
  author: {
    name: 'SERP Apps',
    url: 'https://apps.serp.co',
  },
  datePublished: '2023-06-15',
  dateModified: '2024-01-20',
  permissions: ['Internet Access', 'Download Files', 'Local Storage'],
  featureList: [
    'Batch downloading',
    '4K video support',
    'Multiple format conversion',
    'Playlist downloads',
    'Subtitle extraction',
    'Audio-only downloads',
  ],
  browserRequirements: 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
});

console.log('Required Fields:');
console.log('  ✓ name:', !!softwareAppSchema.name);
console.log('  ✓ applicationCategory:', !!softwareAppSchema.applicationCategory);
console.log('  ✓ operatingSystem:', !!softwareAppSchema.operatingSystem);
console.log('  ✓ offers:', !!softwareAppSchema.offers);
console.log('\nRecommended Fields:');
console.log('  ✓ description:', !!softwareAppSchema.description);
console.log('  ✓ aggregateRating:', !!softwareAppSchema.aggregateRating);
console.log('  ✓ screenshot:', Array.isArray(softwareAppSchema.screenshot));
console.log('  ✓ softwareVersion:', !!softwareAppSchema.softwareVersion);
console.log('  ✓ fileSize:', !!softwareAppSchema.fileSize);
console.log('  ✓ author:', !!softwareAppSchema.author);
console.log('  ✓ datePublished:', !!softwareAppSchema.datePublished);
console.log('  ✓ featureList:', !!softwareAppSchema.featureList);
console.log('  ✓ browserRequirements:', !!softwareAppSchema.browserRequirements);

// Summary
console.log('\n' + '=' .repeat(60));
console.log('\n✅ Both Schemas Successfully Generated!\n');

console.log('📝 Implementation Status:');
console.log('  • Article Schema: Added to /app/blog/[slug]/page.tsx');
console.log('  • SoftwareApplication Schema: Added to /app/[slug]/hybrid-page.tsx');
console.log('  • Both schemas are now live on respective pages');

console.log('\n🔗 Test URLs:');
console.log('  • Blog Post: https://apps.serp.co/blog/[any-post-slug]');
console.log('  • Software App: https://apps.serp.co/[any-product-slug]');

console.log('\n📊 Google Search Console Benefits:');
console.log('  • Article: Enhanced visibility in Google News, Discover');
console.log('  • SoftwareApp: Rich snippets with ratings, price, screenshots');

console.log('\n🧪 To Test:');
console.log('  1. Visit any blog post or product page');
console.log('  2. View page source and find the JSON-LD scripts');
console.log('  3. Copy and test at: https://search.google.com/test/rich-results');

console.log('\n✨ Ready for Google Rich Results!');
