---
slug: how-to-download-vimeo-videos
title: How to Download Vimeo Videos
seoTitle: How to Download Vimeo Videos
description: 'Platform: Vimeo.com Primary Formats: HLS (M3U8), DASH (MPD), Progressive
  MP4 Player: Vimeo Player (iframe embeds) Authentication: OAuth, password protection
  support'
seoDescription: 'Platform: Vimeo.com Primary Formats: HLS (M3U8), DASH (MPD), Progressive
  MP4 Player: Vimeo Player (iframe embeds) Authentication: OAuth, password protection
  support'
date: '2025-10-22T18:59:36.628000Z'
author: Devin Schumacher
---

# How to Download Vimeo Videos

**Platform**: Vimeo.com  
**Primary Formats**: HLS (M3U8), DASH (MPD), Progressive MP4  
**Player**: Vimeo Player (iframe embeds)  
**Authentication**: OAuth, password protection support  

## Overview

Vimeo provides multiple streaming formats depending on the video settings and subscription level. Videos can be delivered via HLS adaptive streaming, DASH, or progressive MP4 downloads. The platform supports both public and private videos with various access control mechanisms.

## Video Detection Methods

### 1. URL Pattern Recognition

#### Canonical Vimeo URLs
```javascript
// Vimeo URL patterns
const vimeoPatterns = {
  // Standard video page
  canonical: /^https:\/\/vimeo\.com\/(\d+)$/i,
  
  // Unlisted with hash
  unlisted: /^https:\/\/vimeo\.com\/(\d+)\/([a-f0-9]+)$/i,
  
  // Review pages
  review: /^https:\/\/vimeo\.com\/user\d+\/review\/(\d+)\/([a-f0-9]+)$/i,
  
  // Channel videos
  channel: /^https:\/\/vimeo\.com\/channels\/[^\/]+\/(\d+)$/i,
  
  // On-demand content
  ondemand: /^https:\/\/vimeo\.com\/ondemand\/[^\/]+(?:\/(\d+))?$/i,
  
  // Live events
  event: /^https:\/\/vimeo\.com\/event\/(\d+)$/i,
  
  // Player embed URLs
  playerEmbed: /^https:\/\/player\.vimeo\.com\/video\/(\d+)(?:\?.*)?$/i,
  
  // Private player with hash
  privatePlayer: /^https:\/\/player\.vimeo\.com\/video\/(\d+)\?h=([a-f0-9]+)/i
};

function parseVimeoURL(url) {
  for (const [type, pattern] of Object.entries(vimeoPatterns)) {
    const match = pattern.exec(url);
    if (match) {
      return {
        type,
        videoId: match[1],
        hash: match[2] || null,
        originalUrl: url
      };
    }
  }
  return null;
}

// Extract video ID from any Vimeo URL
function extractVimeoId(url) {
  const parsed = parseVimeoURL(url);
  return parsed?.videoId || null;
}
```

### 2. Page Data Extraction

