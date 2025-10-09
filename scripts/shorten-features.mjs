#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

const productsDir = path.resolve("/home/runner/work/store/store/apps/store/data/products");

// Files to exclude from processing
const excludedFiles = [
  'skool-video-downloader.yaml',
  'vimeo-video-downloader.yaml',
  'loom-video-downloader.yaml',
  'ai-voice-cloner-app.yaml'
];

// Mapping patterns for shortening features
const shorteningRules = [
  // Generic patterns
  { from: /Download\s+(.+?)\s+(?:in|with)\s+(?:up to\s+)?(.+?)\s+(?:resolution|quality|definition)/i, to: (m) => `${m[2]} ${m[1]} downloads` },
  { from: /Download\s+(.+?)\s+in\s+(?:high|HD|4K|8K|premium)\s+(?:quality|definition)/i, to: (m) => `High-quality ${m[1]} downloads` },
  { from: /(?:Download|Extract|Save)\s+(.+?)\s+(?:in|to)\s+various\s+formats\s+\((.+?)\)/i, to: (m) => `${m[1]} in multiple formats` },
  { from: /Extract audio tracks? in various formats \((.+?)\)/i, to: () => `Multiple audio format support` },
  { from: /Support for multiple subtitle and audio tracks/i, to: () => `Multi-track subtitle/audio support` },
  { from: /Batch download entire (?:playlists?|channels?|seasons?|series|collections?)(?: and .+?)?(?: efficiently)?/i, to: () => `Batch downloads for series/collections` },
  { from: /Automatic subtitle and closed caption extraction/i, to: () => `Auto subtitle extraction` },
  { from: /Auto(?:matic|matically)?\s+(?:subtitle|caption)\s+(?:and\s+)?(?:closed\s+)?(?:caption\s+)?(?:extraction|download)/i, to: () => `Auto subtitle/audio extraction` },
  { from: /Resume interrupted downloads?(?:\s+with\s+smart\s+recovery)?(?:\s+seamlessly)?/i, to: () => `Resume downloads` },
  { from: /Cross-platform (?:desktop|mobile)?(?: and mobile)?(?: desktop)?\s*(?:application)?\s*support/i, to: () => `Cross-platform support` },
  { from: /Built-in video player with (?:advanced\s+)?(?:streaming\s+)?controls?/i, to: () => `Built-in media player` },
  { from: /Built-in video player with (?:advanced )?(?:playback )?controls/i, to: () => `Built-in media player` },
  { from: /Custom (?:naming schemes and )?folder organization (?:by|and)\s+(.+)/i, to: (m) => `Organize by ${m[1]}` },
  { from: /Duplicate (?:video\s+)?detection and (?:management|library management)/i, to: () => `Duplicate detection` },
  { from: /Command-line (?:interface|tools) for (?:advanced )?(?:automation|automated workflows)/i, to: () => `Command-line tools` },
  { from: /Integration with (?:media players? and libraries|media center applications|social media management tools)/i, to: () => `Media center integration` },
  { from: /Export (?:viewing history and watchlist data|metadata in various formats \(.+?\)|data and stats)/i, to: () => `Export data & stats` },
  { from: /Privacy(?:-focused design| protection) with (?:encrypted )?local storage(?: only)?/i, to: () => `Local-only storage for privacy` },
  { from: /Regular updates to maintain .+? compatibility/i, to: () => `Regular compatibility updates` },
  { from: /Support for (?:age-restricted and region-locked content|private and restricted .+? content|various video qualities and formats)/i, to: () => `Supports various containers/codecs` },
  { from: /Bandwidth (?:management|throttling) and download scheduling/i, to: () => `Bandwidth-efficient downloads` },
  { from: /(?:Search|Search and filter)(?: functionality)? across downloaded content/i, to: () => `Library search` },
  { from: /Backup and (?:restore capabilities for media libraries|sync capabilities)/i, to: () => `Backup & restore collections` },
  { from: /(?:Maintain episode structure and metadata|Metadata extraction including .+)/i, to: () => `Metadata preservation` },
  { from: /Offline viewing with sync(?:hronized)? progress/i, to: () => `Offline viewing with sync` },
  { from: /Smart recommendations based on download history/i, to: () => `Smart recommendations` },
  { from: /Live stream recording and real-time downloading/i, to: () => `Live stream recording` },
  { from: /Video format conversion and quality optimization/i, to: () => `Format conversion & optimization` },
  { from: /Thumbnail and channel art extraction/i, to: () => `Thumbnail extraction` },
  { from: /Proxy support for enhanced privacy and access/i, to: () => `Proxy support` },
  { from: /Privacy-focused design with no data collection/i, to: () => `Privacy-focused, no tracking` },
  { from: /(?:Download|Save) user profile information and statistics/i, to: () => `Profile & stats download` },
  { from: /Automatic hashtag and description extraction/i, to: () => `Hashtag/description extraction` },
  { from: /Download without watermarks in HD quality/i, to: () => `Watermark-free HD downloads` },
  { from: /Download\s+(.+?)\s+without watermarks in HD quality/i, to: (m) => `Watermark-free HD ${m[1]}` },
  { from: /Download high-definition content with original quality/i, to: () => `HD downloads with original quality` },
  { from: /Organize downloads by .+ categories/i, to: (m) => `Category-based organization` },
  { from: /Filter (?:by|and sort by) (.+)/i, to: (m) => `Filter by ${m[1]}` },
  { from: /Sort (?:by|and filter by) (.+)/i, to: (m) => `Sort by ${m[1]}` },
  
  // Additional patterns for wordy features
  { from: /(?:Cross-platform|Platform) (?:compatibility|support) \((.+?)\)/i, to: () => `Cross-platform support` },
  { from: /Command-line and GUI workflows/i, to: () => `CLI & GUI workflows` },
  { from: /Metadata extraction for (.+)/i, to: (m) => `Metadata extraction (${m[1].replace(/, and /g, ', ')})` },
  { from: /Integration with (?:popular )?(.+? (?:players?|libraries|applications|software|center systems))/i, to: (m) => `${m[1]} integration` },
  { from: /Command-line interface for (.+)/i, to: () => `CLI automation` },
  { from: /Search capabilities across (.+)/i, to: (m) => `Search ${m[1]}` },
  { from: /Download high-resolution (.+?) with quality selection/i, to: (m) => `High-res ${m[1]} downloads` },
  { from: /Batch processing (?:capabilities )?for (.+)/i, to: (m) => `Batch ${m[1]}` },
  { from: /Custom folder organization and file naming/i, to: () => `Custom folder organization` },
  { from: /Duplicate detection and content management/i, to: () => `Duplicate detection` },
  { from: /Bandwidth management and download optimization/i, to: () => `Bandwidth optimization` },
  { from: /Progress tracking with detailed analytics/i, to: () => `Progress tracking` },
  { from: /Offline viewing with progress synchronization/i, to: () => `Offline viewing with sync` },
  { from: /Advanced filtering by (.+)/i, to: (m) => `Filter by ${m[1]}` },
  { from: /Support for various (.+?) formats and (?:sizes|resolutions)/i, to: (m) => `Multiple ${m[1]} formats` },
  { from: /(?:Support for|Support) editorial and commercial licenses/i, to: () => `Editorial & commercial licenses` },
  { from: /Batch (.+?) collections\/searches downloads/i, to: (m) => `Batch ${m[1]} downloads` },
  { from: /Automatic(?:ally)? (.+?) and (?:.+?) tracking/i, to: (m) => `Auto ${m[1]}` },
  { from: /Organize by (.+?)\/(.+)/i, to: (m) => `Organize by ${m[1]}/${m[2]}` },
  { from: /Integration with (.+?) workflows/i, to: (m) => `${m[1]} workflow integration` },
  { from: /Export (.+?) data\/(?:licensing )?(?:.+?) information/i, to: (m) => `Export ${m[1]} data` },
  { from: /Advanced search across (.+)/i, to: (m) => `Advanced search in ${m[1]}` },
  { from: /Smart categorization/i, to: () => `Smart categories` },
  { from: /Professional (.+?) features/i, to: (m) => `Pro ${m[1]}` },
  { from: /Quality control and (.+?) tools/i, to: (m) => `Quality control tools` },
  { from: /High-res and (.+?) formats/i, to: (m) => `High-res & ${m[1]}` },
  { from: /Advanced (.+?) management and (?:usage )?tracking/i, to: (m) => `Advanced ${m[1]} tracking` },
  { from: /Professional search and filtering capabilities/i, to: () => `Pro search & filtering` },
  { from: /Duplicate detection across (.+)/i, to: (m) => `Duplicate detection (${m[1]})` },
  { from: /Enterprise-grade (.+?) and (.+?) features/i, to: () => `Enterprise-grade security` },
  { from: /Regular updates to maintain (.+?) compatibility/i, to: (m) => `Regular ${m[1]} updates` },
  { from: /Export capabilities for (.+)/i, to: (m) => `Export for ${m[1]}` },
  { from: /Smart bandwidth management for (.+)/i, to: () => `Smart bandwidth management` },
  { from: /Backup and sync for (.+)/i, to: (m) => `Backup & sync (${m[1]})` },
  { from: /Advanced metadata and keyword management/i, to: () => `Advanced metadata management` },
  { from: /(?:Bandwidth|Download) optimization/i, to: () => `Bandwidth optimization` },
  { from: /Backup and restore (?:options )?for (.+)/i, to: (m) => `Backup & restore ${m[1]}` },
  { from: /(?:License|Rights) compliance tracking and management/i, to: () => `License compliance tracking` },
  { from: /AI-powered (.+?) and (.+)/i, to: (m) => `AI ${m[1]}` },
  { from: /Seamless integration with (.+)/i, to: (m) => `${m[1]} integration` },
  { from: /(.+?) viewer/i, to: (m) => `Built-in ${m[1]} viewer` },
  { from: /Support for various (.+?) and (.+)/i, to: (m) => `Multiple ${m[1]} & ${m[2]}` },
  { from: /Multi-(?:model|stream) recording (?:and monitoring )?capabilities/i, to: () => `Multi-stream recording` },
  { from: /Automatic export in various formats \((.+?)\)/i, to: () => `Multiple export formats` },
  { from: /Bandwidth-efficient downloads with throttling controls/i, to: () => `Bandwidth throttling` },
  { from: /(.+?) workflow integration features/i, to: (m) => `${m[1]} workflow integration` },
  { from: /Support for various (.+)/i, to: (m) => `Multiple ${m[1]}` },
];

