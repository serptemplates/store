# XNXX Video Downloader — Product Writeup

## About
Download XNXX videos with a simple download control and popup. Select quality and save the resulting file to your device using the browser's save dialog.

Focused on a no-nonsense download experience with retry logic for reliability.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen merging when needed
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download embedded videos on other sites?

A: The extension focuses on XNXX pages, but it may detect some embeds depending on how they’re served.

Q: What if the download stalls?

A: Retry from the manager; the extension will attempt retries for segment downloads.

## Permission Justifications

- downloads — To save files locally.
- activeTab / tabs — To detect content and insert UI.
- storage — To save download history.
- scripting — To add UI and helper scripts.
- offscreen — To assemble separate streams when needed.
