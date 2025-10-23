---
slug: how-to-download-avi-videos
title: How to Download AVI Video Files
seoTitle: How to Download AVI Video Files
description: 'File Extensions: .avi MIME Types: video/avi, video/x-msvideo Container:
  Microsoft multimedia container Codecs: Various (DivX, XviD, H.264, MP3, AC-3)'
seoDescription: 'File Extensions: .avi MIME Types: video/avi, video/x-msvideo Container:
  Microsoft multimedia container Codecs: Various (DivX, XviD, H.264, MP3, AC-3)'
date: '2025-10-22T18:59:36.627000Z'
author: Devin Schumacher
---

# How to Download AVI Video Files

**File Extensions**: `.avi`  
**MIME Types**: `video/avi`, `video/x-msvideo`  
**Container**: Microsoft multimedia container  
**Codecs**: Various (DivX, XviD, H.264, MP3, AC-3)  

## Overview

AVI (Audio Video Interleave) is a multimedia container format developed by Microsoft as part of its Video for Windows technology. Despite being an older format, AVI remains widely used and supported across many platforms and devices.

## Container Structure

AVI files use the RIFF (Resource Interchange File Format) structure:

```
RIFF ('AVI ' 
  LIST ('hdrl'
    'avih' (AVI Header)
    LIST ('strl'
      'strh' (Stream Header)
      'strf' (Stream Format)
    )
  )
  LIST ('movi'
    '00dc' (Video Chunk)
    '01wb' (Audio Chunk)
  )
  'idx1' (Index Chunk)
)
```

## Detection Methods

### 1. File Extension and MIME Type
```javascript
// Check AVI file extension
function isAVI(filename) {
  return /\.avi$/i.test(filename);
}

// Check AVI MIME type
function isAVIMimeType(mimeType) {
  return /^video\/(avi|x-msvideo)$/i.test(mimeType);
}

// Browser support check (limited)
function supportsAVI() {
  const video = document.createElement('video');
  return !!(video.canPlayType && video.canPlayType('video/avi').replace(/no/, ''));
}
```

### 2. Binary File Header Detection
```javascript
// Detect AVI by file signature
function detectAVIHeader(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // Check RIFF header: "RIFF" + 4 bytes size + "AVI "
  const riffSignature = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  
  if (riffSignature === 'RIFF') {
    const aviSignature = String.fromCharCode(
      view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
    );
    
    return aviSignature === 'AVI ';
  }
  
  return false;
}

// Check if URL serves AVI content
async function isAVIContent(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'Range': 'bytes=0-11' }
    });
    
    // Check content-type header
    const contentType = response.headers.get('content-type');
    if (contentType && isAVIMimeType(contentType)) {
      return true;
    }
    
    // Check binary header if partial content supported
    if (response.status === 206) {
      const buffer = await response.arrayBuffer();
      return detectAVIHeader(buffer);
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to check AVI content:', error);
    return false;
  }
}
```

### 3. Network Traffic Monitoring
```javascript
// Monitor for AVI downloads
const aviDetector = {
  detectedFiles: new Set(),
  
  init() {
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && isAVI(url)) {
        aviDetector.detectedFiles.add(url);
        console.log('AVI detected via fetch:', url);
      }
      
      return originalFetch.apply(this, args).then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && isAVIMimeType(contentType)) {
          aviDetector.detectedFiles.add(url);
          console.log('AVI detected via content-type:', url);
        }
        return response;
      });
    };
    
    // Monitor download links
    this.observeLinks();
  },
  
  observeLinks() {
    document.querySelectorAll('a[href$=".avi" i]').forEach(link => {
      this.detectedFiles.add(link.href);
      console.log('AVI download link detected:', link.href);
    });
    
    // Monitor for dynamically added links
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.tagName === 'A') {
            if (isAVI(node.href)) {
              this.detectedFiles.add(node.href);
              console.log('Dynamic AVI link detected:', node.href);
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
};

// Initialize detector
aviDetector.init();
```

## Download Methods

### 1. Direct HTTP Download
```bash
# Simple wget download
wget "https://example.com/video.avi"

# With custom headers
wget --header="Referer: https://example.com/" \
     --header="User-Agent: Mozilla/5.0..." \
     "https://example.com/video.avi"

# Resume partial download
wget -c "https://example.com/video.avi"
```

### 2. curl Download with Progress
```bash
# Basic download with progress
curl --progress-bar -o video.avi "https://example.com/video.avi"

# With authentication
curl -u username:password \
     -o video.avi \
     "https://example.com/protected/video.avi"

# Resume interrupted download
curl -C - -o video.avi "https://example.com/video.avi"

# Download with rate limiting
curl --limit-rate 1M -o video.avi "https://example.com/video.avi"
```

