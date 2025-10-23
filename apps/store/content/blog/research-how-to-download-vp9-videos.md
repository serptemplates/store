---
slug: how-to-download-vp9-videos
title: How to Download VP9 Encoded Videos
seoTitle: How to Download VP9 Encoded Videos
description: 'Developer: Google Standard: VP9 (WebM Project) File Extensions: .vp9,
  .webm Containers: WebM, MKV MIME Types: video/webm; codecs="vp9"'
seoDescription: 'Developer: Google Standard: VP9 (WebM Project) File Extensions: .vp9,
  .webm Containers: WebM, MKV MIME Types: video/webm; codecs="vp9"'
date: '2025-10-22T18:59:36.628000Z'
author: Devin Schumacher
---

# How to Download VP9 Encoded Videos

**Developer**: Google  
**Standard**: VP9 (WebM Project)  
**File Extensions**: `.vp9`, `.webm`  
**Containers**: WebM, MKV  
**MIME Types**: `video/webm; codecs="vp9"`  

## Overview

VP9 is Google's open-source video codec designed as a successor to VP8 and competitor to H.265/HEVC. It offers significant compression improvements over VP8 and H.264, making it popular for web streaming, particularly on YouTube and other Google services.

## VP9 Profiles and Levels

### Profile Support
```javascript
// VP9 profile identification and support
const vp9Profiles = {
  'vp09.00.10.08': {
    profile: '0',
    level: '1.0',
    bitDepth: '8',
    chromaSubsampling: '4:2:0',
    description: 'Standard definition, 8-bit'
  },
  'vp09.00.20.08': {
    profile: '0',
    level: '2.0',
    bitDepth: '8', 
    chromaSubsampling: '4:2:0',
    description: 'HD, 8-bit'
  },
  'vp09.01.20.08.01': {
    profile: '1',
    level: '2.0',
    bitDepth: '8',
    chromaSubsampling: '4:2:2/4:4:4',
    description: 'HD, 8-bit, higher chroma'
  },
  'vp09.02.30.10.01': {
    profile: '2',
    level: '3.0',
    bitDepth: '10',
    chromaSubsampling: '4:2:0',
    description: '4K, 10-bit'
  }
};

function parseVP9Codec(codecString) {
  if (codecString.startsWith('vp09.')) {
    const parts = codecString.split('.');
    
    if (parts.length >= 4) {
      const profile = parts[1];
      const level = parts[2];
      const bitDepth = parts[3];
      const chromaSubsampling = parts[4] || '00';
      
      return {
        profile: parseInt(profile, 10),
        level: parseInt(level, 10) / 10,
        bitDepth: parseInt(bitDepth, 10),
        chromaSubsampling: getChromaSubsampling(chromaSubsampling),
        description: `Profile ${profile}, Level ${parseInt(level, 10) / 10}, ${bitDepth}-bit`
      };
    }
  } else if (codecString === 'vp9' || codecString === 'vp9.0') {
    return {
      profile: 0,
      level: 'unknown',
      bitDepth: 8,
      chromaSubsampling: '4:2:0',
      description: 'VP9 Profile 0 (basic)'
    };
  }
  
  return null;
}

function getChromaSubsampling(code) {
  const subsamplingMap = {
    '00': '4:2:0',
    '01': '4:2:2',
    '02': '4:4:4',
    '03': '4:4:4'
  };
  
  return subsamplingMap[code] || 'unknown';
}
```