// Additional simple replacements for common wordy phrases
const simpleReplacements = [
  { from: "Support for age-restricted and region-locked content", to: "Age-restricted & region-locked support" },
  { from: "Support for private and restricted", to: "Private content support" },
  { from: "in high definition", to: "in HD" },
  { from: "efficiently", to: "" },
  { from: "seamlessly", to: "" },
  { from: "with smart recovery", to: "" },
  { from: "with advanced controls", to: "" },
  { from: "with playback controls", to: "" },
  { from: " system", to: "" },
];

function shortenFeature(feature) {
  let shortened = feature.trim();
  
  // Try pattern matching first
  for (const rule of shorteningRules) {
    const match = shortened.match(rule.from);
    if (match) {
      if (typeof rule.to === 'function') {
        return rule.to(match);
      } else {
        return rule.to;
      }
    }
  }
  
  // Apply simple replacements
  for (const replacement of simpleReplacements) {
    shortened = shortened.replace(replacement.from, replacement.to);
  }
  
  // Clean up extra spaces
  shortened = shortened.replace(/\s+/g, ' ').trim();
  
  return shortened;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const doc = parseDocument(content);
  
  const features = doc.get("features");
  if (!features || !Array.isArray(features.items) || features.items.length === 0) {
    return false; // No features to process
  }
  
  let modified = false;
  const newFeatures = [];
  
  for (let i = 0; i < features.items.length; i++) {
    const item = features.items[i];
    const originalFeature = item.value;
    const shortenedFeature = shortenFeature(originalFeature);
    
    if (shortenedFeature !== originalFeature && shortenedFeature.length < originalFeature.length) {
      newFeatures.push(shortenedFeature);
      modified = true;
    } else {
      newFeatures.push(originalFeature);
    }
  }
  
  if (modified) {
    doc.set("features", newFeatures);
    fs.writeFileSync(filePath, doc.toString({ lineWidth: 0 }));
    return true;
  }
  
  return false;
}

// Process all YAML files
const files = fs.readdirSync(productsDir).filter(f => f.endsWith(".yaml"));
let processedCount = 0;

console.log(`Processing ${files.length} product YAML files...`);

for (const file of files) {
  // Skip excluded files
  if (excludedFiles.includes(file)) {
    console.log(`⊘ Skipped (excluded): ${file}`);
    continue;
  }
  
  const filePath = path.join(productsDir, file);
  try {
    if (processFile(filePath)) {
      processedCount++;
      console.log(`✓ Processed: ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

console.log(`\nCompleted: ${processedCount} files modified out of ${files.length} total files.`);
