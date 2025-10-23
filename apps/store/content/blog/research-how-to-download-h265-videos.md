---
slug: how-to-download-h265-videos
---

# How to Download H.265 HEVC Videos

**Standard**: ITU-T H.265 / ISO/IEC HEVC  
**Also Known As**: HEVC (High Efficiency Video Coding)  
**File Extensions**: `.h265`, `.265`, `.hevc`  
**Containers**: MP4, MKV, MOV, TS  
**MIME Types**: `video/h265`, `video/hevc`  

## Overview

H.265/HEVC is the successor to H.264, offering approximately 50% better data compression at the same level of video quality. It's designed to support 4K, 8K, and high dynamic range (HDR) content, making it essential for modern streaming and broadcast applications.

## H.265 Profiles and Levels

### Main Profiles
```javascript
// H.265 profile identification
const h265Profiles = {
  'hev1.1.6.L93.B0': {
    profile: 'Main',
    level: '3.1',
    tier: 'Main',
    description: '1080p streaming'
  },
  'hev1.1.6.L120.B0': {
    profile: 'Main',
    level: '4.0',
    tier: 'Main',
    description: '4K streaming'
  },
  'hev1.2.4.L120.B0': {
    profile: 'Main10',
    level: '4.0',
    tier: 'Main',
    description: '4K HDR content'
  },
  'hev1.3.E.L150.B0': {
    profile: 'Main Still Picture',
    level: '5.0',
    tier: 'Main',
    description: 'High-resolution still images'
  }
};

// Parse H.265 codec string
function parseH265Codec(codecString) {
  if (codecString.startsWith('hev1.') || codecString.startsWith('hvc1.')) {
    const parts = codecString.split('.');
    
    if (parts.length >= 4) {
      const profileIdc = parseInt(parts[1]);
      const profileCompatibility = parts[2];
      const levelIdc = parts[3];
      const constraintFlags = parts[4] || 'B0';
      
      // Profile mapping
      const profiles = {
        1: 'Main',
        2: 'Main10',
        3: 'Main Still Picture',
        4: 'Range Extensions'
      };
      
      return {
        profile: profiles[profileIdc] || 'Unknown',
        profileIdc,
        profileCompatibility,
        level: parseInt(levelIdc, 16) / 30,
        levelIdc,
        constraintFlags,
        description: `${profiles[profileIdc] || 'Unknown'} Profile, Level ${parseInt(levelIdc, 16) / 30}`
      };
    }
  }
  
  return null;
}
```

### Browser Support Detection
```javascript
// Check H.265 support in browsers
function checkH265Support() {
  const video = document.createElement('video');
  
  const codecTests = {
    // Main Profile
    main: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
    
    // Main10 Profile (10-bit)
    main10: video.canPlayType('video/mp4; codecs="hev1.2.4.L120.B0"'),
    
    // Hardware acceleration indicators
    hardware: checkHardwareH265Support()
  };
  
  // Convert results to boolean
  Object.keys(codecTests).forEach(key => {
    if (key !== 'hardware') {
      codecTests[key] = codecTests[key] !== '' && codecTests[key] !== 'no';
    }
  });
  
  return codecTests;
}

function checkHardwareH265Support() {
  // Check for hardware decoding hints
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (gl) {
    const renderer = gl.getParameter(gl.RENDERER);
    
    // Common hardware that supports H.265
    const hardwareSupport = {
      apple: /Apple/i.test(renderer), // iOS/macOS hardware
      nvidia: /NVIDIA/i.test(renderer),
      intel: /Intel/i.test(renderer),
      amd: /AMD|Radeon/i.test(renderer)
    };
    
    return hardwareSupport;
  }
  
  return { supported: false };
}
```

## Detection Methods