#### Config JSON Detection
```javascript
// Extract Vimeo config from page
function extractVimeoConfig() {
  const configs = [];
  
  // Look for vimeo.clip_page_config
  if (window.vimeo?.clip_page_config) {
    configs.push({
      source: 'clip_page_config',
      config: window.vimeo.clip_page_config
    });
  }
  
  // Look for embedded config in script tags
  document.querySelectorAll('script').forEach(script => {
    const content = script.textContent || script.innerHTML;
    
    // Pattern for Vimeo player config
    const configMatch = content.match(/(?:config|player_config)\s*[:=]\s*({.+?})/s);
    if (configMatch) {
      try {
        const config = JSON.parse(configMatch[1]);
        if (config.video || config.request) {
          configs.push({
            source: 'script_tag',
            config
          });
        }
      } catch (e) {
        console.warn('Failed to parse Vimeo config:', e);
      }
    }
    
    // Pattern for __PLAYER_CONFIG__
    const playerConfigMatch = content.match(/__PLAYER_CONFIG__\s*=\s*({.+?});/s);
    if (playerConfigMatch) {
      try {
        const config = JSON.parse(playerConfigMatch[1]);
        configs.push({
          source: '__PLAYER_CONFIG__',
          config
        });
      } catch (e) {
        console.warn('Failed to parse __PLAYER_CONFIG__:', e);
      }
    }
  });
  
  return configs;
}

// Extract video URLs from config
function extractVideoURLsFromConfig(config) {
  const urls = {
    hls: [],
    dash: [],
    progressive: []
  };
  
  // Navigate config structure
  const videoData = config.video || config.request?.files;
  
  if (videoData) {
    // HLS streams
    if (videoData.hls?.cdns) {
      Object.values(videoData.hls.cdns).forEach(cdn => {
        if (cdn.url) {
          urls.hls.push(cdn.url);
        }
      });
    }
    
    // DASH streams  
    if (videoData.dash?.cdns) {
      Object.values(videoData.dash.cdns).forEach(cdn => {
        if (cdn.url) {
          urls.dash.push(cdn.url);
        }
      });
    }
    
    // Progressive downloads
    if (videoData.progressive) {
      videoData.progressive.forEach(prog => {
        if (prog.url) {
          urls.progressive.push({
            url: prog.url,
            quality: prog.quality,
            width: prog.width,
            height: prog.height,
            fps: prog.fps
          });
        }
      });
    }
  }
  
  return urls;
}
```

#### JSON-LD Structured Data
```javascript
// Extract Vimeo data from JSON-LD
function extractVimeoJSONLD() {
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      
      // Look for VideoObject
      if (data['@type'] === 'VideoObject' || 
          (Array.isArray(data) && data.some(item => item['@type'] === 'VideoObject'))) {
        
        const videoObjects = Array.isArray(data) ? 
          data.filter(item => item['@type'] === 'VideoObject') : [data];
        
        return videoObjects.map(video => ({
          name: video.name,
          description: video.description,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          uploadDate: video.uploadDate,
          contentUrl: video.contentUrl,
          embedUrl: video.embedUrl
        }));
      }
    } catch (e) {
      console.warn('Failed to parse JSON-LD:', e);
    }
  }
  
  return [];
}
```

### 3. Iframe Detection
```javascript
// Detect Vimeo iframes on page
function detectVimeoIframes() {
  const iframes = [];
  
  document.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.src || iframe.dataset.src;
    
    if (src && src.includes('player.vimeo.com/video/')) {
      const parsed = parseVimeoURL(src);
      if (parsed) {
        iframes.push({
          element: iframe,
          src,
          videoId: parsed.videoId,
          hash: parsed.hash,
          width: iframe.width,
          height: iframe.height
        });
      }
    }
  });
  
  return iframes;
}

// Extract Vimeo URLs from page links
function detectVimeoLinks() {
  const links = [];
  
  document.querySelectorAll('a[href*="vimeo.com"]').forEach(link => {
    const parsed = parseVimeoURL(link.href);
    if (parsed) {
      links.push({
        element: link,
        url: link.href,
        videoId: parsed.videoId,
        hash: parsed.hash,
        text: link.textContent.trim()
      });
    }
  });
  
  return links;
}
```

