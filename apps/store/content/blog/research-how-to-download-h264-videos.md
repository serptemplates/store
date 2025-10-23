---
slug: how-to-download-h264-videos
---

# How to Download H.264 Encoded Videos

**Standard**: ITU-T H.264 / ISO/IEC MPEG-4 Part 10  
**Also Known As**: AVC (Advanced Video Coding), MPEG-4 AVC  
**File Extensions**: `.h264`, `.264`, `.avc`  
**Containers**: MP4, MKV, MOV, TS, WebM (rare), AVI  
**MIME Types**: `video/h264`, `video/avc`  

## Overview

H.264/AVC is one of the most widely used video compression standards. It provides excellent compression efficiency and quality, making it the de facto standard for web streaming, Blu-ray, digital TV, and mobile video applications.

## H.264 Profiles and Levels

### Common Profiles
```javascript
// H.264 profile identification
const h264Profiles = {
  'avc1.42001E': {
    profile: 'Baseline',
    level: '3.0',
    description: 'Mobile/Web streaming, basic features'
  },
  'avc1.42001F': {
    profile: 'Baseline',
    level: '3.1', 
    description: 'Mobile HD, web streaming'
  },
  'avc1.4D401E': {
    profile: 'Main',
    level: '3.0',
    description: 'Standard definition TV'
  },
  'avc1.4D401F': {
    profile: 'Main', 
    level: '3.1',
    description: 'HD TV, streaming'
  },
  'avc1.640028': {
    profile: 'High',
    level: '4.0',
    description: 'HD video, Blu-ray'
  },
  'avc1.640032': {
    profile: 'High',
    level: '5.0',
    description: '4K video, high bitrate'
  }
};

function parseH264Codec(codecString) {
  const profile = h264Profiles[codecString];
  if (profile) {
    return profile;
  }
  
  // Manual parsing if not in lookup table
  if (codecString.startsWith('avc1.')) {
    const hex = codecString.substring(5);
    const profileIdc = parseInt(hex.substring(0, 2), 16);
    const constraintSet = parseInt(hex.substring(2, 4), 16);
    const levelIdc = parseInt(hex.substring(4, 6), 16);
    
    return {
      profileIdc,
      constraintSet,
      levelIdc,
      description: `Profile ${profileIdc}, Level ${levelIdc / 10}`
    };
  }
  
  return null;
}
```

### Profile Capabilities
```javascript
// Check H.264 profile support in browser
function checkH264ProfileSupport() {
  const video = document.createElement('video');
  
  const profiles = {
    baseline: video.canPlayType('video/mp4; codecs="avc1.42001E"'),
    main: video.canPlayType('video/mp4; codecs="avc1.4D401F"'),
    high: video.canPlayType('video/mp4; codecs="avc1.640028"'),
    high10: video.canPlayType('video/mp4; codecs="avc1.6E0032"'),
    high422: video.canPlayType('video/mp4; codecs="avc1.7A0033"')
  };
  
  // Convert results to boolean
  Object.keys(profiles).forEach(key => {
    profiles[key] = profiles[key] !== '' && profiles[key] !== 'no';
  });
  
  return profiles;
}
```

## Detection Methods

### 1. Container Analysis
```javascript
// Detect H.264 in various containers
function detectH264InContainers() {
  const h264Sources = [];
  
  // Check video elements
  document.querySelectorAll('video').forEach(video => {
    const src = video.src || video.currentSrc;
    
    if (src) {
      // Check if source likely contains H.264
      if (isH264Container(src)) {
        h264Sources.push({
          element: video,
          src,
          type: 'video-element'
        });
      }
    }
    
    // Check source children
    video.querySelectorAll('source').forEach(source => {
      if (isH264Container(source.src) || isH264Codec(source.type)) {
        h264Sources.push({
          element: video,
          src: source.src,
          type: source.type,
          sourceType: 'source-element'
        });
      }
    });
  });
  
  return h264Sources;
}

function isH264Container(url) {
  // Containers that commonly contain H.264
  return /\.(mp4|m4v|mov|ts|mkv)(\?|$)/i.test(url);
}

function isH264Codec(mimeType) {
  if (!mimeType) return false;
  
  // Check for H.264 codec indicators
  return /avc1\.|h264|x264/i.test(mimeType);
}
```

