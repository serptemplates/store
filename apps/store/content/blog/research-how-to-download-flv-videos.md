---
slug: how-to-download-flv-videos
title: How to Download FLV Flash Videos
seoTitle: How to Download FLV Flash Videos
description: 'File Extensions: .flv, .f4v MIME Types: video/x-flv, video/flv Container:
  Adobe Flash Video container Codecs: H.264, VP6, Sorenson Spark, AAC, MP3'
seoDescription: 'File Extensions: .flv, .f4v MIME Types: video/x-flv, video/flv Container:
  Adobe Flash Video container Codecs: H.264, VP6, Sorenson Spark, AAC, MP3'
date: '2025-10-22T18:59:36.627000Z'
author: Devin Schumacher
---

# How to Download FLV Flash Videos

**File Extensions**: `.flv`, `.f4v`  
**MIME Types**: `video/x-flv`, `video/flv`  
**Container**: Adobe Flash Video container  
**Codecs**: H.264, VP6, Sorenson Spark, AAC, MP3  

## Overview

FLV (Flash Video) is a container format used to deliver digital video content over the internet using Adobe Flash Player. While Flash has been deprecated, FLV files are still encountered in legacy content and some streaming applications, particularly RTMP streams.

## Container Structure

FLV files have a simple structure:

```
FLV Header (9 bytes)
├─ Signature (3 bytes): 'FLV'
├─ Version (1 byte): Usually 0x01
├─ Flags (1 byte): Audio/Video presence
└─ Header Size (4 bytes): Usually 0x09

Previous Tag Size (4 bytes): Always 0 for first tag

Tag 1
├─ Tag Type (1 byte): Audio(8)/Video(9)/Script(18)
├─ Data Size (3 bytes)
├─ Timestamp (3 bytes + 1 byte extended)
├─ Stream ID (3 bytes): Always 0
└─ Tag Data (variable)

Previous Tag Size (4 bytes)
...
```

## Detection Methods

### 1. File Extension and MIME Type
```javascript
// Check FLV file extension
function isFLV(filename) {
  return /\.(flv|f4v)$/i.test(filename);
}

// Check FLV MIME type
function isFLVMimeType(mimeType) {
  return /^video\/(x-flv|flv)$/i.test(mimeType);
}

// Browser support check (requires Flash or native support)
function supportsFLV() {
  // Modern browsers don't support FLV natively
  const video = document.createElement('video');
  const canPlay = video.canPlayType('video/x-flv');
  
  // Check for Flash plugin (deprecated)
  const hasFlash = navigator.plugins['Shockwave Flash'] !== undefined;
  
  return {
    native: canPlay !== '' && canPlay !== 'no',
    flash: hasFlash,
    supported: canPlay !== '' || hasFlash
  };
}
```

### 2. Binary File Header Detection
```javascript
// Detect FLV by file signature
function detectFLVHeader(arrayBuffer) {
  if (arrayBuffer.byteLength < 9) return false;
  
  const view = new DataView(arrayBuffer);
  
  // Check FLV signature: 'FLV'
  const signature = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2)
  );
  
  if (signature === 'FLV') {
    const version = view.getUint8(3);
    const flags = view.getUint8(4);
    const headerSize = view.getUint32(5, false);
    
    return {
      isFlv: true,
      version,
      hasAudio: !!(flags & 0x04),
      hasVideo: !!(flags & 0x01),
      headerSize
    };
  }
  
  return { isFlv: false };
}

// Parse FLV tags for detailed analysis
function parseFLVTags(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 9; // Skip FLV header
  offset += 4; // Skip first PreviousTagSize
  
  const tags = [];
  
  while (offset < arrayBuffer.byteLength - 15) {
    const tag = {
      type: view.getUint8(offset),
      dataSize: (view.getUint8(offset + 1) << 16) | 
                (view.getUint8(offset + 2) << 8) | 
                view.getUint8(offset + 3),
      timestamp: (view.getUint8(offset + 4) << 16) | 
                (view.getUint8(offset + 5) << 8) | 
                view.getUint8(offset + 6) | 
                (view.getUint8(offset + 7) << 24)
    };
    
    // Tag type names
    const tagTypes = { 8: 'audio', 9: 'video', 18: 'script' };
    tag.typeName = tagTypes[tag.type] || 'unknown';
    
    tags.push(tag);
    
    // Move to next tag
    offset += 11 + tag.dataSize + 4;
    
    // Limit parsing to first 100 tags for performance
    if (tags.length >= 100) break;
  }
  
  return tags;
}
```

