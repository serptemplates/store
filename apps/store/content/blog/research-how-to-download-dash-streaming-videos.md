---
slug: how-to-download-dash-streaming-videos
---

# How to Download DASH Streaming Videos

**File Extensions**: `.mpd` (Media Presentation Description)  
**MIME Types**: `application/dash+xml`  
**Container**: XML manifest format  
**Streaming**: Adaptive bitrate streaming protocol  

## Overview

DASH (Dynamic Adaptive Streaming over HTTP) is an international standard for adaptive bitrate streaming. Unlike [HLS which uses M3U8 playlists](https://apps.serp.co/blog/how-to-download-hls-m3u8-streaming-videos), DASH uses XML-based Media Presentation Description (MPD) files to describe the available media segments. While [RTMP](https://apps.serp.co/blog/how-to-download-rtmp-live-streams) is primarily used for live stream ingestion, DASH handles the delivery to viewers alongside protocols like [WebRTC](https://apps.serp.co/blog/how-to-download-webrtc-video-streams) for ultra-low latency applications.

## DASH Structure

### MPD Manifest Structure
```xml
<?xml version="1.0"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" 
     type="static" 
     mediaPresentationDuration="PT634.566S">
  
  <Period start="PT0S">
    <AdaptationSet mimeType="video/mp4">
      <Representation id="1" 
                      bandwidth="1000000" 
                      width="1280" 
                      height="720" 
                      codecs="avc1.42001e">
        <SegmentTemplate timescale="1000"
                         duration="4000"
                         initialization="init-$RepresentationID$.mp4"
                         media="chunk-$RepresentationID$-$Number$.mp4"
                         startNumber="1"/>
      </Representation>
    </AdaptationSet>
    
    <AdaptationSet mimeType="audio/mp4">
      <Representation id="audio" 
                      bandwidth="128000" 
                      codecs="mp4a.40.2">
        <SegmentTemplate timescale="1000"
                         duration="4000"
                         initialization="init-audio.mp4"
                         media="chunk-audio-$Number$.mp4"
                         startNumber="1"/>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>
```

### Segment Types
1. **Initialization Segments**: Container metadata (init-*.mp4)
2. **Media Segments**: Actual audio/video data (chunk-*.mp4)

## Detection Methods

### 1. Network Traffic Analysis

#### Browser Developer Tools
```javascript
// Monitor for MPD files in Network tab
// Filter by: XHR/Fetch or response type containing "xml"
// Look for URLs ending in .mpd or content-type application/dash+xml
```

#### JavaScript Network Interception
```javascript
// Intercept DASH manifest requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  
  if (typeof url === 'string') {
    if (url.includes('.mpd') || url.includes('manifest')) {
      console.log('Potential DASH manifest:', url);
    }
  }
  
  return originalFetch.apply(this, args).then(response => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('dash+xml')) {
      console.log('DASH MPD detected:', url);
    }
    return response;
  });
};
```

### 2. DOM Analysis

#### Video Element Detection
```javascript
// Check for DASH-enabled video players
function detectDASHPlayers() {
  const players = [];
  
  // Check for dash.js library
  if (window.dashjs) {
    console.log('dash.js library detected');
    
    // Find MediaPlayer instances
    document.querySelectorAll('video').forEach(video => {
      if (video.dashPlayer) {
        const manifest = video.dashPlayer.getSource();
        players.push({ element: video, manifest });
      }
    });
  }
  
  // Check for Shaka Player
  if (window.shaka) {
    console.log('Shaka Player library detected');
    
    document.querySelectorAll('video').forEach(video => {
      if (video.shakaPlayer) {
        const manifest = video.shakaPlayer.getAssetUri();
        players.push({ element: video, manifest, player: 'shaka' });
      }
    });
  }
  
  return players;
}
```

#### Generic Player Detection
```javascript
// Detect DASH from various player frameworks
function detectGenericDASH() {
  const dashSources = [];
  
  // Check all video elements for dash sources
  document.querySelectorAll('video').forEach(video => {
    // Check src attribute
    if (video.src && video.src.includes('.mpd')) {
      dashSources.push(video.src);
    }
    
    // Check source elements
    video.querySelectorAll('source').forEach(source => {
      if (source.src && source.src.includes('.mpd')) {
        dashSources.push(source.src);
      }
    });
  });
  
  // Check for data attributes that might contain DASH URLs
  document.querySelectorAll('[data-dash-url], [data-manifest-url], [data-mpd]').forEach(el => {
    const dashUrl = el.dataset.dashUrl || el.dataset.manifestUrl || el.dataset.mpd;
    if (dashUrl) {
      dashSources.push(dashUrl);
    }
  });
  
  return dashSources;
}
```

### 3. MSE (Media Source Extensions) Monitoring
```javascript
// Monitor MediaSource for DASH content
if ('MediaSource' in window) {
  const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
  const originalAppendBuffer = SourceBuffer.prototype.appendBuffer;
  
  MediaSource.prototype.addSourceBuffer = function(mimeType) {
    console.log('SourceBuffer created for:', mimeType);
    
    const sourceBuffer = originalAddSourceBuffer.call(this, mimeType);
    
    // Override appendBuffer for this SourceBuffer
    sourceBuffer.appendBuffer = function(buffer) {
      console.log('Buffer appended, size:', buffer.byteLength);
      
      // Detect DASH initialization segment
      if (isDASHInitSegment(buffer)) {
        console.log('DASH initialization segment detected');
      }
      
      return originalAppendBuffer.call(this, buffer);
    };
    
    return sourceBuffer;
  };
}

function isDASHInitSegment(buffer) {
  const view = new DataView(buffer);
  // Look for ftyp box with DASH brands
  const ftyp = String.fromCharCode(
    view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7)
  );
  
  if (ftyp === 'ftyp') {
    const majorBrand = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
    );
    return ['dash', 'msdh'].includes(majorBrand);
  }
  
  return false;
}
```

## Extraction and Analysis

### 1. MPD Manifest Parsing
```javascript
// Parse DASH MPD manifest
async function parseDASHManifest(mpdUrl) {
  const response = await fetch(mpdUrl);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  
  const mpd = {
    type: doc.documentElement.getAttribute('type'),
    duration: doc.documentElement.getAttribute('mediaPresentationDuration'),
    periods: []
  };
  
  doc.querySelectorAll('Period').forEach(period => {
    const periodData = {
      start: period.getAttribute('start'),
      adaptationSets: []
    };
    
    period.querySelectorAll('AdaptationSet').forEach(adaptationSet => {
      const setData = {
        mimeType: adaptationSet.getAttribute('mimeType'),
        codecs: adaptationSet.getAttribute('codecs'),
        representations: []
      };
      
      adaptationSet.querySelectorAll('Representation').forEach(rep => {
        const repData = {
          id: rep.getAttribute('id'),
          bandwidth: parseInt(rep.getAttribute('bandwidth')),
          width: rep.getAttribute('width'),
          height: rep.getAttribute('height'),
          codecs: rep.getAttribute('codecs') || setData.codecs
        };
        
        // Parse segment template
        const segmentTemplate = rep.querySelector('SegmentTemplate');
        if (segmentTemplate) {
          repData.segmentTemplate = {
            initialization: segmentTemplate.getAttribute('initialization'),
            media: segmentTemplate.getAttribute('media'),
            duration: segmentTemplate.getAttribute('duration'),
            startNumber: segmentTemplate.getAttribute('startNumber')
          };
        }
        
        setData.representations.push(repData);
      });
      
      periodData.adaptationSets.push(setData);
    });
    
    mpd.periods.push(periodData);
  });
  
  return mpd;
}
```

### 2. Segment URL Generation
```javascript
// Generate segment URLs from template
function generateSegmentURLs(representation, baseUrl, segmentCount) {
  const { segmentTemplate } = representation;
  const urls = [];
  
  // Add initialization segment
  if (segmentTemplate.initialization) {
    const initUrl = segmentTemplate.initialization
      .replace('$RepresentationID$', representation.id);
    urls.push({ type: 'init', url: new URL(initUrl, baseUrl).href });
  }
  
  // Add media segments
  const startNumber = parseInt(segmentTemplate.startNumber) || 1;
  for (let i = 0; i < segmentCount; i++) {
    const segmentNumber = startNumber + i;
    const mediaUrl = segmentTemplate.media
      .replace('$RepresentationID$', representation.id)
      .replace('$Number$', segmentNumber);
    
    urls.push({ 
      type: 'media', 
      url: new URL(mediaUrl, baseUrl).href,
      number: segmentNumber
    });
  }
  
  return urls;
}
```

## Download Methods

### 1. yt-dlp (Recommended)
```bash
# Basic DASH download
yt-dlp "https://example.com/manifest.mpd"

# Select specific format
yt-dlp -f "best[height<=720]" "https://example.com/manifest.mpd"

# Download with headers
yt-dlp --add-header "Referer: https://example.com/" \
       --add-header "Origin: https://example.com/" \
       "https://example.com/manifest.mpd"

# Force merge video+audio
yt-dlp -f "bv*+ba/b" --merge-output-format mp4 \
       "https://example.com/manifest.mpd"
```

### 2. ffmpeg Direct Download
```bash
# Download DASH stream
ffmpeg -i "https://example.com/manifest.mpd" -c copy output.mp4

# With headers
ffmpeg -headers "Referer: https://example.com/" \
       -i "https://example.com/manifest.mpd" \
       -c copy output.mp4

# Select specific adaptation set
ffmpeg -i "https://example.com/manifest.mpd" \
       -map 0:v:0 -map 0:a:0 \
       -c copy output.mp4
```

### 3. Custom DASH Downloader
```javascript
const fs = require('fs');
const https = require('https');
const path = require('path');

class DASHDownloader {
  constructor(mpdUrl, outputDir) {
    this.mpdUrl = mpdUrl;
    this.outputDir = outputDir;
    this.baseUrl = new URL('.', mpdUrl);
  }
  
  async download() {
    // Parse manifest
    const manifest = await this.parseMPD();
    
    // Select best representations
    const videoRep = this.selectBestVideo(manifest);
    const audioRep = this.selectBestAudio(manifest);
    
    // Download segments
    await this.downloadRepresentation(videoRep, 'video');
    await this.downloadRepresentation(audioRep, 'audio');
    
    // Merge with ffmpeg
    await this.mergeStreams();
  }
  
  async downloadRepresentation(representation, type) {
    const segments = generateSegmentURLs(representation, this.baseUrl, 100);
    const segmentDir = path.join(this.outputDir, type);
    
    fs.mkdirSync(segmentDir, { recursive: true });
    
    for (const segment of segments) {
      const filename = segment.type === 'init' 
        ? `init.mp4` 
        : `segment_${segment.number}.mp4`;
      
      const filepath = path.join(segmentDir, filename);
      await this.downloadFile(segment.url, filepath);
      console.log(`Downloaded: ${filename}`);
    }
  }
  
  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', reject);
    });
  }
  
  selectBestVideo(manifest) {
    // Find video adaptation set
    const period = manifest.periods[0];
    const videoSet = period.adaptationSets.find(set => 
      set.mimeType.startsWith('video/'));
    
    // Select highest bitrate
    return videoSet.representations
      .sort((a, b) => b.bandwidth - a.bandwidth)[0];
  }
  
  selectBestAudio(manifest) {
    // Find audio adaptation set
    const period = manifest.periods[0];
    const audioSet = period.adaptationSets.find(set => 
      set.mimeType.startsWith('audio/'));
    
    // Select highest bitrate
    return audioSet.representations
      .sort((a, b) => b.bandwidth - a.bandwidth)[0];
  }
  
  async mergeStreams() {
    // Use ffmpeg to merge video and audio segments
    const { spawn } = require('child_process');
    
    const args = [
      '-i', path.join(this.outputDir, 'video', 'init.mp4'),
      '-i', path.join(this.outputDir, 'audio', 'init.mp4'),
      '-c', 'copy',
      path.join(this.outputDir, 'output.mp4')
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    return new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
    });
  }
}

// Usage
const downloader = new DASHDownloader(
  'https://example.com/manifest.mpd',
  './downloads'
);
downloader.download();
```

### 4. Browser-Based Extraction
```javascript
// Extract DASH segments from browser
class BrowserDASHExtractor {
  constructor() {
    this.segments = new Map();
    this.setupInterception();
  }
  
  setupInterception() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch.apply(this, args);
      const url = args[0];
      
      // Check if this is a DASH segment
      if (this.isDASHSegment(url)) {
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        
        this.segments.set(url, {
          url,
          buffer,
          timestamp: Date.now(),
          type: this.getSegmentType(url)
        });
        
        console.log('DASH segment captured:', url);
      }
      
      return response;
    };
  }
  
  isDASHSegment(url) {
    return /\.(mp4|m4s|webm)(\?|$)/i.test(url) ||
           url.includes('init-') ||
           url.includes('chunk-') ||
           url.includes('segment');
  }
  
  getSegmentType(url) {
    if (url.includes('init')) return 'init';
    return 'media';
  }
  
  downloadCapturedSegments() {
    this.segments.forEach((segment, url) => {
      const blob = new Blob([segment.buffer]);
      const filename = `segment_${segment.timestamp}.mp4`;
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(a.href);
    });
  }
}

// Usage
const extractor = new BrowserDASHExtractor();
// Play the video, then call:
// extractor.downloadCapturedSegments();
```

## Advanced Techniques

### 1. Live DASH Stream Recording
```javascript
// Record live DASH stream
async function recordLiveDASH(mpdUrl, duration) {
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  while (Date.now() < endTime) {
    // Fetch updated manifest
    const manifest = await parseDASHManifest(mpdUrl);
    
    // Download new segments
    // Implementation depends on manifest type (dynamic vs static)
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

### 2. Quality Adaptation
```javascript
// Implement adaptive quality selection
class AdaptiveDASHPlayer {
  constructor(mpdUrl) {
    this.mpdUrl = mpdUrl;
    this.currentBandwidth = 1000000; // Start with 1Mbps
  }
  
  selectRepresentation(adaptationSet) {
    // Simple bandwidth-based selection
    const suitable = adaptationSet.representations.filter(rep => 
      rep.bandwidth <= this.currentBandwidth * 1.2
    );
    
    return suitable.sort((a, b) => b.bandwidth - a.bandwidth)[0];
  }
  
  updateBandwidth(measuredBandwidth) {
    // Simple adaptation logic
    this.currentBandwidth = measuredBandwidth * 0.8; // Conservative
  }
}
```

### 3. DRM Content Detection
```javascript
// Detect DRM-protected DASH content
function detectDRMProtection(manifest) {
  const doc = new DOMParser().parseFromString(manifest, 'text/xml');
  
  const contentProtection = doc.querySelectorAll('ContentProtection');
  if (contentProtection.length > 0) {
    const drmSystems = [];
    
    contentProtection.forEach(cp => {
      const schemeId = cp.getAttribute('schemeIdUri');
      drmSystems.push(schemeId);
    });
    
    return {
      protected: true,
      systems: drmSystems
    };
  }
  
  return { protected: false };
}
```

## Common Issues and Solutions

### 1. CORS Issues
```javascript
// Use proxy for CORS-restricted manifests
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const dashUrl = 'https://example.com/manifest.mpd';

fetch(proxyUrl + dashUrl);
```

### 2. Segment Synchronization
```javascript
// Handle segment timing issues
function calculateSegmentTime(representation, segmentNumber) {
  const template = representation.segmentTemplate;
  const duration = parseInt(template.duration);
  const timescale = parseInt(template.timescale) || 1;
  
  return (segmentNumber - 1) * (duration / timescale);
}
```

### 3. Missing Segments
```javascript
// Handle missing segments gracefully
async function downloadSegmentWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.arrayBuffer();
      }
    } catch (error) {
      console.log(`Retry ${i + 1} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error(`Failed to download segment after ${maxRetries} retries`);
}
```

## Platform-Specific Implementations

### YouTube
- Uses DASH for higher quality streams
- Separate video/audio tracks that need merging
- Download with our [YouTube Downloader](https://apps.serp.co/youtube-downloader)

### Netflix
- Uses DASH with custom DRM
- Requires specific user agents and tokens
- Download with our [Netflix Downloader](https://apps.serp.co/netflix-downloader)

### Facebook/Instagram
- DASH streams often embedded in page data
- May require authentication tokens
- Download Facebook videos with [Facebook Video Downloader](https://apps.serp.co/facebook-video-downloader)
- Download Instagram content with [Instagram Downloader](https://apps.serp.co/instagram-downloader)

## Related Tools

- [Stream Downloader](https://apps.serp.co/stream-downloader) - Universal streaming video downloader
- [YouTube Downloader](https://apps.serp.co/youtube-downloader) - Download YouTube videos using DASH
- [Netflix Downloader](https://apps.serp.co/netflix-downloader) - Download Netflix content
- [Vimeo Video Downloader](https://apps.serp.co/vimeo-video-downloader) - Download Vimeo videos
- [Udemy Video Downloader](https://apps.serp.co/udemy-video-downloader) - Download course videos
- [Coursera Downloader](https://apps.serp.co/coursera-downloader) - Download Coursera lectures

## See Also

- [How to Download HLS/M3U8 Streaming Videos](https://apps.serp.co/blog/how-to-download-hls-m3u8-streaming-videos) - Alternative adaptive streaming
- [How to Download RTMP Live Streams](https://apps.serp.co/blog/how-to-download-rtmp-live-streams) - Live stream ingestion protocol
- [How to Download WebRTC Video Streams](https://apps.serp.co/blog/how-to-download-webrtc-video-streams) - Real-time communication

## YouTube Tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/videoseries?list=PL5qY8HgSEm1dN9gY0Z6P4K1mCHdUvXFvH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>