### 1. Stream Analysis
```javascript
// Detect H.265 content in video streams
class H265StreamDetector {
  constructor() {
    this.detectedStreams = new Map();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor video element creation
    this.instrumentVideoElements();
    
    // Monitor Media Source Extensions
    this.monitorMSE();
    
    // Monitor network requests
    this.monitorNetworkRequests();
  }
  
  instrumentVideoElements() {
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
    video.addEventListener('loadstart', () => {
      this.analyzeVideoSource(video);
    });
    
    video.addEventListener('loadedmetadata', () => {
      this.extractVideoCodecInfo(video);
    });
  }
  
  async analyzeVideoSource(video) {
    const src = video.src || video.currentSrc;
    if (!src) return;
    
    // Check if URL suggests H.265 content
    if (this.isLikelyH265URL(src)) {
      console.log('Potential H.265 content detected:', src);
      this.detectedStreams.set(src, {
        url: src,
        element: video,
        detectionMethod: 'url-pattern',
        timestamp: Date.now()
      });
    }
  }
  
  isLikelyH265URL(url) {
    // Common patterns that suggest H.265 content
    return /h265|hevc|4k|uhd|hdr/i.test(url) ||
           /\.265$/.test(url) ||
           /codec[=:]h265/i.test(url);
  }
  
  extractVideoCodecInfo(video) {
    // Try to get codec information from video element
    if (video.videoTracks && video.videoTracks.length > 0) {
      const track = video.videoTracks[0];
      if (track.configuration && track.configuration.codec) {
        const codecInfo = parseH265Codec(track.configuration.codec);
        if (codecInfo) {
          console.log('H.265 codec confirmed:', codecInfo);
          
          const src = video.src || video.currentSrc;
          this.detectedStreams.set(src, {
            ...this.detectedStreams.get(src),
            codecInfo,
            detectionMethod: 'codec-analysis'
          });
        }
      }
    }
  }
  
  monitorMSE() {
    if (!window.MediaSource) return;
    
    const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    
    MediaSource.prototype.addSourceBuffer = function(mimeType) {
      if (this.isH265Codec(mimeType)) {
        console.log('H.265 MediaSource buffer created:', mimeType);
        
        // Parse codec information
        const codecMatch = mimeType.match(/codecs="([^"]+)"/);
        if (codecMatch) {
          const codecInfo = parseH265Codec(codecMatch[1]);
          if (codecInfo) {
            console.log('H.265 MSE codec info:', codecInfo);
          }
        }
      }
      
      return originalAddSourceBuffer.call(this, mimeType);
    }.bind(this);
  }
  
  isH265Codec(mimeType) {
    return /hev1\.|hvc1\.|hevc|h265/i.test(mimeType);
  }
  
  monitorNetworkRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string' && this.isLikelyH265URL(url)) {
        console.log('H.265 content requested:', url);
      }
      
      return originalFetch.apply(window, args);
    }.bind(this);
  }
  
  getDetectedStreams() {
    return Array.from(this.detectedStreams.entries()).map(([url, info]) => ({
      url,
      ...info
    }));
  }
}

// Initialize H.265 detector
const h265Detector = new H265StreamDetector();
```

### 2. File Header Analysis
```javascript
// Analyze H.265/HEVC in container files
function analyzeH265InContainer(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // For MP4 containers, look for HEVC sample entry
  if (isMP4File(arrayBuffer)) {
    return analyzeH265InMP4(arrayBuffer);
  }
  
  // For raw H.265 streams, check NAL units
  return analyzeRawH265Stream(arrayBuffer);
}

function analyzeH265InMP4(arrayBuffer) {
  const atoms = parseMP4Atoms(arrayBuffer);
  
  // Look for 'hev1' or 'hvc1' atoms
  const hevcAtoms = atoms.filter(atom => 
    atom.type === 'hev1' || atom.type === 'hvc1'
  );
  
  if (hevcAtoms.length > 0) {
    return {
      isH265: true,
      containerFormat: 'MP4',
      hevcAtoms: hevcAtoms.length,
      profile: extractH265ProfileFromAtom(hevcAtoms[0])
    };
  }
  
  return { isH265: false };
}

function analyzeRawH265Stream(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // Check for H.265 NAL unit start codes
  for (let i = 0; i < Math.min(arrayBuffer.byteLength - 4, 1000); i++) {
    if (view.getUint32(i, false) === 0x00000001 || 
        (view.getUint32(i, false) & 0xFFFFFF00) === 0x00000100) {
      
      // Check NAL unit type (bits 1-6 of the byte after start code)
      const nalUnitType = (view.getUint8(i + 4) >> 1) & 0x3F;
      
      // H.265 specific NAL unit types
      if (nalUnitType >= 32 && nalUnitType <= 34) { // VPS, SPS, PPS
        return {
          isH265: true,
          containerFormat: 'Raw Stream',
          nalUnitType,
          startCodePosition: i
        };
      }
    }
  }
  
  return { isH265: false };
}
```