### 3. Flash Player and RTMP Detection
```javascript
// Detect Flash-based FLV players
function detectFlashFLVPlayers() {
  const flashPlayers = [];
  
  // Check Flash embed elements
  document.querySelectorAll('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"]').forEach(element => {
    const src = element.src || element.data;
    const flashvars = element.getAttribute('flashvars') || '';
    
    // Check if flashvars contain FLV references
    if (flashvars.includes('.flv') || flashvars.includes('rtmp://')) {
      flashPlayers.push({
        element,
        src,
        flashvars: parseFlashVars(flashvars),
        type: 'flash-embed'
      });
    }
  });
  
  return flashPlayers;
}

function parseFlashVars(flashvarsString) {
  const vars = {};
  if (!flashvarsString) return vars;
  
  const pairs = flashvarsString.split('&');
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      vars[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });
  
  return vars;
}

// Monitor for RTMP to FLV conversion
function monitorRTMPFLV() {
  const rtmpStreams = [];
  
  // Look for RTMP URLs that might be converted to FLV
  document.addEventListener('DOMContentLoaded', () => {
    const allText = document.body.textContent || document.body.innerText;
    const rtmpRegex = /rtmp:\/\/[^\s"'<>]+/gi;
    const matches = allText.match(rtmpRegex);
    
    if (matches) {
      matches.forEach(rtmpUrl => {
        rtmpStreams.push({
          rtmpUrl,
          possibleFlv: rtmpUrl.replace('rtmp://', 'http://').replace(/\/live\//, '/') + '.flv'
        });
        console.log('RTMP stream found (may be available as FLV):', rtmpUrl);
      });
    }
  });
  
  return rtmpStreams;
}
```

## Download and Conversion Methods

### 1. Direct FLV Download
```bash
# Simple wget download
wget "https://example.com/video.flv"

# With Flash Player user agent
wget --user-agent="Adobe Flash Player" \
     "https://example.com/video.flv"

# Resume partial download
wget -c "https://example.com/video.flv"
```

### 2. RTMP to FLV Recording
```bash
# Record RTMP stream to FLV using rtmpdump
rtmpdump -r "rtmp://server.com/live/stream" -o output.flv

# Record with specific app and playpath
rtmpdump -r "rtmp://server.com" \
         --app "live" \
         --playpath "stream" \
         -o output.flv

# Record live stream for specific duration
timeout 3600 rtmpdump -r "rtmp://server.com/live/stream" -o stream.flv
```

### 3. FLV to Modern Format Conversion
```bash
# Convert FLV to MP4 (most compatible)
ffmpeg -i input.flv -c:v libx264 -c:a aac output.mp4

# Fast copy (if codecs are compatible)
ffmpeg -i input.flv -c copy output.mp4

# Convert to WebM
ffmpeg -i input.flv -c:v libvpx-vp9 -c:a libopus output.webm

# Batch conversion
for file in *.flv; do
  ffmpeg -i "$file" -c:v libx264 -c:a aac "${file%.flv}.mp4"
done

# Handle VP6 codec (common in older FLV files)
ffmpeg -i vp6_video.flv -c:v libx264 -c:a copy converted.mp4
```

