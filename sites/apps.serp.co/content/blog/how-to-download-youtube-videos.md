# How to Download YouTube Videos

**Platform**: YouTube.com (Google)  
**Primary Formats**: DASH (MPD), HLS (M3U8), Progressive MP4  
**Codecs**: H.264, VP9, AV1, AAC, Opus  
**Player**: YouTube HTML5 Player  

## Overview

YouTube uses a sophisticated adaptive streaming system with separate video and audio tracks delivered via DASH. The platform supports multiple codecs and qualities, from 144p to 8K, with separate streams for video and audio that need to be merged for complete playback.

## Video Detection Methods

### 1. URL Pattern Recognition

#### YouTube URL Types
```javascript
// YouTube URL patterns
const youtubePatterns = {
  // Standard watch URLs
  watch: /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  
  // Short URLs
  short: /^https:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  
  // Embed URLs
  embed: /^https:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  
  // Mobile URLs
  mobile: /^https:\/\/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  
  // Playlist URLs
  playlist: /^https:\/\/(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  
  // Channel URLs
  channel: /^https:\/\/(?:www\.)?youtube\.com\/@([^/?]+)|\/c\/([^/?]+)|\/channel\/([^/?]+)/
};

function parseYouTubeURL(url) {
  for (const [type, pattern] of Object.entries(youtubePatterns)) {
    const match = pattern.exec(url);
    if (match) {
      return {
        type,
        videoId: match[1],
        originalUrl: url
      };
    }
  }
  return null;
}

// Extract video ID from any YouTube URL
function extractYouTubeId(url) {
  const parsed = parseYouTubeURL(url);
  return parsed?.videoId || null;
}
```

### 2. Page Data Extraction

#### ytInitialData and ytInitialPlayerResponse
```javascript
// Extract YouTube video data from page
function extractYouTubeData() {
  const data = {
    playerResponse: null,
    initialData: null,
    config: null
  };
  
  // Extract ytInitialPlayerResponse
  if (window.ytInitialPlayerResponse) {
    data.playerResponse = window.ytInitialPlayerResponse;
  }
  
  // Extract ytInitialData  
  if (window.ytInitialData) {
    data.initialData = window.ytInitialData;
  }
  
  // Look in script tags
  document.querySelectorAll('script').forEach(script => {
    const content = script.textContent || script.innerHTML;
    
    // Player response in script
    let match = content.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (match) {
      try {
        data.playerResponse = JSON.parse(match[1]);
      } catch (e) {}
    }
    
    // Initial data in script
    match = content.match(/var ytInitialData = ({.+?});/);
    if (match) {
      try {
        data.initialData = JSON.parse(match[1]);
      } catch (e) {}
    }
  });
  
  return data;
}

// Extract streaming URLs from player response
function extractYouTubeStreamingURLs(playerResponse) {
  const streamingData = playerResponse?.streamingData;
  if (!streamingData) return null;
  
  const formats = {
    adaptive: [],
    progressive: []
  };
  
  // Adaptive formats (separate video/audio)
  if (streamingData.adaptiveFormats) {
    streamingData.adaptiveFormats.forEach(format => {
      formats.adaptive.push({
        itag: format.itag,
        url: format.url,
        mimeType: format.mimeType,
        qualityLabel: format.qualityLabel,
        width: format.width,
        height: format.height,
        fps: format.fps,
        bitrate: format.bitrate,
        contentLength: format.contentLength,
        type: format.mimeType?.startsWith('video/') ? 'video' : 'audio'
      });
    });
  }
  
  // Progressive formats (video+audio combined)
  if (streamingData.formats) {
    streamingData.formats.forEach(format => {
      formats.progressive.push({
        itag: format.itag,
        url: format.url,
        mimeType: format.mimeType,
        qualityLabel: format.qualityLabel,
        width: format.width,
        height: format.height,
        contentLength: format.contentLength
      });
    });
  }
  
  // HLS manifest
  if (streamingData.hlsManifestUrl) {
    formats.hls = streamingData.hlsManifestUrl;
  }
  
  // DASH manifest  
  if (streamingData.dashManifestUrl) {
    formats.dash = streamingData.dashManifestUrl;
  }
  
  return formats;
}
```

