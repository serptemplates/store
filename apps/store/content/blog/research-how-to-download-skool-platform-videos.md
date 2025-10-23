---
slug: how-to-download-skool-platform-videos
---

# How to Download Skool Platform Videos

**Platform**: Skool.com  
**Primary Format**: HLS (M3U8 playlists)  
**CDNs**: Fastly, BunnyCDN, native Skool domains  
**Player**: Mux Player embedded  

## Overview

Skool uses HLS streaming for their native video content, powered by Mux video infrastructure. Videos are served through various CDNs including Fastly and BunnyCDN, with different URL patterns depending on the hosting configuration.

## Video Detection Methods

### 1. Page Data Analysis

#### __NEXT_DATA__ Extraction
```javascript
// Skool embeds video metadata in Next.js data
function extractSkoolVideoFromNextData() {
  const nextDataScript = document.getElementById('__NEXT_DATA__');
  if (nextDataScript) {
    try {
      const data = JSON.parse(nextDataScript.textContent);
      
      // Navigate through the data structure
      const pageProps = data.props?.pageProps;
      
      // Look for video metadata
      if (pageProps?.post?.metadata?.videoStream) {
        return {
          m3u8Url: pageProps.post.metadata.videoStream,
          videoLink: pageProps.post.metadata.videoLink,
          title: pageProps.post.title || pageProps.post.metadata.title
        };
      }
      
      // Check other possible locations
      if (pageProps?.lesson?.videoStream) {
        return {
          m3u8Url: pageProps.lesson.videoStream,
          title: pageProps.lesson.title
        };
      }
      
    } catch (e) {
      console.error('Failed to parse __NEXT_DATA__:', e);
    }
  }
  
  return null;
}
```

#### Mux Player Detection
```javascript
// Detect Mux player instances
function detectMuxPlayer() {
  const muxPlayers = [];
  
  // Look for mux-player elements
  document.querySelectorAll('mux-player').forEach(player => {
    const playbackId = player.getAttribute('playback-id');
    const streamType = player.getAttribute('stream-type');
    const src = player.getAttribute('src');
    
    if (playbackId || src) {
      muxPlayers.push({
        element: player,
        playbackId,
        streamType,
        src,
        // Construct potential M3U8 URL
        m3u8Url: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : src
      });
    }
  });
  
  // Look for standard video elements with mux sources
  document.querySelectorAll('video').forEach(video => {
    if (video.src && video.src.includes('mux.com')) {
      muxPlayers.push({
        element: video,
        src: video.src,
        m3u8Url: video.src
      });
    }
  });
  
  return muxPlayers;
}
```

### 2. Network Traffic Sniffing

#### HLS Manifest Detection
Based on the codebase, Skool uses a scoring system to identify HLS streams:

```typescript
// Scoring system for Skool M3U8 streams (from codebase)
function scoreSkoolM3U8(url: string, contentType?: string): number {
  try {
    const urlObj = new URL(url);
    const host = urlObj.host.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    
    // BunnyCDN playlist (highest priority)
    if (/\.b-cdn\.net$/i.test(host) && /\/playlist\.m3u8(?:$|\?)/i.test(path)) {
      return 5;
    }
    
    // Native Skool stream domain
    if (host === 'stream.video.skool.com') {
      return 4;
    }
    
    // Fastly CDN rendition
    if (/^manifest-/.test(host) && 
        /fastly\.video\.skool\.com$/i.test(host) && 
        /\/rendition\.m3u8(?:$|\?)/i.test(path)) {
      return 3;
    }
    
    // General Fastly Skool domain
    if (/^manifest-/.test(host) && /video\.skool\.com$/i.test(host)) {
      return 2;
    }
    
    // Stream subdomain
    if (/^stream\./.test(host) && /video\.skool\.com$/i.test(host)) {
      return 2;
    }
    
    // Any Skool video domain
    if (/video\.skool\.com$/i.test(host)) {
      return 1;
    }
    
    // Content-Type based detection
    if (contentType && /mpegurl|vnd\.apple\.mpegurl/i.test(contentType)) {
      return 1;
    }
    
    return 0;
  } catch {
    return 0;
  }
}
```

#### Network Request Monitoring
```javascript
// Monitor network requests for Skool HLS streams
function monitorSkoolHLS() {
  const detectedStreams = [];
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && /\.m3u8(\?|$)/i.test(url)) {
      const score = scoreSkoolM3U8(url);
      if (score > 0) {
        detectedStreams.push({
          url,
          score,
          timestamp: Date.now(),
          type: 'fetch'
        });
        console.log(`Skool HLS detected (score: ${score}):`, url);
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && /\.m3u8(\?|$)/i.test(url)) {
      const score = scoreSkoolM3U8(url);
      if (score > 0) {
        detectedStreams.push({
          url,
          score,
          timestamp: Date.now(),
          type: 'xhr'
        });
        console.log(`Skool HLS detected via XHR (score: ${score}):`, url);
      }
    }
    
    return originalOpen.apply(this, arguments);
  };
  
  return detectedStreams;
}
```

