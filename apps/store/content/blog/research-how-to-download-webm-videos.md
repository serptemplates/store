---
slug: how-to-download-webm-videos
---

# How to Download WebM Videos

**File Extensions**: `.webm`  
**MIME Types**: `video/webm`, `audio/webm`  
**Container**: Matroska-based multimedia container  
**Codecs**: VP8, VP9, AV1 (video), Vorbis, Opus (audio)  

## Overview

WebM is an open, royalty-free media file format designed for the web. It's based on the Matroska container and primarily uses VP8, VP9, or AV1 video codecs with Vorbis or Opus audio codecs. WebM is widely supported in modern browsers and is the preferred format for many web streaming platforms.

## Detection Methods

### 1. File Extension and MIME Type
```javascript
// Check WebM file extension
function isWebM(filename) {
  return /\.webm$/i.test(filename);
}

// Check WebM MIME type
function isWebMMimeType(mimeType) {
  return /^(video|audio)\/webm$/i.test(mimeType);
}

// Browser support check
function supportsWebM() {
  const video = document.createElement('video');
  return !!(video.canPlayType && video.canPlayType('video/webm').replace(/no/, ''));
}
```

### 2. Network Traffic Monitoring
```javascript
// Monitor for WebM requests
const webmDetector = {
  detectedFiles: new Set(),
  
  init() {
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && isWebM(url)) {
        webmDetector.detectedFiles.add(url);
        console.log('WebM detected via fetch:', url);
      }
      
      return originalFetch.apply(this, args).then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && isWebMMimeType(contentType)) {
          webmDetector.detectedFiles.add(url);
          console.log('WebM detected via content-type:', url);
        }
        return response;
      });
    };
    
    // Monitor video elements
    this.observeVideoElements();
  },
  
  observeVideoElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.scanElement(node);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Scan existing elements
    this.scanElement(document.body);
  },
  
  scanElement(element) {
    // Check video elements
    const videos = element.querySelectorAll ? 
      element.querySelectorAll('video') : 
      (element.tagName === 'VIDEO' ? [element] : []);
    
    videos.forEach(video => {
      if (video.src && isWebM(video.src)) {
        this.detectedFiles.add(video.src);
        console.log('WebM video element detected:', video.src);
      }
      
      // Check source children
      video.querySelectorAll('source').forEach(source => {
        if (source.src && isWebM(source.src)) {
          this.detectedFiles.add(source.src);
          console.log('WebM source element detected:', source.src);
        }
      });
    });
  }
};

// Initialize detector
webmDetector.init();
```

### 3. Binary File Header Detection
```javascript
// Detect WebM by file signature
function detectWebMHeader(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // WebM uses EBML (Extensible Binary Meta Language)
  // Check for EBML header: 0x1A45DFA3
  const ebmlHeader = view.getUint32(0, false);
  
  if (ebmlHeader === 0x1A45DFA3) {
    // Look for WebM doctype
    const bytes = new Uint8Array(arrayBuffer.slice(0, 100));
    const str = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    
    return str.includes('webm');
  }
  
  return false;
}

// Check if URL serves WebM content
async function isWebMContent(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'Range': 'bytes=0-99' }
    });
    
    // Check content-type header
    const contentType = response.headers.get('content-type');
    if (contentType && isWebMMimeType(contentType)) {
      return true;
    }
    
    // Check binary header if partial content supported
    if (response.status === 206) {
      const buffer = await response.arrayBuffer();
      return detectWebMHeader(buffer);
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to check WebM content:', error);
    return false;
  }
}
```

## Download Methods

### 1. Direct HTTP Download
```bash
# Simple wget download
wget "https://example.com/video.webm"

# With custom headers
wget --header="Referer: https://example.com/" \
     --header="User-Agent: Mozilla/5.0..." \
     "https://example.com/video.webm"

# Resume partial download
wget -c "https://example.com/video.webm"
```

### 2. curl Download with Progress
```bash
# Basic download with progress
curl --progress-bar -o video.webm "https://example.com/video.webm"

# With headers for protected content
curl -H "Referer: https://example.com/" \
     -H "Origin: https://example.com/" \
     -o video.webm \
     "https://example.com/video.webm"

# Resume interrupted download
curl -C - -o video.webm "https://example.com/video.webm"
```

