# Stripchat Video Downloader — Product Writeup

## About
Download Stripchat live streams and recordings with a dedicated Download button and popup. The extension detects available streams and saves files locally via your browser.

Made for capturing live and recorded sessions with minimal fuss.

## Features

- In-player download button
- Support for live and recorded streams
- Queue downloads with progress
- Chunked downloads and retries
- Offscreen merging when needed
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download live streams while they’re active?

A: You can attempt to save active streams; full or partial saves may vary depending on stream settings.

Q: Are recordings altered?

A: No — files are saved as captured without added watermarks.

## Permission Justifications

- downloads — To save captured streams.
- activeTab / tabs — To detect streams and inject controls.
- storage — To persist download state.
- scripting — To insert the download UI.
- offscreen — To merge and finalize segmented streams.