### 4. Player Coaxing
```javascript
// Coax Vimeo player to start loading
async function coaxVimeoPlayer(maxWaitMs = 5000) {
  const startTime = Date.now();
  
  const strategies = [
    // Click Vimeo play buttons
    () => {
      const selectors = [
        '[data-testid="VimeoPlayerPlayButton"]',
        '.vp-overlay-play-icon',
        '.vp-controls .vp-playpause',
        'button[aria-label="Play"]',
        '.play-button'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(btn => {
          if (btn.offsetParent) {
            btn.click();
            console.log('Clicked Vimeo play button:', selector);
          }
        });
      });
    },
    
    // Hover over player areas
    () => {
      document.querySelectorAll('iframe[src*="player.vimeo.com"], .vimeo-player').forEach(player => {
        const events = ['mouseenter', 'mouseover', 'focus'];
        events.forEach(eventType => {
          const event = new MouseEvent(eventType, { bubbles: true });
          player.dispatchEvent(event);
        });
      });
    },
    
    // Trigger video element events
    () => {
      document.querySelectorAll('video').forEach(video => {
        if (video.src && video.src.includes('vimeocdn.com')) {
          video.load();
          video.play().catch(() => {}); // Ignore auto-play prevention
        }
      });
    }
  ];
  
  // Execute strategies
  for (const strategy of strategies) {
    if (Date.now() - startTime > maxWaitMs) break;
    
    try {
      strategy();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.warn('Vimeo coax strategy failed:', e);
    }
  }
}
```

## Download Methods

### 1. Using yt-dlp (Recommended)
```bash
# Basic Vimeo download
yt-dlp "https://vimeo.com/123456789"

# Private video with password
yt-dlp --video-password "secret123" "https://vimeo.com/123456789"

# Embed URL with proper headers
yt-dlp --add-header "Referer: https://example.com/" \
       --add-header "Origin: https://player.vimeo.com" \
       "https://player.vimeo.com/video/123456789?h=abcdef123"

# Select specific quality
yt-dlp -f "best[height<=720]" "https://vimeo.com/123456789"

# Merge video+audio and convert to MP4
yt-dlp -f "bv*+ba/b" --merge-output-format mp4 "https://vimeo.com/123456789"

# Download with cookies (for authenticated content)
yt-dlp --cookies cookies.txt "https://vimeo.com/123456789"
```

### 2. Direct Progressive Download
```javascript
// Download Vimeo progressive streams
async function downloadVimeoProgressive(videoUrl, referer) {
  const config = extractVimeoConfig();
  
  if (config.length === 0) {
    throw new Error('No Vimeo config found');
  }
  
  const urls = extractVideoURLsFromConfig(config[0].config);
  
  if (urls.progressive.length === 0) {
    throw new Error('No progressive streams available');
  }
  
  // Select best quality
  const bestQuality = urls.progressive
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  
  console.log(`Downloading ${bestQuality.quality} (${bestQuality.width}x${bestQuality.height})`);
  
  // Download with proper headers
  const response = await fetch(bestQuality.url, {
    headers: {
      'Referer': referer || 'https://vimeo.com/',
      'Origin': 'https://player.vimeo.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  return response.blob();
}
```

### 3. HLS Stream Download
```bash
# Download HLS stream from Vimeo
# First extract HLS URL from config, then:
yt-dlp --add-header "Referer: https://vimeo.com/" \
       "https://vod-adaptive.akamaized.net/exp=1234567890~acl=/*~data=hdntl~hmac=abcdef/master.m3u8"

# Using ffmpeg
ffmpeg -headers "Referer: https://vimeo.com/" \
       -i "https://vod-adaptive.akamaized.net/.../master.m3u8" \
       -c copy output.mp4
```

