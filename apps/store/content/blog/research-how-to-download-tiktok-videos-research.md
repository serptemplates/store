---
slug: how-to-download-tiktok-videos-guide
title: How to Download TikTok Videos
seoTitle: How to Download TikTok Videos
description: "**Platform**: TikTok (ByteDance)   **Primary Formats**: MP4
  (H.264), WebM   **Content Types**: Short videos, live streams,
  stories   **Video Specs**: Vertical (9:16), mobile-optimized"
seoDescription: "**Platform**: TikTok (ByteDance)   **Primary Formats**: MP4
  (H.264), WebM   **Content Types**: Short videos, live streams,
  stories   **Video Specs**: Vertical (9:16), mobile-optimized"
date: 2025-10-22T18:59:36.628Z
author: Devin Schumacher
---

# How to Download TikTok Videos

**Platform**: TikTok (ByteDance)  
**Primary Formats**: MP4 (H.264), WebM  
**Content Types**: Short videos, live streams, stories  
**Video Specs**: Vertical (9:16), mobile-optimized  

## Overview

TikTok is a short-form video platform optimized for mobile consumption. Videos are primarily vertical (9:16 aspect ratio) and designed for quick, engaging content. The platform uses adaptive streaming and aggressive compression to ensure fast loading on mobile networks.

## URL Patterns and Content Types

### 1. TikTok URL Detection
```javascript
// TikTok URL patterns
const tiktokPatterns = {
  // Standard video URLs
  video: /^https:\/\/(?:www\.|vm\.|m\.)?tiktok\.com\/(@[^/]+\/video\/\d+|v\/\d+)/,
  
  // Short URLs
  shortUrl: /^https:\/\/vm\.tiktok\.com\/[A-Za-z0-9]+/,
  
  // User profile URLs
  user: /^https:\/\/(?:www\.|m\.)?tiktok\.com\/@([^/?]+)/,
  
  // Tag/hashtag URLs
  tag: /^https:\/\/(?:www\.|m\.)?tiktok\.com\/tag\/([^/?]+)/,
  
  // Music/sound URLs
  music: /^https:\/\/(?:www\.|m\.)?tiktok\.com\/music\/([^/?]+)/,
  
  // Live streams
  live: /^https:\/\/(?:www\.|m\.)?tiktok\.com\/@[^/]+\/live/
};

function parseTikTokURL(url) {
  // Handle short URLs first
  if (tiktokPatterns.shortUrl.test(url)) {
    return {
      type: 'short-url',
      shortCode: url.split('/').pop(),
      originalUrl: url
    };
  }
  
  for (const [type, pattern] of Object.entries(tiktokPatterns)) {
    const match = pattern.exec(url);
    if (match) {
      return {
        type,
        id: match[1],
        originalUrl: url
      };
    }
  }
  
  return null;
}

// Extract TikTok video ID
function extractTikTokVideoId(url) {
  const videoMatch = url.match(/\/video\/(\d+)/);
  if (videoMatch) {
    return videoMatch[1];
  }
  
  // Handle short URLs by expanding them
  return expandTikTokShortUrl(url);
}

async function expandTikTokShortUrl(shortUrl) {
  try {
    // This would need to be done server-side in practice
    const response = await fetch(shortUrl, { 
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const location = response.headers.get('location');
    if (location) {
      return extractTikTokVideoId(location);
    }
  } catch (error) {
    console.error('Failed to expand short URL:', error);
  }
  
  return null;
}
```