### 4. Browser-Based FLV Handling
```javascript
// Handle FLV files in modern browsers
class FLVHandler {
  constructor() {
    this.detectedFLVs = new Set();
    this.setupDetection();
  }
  
  setupDetection() {
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && isFLV(url)) {
        this.detectedFLVs.add(url);
        console.log('FLV file detected:', url);
        this.handleFLVDetection(url);
      }
      
      return originalFetch.apply(window, args);
    }.bind(this);
    
    // Check existing links
    this.scanForFLVLinks();
  }
  
  scanForFLVLinks() {
    document.querySelectorAll('a[href$=".flv" i], a[href$=".f4v" i]').forEach(link => {
      this.detectedFLVs.add(link.href);
      this.handleFLVDetection(link.href);
    });
  }
  
  handleFLVDetection(flvUrl) {
    this.showFLVWarning(flvUrl);
    this.suggestConversion(flvUrl);
  }
  
  showFLVWarning(flvUrl) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 10000;
      padding: 15px; background: #ff9800; color: white; border-radius: 5px;
      max-width: 300px; font-family: Arial, sans-serif;
    `;
    
    warning.innerHTML = `
      <strong>FLV File Detected</strong><br>
      Flash Video files may not play in modern browsers.<br>
      <button onclick="this.parentElement.remove()">Dismiss</button>
      <button onclick="window.flvHandler.downloadAndConvert('${flvUrl}')">Download & Convert</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 10000);
  }
  
  suggestConversion(flvUrl) {
    console.group('FLV Conversion Suggestions:');
    console.log('Original FLV:', flvUrl);
    console.log('Suggested ffmpeg command:');
    console.log(`ffmpeg -i "${flvUrl}" -c:v libx264 -c:a aac converted.mp4`);
    console.log('Online converter suggestion: Use a service like CloudConvert or FFmpeg online');
    console.groupEnd();
  }
  
  async downloadAndConvert(flvUrl) {
    try {
      // Download FLV file
      console.log('Downloading FLV for conversion...');
      const response = await fetch(flvUrl);
      const blob = await response.blob();
      
      // For actual conversion, you'd need FFmpeg.wasm or similar
      console.log('FLV downloaded. Conversion would require FFmpeg.wasm or server-side processing.');
      
      // For now, just download the original
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = flvUrl.split('/').pop();
      a.click();
      
      URL.revokeObjectURL(url);
      
      alert('FLV file downloaded. Please use FFmpeg or online converter to convert to MP4.');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download FLV file.');
    }
  }
}

// Initialize FLV handler
window.flvHandler = new FLVHandler();
```

## Legacy Flash Player Integration

### 1. Flash Player Detection and Fallback
```javascript
// Comprehensive Flash Player detection
function detectFlashPlayer() {
  const flashInfo = {
    available: false,
    version: null,
    enabled: false
  };
  
  // Method 1: Check plugins (Chrome, Firefox)
  if (navigator.plugins && navigator.plugins['Shockwave Flash']) {
    flashInfo.available = true;
    const plugin = navigator.plugins['Shockwave Flash'];
    flashInfo.version = plugin.description.match(/\d+\.\d+/)?.[0];
    flashInfo.enabled = true;
  }
  
  // Method 2: ActiveX detection (Internet Explorer)
  if (!flashInfo.available && window.ActiveXObject) {
    try {
      const flash = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      flashInfo.available = true;
      flashInfo.enabled = true;
      flashInfo.version = flash.GetVariable('$version').match(/\d+,\d+/)?.[0];
    } catch (e) {
      // Flash not available
    }
  }
  
  // Method 3: Check MIME type support
  if (!flashInfo.available) {
    const mimeType = navigator.mimeTypes['application/x-shockwave-flash'];
    if (mimeType && mimeType.enabledPlugin) {
      flashInfo.available = true;
      flashInfo.enabled = true;
    }
  }
  
  return flashInfo;
}

// Provide FLV playback alternatives
function setupFLVPlayback(flvUrl, containerId) {
  const flashInfo = detectFlashPlayer();
  const container = document.getElementById(containerId);
  
  if (flashInfo.available && flashInfo.enabled) {
    // Use Flash Player
    setupFlashPlayer(container, flvUrl);
  } else {
    // Use alternative methods
    setupFLVAlternative(container, flvUrl);
  }
}

function setupFlashPlayer(container, flvUrl) {
  container.innerHTML = `
    <object type="application/x-shockwave-flash" data="flv_player.swf" width="640" height="480">
      <param name="movie" value="flv_player.swf" />
      <param name="flashvars" value="file=${encodeURIComponent(flvUrl)}&autostart=true" />
      <param name="allowFullScreen" value="true" />
      <param name="allowScriptAccess" value="always" />
      Your browser does not support Flash Player.
    </object>
  `;
}

function setupFLVAlternative(container, flvUrl) {
  // Suggest conversion or alternative formats
  container.innerHTML = `
    <div style="padding: 20px; border: 2px dashed #ccc; text-align: center;">
      <h3>FLV Playback Not Available</h3>
      <p>This FLV file cannot be played directly in modern browsers.</p>
      <p><strong>File:</strong> ${flvUrl}</p>
      <br>
      <button onclick="downloadFLVForConversion('${flvUrl}')">Download FLV</button>
      <button onclick="requestConvertedVersion('${flvUrl}')">Request MP4 Version</button>
      <br><br>
      <small>Suggestion: Convert to MP4 using FFmpeg:<br>
      <code>ffmpeg -i input.flv -c:v libx264 -c:a aac output.mp4</code></small>
    </div>
  `;
}
```