### 3. Browser-Based Download
```javascript
// Download AVI from browser
async function downloadAVI(url, filename, onProgress) {
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
    const blob = new Blob(chunks, { type: 'video/avi' });
    const downloadUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.click();
    
    // Cleanup
    URL.revokeObjectURL(downloadUrl);
    
    return blob;
  } catch (error) {
    console.error('AVI download failed:', error);
    throw error;
  }
}

// Usage with progress callback
downloadAVI('https://example.com/video.avi', 'downloaded.avi', 
  (progress, received, total) => {
    console.log(`Download progress: ${progress.toFixed(1)}% (${received}/${total} bytes)`);
  }
);
```

### 4. Node.js Download with Retry Logic
```javascript
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

function downloadAVI(url, outputPath, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    onProgress = null
  } = options;
  
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    
    function attemptDownload() {
      const file = fs.createWriteStream(outputPath);
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, { timeout }, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(outputPath, () => {});
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Download failed (${response.statusCode}), retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
            setTimeout(attemptDownload, retryDelay * retryCount);
            return;
          }
          
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          
          if (onProgress && totalBytes > 0) {
            const progress = (downloadedBytes / totalBytes) * 100;
            onProgress(progress, downloadedBytes, totalBytes);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`AVI download completed: ${outputPath}`);
          resolve({ 
            success: true, 
            file: outputPath,
            size: downloadedBytes 
          });
        });
        
        file.on('error', (err) => {
          fs.unlink(outputPath, () => {});
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`File error, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
            setTimeout(attemptDownload, retryDelay * retryCount);
          } else {
            reject(err);
          }
        });
      });
      
      request.on('error', (err) => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Request error, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
          setTimeout(attemptDownload, retryDelay * retryCount);
        } else {
          reject(err);
        }
      });
      
      request.on('timeout', () => {
        request.abort();
      });
    }
    
    attemptDownload();
  });
}

// Usage
downloadAVI('https://example.com/video.avi', './downloads/video.avi', {
  onProgress: (progress, downloaded, total) => {
    process.stdout.write(`\rDownload progress: ${progress.toFixed(1)}% (${downloaded}/${total} bytes)`);
  }
});
```

## Format Analysis and Conversion

### 1. AVI Metadata Extraction
```bash
# Extract AVI metadata using ffprobe
ffprobe -v quiet -print_format json -show_format -show_streams video.avi

# Get video codec information
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of csv="p=0" video.avi

# Get audio codec information
ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of csv="p=0" video.avi

# Get container information
ffprobe -v quiet -show_entries format=format_name,duration,size,bit_rate -of csv="p=0" video.avi
```

### 2. AVI Repair and Fixing
```bash
# Fix corrupted AVI file
ffmpeg -i broken.avi -c copy -avoid_negative_ts make_zero fixed.avi

# Repair index (for seeking issues)
ffmpeg -i video.avi -c copy -f avi -y repaired.avi

# Fix audio sync issues
ffmpeg -i video.avi -itsoffset 0.5 -i video.avi -map 1:v -map 0:a -c copy synced.avi
```

### 3. AVI to Modern Format Conversion
```bash
# Convert AVI to MP4 (H.264 + AAC)
ffmpeg -i input.avi -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k output.mp4

# Convert to WebM (VP9 + Opus)
ffmpeg -i input.avi -c:v libvpx-vp9 -crf 30 -c:a libopus -b:a 128k output.webm

# Batch conversion
for file in *.avi; do
  ffmpeg -i "$file" -c:v libx264 -c:a aac "${file%.avi}.mp4"
done

# Fast copy (no re-encoding if codecs are compatible)
ffmpeg -i input.avi -c copy output.mp4
```

## Common AVI Issues and Solutions

### 1. Codec Compatibility
```javascript
// Check AVI codec support in browser
function checkAVICodecSupport() {
  const video = document.createElement('video');
  
  const codecs = {
    // Video codecs commonly found in AVI
    'h264': video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    'divx': video.canPlayType('video/avi; codecs="DIVX"'),
    'xvid': video.canPlayType('video/avi; codecs="XVID"'),
    'mjpeg': video.canPlayType('video/avi; codecs="MJPG"'),
    
    // Audio codecs
    'mp3': video.canPlayType('audio/mpeg'),
    'ac3': video.canPlayType('audio/ac3'),
    'pcm': video.canPlayType('audio/wav; codecs="1"')
  };
  
  return codecs;
}