### Browser Support Detection
```javascript
// Check VP9 support in browsers
function checkVP9Support() {
  const video = document.createElement('video');
  
  const codecTests = {
    // Basic VP9 support
    vp9: video.canPlayType('video/webm; codecs="vp9"'),
    
    // VP9 Profile 0 (most common)
    profile0: video.canPlayType('video/webm; codecs="vp09.00.20.08"'),
    
    // VP9 Profile 2 (10-bit, HDR)
    profile2: video.canPlayType('video/webm; codecs="vp09.02.30.10.01"'),
    
    // Hardware acceleration detection
    hardware: checkVP9HardwareSupport()
  };
  
  // Convert results to boolean
  Object.keys(codecTests).forEach(key => {
    if (key !== 'hardware') {
      codecTests[key] = codecTests[key] !== '' && codecTests[key] !== 'no';
    }
  });
  
  return codecTests;
}

function checkVP9HardwareSupport() {
  // VP9 hardware support varies widely
  const userAgent = navigator.userAgent;
  
  return {
    chrome: /Chrome\/([0-9]+)/.test(userAgent) && parseInt(RegExp.$1) >= 88,
    firefox: /Firefox\/([0-9]+)/.test(userAgent) && parseInt(RegExp.$1) >= 85,
    safari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent) && 'limited',
    edge: /Edg\/([0-9]+)/.test(userAgent) && parseInt(RegExp.$1) >= 88
  };
}
```

## Detection Methods

### 1. VP9 Stream Detection
```javascript
// Comprehensive VP9 detection system
class VP9StreamDetector {
  constructor() {
    this.detectedStreams = new Map();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor Media Source Extensions
    this.monitorMSE();
    
    // Monitor video element sources
    this.monitorVideoSources();
    
    // Monitor network requests
    this.monitorNetworkRequests();
    
    // Monitor WebRTC (VP9 commonly used)
    this.monitorWebRTC();
  }
  
  monitorMSE() {
    if (!window.MediaSource) return;
    
    const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    
    MediaSource.prototype.addSourceBuffer = function(mimeType) {
      if (this.isVP9Codec(mimeType)) {
        console.log('VP9 MediaSource buffer created:', mimeType);
        
        const codecInfo = this.parseVP9FromMimeType(mimeType);
        if (codecInfo) {
          console.log('VP9 codec details:', codecInfo);
        }
      }
      
      return originalAddSourceBuffer.call(this, mimeType);
    }.bind(this);
  }
  
  isVP9Codec(mimeType) {
    return /vp9|vp09\./i.test(mimeType);
  }
  
  parseVP9FromMimeType(mimeType) {
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    if (codecMatch) {
      const codec = codecMatch[1];
      return parseVP9Codec(codec);
    }
    return null;
  }
  
  monitorVideoSources() {
    // Monitor video element creation and src changes
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'video') {
        this.instrumentVideoElement(element);
      }
      
      return element;
    }.bind(this);
    
    // Instrument existing video elements
    document.querySelectorAll('video').forEach(video => {
      this.instrumentVideoElement(video);
    });
  }
  
  instrumentVideoElement(video) {
    // Monitor source elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'SOURCE') {
            this.analyzeSourceElement(node);
          }
        });
      });
    });
    
    observer.observe(video, { childList: true });
    
    // Check existing sources
    video.querySelectorAll('source').forEach(source => {
      this.analyzeSourceElement(source);
    });
    
    // Monitor loadstart event
    video.addEventListener('loadstart', () => {
      this.analyzeVideoSource(video);
    });
  }
  
  analyzeSourceElement(sourceElement) {
    const type = sourceElement.type;
    const src = sourceElement.src;
    
    if (type && this.isVP9Codec(type)) {
      console.log('VP9 source element detected:', src);
      
      this.detectedStreams.set(src, {
        url: src,
        codec: this.parseVP9FromMimeType(type),
        element: sourceElement,
        detectionMethod: 'source-element',
        timestamp: Date.now()
      });
    }
  }
  
  analyzeVideoSource(video) {
    const src = video.src || video.currentSrc;
    
    if (src && this.isLikelyVP9URL(src)) {
      console.log('Potential VP9 video detected:', src);
      
      this.detectedStreams.set(src, {
        url: src,
        element: video,
        detectionMethod: 'url-pattern',
        timestamp: Date.now()
      });
    }
  }
  
  isLikelyVP9URL(url) {
    return /\.webm(\?|$)/i.test(url) ||
           /vp9|webm/i.test(url) ||
           url.includes('youtube.com') && url.includes('mime=video%2Fwebm');
  }
  
  monitorNetworkRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && this.isLikelyVP9URL(url)) {
        console.log('VP9 content requested via fetch:', url);
      }
      
      return originalFetch.apply(window, args).then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && /video\/webm/i.test(contentType)) {
          console.log('VP9/WebM content detected via response headers:', url);
        }
        return response;
      });
    }.bind(this);
  }
  
  monitorWebRTC() {
    // VP9 is commonly used in WebRTC
    if (!window.RTCPeerConnection) return;
    
    const originalCreateOffer = RTCPeerConnection.prototype.createOffer;
    const originalCreateAnswer = RTCPeerConnection.prototype.createAnswer;
    
    RTCPeerConnection.prototype.createOffer = async function(options) {
      const offer = await originalCreateOffer.call(this, options);
      
      if (offer.sdp && offer.sdp.includes('VP9')) {
        console.log('VP9 codec found in WebRTC offer');
        this.parseWebRTCCodecs(offer.sdp);
      }
      
      return offer;
    }.bind(this);
    
    RTCPeerConnection.prototype.createAnswer = async function(options) {
      const answer = await originalCreateAnswer.call(this, options);
      
      if (answer.sdp && answer.sdp.includes('VP9')) {
        console.log('VP9 codec found in WebRTC answer');
        this.parseWebRTCCodecs(answer.sdp);
      }
      
      return answer;
    }.bind(this);
  }
  
  parseWebRTCCodecs(sdp) {
    const lines = sdp.split('\n');
    
    lines.forEach(line => {
      if (line.includes('a=rtpmap:') && line.includes('VP9')) {
        console.log('WebRTC VP9 mapping:', line);
      }
      
      if (line.includes('a=fmtp:') && line.includes('VP9')) {
        console.log('WebRTC VP9 format parameters:', line);
      }
    });
  }
  
  getDetectedStreams() {
    return Array.from(this.detectedStreams.entries()).map(([url, info]) => ({
      url,
      ...info
    }));
  }
}

// Initialize VP9 detector
const vp9Detector = new VP9StreamDetector();
```

