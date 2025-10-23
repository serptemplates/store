---
slug: how-to-download-rtmp-live-streams
title: How to Download RTMP Live Streams
seoTitle: How to Download RTMP Live Streams
description: 'Protocol: RTMP, RTMPS, RTMPE Ports: 1935 (default), 443 (RTMPS) Container:
  FLV (Flash Video) Usage: Live streaming, broadcast ingestion'
seoDescription: 'Protocol: RTMP, RTMPS, RTMPE Ports: 1935 (default), 443 (RTMPS) Container:
  FLV (Flash Video) Usage: Live streaming, broadcast ingestion'
date: '2025-10-22T18:59:36.628000Z'
author: Devin Schumacher
---

# How to Download RTMP Live Streams

**Protocol**: RTMP, RTMPS, RTMPE  
**Ports**: 1935 (default), 443 (RTMPS)  
**Container**: FLV (Flash Video)  
**Usage**: Live streaming, broadcast ingestion  

## Overview

RTMP (Real-Time Messaging Protocol) is a TCP-based protocol developed by Adobe for streaming audio, video, and data over the internet. Originally designed for Flash Player, RTMP remains widely used for live streaming ingestion to platforms like Twitch, YouTube Live, and Facebook Live. While newer protocols like [HLS/M3U8](https://apps.serp.co/blog/how-to-download-hls-m3u8-streaming-videos) and [DASH](https://apps.serp.co/blog/how-to-download-dash-streaming-videos) are used for delivery, RTMP is still the standard for broadcast ingestion. For real-time interactive streaming, many platforms are now adopting [WebRTC](https://apps.serp.co/blog/how-to-download-webrtc-video-streams).

## RTMP Variants

### 1. Protocol Types
```javascript
// RTMP protocol variants
const rtmpProtocols = {
  rtmp: {
    port: 1935,
    encryption: false,
    description: 'Basic RTMP over TCP'
  },
  rtmps: {
    port: 443,
    encryption: true,
    description: 'RTMP over TLS/SSL'
  },
  rtmpe: {
    port: 1935,
    encryption: true,
    description: 'RTMP with Adobe encryption'
  },
  rtmpt: {
    port: 80,
    encryption: false,
    description: 'RTMP tunneled over HTTP'
  },
  rtmpts: {
    port: 443,
    encryption: true,
    description: 'RTMP tunneled over HTTPS'
  }
};

function parseRTMPUrl(url) {
  const rtmpRegex = /^(rtmp[ste]?):[/]{2}([^/:]+)(?::(\d+))?[/](.+)/i;
  const match = rtmpRegex.exec(url);
  
  if (match) {
    return {
      protocol: match[1],
      host: match[2],
      port: match[3] || rtmpProtocols[match[1]]?.port || 1935,
      app: match[4].split('/')[0],
      stream: match[4].split('/').slice(1).join('/'),
      fullUrl: url
    };
  }
  
  return null;
}
```

## Detection Methods

### 1. Network Traffic Analysis

#### Browser Network Monitor
```javascript
// Monitor for RTMP URLs in page content
function detectRTMPStreams() {
  const rtmpUrls = new Set();
  
  // Check all text content for RTMP URLs
  function scanText(text) {
    const rtmpRegex = /rtmp[ste]?:\/\/[^\s"'<>]+/gi;
    const matches = text.match(rtmpRegex);
    if (matches) {
      matches.forEach(url => rtmpUrls.add(url));
    }
  }
  
  // Scan page content
  scanText(document.documentElement.innerHTML);
  
  // Monitor dynamic content
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          scanText(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scanText(node.innerHTML);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  return Array.from(rtmpUrls);
}

// Initialize RTMP detection
const detectedRTMP = detectRTMPStreams();
console.log('Detected RTMP streams:', detectedRTMP);
```

#### Flash Player Detection
```javascript
// Detect Flash-based RTMP streams
function detectFlashRTMP() {
  const flashVars = [];
  
  // Check Flash embed parameters
  document.querySelectorAll('embed[type="application/x-shockwave-flash"], object[type="application/x-shockwave-flash"]').forEach(element => {
    // Check flashvars parameter
    const flashvars = element.getAttribute('flashvars');
    if (flashvars) {
      flashVars.push(parseFlashVars(flashvars));
    }
    
    // Check param elements
    element.querySelectorAll('param[name="flashvars"]').forEach(param => {
      flashVars.push(parseFlashVars(param.value));
    });
  });
  
  return flashVars.filter(vars => vars.rtmp || vars.streamer);
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

### 2. JavaScript Player Detection

#### JW Player RTMP Detection
```javascript
// Detect RTMP streams in JW Player
function detectJWPlayerRTMP() {
  const rtmpStreams = [];
  
  if (window.jwplayer) {
    // Get all JW Player instances
    const players = jwplayer.utils.exists() ? jwplayer.utils.playerInstances : [];
    
    players.forEach((player, index) => {
      try {
        const config = player.getConfig();
        const playlist = player.getPlaylist();
        
        // Check current item
        const currentItem = player.getPlaylistItem();
        if (currentItem && currentItem.file && currentItem.file.startsWith('rtmp://')) {
          rtmpStreams.push({
            player: `jwplayer_${index}`,
            url: currentItem.file,
            title: currentItem.title
          });
        }
        
        // Check all playlist items
        playlist.forEach((item, itemIndex) => {
          if (item.file && item.file.startsWith('rtmp://')) {
            rtmpStreams.push({
              player: `jwplayer_${index}`,
              item: itemIndex,
              url: item.file,
              title: item.title
            });
          }
        });
      } catch (e) {
        console.warn('Failed to analyze JW Player instance:', e);
      }
    });
  }
  
  return rtmpStreams;
}
```

#### Video.js RTMP Detection  
```javascript
// Detect RTMP in Video.js players
function detectVideoJsRTMP() {
  const rtmpStreams = [];
  
  if (window.videojs) {
    const players = videojs.getPlayers();
    
    Object.entries(players).forEach(([id, player]) => {
      try {
        const tech = player.tech();
        
        // Check current source
        const currentSrc = player.currentSource();
        if (currentSrc && currentSrc.src && currentSrc.src.startsWith('rtmp://')) {
          rtmpStreams.push({
            player: id,
            url: currentSrc.src,
            type: currentSrc.type
          });
        }
        
        // Check all sources
        const sources = player.currentSources();
        sources.forEach((source, index) => {
          if (source.src && source.src.startsWith('rtmp://')) {
            rtmpStreams.push({
              player: id,
              source: index,
              url: source.src,
              type: source.type
            });
          }
        });
      } catch (e) {
        console.warn('Failed to analyze Video.js player:', e);
      }
    });
  }
  
  return rtmpStreams;
}
```

### 3. Page Source Analysis
```javascript
// Extract RTMP URLs from page source and scripts
function extractRTMPFromSource() {
  const rtmpSources = [];
  
  // Scan all script tags
  document.querySelectorAll('script').forEach((script, index) => {
    const content = script.textContent || script.innerHTML;
    const rtmpRegex = /rtmp[ste]?:\/\/[^\s"']+/gi;
    
    let match;
    while ((match = rtmpRegex.exec(content)) !== null) {
      rtmpSources.push({
        source: 'script',
        scriptIndex: index,
        url: match[0],
        context: content.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
      });
    }
  });
  
  // Check data attributes
  document.querySelectorAll('*[data-rtmp], *[data-stream], *[data-streamer]').forEach(element => {
    ['data-rtmp', 'data-stream', 'data-streamer'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value && value.startsWith('rtmp://')) {
        rtmpSources.push({
          source: 'data-attribute',
          attribute: attr,
          element: element.tagName,
          url: value
        });
      }
    });
  });
  
  return rtmpSources;
}
```

## Recording and Download Methods

### 1. FFmpeg RTMP Recording
```bash
# Record RTMP stream to file
ffmpeg -i "rtmp://example.com/live/stream" -c copy output.flv

