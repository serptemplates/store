# Beeg Video Downloader — Product Writeup

## About
Save videos from Beeg quickly with an integrated Download button and a simple popup. The extension detects available streams, offers quality choices, and downloads files directly through your browser.

It’s made for convenience: manage several downloads, watch progress, and cancel if needed.

## Features

- In-player download button
- Choose quality or audio-only
- Multiple downloads with progress
- Chunked downloads and retries
- Offscreen processing for merging
- Persistent local history
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Does it work on mobile views?

A: The extension injects controls on desktop pages and common mobile layouts; results may vary by site layout.

Q: Are files modified?

A: No — the extension merges original streams but does not add watermarks.

## Permission Justifications

- downloads — To save media files locally.
- activeTab / tabs — To interact with the page and coordinate downloads.
- storage — For download state and settings.
- scripting — For injecting UI and helpers into pages.
- offscreen — For background merging and processing.
