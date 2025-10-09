#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

const productsDir = path.resolve("/home/runner/work/store/store/apps/store/data/products");

/**
 * Generates an SEO-optimized title for a downloader product
 * Following best practices:
 * - Under 60 characters for optimal display in search results
 * - Includes primary keyword (platform name + downloader)
 * - Adds compelling benefit/feature
 * - Avoids redundancy
 * - Focuses on user intent
 */
function generateOptimizedSeoTitle(name, platform, slug) {
  // Clean up the platform name
  const cleanPlatform = platform || name.split(' ')[0] || slug.split('-')[0];
  
  // Define SEO-optimized title patterns based on product type
  const patterns = {
    // Social media platforms
    'tiktok': 'Download TikTok Videos Without Watermark | Fast & Easy',
    'instagram': 'Instagram Video & Photo Downloader | Save Posts, Stories & Reels',
    'youtube': 'YouTube Video Downloader | HD, 4K & 8K Quality Downloads',
    'facebook': 'Facebook Video Downloader | Save Videos, Photos & Stories',
    'twitter': 'Twitter Video Downloader | Save Videos & GIFs Instantly',
    'reddit': 'Reddit Video Downloader | Save Videos & GIFs Fast',
    'snapchat': 'Snapchat Video Downloader | Save Stories & Snaps',
    'pinterest': 'Pinterest Image & Video Downloader | Save Pins Instantly',
    'twitch': 'Twitch Clip & VOD Downloader | Save Streams in HD',
    'linkedin': 'LinkedIn Video Downloader | Save Professional Content',
    
    // Video platforms
    'vimeo': 'Vimeo Video Downloader | HD Quality Offline Viewing',
    'dailymotion': 'Dailymotion Video Downloader | Fast HD Downloads',
    'rumble': 'Rumble Video Downloader | Save Videos Offline',
    'kick': 'Kick Clip Downloader | Save Streams & Highlights',
    'bilibili': 'Bilibili Video Downloader | Download Anime & Videos',
    
    // Streaming services
    'netflix': 'Netflix Video Downloader | Save Movies & Series Offline',
    'amazon': 'Amazon Prime Video Downloader | Offline Viewing Tool',
    'hulu': 'Hulu Video Downloader | Save Shows & Movies',
    'disney': 'Disney+ Downloader | Save Your Favorite Content',
    
    // Learning platforms
    'coursera': 'Coursera Course Downloader | Save Lectures for Offline Study',
    'udemy': 'Udemy Course Downloader | Download Videos for Offline Learning',
    'linkedin-learning': 'LinkedIn Learning Downloader | Save Courses Offline',
    'skillshare': 'Skillshare Class Downloader | Offline Learning Tool',
    'khan-academy': 'Khan Academy Video Downloader | Educational Content Saver',
    'pluralsight': 'Pluralsight Course Downloader | Save Tech Training Videos',
    'teachable': 'Teachable Course Downloader | Save Your Purchased Courses',
    'thinkific': 'Thinkific Course Downloader | Download Course Materials',
    'kajabi': 'Kajabi Course Downloader | Save Videos & Content',
    'podia': 'Podia Course Downloader | Download Your Digital Products',
    'moodle': 'Moodle Course Downloader | Save Course Materials Offline',
    'circle': 'Circle Community Downloader | Save Course & Community Content',
    'gohighlevel': 'GoHighLevel Course Downloader | Save Training Materials',
    
    // Stock & creative platforms
    'shutterstock': 'Shutterstock Downloader | Save Stock Photos & Videos',
    'getty': 'Getty Images Downloader | Save Stock Photography',
    'adobe-stock': 'Adobe Stock Downloader | Save Creative Assets',
    'freepik': 'Freepik Downloader | Download Graphics & Templates',
    'canva': 'Canva Design Downloader | Export Your Designs Easily',
    'depositphotos': 'Depositphotos Downloader | Save Stock Media Files',
    'dreamstime': 'Dreamstime Stock Downloader | Save Images & Videos',
    '123rf': '123RF Stock Downloader | Download Royalty-Free Media',
    'pixabay': 'Pixabay Downloader | Free Stock Photos & Videos',
    'unsplash': 'Unsplash Photo Downloader | Save High-Quality Images',
    'pexels': 'Pexels Downloader | Free Stock Photos & Videos',
    'giphy': 'GIPHY Downloader | Save GIFs & Stickers Instantly',
    'deviantart': 'DeviantArt Downloader | Save Art & Illustrations',
    'flickr': 'Flickr Photo Downloader | Save Albums & Collections',
    'alamy': 'Alamy Stock Downloader | Save Professional Photography',
    'rawpixel': 'Rawpixel Downloader | Save Design Resources',
    'creative-market': 'Creative Market Downloader | Save Digital Assets',
    
    // Adult content (keeping professional but clear)
    'pornhub': 'Pornhub Video Downloader | Save Videos for Offline Viewing',
    'xvideos': 'Xvideos Video Downloader | HD Quality Downloads',
    'xnxx': 'XNXX Video Downloader | Fast & Private Downloads',
    'onlyfans': 'OnlyFans Content Downloader | Save Exclusive Content',
    'youporn': 'YouPorn Video Downloader | Save Videos Privately',
    'spankbang': 'SpankBang Video Downloader | HD Downloads',
    'xhamster': 'xHamster Video Downloader | Save Videos Offline',
    'chaturbate': 'Chaturbate Recorder | Save Live Streams',
    'bongacams': 'BongaCams Recorder | Save Live Shows',
    'camsoda': 'CamSoda Recorder | Record Live Streams',
    'stripchat': 'StripChat Recorder | Save Live Performances',
    'eporner': 'ePorner Video Downloader | HD Quality Downloads',
    'beeg': 'Beeg Video Downloader | Fast HD Downloads',
    'alpha-porno': 'Alpha Porno Video Downloader | Save Videos Offline',
    'erome': 'Erome Content Downloader | Save Photos & Videos',
    'erothots': 'EroThots Content Downloader | Save Creator Content',
    
    // Music platforms
    'soundcloud': 'SoundCloud Music Downloader | Save Tracks & Playlists',
    'spotify': 'Spotify Music Downloader | Save Songs Offline',
    'bandcamp': 'Bandcamp Music Downloader | Save Albums & Tracks',
    
    // E-commerce and marketplace
    'etsy': 'Etsy Image Downloader | Save Product Photos',
    'shopify': 'Shopify Product Downloader | Export Store Media',
    
    // Document platforms
    'scribd': 'Scribd Document Downloader | Save Books & Documents',
    'slideshare': 'SlideShare Presentation Downloader | Save Slides Offline',
    
    // Cloud storage
    'google-drive': 'Google Drive Downloader | Bulk File Download Tool',
    'dropbox': 'Dropbox Batch Downloader | Download Multiple Files',
    'terabox': 'TeraBox Downloader | Fast Cloud File Downloads',
    'mega': 'MEGA Downloader | Fast Cloud Storage Downloads',
    
    // Communication platforms
    'telegram': 'Telegram Media Downloader | Save Photos, Videos & Files',
    'discord': 'Discord Media Downloader | Save Attachments & Images',
    'whatsapp': 'WhatsApp Media Downloader | Save Photos & Videos',
    
    // Niche platforms
    'patreon': 'Patreon Content Downloader | Save Creator Posts & Media',
    'onlyfans': 'OnlyFans Downloader | Save Exclusive Creator Content',
    'fansly': 'Fansly Content Downloader | Download Creator Media',
    'whop': 'Whop Digital Product Downloader | Access Your Purchases',
    'clientclub': 'ClientClub Content Downloader | Save Community Resources',
  };
  
  // Try to match by slug first (most reliable)
  const slugKey = slug.toLowerCase().replace(/-downloader$/, '').replace(/-video-downloader$/, '').replace(/-clip-downloader$/, '');
  if (patterns[slugKey]) {
    return patterns[slugKey];
  }
  
  // Try to match by platform name
  const platformKey = cleanPlatform.toLowerCase().replace(/\s+/g, '-');
  if (patterns[platformKey]) {
    return patterns[platformKey];
  }
  
  // Generic fallback based on content type
  const lowerName = name.toLowerCase();
  const lowerSlug = slug.toLowerCase();
  
  if (lowerSlug.includes('video') || lowerName.includes('video')) {
    return `${cleanPlatform} Video Downloader | Save Videos for Offline Viewing`;
  } else if (lowerSlug.includes('photo') || lowerSlug.includes('image') || lowerName.includes('image')) {
    return `${cleanPlatform} Image Downloader | Save Photos & Graphics`;
  } else if (lowerSlug.includes('music') || lowerSlug.includes('audio') || lowerName.includes('music')) {
    return `${cleanPlatform} Music Downloader | Save Tracks & Audio`;
  } else if (lowerSlug.includes('course') || lowerName.includes('course') || lowerName.includes('learning')) {
    return `${cleanPlatform} Course Downloader | Save for Offline Learning`;
  } else if (lowerSlug.includes('stock') || lowerName.includes('stock')) {
    return `${cleanPlatform} Stock Downloader | Save Creative Assets`;
  } else {
    return `${cleanPlatform} Downloader | Fast & Easy Content Downloads`;
  }
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const doc = parseDocument(content);
    
    const slug = doc.get("slug");
    const name = doc.get("name");
    const platform = doc.get("platform");
    const currentSeoTitle = doc.get("seo_title");
    
    if (!slug || !name) {
      console.log(`⚠ Skipping ${path.basename(filePath)}: missing slug or name`);
      return false;
    }
    
    const newSeoTitle = generateOptimizedSeoTitle(name, platform, slug);
    
    // Only update if the title actually changed
    if (currentSeoTitle === newSeoTitle) {
      return false;
    }
    
    doc.set("seo_title", newSeoTitle);
    fs.writeFileSync(filePath, doc.toString());
    
    console.log(`✓ Updated ${path.basename(filePath)}`);
    console.log(`  Old: ${currentSeoTitle}`);
    console.log(`  New: ${newSeoTitle}`);
    
    return true;
  } catch (error) {
    console.error(`✗ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Process all YAML files
const files = fs.readdirSync(productsDir).filter(f => f.endsWith(".yaml"));
let updatedCount = 0;
let skippedCount = 0;

console.log(`Processing ${files.length} product YAML files...\n`);

for (const file of files) {
  const filePath = path.join(productsDir, file);
  if (processFile(filePath)) {
    updatedCount++;
  } else {
    skippedCount++;
  }
}

console.log(`\n========================================`);
console.log(`✓ Updated ${updatedCount} product YAML files`);
console.log(`- Skipped ${skippedCount} files (no changes needed)`);
console.log(`========================================`);
