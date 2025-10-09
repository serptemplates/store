#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const productsDir = path.resolve("apps/store/data/products");

// Helper function to extract platform name and determine content type
function analyzeProduct(data) {
  const name = data.name || "";
  const platform = data.platform || "";
  const slug = data.slug || "";
  const features = data.features || [];
  
  // Determine if it's a video downloader, image downloader, or other type
  let contentType = "content";
  let actionVerb = "Download";
  
  // Check for video platforms - check slug, name, and common video platforms
  const videoKeywords = ["video", "youtube", "tiktok", "instagram", "facebook", "vimeo", "dailymotion", "twitch", "netflix", "hulu", "amazon", "tubi", "wistia", "loom", "kajabi", "teachable", "thinkific", "pornhub", "xvideos", "xnxx", "youporn", "xhamster", "redtube", "beeg", "eporner", "tnaflix", "spankbang", "chaturbate", "stripchat", "camsoda", "livejasmin", "myfreecams", "bongacams", "telegram", "snapchat", "twitter", "tumblr", "reddit", "kick", "patreon", "onlyfans", "redgifs", "erome", "erothots", "whop", "skool", "circle", "podia", "stream", "sprout", "bilibili", "nicovideo", "vk", "m3u8"];
  const isVideo = videoKeywords.some(kw => slug.includes(kw) || name.toLowerCase().includes(kw));
  
  if (isVideo) {
    contentType = "videos";
  } else if (slug.includes("audio") || slug.includes("sound") || platform.toLowerCase() === "soundcloud" || platform.toLowerCase() === "soundgasm") {
    contentType = "audio";
  } else if (slug.includes("image") || slug.includes("photo") || slug.includes("stock") || 
             ["adobe-stock", "shutterstock", "istock", "getty", "flickr", "unsplash", "pexels", "pixabay", "rawpixel", "dreamstime", "depositphotos", "alamy", "123rf", "freepik", "creative-market", "deviantart", "canva", "vectorstock", "stocksy", "stockvault", "storyblocks"].some(s => slug.includes(s))) {
    contentType = "images";
  } else if (slug.includes("pdf")) {
    contentType = "PDFs";
  } else if (slug.includes("thumbnail")) {
    contentType = "thumbnails";
  } else if (slug.includes("learning") || slug.includes("course") || slug.includes("udemy") || slug.includes("moodle") || slug.includes("learndash") || slug.includes("learnworlds") || slug.includes("skillshare") || slug.includes("coursera") || slug.includes("khan") || slug.includes("linkedin-learning")) {
    contentType = "courses";
  } else if (slug.includes("archive") || slug.includes("scribd") || slug.includes("gohighlevel") || slug.includes("gokollab") || slug.includes("clientclub")) {
    contentType = "content";
  } else if (slug.includes("giphy")) {
    contentType = "gifs";
  } else if (slug.includes("pinterest")) {
    contentType = "images";
  }
  
  return { platform, contentType, actionVerb };
}

// Helper function to create better SEO title
function createSeoTitle(data) {
  const { platform, contentType } = analyzeProduct(data);
  
  // Use the actual platform name from data
  let platformName = platform || data.name.replace(/(video downloader|downloader|video|audio)/gi, "").trim();
  
  // Special case handling
  if (data.slug === "pdf-downloader") {
    return `Download PDFs - PDF Document Downloader Tool`;
  } else if (data.slug === "khan-academy-downloader") {
    platformName = "Khan Academy";
  } else if (data.slug === "linkedin-learning-downloader") {
    platformName = "LinkedIn Learning";
  }
  
  if (contentType === "videos") {
    return `Download ${platformName} Videos - ${platformName} Video Downloader Tool`;
  } else if (contentType === "audio") {
    return `Download ${platformName} Audio - ${platformName} Audio Downloader`;
  } else if (contentType === "images") {
    return `Download ${platformName} Images - ${platformName} Image Downloader`;
  } else if (contentType === "gifs") {
    return `Download ${platformName} GIFs - ${platformName} GIF Downloader`;
  } else if (contentType === "PDFs") {
    return `Download PDFs - PDF Document Downloader Tool`;
  } else if (contentType === "thumbnails") {
    return `Download Video Thumbnails - Thumbnail Downloader Tool`;
  } else if (contentType === "courses") {
    return `Download ${platformName} Courses - ${platformName} Course Downloader`;
  }
  
  return `Download ${platformName} Content - ${platformName} Downloader Tool`;
}

// Helper function to create better tagline
function createTagline(data) {
  const { platform, contentType } = analyzeProduct(data);
  let platformName = platform || data.name.replace(/(video downloader|downloader|video|audio)/gi, "").trim();
  
  // Special case handling
  if (data.slug === "pdf-downloader") {
    return `Download PDFs and documents quickly and easily for offline reading. Fast and secure PDF downloader.`;
  } else if (data.slug === "khan-academy-downloader") {
    platformName = "Khan Academy";
  } else if (data.slug === "linkedin-learning-downloader") {
    platformName = "LinkedIn Learning";
  }
  
  if (contentType === "videos") {
    return `Download ${platformName} videos quickly and easily for offline viewing. Fast, reliable, and secure video downloader.`;
  } else if (contentType === "audio") {
    return `Download ${platformName} audio tracks quickly and easily for offline listening. Fast and reliable audio downloader.`;
  } else if (contentType === "images") {
    return `Download ${platformName} images and stock photos quickly and easily. Fast and reliable image downloader tool.`;
  } else if (contentType === "gifs") {
    return `Download ${platformName} GIFs and animated images quickly and easily. Fast and reliable GIF downloader tool.`;
  } else if (contentType === "PDFs") {
    return `Download PDFs and documents quickly and easily for offline reading. Fast and secure PDF downloader.`;
  } else if (contentType === "thumbnails") {
    return `Download video thumbnails quickly and easily in high resolution. Fast and reliable thumbnail downloader.`;
  } else if (contentType === "courses") {
    return `Download ${platformName} courses and educational content for offline learning. Fast and reliable course downloader.`;
  }
  
  return `Download ${platformName} content quickly and easily for offline access. Fast and reliable downloader tool.`;
}