## Download and Extraction Methods

### 1. H.265 Stream Download
```bash
# Download H.265 stream using ffmpeg
ffmpeg -i "https://example.com/video.mp4" -c:v copy -bsf:v hevc_mp4toannexb output.h265

# Extract H.265 elementary stream from container
ffmpeg -i input.mp4 -vn -c:v copy -bsf:v hevc_mp4toannexb video.h265

# Download 4K H.265 stream with specific parameters
ffmpeg -i "https://example.com/4k_hevc_stream.m3u8" \
       -c:v copy -c:a copy \
       -bsf:v hevc_mp4toannexb \
       4k_video.h265
```

### 2. yt-dlp with H.265 Preference
```bash
# Prefer H.265 codec for downloads
yt-dlp -f "best[vcodec^=hev1]/best[vcodec=hevc]/best" "https://example.com/video"

# Download specific H.265 profile
yt-dlp -f "best[vcodec^=hev1.2.4]" "https://example.com/video"  # Main10 profile

# Force H.265 output (re-encode if necessary)
yt-dlp --recode-video mp4 --postprocessor-args "-c:v libx265 -preset medium -crf 23" "https://example.com/video"

# Download 4K H.265 content
yt-dlp -f "best[height>=2160][vcodec*=hev]" "https://example.com/4k-video"
```