### 2. WebM/VP9 File Analysis
```javascript
// Analyze WebM containers for VP9 content
async function analyzeWebMForVP9(file) {
  const arrayBuffer = await file.arrayBuffer();
  const analysis = {
    isWebM: false,
    hasVP9: false,
    tracks: []
  };
  
  // Check for WebM header (EBML)
  const view = new DataView(arrayBuffer);
  const ebmlSignature = view.getUint32(0, false);
  
  if (ebmlSignature === 0x1A45DFA3) {
    analysis.isWebM = true;
    
    // Look for VP9 codec indicators
    const bytes = new Uint8Array(arrayBuffer.slice(0, 10000));
    const str = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    
    if (str.includes('V_VP9') || str.includes('vp09')) {
      analysis.hasVP9 = true;
      
      // Extract VP9 codec parameters (simplified)
      const vp9Match = str.match(/vp09\.(\d{2})\.(\d{2})\.(\d{2})/);
      if (vp9Match) {
        analysis.vp9Profile = {
          profile: parseInt(vp9Match[1], 10),
          level: parseInt(vp9Match[2], 10) / 10,
          bitDepth: parseInt(vp9Match[3], 10)
        };
      }
    }
  }
  
  return analysis;
}

// File drop handler for VP9 analysis
function setupVP9FileAnalysis() {
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const webmFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.webm') ||
      file.type === 'video/webm'
    );
    
    for (const file of webmFiles) {
      console.group(`Analyzing WebM file: ${file.name}`);
      
      try {
        const analysis = await analyzeWebMForVP9(file);
        
        console.log('File size:', file.size, 'bytes');
        console.log('Is WebM:', analysis.isWebM);
        console.log('Contains VP9:', analysis.hasVP9);
        
        if (analysis.vp9Profile) {
          console.log('VP9 Profile:', analysis.vp9Profile);
        }
        
        if (analysis.hasVP9) {
          showVP9FileInfo(file.name, analysis);
        }
        
      } catch (error) {
        console.error('Analysis failed:', error);
      }
      
      console.groupEnd();
    }
  });
}

function showVP9FileInfo(filename, analysis) {
  const info = document.createElement('div');
  info.style.cssText = `
    position: fixed; top: 20px; left: 20px; z-index: 10000;
    background: #4285f4; color: white; padding: 20px; border-radius: 8px;
    max-width: 350px; font-family: Arial, sans-serif;
  `;
  
  info.innerHTML = `
    <h4 style="margin: 0 0 10px 0;">VP9 File Detected</h4>
    <p style="margin: 0 0 10px 0;"><strong>File:</strong> ${filename}</p>
    ${analysis.vp9Profile ? `
      <p style="margin: 0 0 10px 0;">
        <strong>Profile:</strong> ${analysis.vp9Profile.profile}<br>
        <strong>Level:</strong> ${analysis.vp9Profile.level}<br>
        <strong>Bit Depth:</strong> ${analysis.vp9Profile.bitDepth}
      </p>
    ` : ''}
    <button onclick="this.parentElement.remove()"
            style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 16px; border-radius: 4px;">
      Close
    </button>
  `;
  
  document.body.appendChild(info);
  
  setTimeout(() => {
    if (info.parentElement) {
      info.remove();
    }
  }, 10000);
}

// Initialize file analysis
setupVP9FileAnalysis();
```