### 2. TikTok Player Detection
```javascript
// Detect TikTok embedded players and content
function detectTikTokContent() {
  const tiktokContent = [];
  
  // Check for TikTok embed scripts
  document.querySelectorAll('script[src*="tiktok"]').forEach(script => {
    tiktokContent.push({
      type: 'embed-script',
      src: script.src,
      element: script
    });
  });
  
  // Check for TikTok iframes
  document.querySelectorAll('iframe[src*="tiktok"]').forEach(iframe => {
    tiktokContent.push({
      type: 'iframe-embed',
      src: iframe.src,
      element: iframe
    });
  });
  
  // Check for TikTok video links in page content
  const pageText = document.body.textContent || document.body.innerText;
  const urlRegex = /https:\/\/(?:vm\.|www\.|m\.)?tiktok\.com\/[^\s"'<>]+/gi;
  const matches = pageText.match(urlRegex);
  
  if (matches) {
    matches.forEach(url => {
      const parsed = parseTikTokURL(url);
      if (parsed) {
        tiktokContent.push({
          type: 'url-reference',
          url,
          parsed
        });
      }
    });
  }
  
  // Monitor for TikTok video elements
  document.querySelectorAll('video').forEach(video => {
    const src = video.src || video.currentSrc;
    if (src && (src.includes('tiktok') || isTikTokVideoFormat(src))) {
      tiktokContent.push({
        type: 'video-element',
        src,
        element: video,
        dimensions: {
          width: video.videoWidth,
          height: video.videoHeight,
          isVertical: video.videoHeight > video.videoWidth
        }
      });
    }
  });
  
  return tiktokContent;
}

function isTikTokVideoFormat(url) {
  // TikTok-specific video characteristics
  return url.includes('v16-webapp') || // TikTok CDN pattern
         url.includes('musical.ly') || // Legacy domain
         /\/[a-f0-9]{32}\.mp4/.test(url); // TikTok hash pattern
}
```

## Download Methods

### 1. yt-dlp for TikTok Videos
```bash
# Download single TikTok video
yt-dlp "https://www.tiktok.com/@username/video/1234567890123456789"

# Download with metadata
yt-dlp --write-info-json --write-thumbnail "https://www.tiktok.com/@username/video/1234567890123456789"

# Download all videos from a user
yt-dlp "https://www.tiktok.com/@username"

# Download specific quality
yt-dlp -f "best[height<=720]" "https://www.tiktok.com/@username/video/1234567890123456789"

# Download with watermark removed (if available)
yt-dlp --write-sub --write-auto-sub "https://www.tiktok.com/@username/video/1234567890123456789"
```

