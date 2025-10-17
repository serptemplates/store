# TNAFlix Video Downloader — Product Writeup

## About
Save TNAFlix videos using an in-page download button and popup. Choose quality and download files locally through your browser.

Designed to be simple and reliable for common site layouts.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Will this work if the site structure changes?

A: The extension attempts multiple detection methods; if it fails, report the page so it can be updated.

Q: Are files uploaded off my device?

A: No — downloads remain local unless you manually upload them elsewhere.

## Permission Justifications

- downloads — To save video files.
- activeTab / tabs — To detect playable content.
- storage — To persist state and history.
- scripting — To inject UI and helpers.