## Download and Extraction Methods

### 1. VP9/WebM Download
```bash
# Download VP9 content using yt-dlp
yt-dlp -f "bv*[vcodec*=vp9]+ba/b[vcodec*=vp9]/bv*+ba" "https://example.com/video"

# Prefer VP9 over other codecs
yt-dlp -f "best[vcodec*=vp9]" "https://example.com/video"

# Download specific VP9 quality from YouTube
yt-dlp -f "248+140" "https://youtube.com/watch?v=VIDEO_ID"  # 1080p VP9 + AAC

# Extract VP9 stream from WebM container
ffmpeg -i input.webm -c:v copy -an output.vp9
```

### 2. YouTube VP9 Streams
```bash
# List available VP9 formats on YouTube
yt-dlp -F "https://youtube.com/watch?v=VIDEO_ID" | grep vp9

# Download 4K VP9 from YouTube
yt-dlp -f "315+140" "https://youtube.com/watch?v=VIDEO_ID"  # 2160p VP9 + AAC

# Download VP9 with opus audio
yt-dlp -f "248+251" "https://youtube.com/watch?v=VIDEO_ID"  # 1080p VP9 + Opus
```

### 3. Browser-Based VP9 Extraction
```javascript
// Browser VP9 stream extractor
class VP9StreamExtractor {
  constructor() {
    this.extractedStreams = new Map();
    this.setupInterception();
  }
  
  setupInterception() {
    // Monitor for VP9 video sources
    this.monitorVideoElements();
    
    // Track VP9 download opportunities
    this.trackDownloadOpportunities();
  }
  
  monitorVideoElements() {
    // Override video src property
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src').set;
    
    Object.defineProperty(HTMLVideoElement.prototype, 'src', {
      set: function(value) {
        if (vp9Detector.isLikelyVP9URL(value)) {
          console.log('VP9 video source detected:', value);
          
          this.extractedStreams.set(value, {
            url: value,
            element: this,
            timestamp: Date.now(),
            method: 'src-property'
          });
          
          this.analyzeVP9Quality(this, value);
        }
        
        return originalSrcSetter.call(this, value);
      }.bind(this),
      
      get: function() {
        return this.getAttribute('src');
      }
    });
  }
  
  analyzeVP9Quality(videoElement, src) {
    videoElement.addEventListener('loadedmetadata', () => {
      const analysis = {
        resolution: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        duration: videoElement.duration,
        aspectRatio: videoElement.videoWidth / videoElement.videoHeight,
        isHD: videoElement.videoWidth >= 1280,
        is4K: videoElement.videoWidth >= 3840,
        estimatedBitrate: this.estimateVP9Bitrate(videoElement)
      };
      
      console.log('VP9 video analysis:', analysis);
      
      // Update stream info with analysis
      const streamInfo = this.extractedStreams.get(src);
      if (streamInfo) {
        streamInfo.analysis = analysis;
      }
      
      if (analysis.is4K) {
        this.show4KVP9Notification(src, analysis);
      }
    });
  }
  
  estimateVP9Bitrate(videoElement) {
    // VP9 bitrate estimation based on resolution
    const pixels = videoElement.videoWidth * videoElement.videoHeight;
    
    if (pixels >= 3840 * 2160) return '10-20 Mbps (4K VP9)';
    if (pixels >= 1920 * 1080) return '2-5 Mbps (1080p VP9)';
    if (pixels >= 1280 * 720) return '1-2.5 Mbps (720p VP9)';
    return 'Unknown';
  }
  
  show4KVP9Notification(src, analysis) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 10000;
      background: linear-gradient(135deg, #4285f4, #34a853); color: white;
      padding: 20px; border-radius: 12px; max-width: 350px;
      font-family: Arial, sans-serif; box-shadow: 0 8px 32px rgba(66, 133, 244, 0.3);
    `;
    
    notification.innerHTML = `
      <h4 style="margin: 0 0 10px 0;">4K VP9 Content Detected!</h4>
      <p style="margin: 0 0 10px 0;">
        <strong>Resolution:</strong> ${analysis.resolution}<br>
        <strong>Estimated Bitrate:</strong> ${analysis.estimatedBitrate}
      </p>
      <div style="margin-top: 15px;">
        <button onclick="vp9Extractor.downloadVP9Stream('${src}')"
                style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; margin-right: 8px; border-radius: 6px; cursor: pointer;">
          📥 Download
        </button>
        <button onclick="vp9Extractor.showConversionOptions('${src}')"
                style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; margin-right: 8px; border-radius: 6px; cursor: pointer;">
          🔄 Convert
        </button>
        <button onclick="this.parentElement.remove()"
                style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
          ✕ Close
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 20 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 20000);
  }
  
  async downloadVP9Stream(url) {
    try {
      console.log('Downloading VP9 stream:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `vp9_video_${Date.now()}.webm`;
      a.click();
      
      URL.revokeObjectURL(downloadUrl);
      
      console.log('VP9 download completed');
      
    } catch (error) {
      console.error('VP9 download failed:', error);
      alert('Download failed. Stream may be protected or require authentication.');
    }
  }
  
  showConversionOptions(url) {
    console.group('VP9 Conversion Options:');
    console.log('Source URL:', url);
    console.log('');
    
    console.log('Convert VP9 to H.264 (better compatibility):');
    console.log(`ffmpeg -i input.webm -c:v libx264 -preset medium -crf 23 -c:a aac output.mp4`);
    
    console.log('');
    console.log('Convert VP9 to H.265 (smaller file size):');
    console.log(`ffmpeg -i input.webm -c:v libx265 -preset medium -crf 28 -c:a aac output.mp4`);
    
    console.log('');
    console.log('Extract VP9 stream only:');
    console.log(`ffmpeg -i input.webm -c:v copy -an output.vp9`);
    
    console.log('');
    console.log('Remux to MP4 container (if codecs are compatible):');
    console.log(`ffmpeg -i input.webm -c copy output.mp4`);
    
    console.groupEnd();
  }
  
  trackDownloadOpportunities() {
    // Look for YouTube-style format selection
    const formatButtons = document.querySelectorAll('[data-itag*="vp9"], [data-format*="vp9"]');
    
    formatButtons.forEach(button => {
      console.log('VP9 format button detected:', button);
      
      button.addEventListener('click', () => {
        console.log('VP9 format selected by user');
      });
    });
  }
  
  generateDownloadCommands() {
    console.group('VP9 Download Commands:');
    
    this.extractedStreams.forEach((stream, url) => {
      console.group(`Stream: ${url.substring(0, 80)}...`);
      
      console.log('Direct download:');
      console.log(`wget "${url}"`);
      
      console.log('yt-dlp (if from supported site):');
      console.log(`yt-dlp -f "best[vcodec*=vp9]" "${url}"`);
      
      if (stream.analysis) {
        const { resolution, is4K } = stream.analysis;
        
        if (is4K) {
          console.log('4K VP9 to 1080p H.264 conversion:');
          console.log(`ffmpeg -i input.webm -vf scale=1920:1080 -c:v libx264 -preset medium -crf 23 1080p.mp4`);
        }
      }
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
}

// Initialize VP9 extractor
const vp9Extractor = new VP9StreamExtractor();
```