### 2. Stream Analysis
```javascript
// Analyze video stream for H.264 characteristics
async function analyzeH264Stream(videoUrl) {
  try {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'metadata';
    
    return new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => {
        const analysis = {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          
          // Try to determine if it's H.264
          likelyH264: isH264Container(videoUrl),
          
          // Additional analysis would need Media Source Extensions
          // or server-side processing to get exact codec info
        };
        
        resolve(analysis);
      });
      
      video.addEventListener('error', reject);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Analysis timeout')), 10000);
    });
  } catch (error) {
    console.error('Failed to analyze H.264 stream:', error);
    throw error;
  }
}
```

### 3. Network Traffic Monitoring
```javascript
// Monitor for H.264 content in network requests
class H264NetworkMonitor {
  constructor() {
    this.detectedStreams = new Set();
    this.setupInterception();
  }
  
  setupInterception() {
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && isH264Container(url)) {
        console.log('Potential H.264 content detected:', url);
      }
      
      return originalFetch.apply(this, args).then(response => {
        this.analyzeResponse(url, response);
        return response;
      }.bind(this));
    }.bind(this);
    
    // Monitor Media Source Extensions usage
    this.monitorMSE();
  }
  
  analyzeResponse(url, response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && isH264Codec(contentType)) {
      this.detectedStreams.add({
        url,
        contentType,
        timestamp: new Date().toISOString()
      });
      console.log('H.264 content confirmed:', url, contentType);
    }
  }
  
  monitorMSE() {
    if (!window.MediaSource) return;
    
    const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    
    MediaSource.prototype.addSourceBuffer = function(mimeType) {
      if (isH264Codec(mimeType)) {
        console.log('H.264 MediaSource buffer created:', mimeType);
      }
      
      return originalAddSourceBuffer.call(this, mimeType);
    };
  }
}

// Initialize monitoring
const h264Monitor = new H264NetworkMonitor();
```

## Download and Extraction Methods

### 1. Direct Stream Download
```bash
# Download H.264 stream using ffmpeg
ffmpeg -i "https://example.com/video.mp4" -c copy -bsf:v h264_mp4toannexb output.h264

# Extract H.264 elementary stream from container
ffmpeg -i input.mp4 -vn -c:v copy -bsf:v h264_mp4toannexb video.h264

# Download and convert to Annex B format
ffmpeg -i "rtmp://stream.example.com/live" -c:v copy -bsf:v h264_mp4toannexb stream.h264
```

### 2. yt-dlp with H.264 Preference
```bash
# Prefer H.264 codec
yt-dlp -f "best[vcodec^=avc1]/best[vcodec=h264]/best" "https://example.com/video"

# Download specific H.264 profile
yt-dlp -f "best[vcodec^=avc1.640028]" "https://example.com/video"  # High profile

# Force H.264 output
yt-dlp --recode-video mp4 --postprocessor-args "-c:v libx264" "https://example.com/video"
```

### 3. Browser-Based H.264 Detection and Download
```javascript
// H.264 stream extractor for browser use
class H264StreamExtractor {
  constructor() {
    this.extractedStreams = new Map();
    this.setupMediaInterception();
  }
  
  setupMediaInterception() {
    // Intercept video element creation
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
    // Monitor source changes
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src').set;
    
    Object.defineProperty(video, 'src', {
      set: function(value) {
        if (isH264Container(value)) {
          console.log('H.264 video source set:', value);
          this.extractedStreams.set(value, {
            url: value,
            element: video,
            timestamp: Date.now(),
            method: 'src-property'
          });
        }
        return originalSrcSetter.call(this, value);
      }.bind(this),
      get: function() {
        return this.getAttribute('src');
      }
    });
    
    // Monitor loadstart event for additional info
    video.addEventListener('loadstart', () => {
      const src = video.src || video.currentSrc;
      if (src && isH264Container(src)) {
        this.analyzeVideoMetadata(video, src);
      }
    });
  }
  
  async analyzeVideoMetadata(video, src) {
    video.addEventListener('loadedmetadata', () => {
      const streamInfo = this.extractedStreams.get(src);
      if (streamInfo) {
        streamInfo.metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight
        };
        
        console.log('H.264 stream metadata:', streamInfo);
      }
    });
  }
  
  generateDownloadCommands() {
    console.group('H.264 Download Commands:');
    
    this.extractedStreams.forEach((stream, url) => {
      console.group(`Stream: ${url}`);
      
      // FFmpeg commands
      console.log('Extract H.264 elementary stream:');
      console.log(`ffmpeg -i "${url}" -vn -c:v copy -bsf:v h264_mp4toannexb output.h264`);
      
      console.log('Download and remux:');
      console.log(`ffmpeg -i "${url}" -c copy output.mp4`);
      
      if (stream.metadata) {
        console.log('Re-encode with specific settings:');
        console.log(`ffmpeg -i "${url}" -c:v libx264 -preset medium -crf 23 -s ${stream.metadata.width}x${stream.metadata.height} output.mp4`);
      }
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
  
  downloadExtractedStreams() {
    this.extractedStreams.forEach(async (stream, url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `h264_stream_${Date.now()}.mp4`;
        a.click();
        
        URL.revokeObjectURL(a.href);
      } catch (error) {
        console.error('Failed to download stream:', url, error);
      }
    });
  }
}

// Initialize extractor
const h264Extractor = new H264StreamExtractor();

// Usage: call this after page loads to see detected streams
// h264Extractor.generateDownloadCommands();
```