### 2. FLV Metadata Extraction
```javascript
// Extract FLV metadata from file
async function extractFLVMetadata(flvFile) {
  const arrayBuffer = await flvFile.arrayBuffer();
  const headerInfo = detectFLVHeader(arrayBuffer);
  
  if (!headerInfo.isFlv) {
    throw new Error('Not a valid FLV file');
  }
  
  const tags = parseFLVTags(arrayBuffer);
  
  // Find script data tags (metadata)
  const scriptTags = tags.filter(tag => tag.type === 18);
  const videoTags = tags.filter(tag => tag.type === 9);
  const audioTags = tags.filter(tag => tag.type === 8);
  
  const metadata = {
    header: headerInfo,
    duration: calculateFLVDuration(tags),
    videoTracks: videoTags.length,
    audioTracks: audioTags.length,
    scriptData: scriptTags.length,
    totalTags: tags.length,
    estimatedBitrate: calculateBitrate(arrayBuffer.byteLength, calculateFLVDuration(tags))
  };
  
  return metadata;
}

function calculateFLVDuration(tags) {
  if (tags.length === 0) return 0;
  
  const lastTag = tags[tags.length - 1];
  return lastTag.timestamp / 1000; // Convert to seconds
}

function calculateBitrate(fileSize, duration) {
  if (duration === 0) return 0;
  return Math.round((fileSize * 8) / duration); // bits per second
}
```

## RTMP Integration and Live Streaming