### 3. yt-dlp for Web Extraction
```bash
# Extract and download WebM from web pages
yt-dlp -f "webm" "https://example.com/page-with-video"

# Prefer WebM format
yt-dlp -f "best[ext=webm]" "https://example.com/page-with-video"

# Download all WebM qualities
yt-dlp -f "webm/best" "https://example.com/page-with-video"

# Force WebM output format
yt-dlp --merge-output-format webm "https://example.com/page-with-video"
```

### 4. Browser-Based Download
```javascript
// Download WebM from browser with progress
async function downloadWebM(url, filename, onProgress) {
  try {
    const response = await fetch(url);
    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedBytes += value.length;
      
      if (onProgress && totalBytes > 0) {
        const progress = (receivedBytes / totalBytes) * 100;
        onProgress(progress, receivedBytes, totalBytes);
      }
    }
    
    // Create blob and download
    const blob = new Blob(chunks, { type: 'video/webm' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.click();
    
    // Cleanup
    URL.revokeObjectURL(downloadUrl);
    
    return blob;
  } catch (error) {
    console.error('WebM download failed:', error);
    throw error;
  }
}

// Usage with progress callback
downloadWebM('https://example.com/video.webm', 'downloaded.webm', 
  (progress, received, total) => {
    console.log(`Download progress: ${progress.toFixed(1)}% (${received}/${total} bytes)`);
  }
);
```

### 5. Node.js Stream Download
```javascript
const fs = require('fs');
const https = require('https');
const path = require('path');

function downloadWebMStream(url, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    const requestOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    };
    
    const request = https.get(url, requestOptions, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        
        if (options.onProgress && totalBytes > 0) {
          const progress = (downloadedBytes / totalBytes) * 100;
          options.onProgress(progress, downloadedBytes, totalBytes);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`WebM download completed: ${outputPath}`);
        resolve({ 
          success: true, 
          file: outputPath,
          size: downloadedBytes 
        });
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete partial file
        reject(err);
      });
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error('Download timeout'));
    });
  });
}

// Usage
downloadWebMStream('https://example.com/video.webm', './downloads/video.webm', {
  onProgress: (progress, downloaded, total) => {
    process.stdout.write(`\rDownload progress: ${progress.toFixed(1)}% (${downloaded}/${total} bytes)`);
  }
});
```

## Format Analysis and Conversion

### 1. WebM Metadata Extraction
```javascript
// Extract WebM metadata using File API
async function extractWebMMetadata(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  
  const metadata = {
    format: 'WebM',
    size: buffer.byteLength,
    elements: []
  };
  
  let offset = 0;
  
  // Parse EBML elements
  while (offset < Math.min(buffer.byteLength, 1024)) { // Parse first 1KB
    try {
      const element = parseEBMLElement(view, offset);
      if (!element) break;
      
      metadata.elements.push(element);
      offset += element.totalSize;
    } catch (e) {
      break;
    }
  }
  
  return metadata;
}

function parseEBMLElement(view, offset) {
  if (offset >= view.byteLength - 4) return null;
  
  const id = view.getUint32(offset, false);
  let size = 0;
  let sizeLength = 1;
  
  // Parse EBML variable-length size
  const firstByte = view.getUint8(offset + 4);
  if (firstByte & 0x80) {
    size = firstByte & 0x7F;
  } else if (firstByte & 0x40) {
    size = ((firstByte & 0x3F) << 8) | view.getUint8(offset + 5);
    sizeLength = 2;
  }
  // ... more size parsing logic
  
  return {
    id: id.toString(16),
    size,
    totalSize: 4 + sizeLength + size
  };
}
```

### 2. Using ffprobe for Detailed Analysis
```bash
# Extract comprehensive WebM metadata
ffprobe -v quiet -print_format json -show_format -show_streams video.webm

# Get video codec information
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of csv="p=0" video.webm

# Get audio codec information  
ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv="p=0" video.webm

# Check for VP9 codec
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -of csv="p=0" video.webm | grep vp9
```

