# ClientClub Video Downloader — Product Writeup

## About
Easily save videos embedded in ClientClub pages. The extension detects Loom, Vimeo, YouTube, and Wistia embeds and provides a compact popup to pick quality and start downloads.

It focuses on being simple and reliable for course and membership content.

## Features

- Auto-detect embedded videos
- Pick video or audio quality
- Download queue with progress
- Cross-tab sync and local history
- Offscreen background processing
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Will it work on private membership pages?

A: It can detect embedded videos on pages you can access in your browser. If content requires additional auth, ensure you're signed in.

Q: Is my data shared externally?

A: No — download actions occur in your browser and temporary state is stored locally.

## Permission Justifications

- downloads — To save media files.
- activeTab / tabs — To interact with content pages and open the popup.
- storage — To store download state and preferences.
- scripting — To inject detectors and UI.
- offscreen — To merge and process media off the main page.