### 4. Browser Extension Implementation
```javascript
// Vimeo video extractor extension
class VimeoVideoExtractor {
  constructor() {
    this.detectedVideos = new Map();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.scanPage());
    } else {
      this.scanPage();
    }
    
    // Monitor dynamic content
    const observer = new MutationObserver(() => this.scanPage());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Monitor network requests
    this.interceptNetworkRequests();
  }
  
  scanPage() {
    // Detect iframes
    const iframes = detectVimeoIframes();
    iframes.forEach(iframe => {
      this.detectedVideos.set(iframe.videoId, {
        type: 'iframe',
        videoId: iframe.videoId,
        hash: iframe.hash,
        url: iframe.src,
        element: iframe.element
      });
    });
    
    // Detect config data
    const configs = extractVimeoConfig();
    configs.forEach(config => {
      const urls = extractVideoURLsFromConfig(config.config);
      if (urls.hls.length > 0 || urls.progressive.length > 0) {
        const videoId = this.extractVideoIdFromConfig(config.config);
        this.detectedVideos.set(videoId, {
          type: 'config',
          videoId,
          urls,
          config: config.config
        });
      }
    });
    
    this.notifyDetection();
  }
  
  interceptNetworkRequests() {
    // Intercept fetch for Vimeo API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && url.includes('vimeo.com')) {
        console.log('Vimeo API call detected:', url);
      }
      
      return originalFetch.apply(this, args);
    };
  }
  
  notifyDetection() {
    if (this.detectedVideos.size > 0) {
      console.log(`Found ${this.detectedVideos.size} Vimeo video(s)`);
      
      // Show notification or UI indicator
      this.showDetectionIndicator();
    }
  }
  
  showDetectionIndicator() {
    // Create floating indicator
    const indicator = document.createElement('div');
    indicator.id = 'vimeo-detector-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      padding: 10px;
      background: #1ab7ea;
      color: white;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      cursor: pointer;
    `;
    indicator.textContent = `${this.detectedVideos.size} Vimeo video(s) detected`;
    
    indicator.onclick = () => this.showVideoList();
    document.body.appendChild(indicator);
  }
  
  showVideoList() {
    const videos = Array.from(this.detectedVideos.values());
    console.table(videos);
    
    // Could implement modal or download UI here
    alert(`Detected videos:\n${videos.map(v => v.videoId).join('\n')}`);
  }
  
  extractVideoIdFromConfig(config) {
    return config.video?.id || 
           config.video?.owner?.id || 
           config.clip_id || 
           'unknown';
  }
}