### 2. Browser-Based TikTok Downloader
```javascript
// TikTok video downloader for browser use
class TikTokDownloader {
  constructor() {
    this.detectedVideos = new Map();
    this.downloadQueue = [];
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor network requests for TikTok video URLs
    this.interceptNetworkRequests();
    
    // Monitor page for TikTok content
    this.scanPageForTikTokContent();
    
    // Monitor URL changes (TikTok SPA)
    this.monitorURLChanges();
  }
  
  interceptNetworkRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string') {
        // Check for TikTok video files
        if (this.isTikTokVideoURL(url)) {
          this.detectedVideos.set(url, {
            url,
            timestamp: Date.now(),
            method: 'network-intercept'
          });
          
          console.log('TikTok video detected:', url);
        }
        
        // Check for TikTok API calls
        if (url.includes('tiktok.com/api') || url.includes('musical.ly/api')) {
          this.handleTikTokAPI(args);
        }
      }
      
      return originalFetch.apply(window, args);
    }.bind(this);
  }
  
  isTikTokVideoURL(url) {
    return /\.tiktokcdn\.com.*\.mp4/.test(url) ||
           /v16-webapp.*\.mp4/.test(url) ||
           /musical\.ly.*\.mp4/.test(url) ||
           (url.includes('tiktok') && url.includes('.mp4'));
  }
  
  async handleTikTokAPI(fetchArgs) {
    try {
      const response = await originalFetch.apply(window, fetchArgs);
      const clone = response.clone();
      const data = await clone.json();
      
      // Extract video URLs from API responses
      if (data && data.itemList) {
        data.itemList.forEach(item => {
          if (item.video && item.video.playAddr) {
            const videoUrl = item.video.playAddr;
            this.detectedVideos.set(videoUrl, {
              url: videoUrl,
              videoId: item.id,
              author: item.author?.uniqueId,
              description: item.desc,
              timestamp: Date.now(),
              method: 'api-extraction'
            });
          }
        });
      }
      
      return response;
    } catch (error) {
      return originalFetch.apply(window, fetchArgs);
    }
  }
  
  scanPageForTikTokContent() {
    // Look for TikTok video metadata in page scripts
    document.querySelectorAll('script').forEach(script => {
      const content = script.textContent || script.innerHTML;
      
      if (content.includes('tiktok') || content.includes('musical.ly')) {
        this.extractVideoFromScript(content);
      }
    });
    
    // Monitor for new scripts (TikTok loads content dynamically)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
            const content = node.textContent || node.innerHTML;
            if (content.includes('tiktok') || content.includes('musical.ly')) {
              this.extractVideoFromScript(content);
            }
          }
        });
      });
    });
    
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  extractVideoFromScript(scriptContent) {
    try {
      // Look for video URLs in JSON data
      const videoUrlRegex = /"(https?:\/\/[^"]*\.mp4[^"]*)"/g;
      let match;
      
      while ((match = videoUrlRegex.exec(scriptContent)) !== null) {
        const videoUrl = match[1];
        
        if (this.isTikTokVideoURL(videoUrl)) {
          this.detectedVideos.set(videoUrl, {
            url: videoUrl,
            timestamp: Date.now(),
            method: 'script-extraction'
          });
          
          console.log('TikTok video found in script:', videoUrl);
        }
      }
    } catch (error) {
      console.warn('Error extracting from script:', error);
    }
  }
  
  monitorURLChanges() {
    let lastUrl = location.href;
    
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        
        const parsed = parseTikTokURL(lastUrl);
        if (parsed && parsed.type === 'video') {
          console.log('TikTok video page detected:', parsed);
          this.handleVideoPage(parsed);
        }
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
  }
  
  async handleVideoPage(parsedUrl) {
    // Wait for page to load video data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to extract video from current page
    this.scanPageForTikTokContent();
    
    // Generate download options for current video
    this.showDownloadOptions(parsedUrl);
  }
  
  showDownloadOptions(videoInfo) {
    const downloadPanel = document.createElement('div');
    downloadPanel.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #ff0050; color: white; padding: 20px; border-radius: 12px;
      max-width: 300px; font-family: 'Arial', sans-serif; font-size: 14px;
      box-shadow: 0 8px 32px rgba(255, 0, 80, 0.3);
    `;
    
    downloadPanel.innerHTML = `
      <h4 style="margin: 0 0 15px 0; display: flex; align-items: center;">
        📱 TikTok Video Detected
      </h4>
      <p style="margin: 0 0 15px 0; font-size: 12px; opacity: 0.9;">
        Video ID: ${videoInfo.id || 'Unknown'}
      </p>
      <div style="margin: 10px 0;">
        <button onclick="tiktokDownloader.downloadCurrentVideo()" 
                style="width: 100%; background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px; margin: 5px 0; border-radius: 6px; cursor: pointer;">
          📥 Download Video
        </button>
        <button onclick="tiktokDownloader.showCommands()" 
                style="width: 100%; background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px; margin: 5px 0; border-radius: 6px; cursor: pointer;">
          🛠️ Show Commands
        </button>
        <button onclick="this.parentElement.remove()" 
                style="width: 100%; background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px; margin: 5px 0; border-radius: 6px; cursor: pointer;">
          ✕ Close
        </button>
      </div>
    `;
    
    document.body.appendChild(downloadPanel);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (downloadPanel.parentElement) {
        downloadPanel.remove();
      }
    }, 30000);
  }
  
  async downloadCurrentVideo() {
    const currentUrl = location.href;
    const parsed = parseTikTokURL(currentUrl);
    
    if (!parsed || parsed.type !== 'video') {
      alert('Please navigate to a TikTok video page first');
      return;
    }
    
    // Look for detected video URLs
    if (this.detectedVideos.size === 0) {
      alert('No video URLs detected yet. Please wait for the page to load completely.');
      return;
    }
    
    // Get the most recent video URL
    const latestVideo = Array.from(this.detectedVideos.values())
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    try {
      console.log('Downloading TikTok video:', latestVideo.url);
      
      const response = await fetch(latestVideo.url, {
        headers: {
          'Referer': 'https://www.tiktok.com/'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tiktok_video_${Date.now()}.mp4`;
      a.click();
      
      URL.revokeObjectURL(downloadUrl);
      
      console.log('TikTok video download completed');
      
    } catch (error) {
      console.error('TikTok download failed:', error);
      alert('Download failed. Video may be protected or require authentication.');
    }
  }
  
  showCommands() {
    const currentUrl = location.href;
    
    console.group('TikTok Download Commands:');
    console.log('Current URL:', currentUrl);
    console.log('');
    console.log('yt-dlp command:');
    console.log(`yt-dlp "${currentUrl}"`);
    console.log('');
    console.log('With metadata:');
    console.log(`yt-dlp --write-info-json --write-thumbnail "${currentUrl}"`);
    console.log('');
    console.log('Specific quality:');
    console.log(`yt-dlp -f "best[height<=720]" "${currentUrl}"`);
    
    if (this.detectedVideos.size > 0) {
      console.log('');
      console.log('Detected video URLs:');
      this.detectedVideos.forEach((info, url) => {
        console.log(`- ${url.substring(0, 80)}...`);
      });
    }
    
    console.groupEnd();
  }
  
  getDetectedVideos() {
    return Array.from(this.detectedVideos.entries());
  }
}

// Initialize TikTok downloader
const tiktokDownloader = new TikTokDownloader();
```

### 3. API-Based Video Extraction
```javascript
// TikTok API integration (requires proper authentication)
class TikTokAPIExtractor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.tiktok.com/v1';
  }
  
  async getVideoInfo(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/video/info?video_id=${videoId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.data && data.data.video) {
        return {
          id: data.data.id,
          title: data.data.title,
          author: data.data.author.unique_id,
          videoUrl: data.data.video.play_addr.url_list[0],
          thumbnailUrl: data.data.video.cover.url_list[0],
          duration: data.data.video.duration,
          stats: data.data.statistics
        };
      }
      
      throw new Error('Video data not found');
      
    } catch (error) {
      console.error('TikTok API error:', error);
      throw error;
    }
  }
  
  async getUserVideos(username, count = 20) {
    try {
      const response = await fetch(`${this.baseUrl}/user/videos?username=${username}&count=${count}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      return data.data.videos.map(video => ({
        id: video.id,
        title: video.title,
        videoUrl: video.video.play_addr.url_list[0],
        createdTime: video.create_time
      }));
      
    } catch (error) {
      console.error('TikTok user videos error:', error);
      throw error;
    }
  }
}
```

## Mobile-Optimized Features

### 1. Vertical Video Handling
```javascript
// Handle TikTok's vertical video format
function optimizeTikTokVideo(videoElement) {
  // Detect vertical orientation
  videoElement.addEventListener('loadedmetadata', () => {
    const isVertical = videoElement.videoHeight > videoElement.videoWidth;
    
    if (isVertical) {
      console.log('Vertical TikTok video detected');
      
      // Apply mobile-optimized styles
      videoElement.style.cssText = `
        width: 100%;
        max-width: 400px;
        height: auto;
        object-fit: contain;
        border-radius: 12px;
      `;
      
      // Add mobile controls
      addMobileVideoControls(videoElement);
    }
  });
}

function addMobileVideoControls(videoElement) {
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = `
    position: absolute;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;
  
  // Add typical TikTok-style controls
  const controls = [
    { icon: '❤️', action: 'like' },
    { icon: '💬', action: 'comment' },
    { icon: '➡️', action: 'share' },
    { icon: '📥', action: 'download' }
  ];
  
  controls.forEach(control => {
    const button = document.createElement('button');
    button.textContent = control.icon;
    button.style.cssText = `
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 20px;
      cursor: pointer;
      backdrop-filter: blur(10px);
    `;
    
    if (control.action === 'download') {
      button.addEventListener('click', () => {
        downloadTikTokVideo(videoElement.src);
      });
    }
    
    controlsContainer.appendChild(button);
  });
  
  // Position relative to video
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  
  videoElement.parentNode.insertBefore(wrapper, videoElement);
  wrapper.appendChild(videoElement);
  wrapper.appendChild(controlsContainer);
}
```

### 2. Auto-Play and Loop Handling
```javascript
// Handle TikTok's auto-play behavior
function setupTikTokAutoPlay() {
  const tiktokVideos = document.querySelectorAll('video[src*="tiktok"], video[src*="musical.ly"]');
  
  tiktokVideos.forEach(video => {
    // TikTok-style auto-play on viewport entry
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          video.play().catch(console.warn);
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(video);
    
    // Enable looping (TikTok default behavior)
    video.loop = true;
    video.muted = true; // Required for auto-play in most browsers
    
    // Handle sound toggle
    video.addEventListener('click', () => {
      video.muted = !video.muted;
      
      // Show mute/unmute indicator
      showMuteIndicator(video, video.muted);
    });
  });
}

function showMuteIndicator(videoElement, isMuted) {
  const indicator = document.createElement('div');
  indicator.textContent = isMuted ? '🔇' : '🔊';
  indicator.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 18px;
    backdrop-filter: blur(10px);
    z-index: 100;
  `;
  
  // Position relative to video
  const wrapper = videoElement.parentElement;
  if (wrapper.style.position !== 'relative') {
    wrapper.style.position = 'relative';
  }
  
  wrapper.appendChild(indicator);
  
  // Remove after 2 seconds
  setTimeout(() => {
    indicator.remove();
  }, 2000);
}
```

## Content Analysis and Metadata

### 1. TikTok Metadata Extraction
```javascript
// Extract TikTok video metadata
function extractTikTokMetadata(pageContent = document.body.innerHTML) {
  const metadata = {
    videoId: null,
    author: null,
    description: null,
    hashtags: [],
    music: null,
    stats: {}
  };
  
  try {
    // Look for structured data
    const jsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    jsonScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        
        if (data['@type'] === 'VideoObject' || data.videoObject) {
          const videoData = data.videoObject || data;
          
          metadata.videoId = videoData.identifier;
          metadata.description = videoData.description;
          metadata.author = videoData.author?.name;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    });
    
    // Extract from page content
    const hashtagRegex = /#[\w\u4e00-\u9fff]+/g;
    const hashtags = pageContent.match(hashtagRegex);
    if (hashtags) {
      metadata.hashtags = [...new Set(hashtags)];
    }
    
    // Look for TikTok-specific data in scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const content = script.textContent || script.innerHTML;
      
      if (content.includes('itemInfo') || content.includes('videoData')) {
        try {
          // Extract video ID
          const videoIdMatch = content.match(/"id":"(\d+)"/);
          if (videoIdMatch) {
            metadata.videoId = videoIdMatch[1];
          }
          
          // Extract author
          const authorMatch = content.match(/"uniqueId":"([^"]+)"/);
          if (authorMatch) {
            metadata.author = authorMatch[1];
          }
          
          // Extract description
          const descMatch = content.match(/"desc":"([^"]+)"/);
          if (descMatch) {
            metadata.description = descMatch[1];
          }
          
          // Extract music info
          const musicMatch = content.match(/"musicName":"([^"]+)"/);
          if (musicMatch) {
            metadata.music = musicMatch[1];
          }
          
        } catch (e) {
          console.warn('Error extracting metadata from script:', e);
        }
      }
    });
    
  } catch (error) {
    console.error('Metadata extraction error:', error);
  }
  
  return metadata;
}