### 3. Player Coaxing
```javascript
// Coax Skool players to start loading video
async function coaxSkoolPlayer(maxWaitMs = 5000) {
  const startTime = Date.now();
  
  // Try to trigger video loading
  const strategies = [
    // Click play buttons
    () => {
      const playButtons = document.querySelectorAll(
        'mux-player [slot="play-button"], ' +
        '.mux-player-play-button, ' +
        '[data-testid="play-button"], ' +
        '.video-play-button'
      );
      
      playButtons.forEach(btn => {
        if (btn.offsetParent) { // visible
          btn.click();
          console.log('Clicked play button');
        }
      });
    },
    
    // Hover over video areas
    () => {
      document.querySelectorAll('mux-player, video').forEach(player => {
        const event = new MouseEvent('mouseenter', { bubbles: true });
        player.dispatchEvent(event);
      });
    },
    
    // Focus video elements
    () => {
      document.querySelectorAll('mux-player, video').forEach(player => {
        if (player.focus) {
          player.focus();
        }
      });
    }
  ];
  
  // Execute strategies with delays
  for (const strategy of strategies) {
    if (Date.now() - startTime > maxWaitMs) break;
    
    try {
      strategy();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.warn('Coax strategy failed:', e);
    }
  }
}
```

## Download Methods

### 1. Using Repository's Implementation
Based on the codebase, here's how Skool videos are downloaded:

```typescript
// Simplified version of the repository's download logic
async function downloadSkoolVideo(m3u8Url: string, options: {
  videosDir: string;
  slug: string;
  referer?: string;
  concurrentFragments?: number;
}) {
  const { videosDir, slug, referer, concurrentFragments = 5 } = options;
  
  // Ensure output directory exists
  await fs.promises.mkdir(videosDir, { recursive: true });
  
  // Build yt-dlp arguments
  const args = [
    m3u8Url,
    '-P', videosDir,
    '-o', `${slug}.%(ext)s`,
    '--no-playlist',
    '--no-part',
    '--retries', '3',
    '--fragment-retries', '3',
    '--concurrent-fragments', concurrentFragments.toString()
  ];
  
  // Add headers if referer provided
  if (referer) {
    args.push('--add-header', `Referer: ${referer}`);
    args.push('--add-header', 'Origin: https://www.skool.com');
  }
  
  // Execute yt-dlp
  const result = await execYtDlp(args);
  
  if (result.code === 0) {
    // Find downloaded file
    const files = await fs.promises.readdir(videosDir);
    const downloadedFile = files.find(f => f.startsWith(slug));
    
    return {
      success: true,
      file: downloadedFile ? path.join(videosDir, downloadedFile) : null
    };
  }
  
  return { success: false, error: result.stderr };
}
```

### 2. Manual HLS Download
```bash
# Direct yt-dlp download with Skool-specific headers
yt-dlp --add-header "Referer: https://www.skool.com/" \
       --add-header "Origin: https://www.skool.com" \
       --concurrent-fragments 5 \
       --output "%(title)s.%(ext)s" \
       "https://manifest-xyz.fastly.video.skool.com/rendition.m3u8"

# Using ffmpeg (for rendition URLs, convert to manifest)
# First, convert rendition.m3u8 to manifest.m3u8
MANIFEST_URL="${RENDITION_URL/rendition.m3u8/manifest.m3u8}"

ffmpeg -headers "Referer: https://www.skool.com/" \
       -i "$MANIFEST_URL" \
       -c copy \
       -bsf:a aac_adtstoasc \
       output.mp4
```

### 3. Browser Extension Implementation
```javascript
// Browser extension for Skool video detection and download
class SkoolVideoExtension {
  constructor() {
    this.detectedVideos = new Set();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor network requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (this.isSkoolM3U8(details.url)) {
          this.detectedVideos.add({
            url: details.url,
            score: scoreSkoolM3U8(details.url),
            tabId: details.tabId,
            timestamp: Date.now()
          });
          
          this.notifyDetection(details.url);
        }
      },
      { urls: ['*://*.skool.com/*', '*://*.video.skool.com/*', '*://*.b-cdn.net/*'] },
      ['requestBody']
    );
  }
  
  isSkoolM3U8(url) {
    return /\.m3u8(\?|$)/i.test(url) && scoreSkoolM3U8(url) > 0;
  }
  
  notifyDetection(url) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Skool Video Detected',
      message: `Found HLS stream: ${url.substring(0, 80)}...`
    });
  }
  
  async downloadDetectedVideos() {
    for (const video of this.detectedVideos) {
      await this.downloadVideo(video);
    }
  }
  
  async downloadVideo(video) {
    const downloadItem = await chrome.downloads.download({
      url: video.url,
      filename: `skool_video_${Date.now()}.m3u8`,
      headers: [
        { name: 'Referer', value: 'https://www.skool.com/' }
      ]
    });
    
    console.log('Download started:', downloadItem);
  }
}
```

## URL Pattern Analysis