# Record with time limit (1 hour)
ffmpeg -i "rtmp://example.com/live/stream" -t 3600 -c copy output.flv

# Record and convert to MP4
ffmpeg -i "rtmp://example.com/live/stream" \
       -c:v libx264 -c:a aac \
       -preset ultrafast \
       output.mp4

# Record with specific quality settings
ffmpeg -i "rtmp://example.com/live/stream" \
       -c:v libx264 -preset medium -crf 23 \
       -c:a aac -b:a 128k \
       output.mp4
```

### 2. Streamlink RTMP Support
```bash
# Use streamlink for RTMP streams
streamlink "rtmp://example.com/live/stream" best

# Save to file
streamlink -o recording.flv "rtmp://example.com/live/stream" best

# Specify quality
streamlink "rtmp://example.com/live/stream" 720p

# With authentication
streamlink --rtmp-rtmpdump "/path/to/rtmpdump" \
           "rtmp://example.com/live/stream?token=123" best
```

### 3. rtmpdump Tool
```bash
# Basic RTMP download
rtmpdump -r "rtmp://example.com/live/stream" -o output.flv

# With authentication
rtmpdump -r "rtmp://example.com/live/stream" \
         --conn S:authstring \
         -o output.flv

# Specify app and playpath
rtmpdump -r "rtmp://example.com" \
         --app "live" \
         --playpath "stream" \
         -o output.flv