### 1. RTMP to FLV Bridge
```javascript
// Monitor RTMP streams and suggest FLV recording
function monitorRTMPForFLV() {
  const rtmpStreams = new Map();
  
  // Check page content for RTMP URLs
  function scanForRTMP() {
    const content = document.body.textContent || document.body.innerText;
    const rtmpRegex = /rtmp:\/\/[^\s"'<>]+/gi;
    let match;
    
    while ((match = rtmpRegex.exec(content)) !== null) {
      const rtmpUrl = match[0];
      if (!rtmpStreams.has(rtmpUrl)) {
        rtmpStreams.set(rtmpUrl, {
          url: rtmpUrl,
          detected: new Date(),
          recordingCommands: generateRTMPCommands(rtmpUrl)
        });
        
        console.log('RTMP stream detected:', rtmpUrl);
        showRTMPRecordingOptions(rtmpUrl);
      }
    }
  }
  
  // Initial scan
  scanForRTMP();
  
  // Monitor DOM changes
  const observer = new MutationObserver(() => {
    scanForRTMP();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return rtmpStreams;
}

function generateRTMPCommands(rtmpUrl) {
  return {
    rtmpdump: `rtmpdump -r "${rtmpUrl}" -o stream.flv`,
    ffmpeg: `ffmpeg -i "${rtmpUrl}" -c copy stream.flv`,
    streamlink: `streamlink "${rtmpUrl}" best --output stream.flv`
  };
}

function showRTMPRecordingOptions(rtmpUrl) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8); z-index: 10001;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; padding: 30px; border-radius: 8px;
    max-width: 600px; max-height: 80vh; overflow-y: auto;
  `;
  
  const commands = generateRTMPCommands(rtmpUrl);
  
  content.innerHTML = `
    <h3>RTMP Stream Recording Options</h3>
    <p><strong>Stream URL:</strong> ${rtmpUrl}</p>
    
    <h4>Recording Commands:</h4>
    
    <div style="margin: 15px 0;">
      <strong>rtmpdump (recommended):</strong>
      <div style="background: #f5f5f5; padding: 10px; margin: 5px 0; font-family: monospace;">
        ${commands.rtmpdump}
      </div>
      <button onclick="navigator.clipboard.writeText('${commands.rtmpdump}')">Copy</button>
    </div>
    
    <div style="margin: 15px 0;">
      <strong>FFmpeg:</strong>
      <div style="background: #f5f5f5; padding: 10px; margin: 5px 0; font-family: monospace;">
        ${commands.ffmpeg}
      </div>
      <button onclick="navigator.clipboard.writeText('${commands.ffmpeg}')">Copy</button>
    </div>
    
    <div style="margin: 15px 0;">
      <strong>Streamlink:</strong>
      <div style="background: #f5f5f5; padding: 10px; margin: 5px 0; font-family: monospace;">
        ${commands.streamlink}
      </div>
      <button onclick="navigator.clipboard.writeText('${commands.streamlink}')">Copy</button>
    </div>
    
    <button onclick="this.parentElement.parentElement.remove()" 
            style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px;">
      Close
    </button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}
```

## Common Issues and Solutions

### 1. Flash Player Deprecation
```javascript
// Handle Flash Player deprecation gracefully
function handleFlashDeprecation() {
  const flashInfo = detectFlashPlayer();
  
  if (!flashInfo.available) {
    console.warn('Flash Player not available - FLV files cannot be played directly');
    
    // Provide migration guide
    showFlashMigrationGuide();
  } else if (flashInfo.version && parseFloat(flashInfo.version) < 32) {
    console.warn('Flash Player version is outdated and may be blocked by browsers');
  }
}

function showFlashMigrationGuide() {
  const guide = document.createElement('div');
  guide.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 10000;
    background: #2196F3; color: white; padding: 20px; border-radius: 8px;
    max-width: 400px; font-family: Arial, sans-serif;
  `;
  
  guide.innerHTML = `
    <h4 style="margin: 0 0 10px 0;">Flash Content Migration</h4>
    <p style="margin: 0 0 15px 0;">
      Flash Player has been discontinued. Consider these alternatives:
    </p>
    <ul style="margin: 0 0 15px 20px; padding: 0;">
      <li>Convert FLV files to MP4 using FFmpeg</li>
      <li>Use Ruffle (Flash emulator) for interactive content</li>
      <li>Contact content creators for HTML5 versions</li>
    </ul>
    <button onclick="this.parentElement.remove()" 
            style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 16px; border-radius: 4px;">
      Got it
    </button>
  `;
  
  document.body.appendChild(guide);
}
```

### 2. Codec Compatibility
```bash
# Handle VP6 codec (common in older FLV files)
ffmpeg -i vp6_video.flv -c:v libx264 -c:a copy output.mp4

# Handle Sorenson Spark codec
ffmpeg -i sorenson_video.flv -c:v libx264 -c:a copy output.mp4

# Preserve original quality
ffmpeg -i input.flv -c:v libx264 -preset slow -crf 18 -c:a copy high_quality.mp4
```

### 3. Corrupted FLV Recovery
```bash
# Try to repair corrupted FLV
ffmpeg -i corrupted.flv -c copy -avoid_negative_ts make_zero repaired.flv

# Extract partial content
ffmpeg -i corrupted.flv -c copy -t 00:10:00 partial.flv
```

