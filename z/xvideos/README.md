# XVideos Video Downloader

A Chrome extension that downloads videos from XVideos using the yt-dlp extractor logic.

## Features

- Detects videos on XVideos pages automatically
- Extracts video metadata (title, uploader, views, likes, etc.)
- Shows available video qualities
- Downloads videos directly to your computer
- Uses yt-dlp's XVideos extractor logic

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `spankbang-downloader` folder

## Usage

1. Navigate to a XVideos video page
2. Click the extension icon in your browser toolbar
3. Select the desired video quality
4. Click "Download Video"
5. Choose where to save the file

## How it Works

The extension uses a bridge to the yt-dlp XVideos extractor logic:

- **content.js**: Detects and extracts video information from the page
- **inject.js**: Accesses page context to extract flashvars data
- **yt-dlp-extractor.js**: Adapts yt-dlp's Python extractor logic to JavaScript
- **background-enhanced.js**: Handles download management and format extraction
- **popup.js**: Provides the user interface

## Supported Sites

- spankbang.com
- All XVideos network sites

## Note

This extension is for educational purposes. Please respect content creators and copyright laws.