## Encoding and Conversion

### 1. H.264 Encoding Parameters
```bash
# Basic H.264 encoding
ffmpeg -i input.raw -c:v libx264 -preset medium -crf 23 output.mp4

# High-quality encoding
ffmpeg -i input.raw -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 output.mp4

# Streaming-optimized encoding
ffmpeg -i input.raw -c:v libx264 -preset veryfast -crf 23 -profile:v baseline -level 3.1 \
       -maxrate 2M -bufsize 4M -movflags +faststart output.mp4

# Mobile-optimized encoding
ffmpeg -i input.raw -c:v libx264 -preset fast -crf 26 -profile:v baseline -level 3.0 \
       -vf scale=720:404 -movflags +faststart mobile.mp4
```

### 2. Profile-Specific Encoding
```bash
# Baseline profile (maximum compatibility)
ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -level 3.1 -x264-params ref=1:bframes=0 baseline.mp4

# Main profile (better compression)
ffmpeg -i input.mp4 -c:v libx264 -profile:v main -level 4.0 main.mp4

# High profile (best compression)
ffmpeg -i input.mp4 -c:v libx264 -profile:v high -level 4.1 high.mp4

# Hardware-accelerated encoding (NVENC)
ffmpeg -i input.mp4 -c:v h264_nvenc -preset slow -crf 23 nvenc.mp4

# Intel Quick Sync encoding
ffmpeg -i input.mp4 -c:v h264_qsv -preset slow -global_quality 23 qsv.mp4
```

### 3. Advanced H.264 Options
```bash
# Two-pass encoding for precise bitrate control
ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 1 -f null /dev/null
ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 2 output.mp4

# Constrained encoding for streaming
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 \
       -maxrate 1M -bufsize 2M -g 50 -keyint_min 25 stream.mp4

# Lossless H.264 encoding
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 0 lossless.mp4

# Custom x264 parameters
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 \
       -x264-params "ref=4:bframes=3:subme=7:trellis=1" custom.mp4
```

## Quality Analysis and Optimization

### 1. H.264 Stream Analysis
```bash
# Analyze H.264 stream properties
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,profile,level,width,height,bit_rate,r_frame_rate -of json input.mp4

# Get detailed H.264 information
ffprobe -v quiet -select_streams v:0 -show_entries stream_tags=encoder -of csv="p=0" input.mp4

# Analyze GOP structure
ffprobe -v quiet -show_frames -select_streams v:0 -show_entries frame=pict_type,coded_picture_number -of csv input.mp4

# Check for B-frames
ffprobe -v quiet -show_frames -select_streams v:0 -show_entries frame=pict_type input.mp4 | grep -c "B"
```

### 2. Quality Metrics
```bash
# Calculate PSNR between original and encoded
ffmpeg -i original.mp4 -i encoded.mp4 -lavfi psnr -f null -

# Calculate SSIM
ffmpeg -i original.mp4 -i encoded.mp4 -lavfi ssim -f null -

# Calculate VMAF (requires vmaf model)
ffmpeg -i encoded.mp4 -i original.mp4 -lavfi libvmaf -f null -

# Bitrate analysis
ffprobe -v quiet -select_streams v:0 -show_entries packet=size,dts_time -of csv input.mp4 > bitrate.csv
```