### 3. Format Analysis
```javascript
// Analyze YouTube format quality and codecs
function analyzeYouTubeFormats(formats) {
  const analysis = {
    videoFormats: [],
    audioFormats: [],
    progressiveFormats: [],
    bestVideo: null,
    bestAudio: null
  };
  
  // Categorize adaptive formats
  formats.adaptive.forEach(format => {
    const codecInfo = parseYouTubeCodec(format.mimeType);
    
    if (format.type === 'video') {
      analysis.videoFormats.push({
        ...format,
        codec: codecInfo.video,
        quality: format.qualityLabel || `${format.height}p`,
        resolution: `${format.width}x${format.height}`
      });
    } else if (format.type === 'audio') {
      analysis.audioFormats.push({
        ...format,
        codec: codecInfo.audio,
        bitrate: format.bitrate
      });
    }
  });
  
  // Analyze progressive formats
  analysis.progressiveFormats = formats.progressive.map(format => ({
    ...format,
    codec: parseYouTubeCodec(format.mimeType),
    quality: format.qualityLabel || 'unknown'
  }));
  
  // Find best quality video and audio
  analysis.bestVideo = analysis.videoFormats
    .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  
  analysis.bestAudio = analysis.audioFormats
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  
  return analysis;
}

function parseYouTubeCodec(mimeType) {
  const codecs = { video: null, audio: null };
  
  const codecMatch = mimeType?.match(/codecs="([^"]+)"/);
  if (codecMatch) {
    const codecString = codecMatch[1];
    
    // Common YouTube codecs
    if (codecString.includes('avc1')) codecs.video = 'H.264';
    else if (codecString.includes('vp9')) codecs.video = 'VP9';
    else if (codecString.includes('av01')) codecs.video = 'AV1';
    
    if (codecString.includes('mp4a')) codecs.audio = 'AAC';
    else if (codecString.includes('opus')) codecs.audio = 'Opus';
  }
  
  return codecs;
}
```

### 4. Live Stream Detection
```javascript
// Detect YouTube live streams
function detectYouTubeLiveStream(playerResponse) {
  const videoDetails = playerResponse?.videoDetails;
  
  if (videoDetails?.isLiveContent || videoDetails?.isLive) {
    return {
      isLive: true,
      isUpcoming: videoDetails?.isUpcoming || false,
      scheduledStart: videoDetails?.scheduledStartTime,
      viewers: videoDetails?.viewCount
    };
  }
  
  // Check for live streaming data
  const streamingData = playerResponse?.streamingData;
  if (streamingData?.hlsManifestUrl) {
    return {
      isLive: true,
      hlsUrl: streamingData.hlsManifestUrl
    };
  }
  
  return { isLive: false };
}
```

## Download Methods

### 1. Using yt-dlp (Recommended)
```bash
# Basic YouTube download
yt-dlp "https://www.youtube.com/watch?v=VIDEO_ID"

# Download specific quality
yt-dlp -f "bestvideo[height<=720]+bestaudio" "https://www.youtube.com/watch?v=VIDEO_ID"

# Download best MP4 format
yt-dlp -f "best[ext=mp4]" "https://www.youtube.com/watch?v=VIDEO_ID"

# Merge best video and audio
yt-dlp -f "bv*+ba/b" --merge-output-format mp4 "https://www.youtube.com/watch?v=VIDEO_ID"

# Download with subtitle
yt-dlp --write-sub --sub-lang en "https://www.youtube.com/watch?v=VIDEO_ID"

# Download playlist
yt-dlp "https://www.youtube.com/playlist?list=PLAYLIST_ID"

# Download live stream
yt-dlp "https://www.youtube.com/watch?v=LIVE_VIDEO_ID"
```