// Helper function to create better SEO description
function createSeoDescription(data) {
  const { platform, contentType } = analyzeProduct(data);
  let platformName = platform || data.name.replace(/(video downloader|downloader|video|audio)/gi, "").trim();
  
  // Special case handling
  if (data.slug === "pdf-downloader") {
    return `Download PDFs and documents quickly and securely with our PDF downloader tool. Save documents for offline reading with original formatting preserved.`;
  } else if (data.slug === "khan-academy-downloader") {
    platformName = "Khan Academy";
  } else if (data.slug === "linkedin-learning-downloader") {
    platformName = "LinkedIn Learning";
  }
  
  if (contentType === "videos") {
    return `Download ${platformName} videos in high quality with our easy-to-use video downloader. Save ${platformName} content for offline viewing with support for multiple formats and resolutions.`;
  } else if (contentType === "audio") {
    return `Download ${platformName} audio tracks in high quality with our reliable audio downloader. Save ${platformName} content for offline listening with support for multiple formats.`;
  } else if (contentType === "images") {
    return `Download ${platformName} images and photos in high quality with our reliable image downloader. Save ${platformName} stock assets for offline use with original quality preserved.`;
  } else if (contentType === "gifs") {
    return `Download ${platformName} GIFs and animated images in high quality with our reliable GIF downloader. Save ${platformName} content for offline use with original quality preserved.`;
  } else if (contentType === "PDFs") {
    return `Download PDFs and documents quickly and securely with our PDF downloader tool. Save documents for offline reading with original formatting preserved.`;
  } else if (contentType === "thumbnails") {
    return `Download video thumbnails in high resolution with our thumbnail downloader. Extract and save thumbnails from any video quickly and easily.`;
  } else if (contentType === "courses") {
    return `Download ${platformName} courses and lessons for offline learning with our course downloader. Save educational content with videos, materials, and resources included.`;
  }
  
  return `Download ${platformName} content with our reliable downloader tool. Fast, secure downloads with support for offline access and original quality preservation.`;
}

// Main function to update YAML files
function updateYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const doc = YAML.parseDocument(content);
    const data = doc.toJSON();
    
    // Check if this file needs updating (has the problematic pattern or generic "content" wording)
    const needsUpdate = 
      (data.seo_title && (
        data.seo_title.includes("Download " + data.name + " for Offline Access") ||
        data.seo_title.includes("| Download " + data.name) ||
        (data.seo_title.includes("Content - ") && !data.seo_title.includes("Videos - ") && !data.seo_title.includes("Images - ") && !data.seo_title.includes("Audio - ")) ||
        data.seo_title.includes("Download Pdf PDFs") ||
        data.seo_title.includes("Download Khan Courses") && data.slug === "khan-academy-downloader"
      )) ||
      (data.seo_description && (
        data.seo_description.includes("Download " + data.name + " content for offline") ||
        data.seo_description.includes("downloader content for offline") ||
        (data.seo_description.includes("content with our reliable") && !data.seo_description.includes("videos in high quality")) ||
        data.seo_description.includes("Download Pdf PDFs") ||
        data.seo_description.includes("Download Khan courses") && data.slug === "khan-academy-downloader"
      )) ||
      (data.tagline && (
        data.tagline.includes("Download " + data.name + " instantly to your device") ||
        data.tagline.includes("downloader instantly to your device") ||
        (data.tagline.includes("content quickly and easily") && !data.tagline.includes("videos quickly and easily")) ||
        data.tagline.includes("Download Pdf PDFs") ||
        data.tagline.includes("Download Khan courses") && data.slug === "khan-academy-downloader"
      ));
    
    if (!needsUpdate) {
      return { updated: false, file: path.basename(filePath) };
    }
    
    // Update the fields
    const newSeoTitle = createSeoTitle(data);
    const newTagline = createTagline(data);
    const newSeoDescription = createSeoDescription(data);
    
    // Update in the document
    doc.set("seo_title", newSeoTitle);
    doc.set("tagline", newTagline);
    doc.set("seo_description", newSeoDescription);
    
    // Write back to file
    fs.writeFileSync(filePath, doc.toString());
    
    return {
      updated: true,
      file: path.basename(filePath),
      changes: {
        seo_title: { old: data.seo_title, new: newSeoTitle },
        tagline: { old: data.tagline, new: newTagline },
        seo_description: { old: data.seo_description, new: newSeoDescription }
      }
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { updated: false, file: path.basename(filePath), error: error.message };
  }
}

// Process all YAML files
function processAllFiles() {
  const files = fs.readdirSync(productsDir)
    .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
  
  console.log(`Found ${files.length} YAML files to process\n`);
  
  const results = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const result = updateYamlFile(filePath);
    results.push(result);
    
    if (result.error) {
      errorCount++;
      console.log(`❌ Error: ${file} - ${result.error}`);
    } else if (result.updated) {
      updatedCount++;
      console.log(`✅ Updated: ${file}`);
    } else {
      skippedCount++;
      console.log(`⏭️  Skipped: ${file} (already has good SEO)`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total files: ${files.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  
  return results;
}

// Run the script
processAllFiles();