## Encoding and Optimization

### 1. VP9 Encoding with FFmpeg
```bash
# Basic VP9 encoding
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 output.webm

# High-quality VP9 encoding (2-pass)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 2M -pass 1 -f null /dev/null
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 2M -pass 2 output.webm

# 4K VP9 encoding with optimization
ffmpeg -i input_4k.mp4 -c:v libvpx-vp9 -crf 24 -b:v 0 \
       -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
       -lag-in-frames 25 -g 250 4k_output.webm

# VP9 Profile 2 (10-bit)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -profile:v 2 -pix_fmt yuv420p10le \
       -crf 28 -b:v 0 output_10bit.webm
```

### 2. Hardware-Accelerated VP9
```bash
# Intel QSV VP9 encoding (limited support)
ffmpeg -i input.mp4 -c:v vp9_qsv -preset slow -b:v 2M output.webm

# Check for VP9 hardware support
ffmpeg -hide_banner -encoders | grep vp9
```

### 3. VP9 Quality Optimization
```bash
# Web streaming optimized VP9
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 \
       -tile-columns 2 -frame-parallel 1 \
       -speed 1 -auto-alt-ref 1 streaming.webm

# Ultra-high quality VP9 (slow encoding)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 15 -b:v 0 \
       -speed 0 -auto-alt-ref 6 -lag-in-frames 25 ultra_quality.webm

# Fast VP9 encoding
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 33 -b:v 0 \
       -speed 4 -tile-columns 2 fast.webm
```