### 2. Format-Specific Downloads
```bash
# List available formats
yt-dlp -F "https://www.youtube.com/watch?v=VIDEO_ID"

# Download specific format by itag
yt-dlp -f "137+140" "https://www.youtube.com/watch?v=VIDEO_ID"

# Download VP9 video with Opus audio
yt-dlp -f "bestvideo[vcodec^=vp9]+bestaudio[acodec=opus]" \
       --merge-output-format webm \
       "https://www.youtube.com/watch?v=VIDEO_ID"

# Download H.264 video with AAC audio  
yt-dlp -f "bestvideo[vcodec^=avc1]+bestaudio[acodec=mp4a]" \
       --merge-output-format mp4 \
       "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 3. Browser-Based Extraction
```javascript
// YouTube video extractor for browser
class YouTubeVideoExtractor {
  constructor() {
    this.detectedVideos = new Map();
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor page changes (YouTube SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => this.scanPage(), 1000); // Wait for content load
      }
    }).observe(document, { subtree: true, childList: true });
    
    // Initial scan
    this.scanPage();
  }
  
  scanPage() {
    const videoId = extractYouTubeId(location.href);
    if (!videoId) return;
    
    const data = extractYouTubeData();
    if (data.playerResponse) {
      const formats = extractYouTubeStreamingURLs(data.playerResponse);
      const analysis = analyzeYouTubeFormats(formats);
      
      this.detectedVideos.set(videoId, {
        videoId,
        title: data.playerResponse.videoDetails?.title,
        duration: data.playerResponse.videoDetails?.lengthSeconds,
        formats,
        analysis,
        url: location.href,
        timestamp: Date.now()
      });
      
      this.notifyDetection(videoId);
    }
  }
  
  notifyDetection(videoId) {
    console.log('YouTube video detected:', videoId);
    this.showDetectionIndicator();
  }
  
  showDetectionIndicator() {
    // Remove existing indicator
    const existing = document.getElementById('yt-extractor-indicator');
    if (existing) existing.remove();
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'yt-extractor-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      padding: 12px;
      background: #ff0000;
      color: white;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    indicator.textContent = `📹 Video formats detected`;
    
    indicator.onclick = () => this.showFormatList();
    document.body.appendChild(indicator);
  }
  
  showFormatList() {
    const currentVideo = this.getCurrentVideo();
    if (!currentVideo) return;
    
    const { analysis } = currentVideo;
    
    // Create format selection modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    content.innerHTML = `
      <h3>Available Formats</h3>
      <div style="margin-bottom: 20px;">
        <strong>Video Formats:</strong><br>
        ${analysis.videoFormats.map(f => 
          `${f.quality} (${f.codec}) - ${f.itag}<br>`
        ).join('')}
      </div>
      <div style="margin-bottom: 20px;">
        <strong>Audio Formats:</strong><br>
        ${analysis.audioFormats.map(f => 
          `${f.codec} - ${Math.round(f.bitrate/1000)}kbps - ${f.itag}<br>`
        ).join('')}
      </div>
      <button onclick="this.parentElement.parentElement.remove()">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }
  
  getCurrentVideo() {
    const videoId = extractYouTubeId(location.href);
    return videoId ? this.detectedVideos.get(videoId) : null;
  }
  
  downloadCurrentVideo(format = 'best') {
    const video = this.getCurrentVideo();
    if (!video) return;
    
    // Generate yt-dlp command
    let command = `yt-dlp `;
    
    if (format === 'best') {
      command += `-f "bv*+ba/b" `;
    } else {
      command += `-f "${format}" `;
    }
    
    command += `"${video.url}"`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(command).then(() => {
      alert('yt-dlp command copied to clipboard!');
    });
  }
}

// Initialize extractor
const youtubeExtractor = new YouTubeVideoExtractor();
```

### 4. Direct URL Download (Node.js)
```javascript
const fs = require('fs');
const https = require('https');

// Download YouTube video directly using extracted URLs
async function downloadYouTubeVideo(videoUrl, outputDir) {
  // This would need YouTube data extraction (simplified)
  const formats = await extractYouTubeFormats(videoUrl);
  
  // Select best video and audio
  const videoFormat = formats.adaptive.find(f => 
    f.type === 'video' && f.height === 1080
  ) || formats.adaptive.find(f => f.type === 'video');
  
  const audioFormat = formats.adaptive.find(f => 
    f.type === 'audio'
  );
  
  if (!videoFormat || !audioFormat) {
    throw new Error('Required formats not found');
  }
  
  // Download video and audio separately
  const videoPath = `${outputDir}/video.mp4`;
  const audioPath = `${outputDir}/audio.mp4`;
  
  await downloadFile(videoFormat.url, videoPath);
  await downloadFile(audioFormat.url, audioPath);
  
  // Merge with ffmpeg
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-i', audioPath,
      '-c', 'copy',
      `${outputDir}/output.mp4`
    ]);
    
    ffmpeg.on('close', (code) => {
      // Clean up temporary files
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);
      
      if (code === 0) {
        resolve(`${outputDir}/output.mp4`);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });
  });
}