### 3. WebM to MP4 Conversion
```bash
# Convert WebM to MP4 (re-encode)
ffmpeg -i input.webm -c:v libx264 -c:a aac output.mp4

# Fast conversion (copy streams if compatible)
ffmpeg -i input.webm -c:v copy -c:a aac -strict experimental output.mp4

# High quality conversion
ffmpeg -i input.webm \
       -c:v libx264 -preset slow -crf 18 \
       -c:a aac -b:a 128k \
       output.mp4

# Batch conversion
for file in *.webm; do
  ffmpeg -i "$file" -c:v libx264 -c:a aac "${file%.webm}.mp4"
done
```

## Platform-Specific WebM Usage

### 1. YouTube WebM Streams
```javascript
// YouTube uses WebM for many video qualities
const youtubeWebMFormats = {
  // VP9 video with Opus audio
  '298': { codec: 'vp9+opus', quality: '720p60', container: 'webm' },
  '299': { codec: 'vp9+opus', quality: '1080p60', container: 'webm' },
  
  // VP8 video with Vorbis audio
  '43': { codec: 'vp8+vorbis', quality: '360p', container: 'webm' },
  '44': { codec: 'vp8+vorbis', quality: '480p', container: 'webm' }
};

// Download YouTube WebM
// yt-dlp -f "299" "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 2. Discord WebM Processing
```javascript
// Discord converts many uploads to WebM
function detectDiscordWebM() {
  const discordAttachments = [];
  
  document.querySelectorAll('a[href*="cdn.discordapp.com"], a[href*="media.discordapp.net"]').forEach(link => {
    if (link.href.includes('.webm')) {
      discordAttachments.push({
        url: link.href,
        filename: link.href.split('/').pop(),
        type: 'discord_attachment'
      });
    }
  });
  
  return discordAttachments;
}
```

### 3. Browser Screen Recording WebM
```javascript
// Detect WebM from browser screen recording
function setupScreenRecordingDetection() {
  const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
  
  navigator.mediaDevices.getDisplayMedia = function(constraints) {
    return originalGetDisplayMedia.call(this, constraints).then(stream => {
      console.log('Screen recording started, likely producing WebM');
      
      // Monitor MediaRecorder usage
      const originalMediaRecorder = window.MediaRecorder;
      window.MediaRecorder = function(stream, options) {
        const recorder = new originalMediaRecorder(stream, options);
        
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data && event.data.type === 'video/webm') {
            console.log('WebM blob created from screen recording:', event.data);
          }
        });
        
        return recorder;
      };
      
      return stream;
    });
  };
}
```

## Advanced WebM Techniques

### 1. Chunked WebM Download
```javascript
// Download large WebM files in chunks
async function downloadWebMChunks(url, chunkSize = 1024 * 1024) { // 1MB chunks
  const response = await fetch(url, { method: 'HEAD' });
  const totalSize = parseInt(response.headers.get('content-length'));
  
  if (!totalSize) {
    throw new Error('Content-Length header missing');
  }
  
  const chunks = [];
  let downloaded = 0;
  
  while (downloaded < totalSize) {
    const start = downloaded;
    const end = Math.min(downloaded + chunkSize - 1, totalSize - 1);
    
    const chunkResponse = await fetch(url, {
      headers: { 'Range': `bytes=${start}-${end}` }
    });
    
    if (chunkResponse.status !== 206) {
      throw new Error('Server does not support range requests');
    }
    
    const chunk = await chunkResponse.arrayBuffer();
    chunks.push(chunk);
    downloaded = end + 1;
    
    console.log(`Downloaded chunk: ${downloaded}/${totalSize} bytes`);
  }
  
  // Combine chunks
  const totalBuffer = new Uint8Array(totalSize);
  let offset = 0;
  
  chunks.forEach(chunk => {
    totalBuffer.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  });
  
  return new Blob([totalBuffer], { type: 'video/webm' });
}
```

### 2. WebM Stream Segmentation
```javascript
// Extract segments from WebM streams
function extractWebMSegments(webmBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const buffer = e.target.result;
      const segments = parseWebMClusters(buffer);
      resolve(segments);
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(webmBlob);
  });
}

