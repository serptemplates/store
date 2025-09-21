# How to Download Videos with Code Examples

This post demonstrates various code block styles for downloading videos.

## JavaScript Example

```javascript
// Download video using fetch API
async function downloadVideo(url, filename) {
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.URL.revokeObjectURL(downloadUrl);
}

// Usage
downloadVideo('https://example.com/video.mp4', 'my-video.mp4');
```

## Python Example

```python
import requests
from tqdm import tqdm

def download_video(url, filepath):
    """Download video with progress bar"""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))

    with open(filepath, 'wb') as file:
        with tqdm(total=total_size, unit='B', unit_scale=True) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
                pbar.update(len(chunk))

    return filepath

# Download the video
download_video('https://example.com/video.mp4', 'output.mp4')
```

## Shell Script Example

```bash
#!/bin/bash

# Download video using curl with progress
download_video() {
    local url=$1
    local output=$2

    echo "Downloading: $url"
    curl -L -# -o "$output" "$url"

    if [ $? -eq 0 ]; then
        echo "Download complete: $output"
    else
        echo "Download failed!"
        exit 1
    fi
}

# Example usage
download_video "https://example.com/video.mp4" "downloaded_video.mp4"
```

## FFmpeg Command

```bash
# Download and convert HLS stream to MP4
ffmpeg -i "https://example.com/stream.m3u8" \
       -c copy \
       -bsf:a aac_adtstoasc \
       "output.mp4"
```

## Inline Code Examples

You can use `youtube-dl` or `yt-dlp` for quick downloads. The command `ffmpeg -i input.mp4 output.webm` converts between formats.

## JSON Configuration

```json
{
  "download": {
    "url": "https://example.com/video.mp4",
    "quality": "1080p",
    "format": "mp4",
    "subtitles": true,
    "metadata": {
      "title": "Sample Video",
      "author": "SERP Apps",
      "date": "2024-01-01"
    }
  }
}
```

## TypeScript with Types

```typescript
interface DownloadOptions {
  url: string;
  filename?: string;
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

class VideoDownloader {
  private options: DownloadOptions;

  constructor(options: DownloadOptions) {
    this.options = options;
  }

  async download(): Promise<Blob> {
    const response = await fetch(this.options.url, {
      headers: this.options.headers || {}
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }
}

// Usage with type safety
const downloader = new VideoDownloader({
  url: 'https://example.com/video.mp4',
  filename: 'my-video.mp4',
  onProgress: (percent) => console.log(`Progress: ${percent}%`)
});
```

## HTML Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Video Downloader</title>
</head>
<body>
    <div id="app">
        <h1>Download Video</h1>
        <button onclick="downloadVideo()">
            Start Download
        </button>
        <progress id="progress" value="0" max="100"></progress>
    </div>

    <script src="downloader.js"></script>
</body>
</html>
```

## Summary

These code examples demonstrate various ways to download videos programmatically. For more advanced features, check out our [HLS Downloader](https://apps.serp.co/hls-downloader) or [RTMP Downloader](https://apps.serp.co/rtmp-downloader) tools.