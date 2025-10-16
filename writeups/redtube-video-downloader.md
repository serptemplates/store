# RedTube Video Downloader — Product Writeup

## About
Save RedTube videos using an integrated download control and a small popup that lists available quality options. Downloads are saved locally via the browser's save dialog.

Designed for a simple, unobtrusive download experience.

## Features

- In-player download button
- Pick quality or audio-only
- Multiple download queue
- Chunked downloads and retries
- Offscreen processing for merging
- Local history and progress
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I choose where the file saves?

A: Yes — the browser save dialog lets you pick location and filename.

Q: What if the site layout changes?

A: The extension uses multiple detection methods; if it stops working, report the page and it can be updated.

## Permission Justifications

- downloads — To save media files locally.
- activeTab / tabs — To interact with pages and show UI.
- storage — To persist download state and settings.
- scripting — To inject UI and helper scripts.
- offscreen — To merge and process media off the main page.