function parseWebMClusters(buffer) {
  const view = new DataView(buffer);
  const segments = [];
  
  // This is a simplified parser - real WebM parsing is much more complex
  let offset = 0;
  
  while (offset < buffer.byteLength - 8) {
    // Look for Cluster elements (0x1F43B675)
    const id = view.getUint32(offset, false);
    
    if (id === 0x1F43B675) {
      const size = parseVarInt(view, offset + 4);
      segments.push({
        offset,
        size: size.value,
        type: 'cluster'
      });
      offset += 4 + size.length + size.value;
    } else {
      offset++;
    }
  }
  
  return segments;
}
```

### 3. Real-time WebM Stream Capture
```javascript
// Capture WebM streams in real-time
class WebMStreamCapture {
  constructor() {
    this.capturedStreams = new Map();
    this.setupInterception();
  }
  
  setupInterception() {
    // Intercept MediaRecorder API
    const originalMediaRecorder = window.MediaRecorder;
    
    window.MediaRecorder = function(stream, options) {
      const recorder = new originalMediaRecorder(stream, options);
      const streamId = Date.now().toString();
      
      const captureData = {
        id: streamId,
        chunks: [],
        startTime: Date.now(),
        options
      };
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          captureData.chunks.push(event.data);
          console.log(`WebM chunk captured: ${event.data.size} bytes`);
        }
      });
      
      recorder.addEventListener('stop', () => {
        const finalBlob = new Blob(captureData.chunks, { type: 'video/webm' });
        captureData.finalBlob = finalBlob;
        console.log(`WebM recording completed: ${finalBlob.size} bytes`);
      });
      
      this.capturedStreams.set(streamId, captureData);
      return recorder;
    }.bind(this);
  }
  
  downloadAllCapturedStreams() {
    this.capturedStreams.forEach((capture, id) => {
      if (capture.finalBlob) {
        const url = URL.createObjectURL(capture.finalBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captured_${id}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
}

// Initialize capture system
const webmCapture = new WebMStreamCapture();
```

## Common Issues and Solutions

### 1. Browser Compatibility
```javascript
// Check WebM codec support
function checkWebMSupport() {
  const video = document.createElement('video');
  
  const support = {
    webm: !!video.canPlayType('video/webm').replace(/no/, ''),
    vp8: !!video.canPlayType('video/webm; codecs="vp8"').replace(/no/, ''),
    vp9: !!video.canPlayType('video/webm; codecs="vp9"').replace(/no/, ''),
    opus: !!video.canPlayType('audio/webm; codecs="opus"').replace(/no/, ''),
    vorbis: !!video.canPlayType('audio/webm; codecs="vorbis"').replace(/no/, '')
  };
  
  return support;
}

// Provide fallback for unsupported browsers
function provideWebMFallback(videoElement) {
  const support = checkWebMSupport();
  
  if (!support.webm) {
    // Replace WebM source with MP4 alternative
    const sources = videoElement.querySelectorAll('source[type="video/webm"]');
    sources.forEach(source => {
      const mp4Src = source.src.replace('.webm', '.mp4');
      source.src = mp4Src;
      source.type = 'video/mp4';
    });
  }
}
```

### 2. Large File Handling
```javascript
// Stream large WebM files efficiently
async function streamLargeWebM(url, onChunk) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Process chunk immediately instead of storing
      if (onChunk) {
        await onChunk(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage: process WebM data in chunks
streamLargeWebM('https://example.com/large-video.webm', async (chunk) => {
  // Process chunk (e.g., save to IndexedDB, analyze, etc.)
  console.log('Processing chunk:', chunk.length, 'bytes');
});
```

### 3. Quality Detection
```bash
# Analyze WebM quality and bitrate
ffprobe -v quiet -select_streams v:0 \
        -show_entries stream=width,height,bit_rate,codec_name \
        -of json video.webm

# Compare WebM vs MP4 quality
ffprobe -v quiet -show_entries format=bit_rate,duration,size \
        -of json video.webm
```

## See Also

- [VP9 Video Codec](../codecs/vp9.md)
- [Opus Audio Codec](../codecs/opus.md)
- [MP4 Container Format](./mp4.md)
- [YouTube Platform](../platforms/youtube.md)