// Initialize extension
const extractor = new VimeoVideoExtractor();
```

## Authentication and Access Control

### 1. Password-Protected Videos
```javascript
// Handle password-protected Vimeo videos
async function handlePasswordProtectedVimeo(videoUrl, password) {
  const videoId = extractVimeoId(videoUrl);
  
  // Submit password via Vimeo API
  const response = await fetch(`https://player.vimeo.com/video/${videoId}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': videoUrl
    },
    body: JSON.stringify({
      password: password
    })
  });
  
  if (response.ok) {
    const config = await response.json();
    return extractVideoURLsFromConfig(config);
  }
  
  throw new Error('Invalid password or authentication failed');
}
```

### 2. Domain-Restricted Embeds
```javascript
// Handle domain-restricted Vimeo embeds
function getEmbedURL(videoId, hash, referrer) {
  const embedUrl = `https://player.vimeo.com/video/${videoId}`;
  const params = new URLSearchParams();
  
  if (hash) {
    params.set('h', hash);
  }
  
  // Add domain-specific parameters
  params.set('dnt', '1'); // Do not track
  params.set('app_id', '122963'); // Common app ID
  
  return `${embedUrl}?${params.toString()}`;
}
```

### 3. Private Videos with Tokens
```bash
# Download private Vimeo video with token
yt-dlp --add-header "Authorization: Bearer YOUR_TOKEN" \
       --add-header "Referer: https://example.com/" \
       "https://player.vimeo.com/video/123456789?h=abcdef123"
```

## Quality and Format Selection

### 1. Available Formats Analysis
```javascript
// Analyze available Vimeo formats
function analyzeVimeoFormats(config) {
  const analysis = {
    hls: [],
    dash: [],
    progressive: []
  };
  
  const urls = extractVideoURLsFromConfig(config);
  
  // Analyze progressive formats
  urls.progressive.forEach(prog => {
    analysis.progressive.push({
      quality: prog.quality,
      resolution: `${prog.width}x${prog.height}`,
      fps: prog.fps,
      size: 'unknown', // Would need HEAD request
      format: 'MP4'
    });
  });
  
  // HLS analysis would require manifest parsing
  urls.hls.forEach(hlsUrl => {
    analysis.hls.push({
      url: hlsUrl,
      type: 'adaptive',
      format: 'HLS'
    });
  });
  
  // DASH analysis would require MPD parsing  
  urls.dash.forEach(dashUrl => {
    analysis.dash.push({
      url: dashUrl,
      type: 'adaptive',
      format: 'DASH'
    });
  });
  
  return analysis;
}
```

### 2. Best Quality Selection
```javascript
// Select best available quality
function selectBestVimeoQuality(formats) {
  const priorities = {
    // Progressive download priorities (if available)
    progressive: ['2160p', '1440p', '1080p', '720p', '540p', '360p'],
    
    // Streaming priorities
    streaming: ['hls', 'dash']
  };
  
  // Prefer progressive if available
  if (formats.progressive.length > 0) {
    for (const quality of priorities.progressive) {
      const match = formats.progressive.find(p => p.quality === quality);
      if (match) {
        return { type: 'progressive', format: match };
      }
    }
  }
  
  // Fallback to adaptive streaming
  for (const streamType of priorities.streaming) {
    if (formats[streamType].length > 0) {
      return { type: streamType, format: formats[streamType][0] };
    }
  }
  
  throw new Error('No suitable format found');
}
```

## Common Issues and Solutions

### 1. Player Domain Restrictions
```javascript
// Resolve player URL for domain-restricted videos
async function resolveVimeoPlayerURL(shareUrl, videoId, hash) {
  const preferredDomains = [
    'https://player.vimeo.com',
    'https://vimeo.com'
  ];
  
  for (const domain of preferredDomains) {
    const playerUrl = `${domain}/video/${videoId}${hash ? `?h=${hash}` : ''}`;
    
    try {
      const response = await fetch(playerUrl, { method: 'HEAD' });
      if (response.ok) {
        return playerUrl;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Fallback to share URL
  return shareUrl;
}
```

### 2. Geo-blocking
```bash
# Use proxy for geo-blocked content
yt-dlp --proxy socks5://127.0.0.1:1080 "https://vimeo.com/123456789"

# Use specific geographic location
yt-dlp --geo-bypass-country US "https://vimeo.com/123456789"
```

### 3. Rate Limiting
```javascript
// Implement rate limiting for API calls
class VimeoRateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requests = [];
    this.limit = requestsPerMinute;
  }
  
  async makeRequest(url, options = {}) {
    await this.waitForRateLimit();
    
    this.requests.push(Date.now());
    return fetch(url, options);
  }
  
  async waitForRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}
```

## Advanced Techniques

### 1. Bulk Video Detection
```javascript
// Detect multiple Vimeo videos on page
function bulkVimeoDetection() {
  const allVideos = new Map();
  
  // Scan all possible sources
  const sources = [
    ...detectVimeoIframes(),
    ...detectVimeoLinks(),
    ...extractVimeoConfig(),
    ...extractVimeoJSONLD()
  ];
  
  sources.forEach(source => {
    const videoId = source.videoId || extractVimeoId(source.url || source.embedUrl);
    if (videoId) {
      allVideos.set(videoId, {
        ...source,
        videoId,
        detectionMethods: (allVideos.get(videoId)?.detectionMethods || []).concat([source.type || 'unknown'])
      });
    }
  });
  
  return Array.from(allVideos.values());
}
```

### 2. Live Stream Detection
```javascript
// Detect Vimeo live streams
function detectVimeoLiveStreams() {
  const liveStreams = [];
  
  // Check for live event URLs
  document.querySelectorAll('a[href*="/event/"]').forEach(link => {
    const match = link.href.match(/\/event\/(\d+)/);
    if (match) {
      liveStreams.push({
        eventId: match[1],
        url: link.href,
        title: link.textContent.trim()
      });
    }
  });
  
  return liveStreams;
}
```

