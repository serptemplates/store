---
slug: how-to-download-twitch-streams-and-vods
---

# How to Download Twitch Streams and VODs

**Platform**: Twitch.tv (Amazon)  
**Primary Formats**: HLS (M3U8), MP4 (VODs)  
**Stream Types**: Live streams, VODs, Clips  
**Authentication**: OAuth, subscriber-only content support  

## Overview

Twitch is Amazon's live streaming platform primarily focused on gaming content. It uses HLS for live streaming delivery and provides MP4 downloads for Video-on-Demand (VOD) content. The platform has various content types including live streams, past broadcasts (VODs), and short clips.

## Stream Types and Detection

### 1. Live Stream Detection

#### URL Pattern Recognition
```javascript
// Twitch URL patterns
const twitchPatterns = {
  // Live channel streams
  channel: /^https:\/\/(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})$/,
  
  // VOD/past broadcasts
  video: /^https:\/\/(?:www\.)?twitch\.tv\/videos\/(\d+)$/,
  
  // Clips
  clip: /^https:\/\/(?:www\.)?twitch\.tv\/[^/]+\/clip\/([a-zA-Z0-9_-]+)$/,
  clips: /^https:\/\/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)$/,
  
  // Collections
  collection: /^https:\/\/(?:www\.)?twitch\.tv\/collections\/([a-zA-Z0-9_-]+)$/,
  
  // Mobile URLs
  mobile: /^https:\/\/m\.twitch\.tv\/([a-zA-Z0-9_]{4,25})$/
};

function parseTwitchURL(url) {
  for (const [type, pattern] of Object.entries(twitchPatterns)) {
    const match = pattern.exec(url);
    if (match) {
      return {
        type,
        id: match[1],
        originalUrl: url
      };
    }
  }
  return null;
}

// Extract channel name or content ID
function extractTwitchId(url) {
  const parsed = parseTwitchURL(url);
  return parsed?.id || null;
}
```

#### Live Stream Status Detection
```javascript
// Detect if a Twitch channel is currently live
async function checkTwitchLiveStatus(channelName) {
  try {
    // This would require Twitch API access
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channelName}`, {
      headers: {
        'Client-ID': 'your_client_id',
        'Authorization': 'Bearer your_access_token'
      }
    });
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const stream = data.data[0];
      return {
        isLive: true,
        title: stream.title,
        game: stream.game_name,
        viewerCount: stream.viewer_count,
        startedAt: stream.started_at,
        thumbnailUrl: stream.thumbnail_url
      };
    }
    
    return { isLive: false };
  } catch (error) {
    console.error('Failed to check live status:', error);
    return { isLive: false, error: error.message };
  }
}
```

### 2. HLS Stream Detection
```javascript
// Detect Twitch HLS streams
function detectTwitchHLS() {
  const hlsStreams = [];
  
  // Monitor network requests for Twitch HLS
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && isTwitchHLS(url)) {
      hlsStreams.push({
        url,
        timestamp: new Date().toISOString(),
        type: 'hls'
      });
      console.log('Twitch HLS detected:', url);
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Also check for existing video elements
  document.querySelectorAll('video').forEach(video => {
    const src = video.src || video.currentSrc;
    if (src && isTwitchHLS(src)) {
      hlsStreams.push({
        url: src,
        element: video,
        type: 'video-element'
      });
    }
  });
  
  return hlsStreams;
}