### 3. Optimization Techniques
```javascript
// Browser-side H.264 optimization analysis
function analyzeH264Optimization(videoElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  // Sample frame for analysis
  ctx.drawImage(videoElement, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const analysis = {
    resolution: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
    aspectRatio: videoElement.videoWidth / videoElement.videoHeight,
    
    // Analyze complexity (simplified)
    estimatedComplexity: analyzeFrameComplexity(imageData),
    
    // Recommendations
    recommendations: []
  };
  
  // Generate recommendations
  if (videoElement.videoWidth > 1920) {
    analysis.recommendations.push('Consider downscaling for web delivery');
  }
  
  if (analysis.estimatedComplexity > 0.8) {
    analysis.recommendations.push('High complexity content - use slower preset for better compression');
  }
  
  return analysis;
}

function analyzeFrameComplexity(imageData) {
  const { data, width, height } = imageData;
  let variance = 0;
  let mean = 0;
  
  // Calculate luminance variance as complexity metric
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    mean += luminance;
  }
  
  mean /= (width * height);
  
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    variance += Math.pow(luminance - mean, 2);
  }
  
  variance /= (width * height);
  
  // Normalize to 0-1 scale
  return Math.min(variance / 10000, 1.0);
}
```

## Platform-Specific H.264 Usage

### 1. Web Browser Optimization
```javascript
// Optimize H.264 delivery for different browsers
function getOptimalH264Profile() {
  const userAgent = navigator.userAgent;
  
  // Safari preferences
  if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) {
    return {
      profile: 'high',
      level: '4.0',
      codec: 'avc1.640028',
      container: 'mp4'
    };
  }
  
  // Chrome preferences
  if (/Chrome\//.test(userAgent)) {
    return {
      profile: 'main', 
      level: '4.0',
      codec: 'avc1.4D4028',
      container: 'mp4'
    };
  }
  
  // Mobile browsers
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return {
      profile: 'baseline',
      level: '3.1',
      codec: 'avc1.42001F',
      container: 'mp4'
    };
  }
  
  // Default fallback
  return {
    profile: 'high',
    level: '4.0', 
    codec: 'avc1.640028',
    container: 'mp4'
  };
}

// Generate appropriate video element
function createOptimizedVideoElement(baseUrl) {
  const video = document.createElement('video');
  const optimal = getOptimalH264Profile();
  
  // Create source elements for different profiles
  const profiles = [
    { suffix: '_high.mp4', codec: 'avc1.640028', profile: 'high' },
    { suffix: '_main.mp4', codec: 'avc1.4D4028', profile: 'main' },
    { suffix: '_baseline.mp4', codec: 'avc1.42001F', profile: 'baseline' }
  ];
  
  profiles.forEach(p => {
    const source = document.createElement('source');
    source.src = baseUrl.replace('.mp4', p.suffix);
    source.type = `video/mp4; codecs="${p.codec}"`;
    video.appendChild(source);
  });
  
  return video;
}
```

### 2. Mobile Device Optimization
```bash
# iOS-optimized H.264
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -profile:v high -level 4.0 \
       -pix_fmt yuv420p -movflags +faststart ios.mp4

# Android-optimized H.264
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 25 -profile:v main -level 4.0 \
       -maxrate 2M -bufsize 4M -movflags +faststart android.mp4

# Low-end mobile devices
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 28 -profile:v baseline -level 3.0 \
       -vf scale=640:360 -maxrate 500k -bufsize 1M mobile_low.mp4
```

### 3. Streaming Optimization
```bash
# HLS-ready H.264
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -profile:v high -level 4.0 \
       -g 50 -keyint_min 50 -sc_threshold 0 \
       -hls_time 6 -hls_playlist_type vod output.m3u8

# DASH-ready H.264
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -profile:v high -level 4.0 \
       -g 50 -keyint_min 50 -sc_threshold 0 \
       -f dash output.mpd
```

## See Also

- [H.265 (HEVC) Video Codec](./h265.md)
- [VP9 Video Codec](./vp9.md)
- [MP4 Container Format](../containers/mp4.md)
- [WebM Container Format](../containers/webm.md)
- [AAC Audio Codec](./aac.md)