### Common Skool HLS Patterns
```javascript
// URL pattern recognition for Skool
const skoolPatterns = {
  // BunnyCDN (highest quality, most reliable)
  bunnycdn: /^https:\/\/[^.]+\.b-cdn\.net\/.*\/playlist\.m3u8/i,
  
  // Native Skool stream domain
  nativeStream: /^https:\/\/stream\.video\.skool\.com\//i,
  
  // Fastly CDN patterns
  fastlyRendition: /^https:\/\/manifest-[^.]+\.fastly\.video\.skool\.com\/.*\/rendition\.m3u8/i,
  fastlyManifest: /^https:\/\/manifest-[^.]+\.fastly\.video\.skool\.com\/.*\/manifest\.m3u8/i,
  
  // General Skool video domains
  videoSkool: /^https:\/\/[^.]+\.video\.skool\.com\//i,
  
  // Mux.com direct (sometimes used)
  muxDirect: /^https:\/\/stream\.mux\.com\/[^.]+\.m3u8/i
};

function identifySkoolURLType(url) {
  for (const [type, pattern] of Object.entries(skoolPatterns)) {
    if (pattern.test(url)) {
      return type;
    }
  }
  return 'unknown';
}

// URL transformation utilities
function convertRenditionToManifest(url) {
  // Convert rendition.m3u8 to manifest.m3u8 for better quality
  return url.replace(/\/rendition\.m3u8(\?|$)/i, '/manifest.m3u8$1');
}

function extractSkoolVideoId(url) {
  // Extract video ID from M3U8 URL
  const patterns = [
    /(?:manifest|rendition)\/([^/]+)\.m3u8/i,
    /\/([A-Za-z0-9_-]{8,})\.m3u8/i
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) {
      return match[1];
    }
  }
  
  return 'skool-native';
}
```

## Quality Selection and Variants

### 1. Master Playlist Analysis
```javascript
// Analyze Skool HLS master playlist
async function analyzeSkoolPlaylist(m3u8Url) {
  const response = await fetch(m3u8Url, {
    headers: {
      'Referer': 'https://www.skool.com/',
      'Origin': 'https://www.skool.com'
    }
  });
  
  const playlistText = await response.text();
  const variants = [];
  
  const lines = playlistText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        const bandwidth = line.match(/BANDWIDTH=(\d+)/)?.[1];
        const resolution = line.match(/RESOLUTION=(\d+x\d+)/)?.[1];
        const codecs = line.match(/CODECS="([^"]+)"/)?.[1];
        
        variants.push({
          url: new URL(nextLine, m3u8Url).href,
          bandwidth: parseInt(bandwidth) || 0,
          resolution,
          codecs,
          quality: resolution ? `${resolution.split('x')[1]}p` : 'unknown'
        });
      }
    }
  }
  
  return variants.sort((a, b) => b.bandwidth - a.bandwidth);
}
```

### 2. Best Quality Selection
```typescript
// Quality selection logic from the codebase
interface SkoolVariant {
  url: string;
  bandwidth: number;
  resolution?: string;
  quality?: string;
}

function pickBestSkoolVariant(variants: SkoolVariant[]): SkoolVariant {
  if (variants.length === 0) {
    throw new Error('No variants available');
  }
  
  // Prefer master playlists over rendition URLs
  const masterVariants = variants.filter(v => 
    v.url.includes('/manifest.m3u8') || v.url.includes('/playlist.m3u8')
  );
  
  if (masterVariants.length > 0) {
    return masterVariants.sort((a, b) => b.bandwidth - a.bandwidth)[0];
  }
  
  // Fallback to highest bandwidth
  return variants.sort((a, b) => b.bandwidth - a.bandwidth)[0];
}
```

## Authentication and Headers

### Required Headers
```javascript
// Headers required for Skool video access
const skoolHeaders = {
  'Referer': 'https://www.skool.com/',
  'Origin': 'https://www.skool.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// For authenticated content, may need cookies
async function downloadWithSkoolAuth(m3u8Url, cookies?) {
  const headers = { ...skoolHeaders };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  
  const response = await fetch(m3u8Url, { headers });
  return response;
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // Use proxy or extension with host permissions
   const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
   fetch(proxyUrl + m3u8Url);
   ```

2. **Authentication Required**
   ```bash
   # Export cookies from authenticated browser session
   yt-dlp --cookies cookies.txt "https://skool-hls-url.m3u8"
   ```

3. **Geo-restrictions**
   ```bash
   # Use VPN or proxy
   yt-dlp --proxy socks5://127.0.0.1:1080 "https://skool-hls-url.m3u8"
   ```

### Debug Information
```javascript
// Debug Skool video detection
function debugSkoolDetection() {
  console.group('Skool Video Debug');
  
  // Check __NEXT_DATA__
  const nextData = extractSkoolVideoFromNextData();
  console.log('Next.js data:', nextData);
  
  // Check Mux players
  const muxPlayers = detectMuxPlayer();
  console.log('Mux players:', muxPlayers);
  
  // Check network requests
  const streams = monitorSkoolHLS();
  console.log('Detected streams:', streams);
  
  console.groupEnd();
}
```

## See Also

- [HLS Streaming Protocol](../streaming/hls.md)
- [MP4 Container Format](../containers/mp4.md)
- [Vimeo Platform](./vimeo.md)
- [Loom Platform](./loom.md)