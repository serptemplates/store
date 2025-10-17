# XVideos Video Downloader — Product Writeup

## About
Save XVideos content quickly with an injected Download button and small popup. Choose quality and save files locally through your browser.

The extension focuses on ease-of-use and robust handling for common network issues.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen merging for segmented streams
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Will this download premium content?

A: Only content you can access in your browser; it does not bypass paid access.

Q: Can I change filename/location?

A: Yes — the browser save dialog allows choosing filename and location.

## Permission Justifications

- downloads — To save videos.
- activeTab / tabs — To interact with pages and show UI.
- storage — To persist download state.
- scripting — To inject download button and helpers.
- offscreen — To perform background merging.