## Platform Integration

### 1. YouTube VP9 Support
```javascript
// YouTube VP9 format detection
function detectYouTubeVP9() {
  if (!location.hostname.includes('youtube.com')) return;
  
  // Check if VP9 formats are available
  const formatSelectors = document.querySelectorAll('[data-itag]');
  const vp9Formats = [];
  
  formatSelectors.forEach(element => {
    const itag = element.dataset.itag;
    
    // YouTube VP9 itags
    const vp9Itags = ['248', '271', '313', '315', '272', '308', '303', '315'];
    
    if (vp9Itags.includes(itag)) {
      vp9Formats.push({
        itag,
        element,
        quality: getYouTubeQualityFromItag(itag)
      });
    }
  });
  
  if (vp9Formats.length > 0) {
    console.log('YouTube VP9 formats available:', vp9Formats);
  }
}

function getYouTubeQualityFromItag(itag) {
  const qualityMap = {
    '248': '1080p VP9',
    '271': '1440p VP9', 
    '313': '2160p VP9',
    '315': '2160p60 VP9',
    '272': '4320p VP9',
    '308': '1440p60 VP9',
    '303': '1080p60 VP9 HDR',
    '335': '1080p60 VP9'
  };
  
  return qualityMap[itag] || 'Unknown VP9';
}

// Monitor YouTube for VP9 usage
if (location.hostname.includes('youtube.com')) {
  detectYouTubeVP9();
  
  // Re-check when navigating to new videos
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(detectYouTubeVP9, 2000);
    }
  });
  
  observer.observe(document, { subtree: true, childList: true });
}
```