// Display extracted metadata
function displayTikTokMetadata() {
  const metadata = extractTikTokMetadata();
  
  console.group('TikTok Video Metadata:');
  console.log('Video ID:', metadata.videoId);
  console.log('Author:', metadata.author);
  console.log('Description:', metadata.description);
  console.log('Hashtags:', metadata.hashtags);
  console.log('Music:', metadata.music);
  console.groupEnd();
  
  return metadata;
}
```

### 2. Batch Download Tools
```bash
# Download multiple TikTok videos from a file
# Create a file with TikTok URLs (urls.txt)
yt-dlp --batch-file urls.txt

# Download all videos from multiple users
#!/bin/bash
users=("user1" "user2" "user3")
for user in "${users[@]}"; do
  echo "Downloading from @$user"
  yt-dlp "https://www.tiktok.com/@$user" --max-downloads 50
done

# Download videos with specific hashtags (requires TikTok API)
yt-dlp --match-filter "description ~= '(?i)#gaming'" "https://www.tiktok.com/@username"
```

## Common Issues and Solutions

### 1. Geographic Restrictions
```javascript
// Handle geo-blocked TikTok content
function handleTikTokGeoBlocking() {
  const currentUrl = location.href;
  
  if (currentUrl.includes('tiktok.com') && 
      document.body.textContent.includes('not available in your region')) {
    
    console.warn('TikTok content is geo-blocked in your region');
    
    showGeoBlockMessage();
  }
}

function showGeoBlockMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #ff0050; color: white; padding: 30px; border-radius: 12px;
    max-width: 400px; text-align: center; z-index: 10001;
    font-family: Arial, sans-serif;
  `;
  
  message.innerHTML = `
    <h3>Content Not Available</h3>
    <p>This TikTok content is not available in your region.</p>
    <p><strong>Possible solutions:</strong></p>
    <ul style="text-align: left; margin: 15px 0;">
      <li>Use a VPN service</li>
      <li>Try alternative TikTok domains</li>
      <li>Use yt-dlp with proxy settings</li>
    </ul>
    <button onclick="this.parentElement.remove()" 
            style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 15px;">
      Close
    </button>
  `;
  
  document.body.appendChild(message);
}
```

### 2. Watermark Removal
```bash
# Remove TikTok watermark using ffmpeg (if video allows)
ffmpeg -i input_with_watermark.mp4 \
       -vf "delogo=x=10:y=10:w=100:h=50" \
       output_no_watermark.mp4

# Crop to remove watermark area
ffmpeg -i input.mp4 -vf "crop=w=in_w:h=in_h-60:x=0:y=0" cropped.mp4
```

### 3. Quality Issues
```javascript
// Handle TikTok quality variations
function optimizeTikTokQuality(videoElement) {
  videoElement.addEventListener('loadeddata', () => {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    console.log(`TikTok video quality: ${width}x${height}`);
    
    // Common TikTok resolutions
    if (width === 540 && height === 960) {
      console.log('Standard TikTok quality (540p)');
    } else if (width === 720 && height === 1280) {
      console.log('HD TikTok quality (720p)');
    } else if (width >= 1080) {
      console.log('High-quality TikTok video');
    }
    
    // Suggest quality improvements
    if (width < 720) {
      console.warn('Low quality video detected. Try downloading with yt-dlp for better quality.');
    }
  });
}
```

## See Also

- [Instagram Platform](./instagram.md)
- [YouTube Platform](./youtube.md)
- [Twitter Platform](./twitter.md)
- [MP4 Container Format](../containers/mp4.md)
- [H.264 Video Codec](../codecs/h264.md)