// Provide conversion suggestions
function suggestAVIConversion(filename) {
  const support = checkAVICodecSupport();
  
  if (!support.h264) {
    console.warn(`${filename}: Consider converting to MP4 with H.264 for better browser support`);
    return 'mp4';
  }
  
  return 'supported';
}
```

### 2. Large File Handling
```javascript
// Stream large AVI files efficiently
async function streamLargeAVI(url, onChunk) {
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

// Usage: process AVI data in chunks
streamLargeAVI('https://example.com/large-video.avi', async (chunk) => {
  // Save to IndexedDB, analyze, or stream to another location
  console.log('Processing AVI chunk:', chunk.length, 'bytes');
});
```

### 3. Quality Assessment
```bash
# Analyze AVI quality metrics
ffmpeg -i video.avi -vf "ssim=stats_file=ssim.log" -f null -

# Get detailed stream information
mediainfo video.avi

# Check for corruption
ffmpeg -v error -i video.avi -f null - 2>error.log
```

## Platform-Specific AVI Usage

### 1. Windows Media Player Integration
```javascript
// Detect Windows Media Player for AVI playback
function detectWMPSupport() {
  try {
    // Check for Windows Media Player ActiveX
    const wmp = new ActiveXObject('WMPlayer.OCX');
    return {
      available: true,
      version: wmp.versionInfo
    };
  } catch (e) {
    return { available: false };
  }
}
```

### 2. Legacy Flash Player Detection
```javascript
// Detect Flash-based AVI players
function detectFlashAVIPlayer() {
  const flashPlayers = [];
  
  document.querySelectorAll('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"]').forEach(player => {
    const src = player.src || player.data;
    const flashvars = player.getAttribute('flashvars') || '';
    
    if (flashvars.includes('.avi') || src?.includes('avi')) {
      flashPlayers.push({
        element: player,
        src,
        flashvars: parseFlashVars(flashvars)
      });
    }
  });
  
  return flashPlayers;
}

function parseFlashVars(flashvarsString) {
  const vars = {};
  const pairs = flashvarsString.split('&');
  
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      vars[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });
  
  return vars;
}
```

## Advanced AVI Techniques

### 1. Multi-part AVI Handling
```javascript
// Handle multi-part AVI files (e.g., video.avi, video.r00, video.r01)
async function downloadMultipartAVI(baseUrl) {
  const parts = [];
  let partIndex = 0;
  
  // Try to download main file
  const mainFile = await downloadAVI(baseUrl, `part_000.avi`);
  parts.push(mainFile);
  
  // Try to download additional parts
  while (true) {
    try {
      const partUrl = baseUrl.replace('.avi', `.r${partIndex.toString().padStart(2, '0')}`);
      const partResponse = await fetch(partUrl, { method: 'HEAD' });
      
      if (partResponse.ok) {
        const partFile = await downloadAVI(partUrl, `part_${(partIndex + 1).toString().padStart(3, '0')}.avi`);
        parts.push(partFile);
        partIndex++;
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }
  
  console.log(`Downloaded ${parts.length} parts`);
  return parts;
}
```

### 2. AVI Frame Extraction
```bash
# Extract frames from AVI
ffmpeg -i video.avi -r 1 -f image2 frame_%04d.png

# Extract specific frame
ffmpeg -i video.avi -ss 00:01:30 -vframes 1 frame.png

# Extract thumbnails
ffmpeg -i video.avi -vf "fps=1/60" -s 320x240 thumb_%04d.jpg
```

### 3. AVI Streaming Server
```javascript
// Simple AVI streaming server in Node.js
const fs = require('fs');
const path = require('path');
const http = require('http');

class AVIStreamingServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = null;
  }
  
  start() {
    this.server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, 'videos', req.url);
      
      if (!fs.existsSync(filePath) || !filePath.endsWith('.avi')) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        // Handle range requests for seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/avi',
        });
        
        file.pipe(res);
      } else {
        // Regular request
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/avi',
        });
        
        fs.createReadStream(filePath).pipe(res);
      }
    });
    
    this.server.listen(this.port, () => {
      console.log(`AVI streaming server running on port ${this.port}`);
    });
  }
  
  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Usage
const server = new AVIStreamingServer(8080);
server.start();
```

## See Also

- [MP4 Container Format](./mp4.md)
- [WebM Container Format](./webm.md)
- [DivX Codec](../legacy/divx.md)
- [XviD Codec](../legacy/xvid.md)
- [H.264 Video Codec](../codecs/h264.md)