# Resume interrupted download
rtmpdump -r "rtmp://example.com/live/stream" \
         --resume \
         -o output.flv
```

### 4. Node.js RTMP Client
```javascript
const NodeMediaClient = require('node-media-server').NodeMediaClient;
const fs = require('fs');

// RTMP client for recording
class RTMPRecorder {
  constructor(rtmpUrl, outputFile) {
    this.rtmpUrl = rtmpUrl;
    this.outputFile = outputFile;
    this.client = null;
    this.writeStream = null;
  }
  
  startRecording() {
    return new Promise((resolve, reject) => {
      this.writeStream = fs.createWriteStream(this.outputFile);
      
      // This is a simplified example
      // Real implementation would need proper RTMP protocol handling
      const rtmpConfig = {
        rtmp: {
          port: 1935,
          chunk_size: 60000,
          gop_cache: true,
          ping: 30,
          ping_timeout: 60
        }
      };
      
      // Connect to RTMP stream
      this.connectRTMP()
        .then(() => {
          console.log('RTMP recording started');
          resolve();
        })
        .catch(reject);
    });
  }
  
  async connectRTMP() {
    // Simplified RTMP connection logic
    // Real implementation would use proper RTMP library
    const url = new URL(this.rtmpUrl);
    
    // This would require a full RTMP client implementation
    console.log(`Connecting to RTMP: ${url.host}:${url.port}`);
    console.log(`App: ${url.pathname.split('/')[1]}`);
    console.log(`Stream: ${url.pathname.split('/').slice(2).join('/')}`);
  }
  
  stopRecording() {
    if (this.writeStream) {
      this.writeStream.end();
    }
    if (this.client) {
      this.client.disconnect();
    }
  }
}

// Usage
const recorder = new RTMPRecorder('rtmp://example.com/live/stream', 'recording.flv');
recorder.startRecording();

// Stop after 1 hour
setTimeout(() => {
  recorder.stopRecording();
}, 3600000);
```

### 5. Browser-Based RTMP Detection and Command Generation
```javascript
// Generate recording commands for detected RTMP streams
class RTMPCommandGenerator {
  constructor() {
    this.detectedStreams = new Map();
    this.startDetection();
  }
  
  startDetection() {
    // Combine all detection methods
    const allStreams = [
      ...detectRTMPStreams(),
      ...detectFlashRTMP(),
      ...detectJWPlayerRTMP(),
      ...detectVideoJsRTMP(),
      ...extractRTMPFromSource()
    ];
    
    allStreams.forEach((stream, index) => {
      const url = stream.url || stream.rtmp || stream.streamer;
      if (url) {
        this.detectedStreams.set(`stream_${index}`, {
          ...stream,
          url,
          detected: new Date().toISOString()
        });
      }
    });
    
    if (this.detectedStreams.size > 0) {
      this.displayCommands();
    }
  }
  