### 2. WebRTC VP9 Configuration
```javascript
// Optimize WebRTC for VP9
function configureWebRTCForVP9(peerConnection) {
  // Prefer VP9 codec
  const transceivers = peerConnection.getTransceivers();
  
  transceivers.forEach(transceiver => {
    if (transceiver.receiver && transceiver.receiver.track.kind === 'video') {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      
      // Find VP9 codec
      const vp9Codec = capabilities.codecs.find(codec => 
        codec.mimeType.toLowerCase() === 'video/vp9'
      );
      
      if (vp9Codec) {
        console.log('VP9 codec available for WebRTC:', vp9Codec);
        
        // Set codec preferences (if supported)
        if (transceiver.setCodecPreferences) {
          transceiver.setCodecPreferences([vp9Codec, ...capabilities.codecs]);
        }
      }
    }
  });
}
```

## Quality Analysis and Metrics

### 1. VP9 Stream Analysis
```bash
# Analyze VP9 stream properties
ffprobe -v quiet -select_streams v:0 \
        -show_entries stream=codec_name,profile,level,width,height,bit_rate,r_frame_rate \
        -of json input.webm

# Check VP9 encoding parameters
ffprobe -v quiet -show_entries stream_tags=encoder -of csv="p=0" input.webm

# GOP structure analysis
ffprobe -v quiet -show_frames -select_streams v:0 \
        -show_entries frame=pict_type,coded_picture_number -of csv input.webm
```

### 2. Quality Comparison
```bash
# Compare VP9 vs H.264 quality (VMAF)
ffmpeg -i vp9_video.webm -i h264_video.mp4 -lavfi libvmaf -f null -

# SSIM comparison
ffmpeg -i original.mp4 -i vp9_encoded.webm -lavfi ssim -f null -

# File size comparison
ls -lh *.{webm,mp4} | awk '{print $5, $9}'
```

## Common Issues and Solutions

### 1. Browser Compatibility
```javascript
// Handle VP9 browser compatibility
function handleVP9Compatibility() {
  const support = checkVP9Support();
  
  if (!support.vp9) {
    console.warn('VP9 not supported in this browser');
    return 'unsupported';
  }
  
  if (!support.profile2) {
    console.warn('VP9 Profile 2 (10-bit/HDR) not supported');
    return 'limited';
  }
  
  return 'full';
}

// Provide VP9 fallbacks
function setupVP9WithFallback(videoElement, vp9Src, h264Fallback) {
  const support = handleVP9Compatibility();
  
  if (support === 'unsupported' && h264Fallback) {
    console.log('Using H.264 fallback due to VP9 incompatibility');
    videoElement.src = h264Fallback;
    return;
  }
  
  // Try VP9 first
  videoElement.src = vp9Src;
  
  videoElement.addEventListener('error', () => {
    if (h264Fallback) {
      console.log('VP9 playback failed, switching to H.264');
      videoElement.src = h264Fallback;
    }
  });
}
```

### 2. Performance Issues
```bash
# Optimize VP9 for lower-end devices
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 35 -b:v 0 \
       -speed 6 -tile-columns 1 \
       -frame-parallel 0 low_end.webm

# Multi-threaded VP9 encoding
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 \
       -threads 8 -tile-columns 4 \
       -row-mt 1 multithread.webm
```

## See Also

- [H.264 Video Codec](./h264.md)
- [H.265 Video Codec](./h265.md)
- [AV1 Video Codec](./av1.md)
- [WebM Container Format](../containers/webm.md)
- [YouTube Platform](../platforms/youtube.md)
