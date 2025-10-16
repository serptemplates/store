# 123Movies Downloader — Product Writeup

## About
Quickly save videos you find while browsing with a clean Download button and a lightweight popup. 123Movies Downloader detects playable media on pages and gives you a simple way to save it to your device using the browser's download dialog.

Designed for easy, everyday use — no confusing settings, just tap the download control, pick a name/location, and the extension handles the rest.

## Features

- One-click download button
- Auto-detect videos on pages
- Save-as via browser dialog
- Download queue and progress
- Chunked downloads with retries
- Offscreen processing for reliability
- Local state & history
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Is this safe to use?

A: Yes. Downloads run in your browser and files are saved locally. The extension keeps minimal local state to show progress and history.

Q: Can I choose file name and location?

A: Yes — your browser's save dialog lets you pick name and location for each download.

Q: What if a download fails?

A: Retry the download. The extension retries parts and has fallback handling for common issues.

## Permission Justifications

- downloads — To save video files to your device.
- sidePanel / tabs / activeTab — To interact with pages and offer UI where needed.
- storage — To persist download state and preferences locally.
- scripting — To inject small helpers and the download button into pages.
- offscreen — To perform background merging/processing without blocking pages.