  displayCommands() {
    console.group('RTMP Recording Commands');
    
    this.detectedStreams.forEach((stream, id) => {
      const commands = this.generateCommands(stream);
      
      console.group(`Stream: ${id}`);
      console.log('URL:', stream.url);
      
      console.group('FFmpeg Commands:');
      commands.ffmpeg.forEach(cmd => console.log(cmd));
      console.groupEnd();
      
      console.group('rtmpdump Commands:');  
      commands.rtmpdump.forEach(cmd => console.log(cmd));
      console.groupEnd();
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
  
  generateCommands(stream) {
    const url = stream.url;
    const parsedUrl = parseRTMPUrl(url);
    
    const commands = {
      ffmpeg: [
        // Basic recording
        `ffmpeg -i "${url}" -c copy output.flv`,
        
        // Convert to MP4
        `ffmpeg -i "${url}" -c:v libx264 -c:a aac -preset ultrafast output.mp4`,
        
        // High quality
        `ffmpeg -i "${url}" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 128k output.mp4`
      ],
      
      rtmpdump: [
        // Basic download
        `rtmpdump -r "${url}" -o output.flv`
      ]
    };
    
    // Add parsed URL variants if available
    if (parsedUrl) {
      commands.rtmpdump.push(
        `rtmpdump -r "rtmp://${parsedUrl.host}:${parsedUrl.port}" --app "${parsedUrl.app}" --playpath "${parsedUrl.stream}" -o output.flv`
      );
    }
    
    return commands;
  }
  
  copyCommandsToClipboard() {
    const allCommands = [];
    
    this.detectedStreams.forEach((stream, id) => {
      allCommands.push(`# Stream: ${id} (${stream.url})`);
      const commands = this.generateCommands(stream);
      allCommands.push(...commands.ffmpeg, ...commands.rtmpdump, '');
    });
    
    const commandText = allCommands.join('\n');
    
    navigator.clipboard.writeText(commandText).then(() => {
      alert('RTMP commands copied to clipboard!');
    });
  }
}

// Initialize command generator
const rtmpCommands = new RTMPCommandGenerator();
```

## Platform-Specific RTMP Usage

### 1. Twitch RTMP Ingestion

Download recorded Twitch streams using our [Twitch Video Downloader](https://apps.serp.co/twitch-video-downloader).
```bash
# Stream to Twitch
ffmpeg -f x11grab -s 1920x1080 -r 30 -i :0.0 \
       -f pulse -i default \
       -c:v libx264 -preset ultrafast -maxrate 3000k -bufsize 6000k \
       -pix_fmt yuv420p -g 50 \
       -c:a aac -b:a 160k -ac 2 -ar 44100 \
       -f flv rtmp://live.twitch.tv/live/YOUR_STREAM_KEY

# Record from Twitch (if available)  
rtmpdump -r "rtmp://live.twitch.tv/live/stream" -o twitch_recording.flv
```

### 2. YouTube Live RTMP

For downloading YouTube videos and streams, use our [YouTube Downloader](https://apps.serp.co/youtube-downloader).
```bash
# Stream to YouTube Live
ffmpeg -i input.mp4 \
       -c:v libx264 -preset veryfast -maxrate 4500k -bufsize 9000k \
       -vf "scale=1920:1080" -g 50 \
       -c:a aac -b:a 128k -ac 2 -ar 44100 \
       -f flv rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY
```

### 3. Facebook Live RTMP

Download Facebook videos with our [Facebook Video Downloader](https://apps.serp.co/facebook-video-downloader).
```bash
# Stream to Facebook Live
ffmpeg -i input.mp4 \
       -c:v libx264 -preset medium -maxrate 4000k -bufsize 8000k \
       -c:a aac -b:a 128k \
       -f flv rtmp://live-api-s.facebook.com:80/rtmp/YOUR_STREAM_KEY
```

## Advanced RTMP Techniques

### 1. RTMP Proxy/Relay
```javascript
// Simple RTMP proxy in Node.js
const net = require('net');

class RTMPProxy {
  constructor(listenPort, targetHost, targetPort) {
    this.listenPort = listenPort;
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.server = null;
  }
  
  start() {
    this.server = net.createServer((clientSocket) => {
      console.log('Client connected to RTMP proxy');
      
      // Connect to target RTMP server
      const serverSocket = net.createConnection({
        host: this.targetHost,
        port: this.targetPort
      });
      
      // Pipe data between client and server
      clientSocket.pipe(serverSocket);
      serverSocket.pipe(clientSocket);
      
      // Handle disconnections
      clientSocket.on('close', () => {
        console.log('Client disconnected');
        serverSocket.destroy();
      });
      
      serverSocket.on('close', () => {
        console.log('Server disconnected');
        clientSocket.destroy();
      });
    });
    
    this.server.listen(this.listenPort, () => {
      console.log(`RTMP proxy listening on port ${this.listenPort}`);
    });
  }
  
  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Usage: proxy RTMP traffic for analysis
const proxy = new RTMPProxy(1935, 'original.server.com', 1935);
proxy.start();
```

### 2. RTMP Stream Analysis
```javascript
// Analyze RTMP stream metadata
function analyzeRTMPStream(rtmpUrl) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      rtmpUrl
    ]);
    
    let output = '';
    
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const analysis = JSON.parse(output);
          resolve(analysis);
        } catch (e) {
          reject(new Error('Failed to parse ffprobe output'));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      ffprobe.kill();
      reject(new Error('Analysis timeout'));
    }, 30000);
  });
}