function downloadFile(url, outputPath) {
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
```

## Format Specifications

### 1. YouTube Format Tags (itags)
```javascript
// Common YouTube format specifications
const youtubeFormats = {
  // Video-only formats
  '137': { type: 'video', quality: '1080p', codec: 'H.264', container: 'mp4' },
  '136': { type: 'video', quality: '720p', codec: 'H.264', container: 'mp4' },
  '135': { type: 'video', quality: '480p', codec: 'H.264', container: 'mp4' },
  
  // VP9 video formats
  '248': { type: 'video', quality: '1080p', codec: 'VP9', container: 'webm' },
  '247': { type: 'video', quality: '720p', codec: 'VP9', container: 'webm' },
  '244': { type: 'video', quality: '480p', codec: 'VP9', container: 'webm' },
  
  // Audio-only formats
  '140': { type: 'audio', bitrate: '128kbps', codec: 'AAC', container: 'm4a' },
  '251': { type: 'audio', bitrate: '160kbps', codec: 'Opus', container: 'webm' },
  '250': { type: 'audio', bitrate: '70kbps', codec: 'Opus', container: 'webm' },
  
  // Progressive formats (video+audio)
  '22': { type: 'progressive', quality: '720p', codec: 'H.264+AAC', container: 'mp4' },
  '18': { type: 'progressive', quality: '360p', codec: 'H.264+AAC', container: 'mp4' }
};

function getFormatInfo(itag) {
  return youtubeFormats[itag] || { type: 'unknown', quality: 'unknown' };
}
```

### 2. Quality Selection Logic
```javascript
// Select best YouTube formats for download
function selectBestYouTubeFormats(formats, preferences = {}) {
  const {
    maxHeight = 1080,
    preferredCodec = 'H.264',
    preferredContainer = 'mp4'
  } = preferences;
  
  // Filter video formats
  let videoFormats = formats.adaptive
    .filter(f => f.type === 'video')
    .filter(f => !f.height || f.height <= maxHeight);
  
  // Apply codec preference
  if (preferredCodec === 'H.264') {
    videoFormats = videoFormats.filter(f => 
      f.mimeType?.includes('avc1') || f.codec === 'H.264'
    );
  } else if (preferredCodec === 'VP9') {
    videoFormats = videoFormats.filter(f => 
      f.mimeType?.includes('vp9') || f.codec === 'VP9'
    );
  }
  
  // Select highest quality
  const bestVideo = videoFormats
    .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  
  // Select best audio
  const audioFormats = formats.adaptive.filter(f => f.type === 'audio');
  const bestAudio = audioFormats
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  
  return { video: bestVideo, audio: bestAudio };
}
```

## Advanced Techniques

### 1. Age-Restricted Video Handling
```javascript
// Handle age-restricted YouTube videos
async function handleAgeRestricted(videoId) {
  // Age-restricted videos require special handling
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  try {
    const response = await fetch(embedUrl);
    const html = await response.text();
    
    // Extract player response from embed page
    const match = html.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (match) {
      const playerResponse = JSON.parse(match[1]);
      return extractYouTubeStreamingURLs(playerResponse);
    }
  } catch (error) {
    console.error('Failed to handle age-restricted video:', error);
  }
  
  return null;
}
```

### 2. Channel Video Extraction
```javascript
// Extract all videos from a YouTube channel
async function extractChannelVideos(channelUrl) {
  // This would require YouTube Data API or scraping
  const videos = [];
  
  // Simplified example - real implementation would need pagination
  const response = await fetch(channelUrl);
  const html = await response.text();
  
  // Extract video links
  const videoRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
  let match;
  
  while ((match = videoRegex.exec(html)) !== null) {
    const videoId = match[1];
    if (!videos.find(v => v.id === videoId)) {
      videos.push({
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }
  
  return videos;
}
```

### 3. Subtitle Download
```javascript
// Extract YouTube subtitles
function extractYouTubeSubtitles(playerResponse) {
  const captions = playerResponse?.captions;
  if (!captions) return [];
  
  const tracks = captions.playerCaptionsTracklistRenderer?.captionTracks || [];
  
  return tracks.map(track => ({
    languageCode: track.languageCode,
    name: track.name?.simpleText,
    url: track.baseUrl,
    isAutoGenerated: track.vssId?.includes('a.') || false
  }));
}

// Download subtitle file
async function downloadYouTubeSubtitle(subtitleUrl, format = 'vtt') {
  const url = new URL(subtitleUrl);
  url.searchParams.set('fmt', format); // vtt, srv1, srv2, srv3, ttml
  
  const response = await fetch(url.toString());
  return response.text();
}
```

## Common Issues and Solutions

### 1. Signature/Cipher Issues
```bash
# yt-dlp handles YouTube signature decryption automatically
yt-dlp --verbose "https://www.youtube.com/watch?v=VIDEO_ID"

# Force update if signature extraction fails
yt-dlp --update
```

### 2. Geo-blocking
```bash
# Use proxy for geo-blocked videos
yt-dlp --proxy socks5://127.0.0.1:1080 "https://www.youtube.com/watch?v=VIDEO_ID"

# Use VPN or bypass techniques
yt-dlp --geo-bypass "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 3. Rate Limiting
```bash
# Slow down requests to avoid rate limiting
yt-dlp --sleep-interval 5 --max-sleep-interval 10 "https://www.youtube.com/playlist?list=PLAYLIST_ID"

# Use alternative extraction method
yt-dlp --extractor-retries 3 "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 4. Live Stream Recording
```bash
# Record YouTube live stream
yt-dlp --wait-for-video 60 --live-from-start "https://www.youtube.com/watch?v=LIVE_VIDEO_ID"

# Record for specific duration
yt-dlp --download-sections "*0-3600" "https://www.youtube.com/watch?v=LIVE_VIDEO_ID"
```

## See Also

- [DASH Streaming Protocol](../streaming/dash.md)
- [HLS Streaming Protocol](../streaming/hls.md)  
- [MP4 Container Format](../containers/mp4.md)
- [WebM Container Format](../containers/webm.md)
- [H.264 Video Codec](../codecs/h264.md)