### 3. Browser-Based H.265 Detection and Download
```javascript
// H.265 stream extractor with quality analysis
class H265StreamExtractor {
  constructor() {
    this.extractedStreams = new Map();
    this.qualityAnalysis = new Map();
    this.setupInterception();
  }
  
  setupInterception() {
    // Monitor video sources
    this.monitorVideoSources();
    
    // Track quality metrics
    this.trackQualityMetrics();
  }
  
  monitorVideoSources() {
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src').set;
    
    Object.defineProperty(HTMLVideoElement.prototype, 'src', {
      set: function(value) {
        if (this.isLikelyH265Content(value)) {
          console.log('H.265 video source detected:', value);
          
          this.extractedStreams.set(value, {
            url: value,
            element: this,
            timestamp: Date.now(),
            method: 'src-property'
          });
          
          this.analyzeH265Quality(this, value);
        }
        
        return originalSrcSetter.call(this, value);
      }.bind(this),
      
      get: function() {
        return this.getAttribute('src');
      }
    });
  }
  
  isLikelyH265Content(url) {
    return /h265|hevc|4k|uhd|hdr/i.test(url) ||
           /\.265$/.test(url) ||
           /codec.*h265|codec.*hevc/i.test(url);
  }
  
  async analyzeH265Quality(videoElement, src) {
    videoElement.addEventListener('loadedmetadata', () => {
      const analysis = {
        resolution: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        aspectRatio: videoElement.videoWidth / videoElement.videoHeight,
        duration: videoElement.duration,
        isUHD: videoElement.videoWidth >= 3840,
        isHDR: this.detectHDRContent(videoElement),
        estimatedBitrate: this.estimateBitrate(videoElement, src)
      };
      
      this.qualityAnalysis.set(src, analysis);
      
      console.log('H.265 quality analysis:', analysis);
      
      if (analysis.isUHD) {
        this.showUHDNotification(src, analysis);
      }
    });
  }
  
  detectHDRContent(videoElement) {
    // Simplified HDR detection based on resolution and naming
    const src = videoElement.src || videoElement.currentSrc;
    return /hdr|bt2020|rec2020|pq|hlg/i.test(src) || videoElement.videoWidth >= 3840;
  }
  
  estimateBitrate(videoElement, src) {
    // This is a simplified estimation
    const pixels = videoElement.videoWidth * videoElement.videoHeight;
    
    // Rough bitrate estimation for H.265
    if (pixels >= 3840 * 2160) return '15-25 Mbps (4K)';
    if (pixels >= 1920 * 1080) return '3-6 Mbps (1080p)';
    if (pixels >= 1280 * 720) return '1-3 Mbps (720p)';
    return 'Unknown';
  }
  
  showUHDNotification(src, analysis) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #4CAF50; color: white; padding: 15px; border-radius: 8px;
      max-width: 350px; font-family: Arial, sans-serif;
    `;
    
    notification.innerHTML = `
      <h4 style="margin: 0 0 10px 0;">4K H.265 Content Detected</h4>
      <p style="margin: 0 0 10px 0;">
        <strong>Resolution:</strong> ${analysis.resolution}<br>
        <strong>HDR:</strong> ${analysis.isHDR ? 'Yes' : 'No'}<br>
        <strong>Estimated Bitrate:</strong> ${analysis.estimatedBitrate}
      </p>
      <div style="margin-top: 10px;">
        <button onclick="this.parentElement.parentElement.downloadH265Stream('${src}')"
                style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 4px;">
          Download
        </button>
        <button onclick="this.parentElement.remove()"
                style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; border-radius: 4px;">
          Dismiss
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 15000);
  }
  
  async downloadH265Stream(url) {
    try {
      console.log('Starting H.265 stream download:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `h265_video_${Date.now()}.mp4`;
      a.click();
      
      URL.revokeObjectURL(downloadUrl);
      
      // Show conversion suggestions for compatibility
      this.showConversionSuggestions(url);
      
    } catch (error) {
      console.error('H.265 download failed:', error);
      alert('Download failed. Stream may be protected or unavailable.');
    }
  }
  
  showConversionSuggestions(originalUrl) {
    console.group('H.265 Conversion Suggestions:');
    console.log('Original URL:', originalUrl);
    console.log('For better compatibility, consider converting to H.264:');
    console.log(`ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a copy output_h264.mp4`);
    console.log('For web streaming:');
    console.log(`ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 23 -movflags +faststart web_compatible.mp4`);
    console.groupEnd();
  }
  
  trackQualityMetrics() {
    // Monitor playback quality metrics
    setInterval(() => {
      document.querySelectorAll('video').forEach(video => {
        if (video.getVideoPlaybackQuality) {
          const quality = video.getVideoPlaybackQuality();
          
          if (quality.droppedVideoFrames > 0 || quality.corruptedVideoFrames > 0) {
            const src = video.src || video.currentSrc;
            if (this.isLikelyH265Content(src)) {
              console.warn('H.265 playback quality issues detected:', {
                droppedFrames: quality.droppedVideoFrames,
                corruptedFrames: quality.corruptedVideoFrames,
                totalFrames: quality.totalVideoFrames
              });
            }
          }
        }
      });
    }, 5000);
  }
  
  generateDownloadCommands() {
    console.group('H.265 Download Commands:');
    
    this.extractedStreams.forEach((stream, url) => {
      const analysis = this.qualityAnalysis.get(url);
      
      console.group(`Stream: ${url.substring(0, 80)}...`);
      
      console.log('Extract H.265 elementary stream:');
      console.log(`ffmpeg -i "${url}" -c:v copy -bsf:v hevc_mp4toannexb output.h265`);
      
      console.log('Download with quality preservation:');
      console.log(`ffmpeg -i "${url}" -c copy output.mp4`);
      
      if (analysis?.isUHD) {
        console.log('4K downscaling for compatibility:');
        console.log(`ffmpeg -i "${url}" -vf scale=1920:1080 -c:v libx264 -preset medium -crf 23 1080p.mp4`);
      }
      
      if (analysis?.isHDR) {
        console.log('HDR to SDR conversion:');
        console.log(`ffmpeg -i "${url}" -vf "colorspace=bt709:iall=bt2020" -c:v libx264 sdr_output.mp4`);
      }
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
}

// Initialize H.265 extractor
window.h265Extractor = new H265StreamExtractor();
```

