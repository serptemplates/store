# YouPorn Video Downloader — Product Writeup

## About
Quickly download YouPorn videos with an easy in-player control and a compact popup. Pick quality and save locally using the browser dialog.

Straightforward and privacy-focused for personal archiving.

## Features

- In-player download button
- Quality selection
- Queue downloads with progress
- Chunked downloads and retries
- Offscreen merging when needed
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download content behind paywalls?

A: No — the extension downloads content you can access in your browser.

Q: Is my activity tracked?

A: No — the extension stores only local state necessary for download management.

## Permission Justifications

- downloads — To save media files.
- activeTab / tabs — To detect pages and show UI.
- storage — To persist download history.
- scripting — To inject helpers and UI.
- offscreen — For merging and processing.