function isTwitchHLS(url) {
  // Twitch HLS stream patterns
  return /https:\/\/.*\.twitch\.tv\/.*\.m3u8/i.test(url) ||
         /https:\/\/video-weaver\..*\.hls\.ttvnw\.net\/.*\.m3u8/i.test(url) ||
         /https:\/\/d.*\.cloudfront\.net\/.*\.m3u8/i.test(url);
}
```

### 3. Player Integration Detection
```javascript
// Detect Twitch player and extract stream info
function detectTwitchPlayer() {
  const players = [];
  
  // Look for Twitch player iframes
  document.querySelectorAll('iframe[src*="twitch.tv/embed"]').forEach(iframe => {
    const src = iframe.src;
    const channelMatch = src.match(/channel=([^&]+)/);
    const videoMatch = src.match(/video=([^&]+)/);
    
    if (channelMatch || videoMatch) {
      players.push({
        element: iframe,
        type: channelMatch ? 'channel' : 'video',
        id: (channelMatch || videoMatch)[1],
        embedUrl: src
      });
    }
  });
  
  // Look for Twitch embedded player scripts
  document.querySelectorAll('script').forEach(script => {
    const content = script.textContent || script.innerHTML;
    
    // Look for Twitch player initialization
    if (content.includes('TwitchEmbed') || content.includes('twitch.tv')) {
      const channelMatch = content.match(/channel:\s*["']([^"']+)["']/);
      const videoMatch = content.match(/video:\s*["']([^"']+)["']/);
      
      if (channelMatch || videoMatch) {
        players.push({
          type: channelMatch ? 'channel' : 'video',
          id: (channelMatch || videoMatch)[1],
          source: 'script'
        });
      }
    }
  });
  
  return players;
}
```

## Download Methods

### 1. Live Stream Recording
```bash
# Record Twitch live stream using streamlink
streamlink "https://twitch.tv/channelname" best --output "stream_{time}.mp4"

# Record with specific quality
streamlink "https://twitch.tv/channelname" 720p60 --output "stream.mp4"

# Record for specific duration (1 hour)
timeout 3600 streamlink "https://twitch.tv/channelname" best --output "stream.mp4"

# Record with retry on disconnect
streamlink "https://twitch.tv/channelname" best --output "stream.mp4" --retry-streams 5
```

### 2. VOD Download using yt-dlp
```bash
# Download Twitch VOD
yt-dlp "https://www.twitch.tv/videos/123456789"

# Download specific quality
yt-dlp -f "best[height<=720]" "https://www.twitch.tv/videos/123456789"

# Download with chat replay
yt-dlp --write-comments "https://www.twitch.tv/videos/123456789"

# Download clips
yt-dlp "https://www.twitch.tv/username/clip/clipname"

# Download all VODs from a channel
yt-dlp "https://www.twitch.tv/username/videos"
```

### 3. Advanced Recording with FFmpeg
```bash
# Record Twitch stream directly with ffmpeg (requires stream URL)
ffmpeg -i "https://video-weaver.*.hls.ttvnw.net/v1/playlist/example.m3u8" \
       -c copy -bsf:a aac_adtstoasc stream.mp4

# Record with custom settings
ffmpeg -i "TWITCH_HLS_URL" \
       -c:v libx264 -preset ultrafast -crf 23 \
       -c:a aac -b:a 128k \
       -f mp4 stream.mp4

# Record multiple qualities simultaneously
ffmpeg -i "TWITCH_HLS_URL" \
       -filter_complex "[0:v]split=3[v720][v480][v360]; [v720]scale=1280:720[720p]; [v480]scale=854:480[480p]; [v360]scale=640:360[360p]" \
       -map "[720p]" -c:v libx264 -preset fast -crf 23 -c:a aac 720p.mp4 \
       -map "[480p]" -c:v libx264 -preset fast -crf 25 -c:a aac 480p.mp4 \
       -map "[360p]" -c:v libx264 -preset fast -crf 27 -c:a aac 360p.mp4
```

### 4. Browser-Based Twitch Stream Extractor
```javascript
// Twitch stream extractor for browser use
class TwitchStreamExtractor {
  constructor() {
    this.detectedStreams = new Map();
    this.chatMessages = [];
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor network requests
    this.interceptNetworkRequests();
    
    // Monitor page changes (Twitch SPA)
    this.observePageChanges();
    
    // Monitor chat if present
    this.monitorChat();
  }
  
  interceptNetworkRequests() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string') {
        // HLS stream detection
        if (isTwitchHLS(url)) {
          this.detectedStreams.set(url, {
            type: 'hls',
            url,
            timestamp: Date.now()
          });
          console.log('Twitch HLS stream detected:', url);
        }
        