## Encoding and Optimization

### 1. H.265 Encoding Parameters
```bash
# Basic H.265 encoding
ffmpeg -i input.mp4 -c:v libx265 -preset medium -crf 23 output.mp4

# High-quality 4K encoding
ffmpeg -i input_4k.mp4 -c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le \
       -x265-params "profile=main10:level=5.1" 4k_output.mp4

# HDR encoding (10-bit)
ffmpeg -i hdr_input.mp4 -c:v libx265 -preset medium -crf 20 \
       -pix_fmt yuv420p10le -colorspace bt2020nc -color_primaries bt2020 \
       -color_trc smpte2084 hdr_output.mp4

# Fast encoding for streaming
ffmpeg -i input.mp4 -c:v libx265 -preset veryfast -crf 25 \
       -tune zerolatency -x265-params "keyint=30:min-keyint=30" stream.mp4
```

### 2. Quality vs. Size Optimization
```bash
# Two-pass encoding for optimal bitrate control
ffmpeg -i input.mp4 -c:v libx265 -b:v 5M -pass 1 -f null /dev/null
ffmpeg -i input.mp4 -c:v libx265 -b:v 5M -pass 2 output.mp4

# Constrained quality mode
ffmpeg -i input.mp4 -c:v libx265 -preset medium -crf 23 \
       -maxrate 8M -bufsize 16M constrained.mp4

# Ultra-high quality (visually lossless)
ffmpeg -i input.mp4 -c:v libx265 -preset veryslow -crf 12 \
       -pix_fmt yuv444p10le ultra_quality.mp4
```

### 3. Hardware-Accelerated Encoding
```bash
# NVIDIA NVENC H.265 encoding
ffmpeg -i input.mp4 -c:v hevc_nvenc -preset slow -crf 23 nvenc.mp4

# Intel Quick Sync H.265 encoding
ffmpeg -i input.mp4 -c:v hevc_qsv -preset slow -global_quality 23 qsv.mp4

# AMD AMF H.265 encoding
ffmpeg -i input.mp4 -c:v hevc_amf -quality quality -rc cqp -qp_i 23 amf.mp4

# Apple VideoToolbox H.265 encoding (macOS)
ffmpeg -i input.mp4 -c:v hevc_videotoolbox -q:v 23 videotoolbox.mp4
```

## Platform-Specific Considerations

### 1. Browser Compatibility
```javascript
// Provide H.265 fallbacks based on browser support
function setupH265Playback(videoElement, h265Src, h264Fallback) {
  const support = checkH265Support();
  
  if (support.main || support.main10) {
    // Browser supports H.265
    videoElement.src = h265Src;
    console.log('Using H.265 source');
    
    // Monitor for playback issues
    videoElement.addEventListener('error', (e) => {
      console.warn('H.265 playback failed, falling back to H.264');
      if (h264Fallback) {
        videoElement.src = h264Fallback;
      }
    });
    
  } else {
    // Fallback to H.264
    console.log('H.265 not supported, using H.264 fallback');
    if (h264Fallback) {
      videoElement.src = h264Fallback;
    } else {
      console.warn('No H.264 fallback available');
    }
  }
  
  return support.main || support.main10;
}

// Create adaptive source elements
function createAdaptiveH265Sources(baseUrl) {
  const video = document.createElement('video');
  
  // Prefer H.265 for supported browsers
  const h265Source = document.createElement('source');
  h265Source.src = baseUrl.replace('.mp4', '_h265.mp4');
  h265Source.type = 'video/mp4; codecs="hev1.1.6.L93.B0"';
  video.appendChild(h265Source);
  
  // H.264 fallback
  const h264Source = document.createElement('source');
  h264Source.src = baseUrl.replace('.mp4', '_h264.mp4');
  h264Source.type = 'video/mp4; codecs="avc1.640028"';
  video.appendChild(h264Source);
  
  return video;
}
```