// Usage
analyzeRTMPStream('rtmp://example.com/live/stream')
  .then(analysis => {
    console.log('Stream info:', analysis.format);
    console.log('Video streams:', analysis.streams.filter(s => s.codec_type === 'video'));
    console.log('Audio streams:', analysis.streams.filter(s => s.codec_type === 'audio'));
  })
  .catch(console.error);
```

## Common Issues and Solutions

### 1. Authentication
```bash
# RTMP with authentication token
rtmpdump -r "rtmp://example.com/live" \
         --playpath "stream?token=abc123" \
         -o output.flv

# SWF verification
rtmpdump -r "rtmp://example.com/live/stream" \
         --swfVfy "http://example.com/player.swf" \
         -o output.flv
```

### 2. Connection Issues
```bash
# Increase timeouts
rtmpdump -r "rtmp://example.com/live/stream" \
         --timeout 30 \
         --retry 3 \
         -o output.flv

# Use different RTMP variant
rtmpdump -r "rtmpe://example.com/live/stream" -o output.flv  # Encrypted
rtmpdump -r "rtmpt://example.com/live/stream" -o output.flv  # HTTP tunnel
```

### 3. Stream Conversion
```bash
# Convert FLV to MP4
ffmpeg -i recording.flv -c:v libx264 -c:a aac recording.mp4

# Fix corrupted FLV
ffmpeg -i broken.flv -c copy -avoid_negative_ts make_zero fixed.flv

# Extract audio from RTMP stream
ffmpeg -i "rtmp://example.com/live/stream" -vn -acodec copy audio.aac
```

## Related Tools

- [Stream Downloader](https://apps.serp.co/stream-downloader) - Universal streaming video downloader
- [Twitch Video Downloader](https://apps.serp.co/twitch-video-downloader) - Download Twitch streams and VODs
- [YouTube Downloader](https://apps.serp.co/youtube-downloader) - Download YouTube videos and live streams
- [Facebook Video Downloader](https://apps.serp.co/facebook-video-downloader) - Download Facebook videos
- [Instagram Downloader](https://apps.serp.co/instagram-downloader) - Download Instagram live streams
- [Kick Clip Downloader](https://apps.serp.co/kick-clip-downloader) - Download Kick.com streams

## See Also

- [How to Download HLS/M3U8 Streaming Videos](https://apps.serp.co/blog/how-to-download-hls-m3u8-streaming-videos) - Learn about HLS protocol
- [How to Download DASH Streaming Videos](https://apps.serp.co/blog/how-to-download-dash-streaming-videos) - Alternative adaptive streaming
- [How to Download WebRTC Video Streams](https://apps.serp.co/blog/how-to-download-webrtc-video-streams) - Real-time communication protocol

## YouTube Tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/videoseries?list=PL5qY8HgSEm1dN9gY0Z6P4K1mCHdUvXFvH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