        // GraphQL API calls (for metadata)
        if (url.includes('gql.twitch.tv')) {
          this.handleGraphQLRequest(args);
        }
      }
      
      return originalFetch.apply(window, args);
    }.bind(this);
  }
  
  async handleGraphQLRequest(fetchArgs) {
    try {
      const response = await originalFetch.apply(window, fetchArgs);
      const clone = response.clone();
      const data = await clone.json();
      
      // Extract stream metadata from GraphQL responses
      if (data.data) {
        this.extractStreamMetadata(data.data);
      }
      
      return response;
    } catch (error) {
      return originalFetch.apply(window, fetchArgs);
    }
  }
  
  extractStreamMetadata(graphqlData) {
    // Extract channel info
    if (graphqlData.user) {
      const user = graphqlData.user;
      console.log('Channel info:', {
        name: user.login,
        displayName: user.displayName,
        isLive: user.stream !== null,
        followers: user.followers?.totalCount
      });
    }
    
    // Extract VOD info
    if (graphqlData.video) {
      const video = graphqlData.video;
      console.log('VOD info:', {
        id: video.id,
        title: video.title,
        duration: video.lengthSeconds,
        createdAt: video.createdAt,
        viewCount: video.viewCount
      });
    }
  }
  
  observePageChanges() {
    let lastUrl = location.href;
    
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('Twitch page changed:', lastUrl);
        
        // Re-analyze page for new content
        setTimeout(() => this.analyzePage(), 1000);
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
  }
  
  analyzePage() {
    const parsed = parseTwitchURL(location.href);
    if (parsed) {
      console.log('Twitch content type:', parsed.type, 'ID:', parsed.id);
      
      // Generate appropriate download commands
      this.generateDownloadCommands(parsed);
    }
  }
  
  generateDownloadCommands(twitchInfo) {
    console.group(`Twitch ${twitchInfo.type} Download Commands:`);
    
    if (twitchInfo.type === 'channel') {
      console.log('Record live stream:');
      console.log(`streamlink "https://twitch.tv/${twitchInfo.id}" best --output "stream.mp4"`);
      
      console.log('Record with yt-dlp:');
      console.log(`yt-dlp "https://twitch.tv/${twitchInfo.id}"`);
    } else if (twitchInfo.type === 'video') {
      console.log('Download VOD:');
      console.log(`yt-dlp "https://www.twitch.tv/videos/${twitchInfo.id}"`);
      
      console.log('Download specific quality:');
      console.log(`yt-dlp -f "best[height<=720]" "https://www.twitch.tv/videos/${twitchInfo.id}"`);
    } else if (twitchInfo.type === 'clip') {
      console.log('Download clip:');
      console.log(`yt-dlp "https://clips.twitch.tv/${twitchInfo.id}"`);
    }
    
    console.groupEnd();
  }
  
  monitorChat() {
    // Look for chat messages in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList?.contains('chat-line__message')) {
            this.extractChatMessage(node);
          }
        });
      });
    });
    
    const chatContainer = document.querySelector('[data-a-target="chat-scroller"]');
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  }
  
  extractChatMessage(messageElement) {
    try {
      const username = messageElement.querySelector('.chat-author__display-name')?.textContent;
      const message = messageElement.querySelector('[data-a-target="chat-line-message-body"]')?.textContent;
      const timestamp = new Date().toISOString();
      
      if (username && message) {
        this.chatMessages.push({
          username,
          message,
          timestamp
        });
        
        // Keep only last 100 messages to avoid memory issues
        if (this.chatMessages.length > 100) {
          this.chatMessages = this.chatMessages.slice(-100);
        }
      }
    } catch (error) {
      console.warn('Failed to extract chat message:', error);
    }
  }
  
  downloadChatLog() {
    if (this.chatMessages.length === 0) {
      alert('No chat messages captured yet');
      return;
    }
    
    const chatText = this.chatMessages
      .map(msg => `[${msg.timestamp}] ${msg.username}: ${msg.message}`)
      .join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `twitch_chat_${Date.now()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  showDetectedStreams() {
    if (this.detectedStreams.size === 0) {
      console.log('No Twitch streams detected yet');
      return;
    }
    
    console.group('Detected Twitch Streams:');
    this.detectedStreams.forEach((stream, url) => {
      console.log(`Type: ${stream.type}, URL: ${url.substring(0, 80)}...`);
    });
    console.groupEnd();
  }
}

// Initialize Twitch extractor
const twitchExtractor = new TwitchStreamExtractor();

// Usage examples:
// twitchExtractor.showDetectedStreams();
// twitchExtractor.downloadChatLog();
```

## Quality and Format Selection

### 1. Twitch Quality Options
```javascript
// Twitch stream quality mapping
const twitchQualities = {
  'source': { resolution: 'Original', fps: 'Variable', bitrate: 'Variable' },
  '720p60': { resolution: '1280x720', fps: 60, bitrate: '~6000k' },
  '720p': { resolution: '1280x720', fps: 30, bitrate: '~3000k' },  
  '480p60': { resolution: '854x480', fps: 60, bitrate: '~2500k' },
  '480p': { resolution: '854x480', fps: 30, bitrate: '~1500k' },
  '360p60': { resolution: '640x360', fps: 60, bitrate: '~1500k' },
  '360p': { resolution: '640x360', fps: 30, bitrate: '~1000k' },
  '160p': { resolution: '284x160', fps: 30, bitrate: '~230k' },
  'audio_only': { resolution: 'N/A', fps: 'N/A', bitrate: '~128k' }
};

// Select best quality based on connection
function selectTwitchQuality(connectionType) {
  const qualityMap = {
    '4g': '720p60',
    'wifi': 'source',
    '3g': '480p',
    '2g': '360p',
    'slow': '160p'
  };
  
  return qualityMap[connectionType] || '720p';
}
```

### 2. Streamlink Quality Selection
```bash
# List available qualities
streamlink "https://twitch.tv/channelname" --json | jq '.streams | keys[]'

# Record specific quality
streamlink "https://twitch.tv/channelname" 720p60 --output "stream.mp4"

# Record best available quality
streamlink "https://twitch.tv/channelname" best --output "stream.mp4"

# Record worst quality (for bandwidth-limited situations)  
streamlink "https://twitch.tv/channelname" worst --output "stream.mp4"

# Record multiple qualities simultaneously
streamlink "https://twitch.tv/channelname" 720p60,480p,360p --output "stream_{resolution}.mp4"
```

## Authentication and Access Control

### 1. OAuth Token Usage
```bash
# Using Twitch OAuth token with streamlink
streamlink --twitch-oauth-token "your_oauth_token" "https://twitch.tv/channelname" best

# For subscriber-only content
streamlink --twitch-oauth-token "your_oauth_token" "https://twitch.tv/subonly_channel" best
```

### 2. Browser Cookie Integration
```javascript
// Extract Twitch authentication from browser
function getTwitchAuthInfo() {
  const authInfo = {
    cookies: {},
    localStorage: {},
    sessionStorage: {}
  };
  
  // Extract relevant cookies
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name.includes('twitch') || name.includes('auth')) {
      authInfo.cookies[name] = value;
    }
  });
  
  // Extract localStorage data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('twitch') || key.includes('auth')) {
      authInfo.localStorage[key] = localStorage.getItem(key);
    }
  }
  
  return authInfo;
}

// Export cookies for external tools
function exportTwitchCookies() {
  const authInfo = getTwitchAuthInfo();
  const cookieString = Object.entries(authInfo.cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
    
  console.log('Twitch cookies:', cookieString);
  
  // Copy to clipboard
  navigator.clipboard.writeText(cookieString).then(() => {
    console.log('Cookies copied to clipboard');
  });
  
  return cookieString;
}
```

## Advanced Techniques

### 1. Multi-Stream Recording
```bash
# Record multiple channels simultaneously
#!/bin/bash
channels=("channel1" "channel2" "channel3")

for channel in "${channels[@]}"; do
  echo "Starting recording for $channel"
  streamlink "https://twitch.tv/$channel" best --output "${channel}_{time}.mp4" &
done

# Wait for all recordings to finish
wait
echo "All recordings completed"
```

### 2. Automated Stream Detection
```python
# Python script for automated Twitch stream detection
import requests
import time
import subprocess
import json

def check_streams(channels, client_id, oauth_token):
    headers = {
        'Client-ID': client_id,
        'Authorization': f'Bearer {oauth_token}'
    }
    
    # Check multiple channels at once
    user_logins = '&'.join([f'user_login={channel}' for channel in channels])
    url = f'https://api.twitch.tv/helix/streams?{user_logins}'
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    live_streams = []
    for stream in data.get('data', []):
        live_streams.append({
            'channel': stream['user_name'],
            'title': stream['title'],
            'game': stream['game_name'],
            'viewers': stream['viewer_count']
        })
    
    return live_streams

def start_recording(channel):
    cmd = [
        'streamlink',
        f'https://twitch.tv/{channel}',
        'best',
        '--output', f'{channel}_{int(time.time())}.mp4'
    ]
    
    return subprocess.Popen(cmd)

# Example usage
channels_to_monitor = ['channel1', 'channel2', 'channel3']
recording_processes = {}

while True:
    try:
        live_streams = check_streams(channels_to_monitor, 'your_client_id', 'your_oauth_token')
        
        for stream in live_streams:
            channel = stream['channel'].lower()
            
            if channel not in recording_processes:
                print(f"Starting recording for {channel}: {stream['title']}")
                process = start_recording(channel)
                recording_processes[channel] = process
        
        # Clean up finished processes
        for channel in list(recording_processes.keys()):
            if recording_processes[channel].poll() is not None:
                del recording_processes[channel]
        
        time.sleep(60)  # Check every minute
        
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(60)
```

### 3. Chat Replay Download
```bash
# Download chat replay for VODs using chat-downloader
pip install chat-downloader

# Download chat for a VOD
chat_downloader "https://www.twitch.tv/videos/123456789" --output "chat.json"

# Download chat in different formats
chat_downloader "https://www.twitch.tv/videos/123456789" --format csv --output "chat.csv"

# Download live chat during stream
chat_downloader "https://www.twitch.tv/channelname" --output "live_chat.json"
```

## Common Issues and Solutions

### 1. Stream Access Issues
```bash
# Handle subscriber-only streams
streamlink --twitch-oauth-token "token" "https://twitch.tv/channel" best

# Handle mature content warnings  
streamlink --twitch-disable-ads "https://twitch.tv/channel" best

# Bypass regional restrictions (use VPN)
streamlink --http-proxy "socks5://127.0.0.1:1080" "https://twitch.tv/channel" best
```

### 2. Quality and Buffering Issues
```bash
# Reduce buffer size for low latency
streamlink "https://twitch.tv/channel" best --hls-live-edge 1

# Increase buffer for stability
streamlink "https://twitch.tv/channel" best --hls-segment-stream-data

# Handle connection drops
streamlink "https://twitch.tv/channel" best --retry-streams 10 --retry-max 5
```

### 3. VOD Download Issues
```bash
# Handle segmented VODs
yt-dlp --concurrent-fragments 4 "https://www.twitch.tv/videos/123456789"

# Download VODs that require authentication
yt-dlp --cookies cookies.txt "https://www.twitch.tv/videos/123456789"

# Handle geo-blocked VODs
yt-dlp --proxy "socks5://127.0.0.1:1080" "https://www.twitch.tv/videos/123456789"
```

## See Also

- [HLS Streaming Protocol](../streaming/hls.md)
- [YouTube Platform](./youtube.md)
- [RTMP Streaming Protocol](../streaming/rtmp.md)
- [MP4 Container Format](../containers/mp4.md)