### 2. Apple Device Optimization
```bash
# iOS/macOS compatible H.265
ffmpeg -i input.mp4 -c:v libx265 -preset medium -crf 23 \
       -pix_fmt yuv420p -tag:v hvc1 -movflags +faststart ios_h265.mp4

# Apple TV 4K optimization
ffmpeg -i input_4k.mp4 -c:v libx265 -preset medium -crf 20 \
       -pix_fmt yuv420p10le -color_primaries bt2020 -color_trc smpte2084 \
       -colorspace bt2020nc -tag:v hvc1 appletv_4k.mp4
```

## Advanced H.265 Analysis

### 1. Stream Analysis Tools
```bash
# Detailed H.265 stream analysis
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,profile,level,width,height,bit_rate,r_frame_rate \
        -show_entries stream_tags=encoder -of json input_h265.mp4

# GOP structure analysis
ffprobe -v quiet -show_frames -select_streams v:0 \
        -show_entries frame=pict_type,coded_picture_number -of csv input_h265.mp4

# Check for HDR metadata
ffprobe -v quiet -show_entries stream=color_space,color_primaries,color_transfer \
        -of json hdr_h265.mp4
```

### 2. Quality Metrics
```bash
# PSNR comparison between original and H.265 encoded
ffmpeg -i original.mp4 -i h265_encoded.mp4 -lavfi psnr -f null -

# SSIM comparison
ffmpeg -i original.mp4 -i h265_encoded.mp4 -lavfi ssim -f null -

# VMAF quality assessment
ffmpeg -i h265_encoded.mp4 -i original.mp4 -lavfi libvmaf -f null -
```

## Common Issues and Solutions

### 1. Compatibility Problems
```javascript
// Handle H.265 compatibility issues
function handleH265Compatibility(videoElement) {
  const src = videoElement.src || videoElement.currentSrc;
  
  videoElement.addEventListener('error', (e) => {
    if (h265Detector.isLikelyH265Content(src)) {
      console.warn('H.265 playback failed, suggesting alternatives');
      
      showH265TroubleshootingGuide(src, e);
    }
  });
}

function showH265TroubleshootingGuide(src, error) {
  const guide = document.createElement('div');
  guide.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 600px; z-index: 10001; font-family: Arial, sans-serif;
  `;
  
  guide.innerHTML = `
    <h3>H.265 Playback Issue</h3>
    <p><strong>Error:</strong> ${error.message || 'Unknown playback error'}</p>
    <p><strong>File:</strong> ${src.substring(0, 80)}...</p>
    
    <h4>Possible Solutions:</h4>
    <ul>
      <li><strong>Browser Support:</strong> Try Safari, Edge, or Chrome with hardware acceleration</li>
      <li><strong>Codec Pack:</strong> Install HEVC Video Extensions (Microsoft Store)</li>
      <li><strong>Convert to H.264:</strong> Use FFmpeg for better compatibility</li>
      <li><strong>Update Browser:</strong> Ensure you have the latest version</li>
    </ul>
    
    <h4>Conversion Command:</h4>
    <code style="background: #f5f5f5; padding: 10px; display: block; margin: 10px 0;">
      ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a copy output_h264.mp4
    </code>
    
    <button onclick="this.parentElement.remove()" 
            style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-top: 15px;">
      Close
    </button>
  `;
  
  document.body.appendChild(guide);
}
```

### 2. Performance Issues
```bash
# Reduce H.265 encoding complexity for faster processing
ffmpeg -i input.mp4 -c:v libx265 -preset ultrafast -crf 25 fast.mp4

# Optimize for low-power devices
ffmpeg -i input.mp4 -c:v libx265 -preset fast -tune fastdecode -crf 25 lowpower.mp4
```

## See Also

- [H.264 Video Codec](./h264.md)
- [VP9 Video Codec](./vp9.md)
- [AV1 Video Codec](./av1.md)
- [MP4 Container Format](../containers/mp4.md)
- [MKV Container Format](../containers/mkv.md)