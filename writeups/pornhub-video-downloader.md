# PornHub Video Downloader — Product Writeup

## About
Download PornHub videos quickly from the site with an injected Download button and a small popup. Choose quality and save directly through your browser for personal use.

Straightforward UI and robust handling maximize the chance of successful downloads.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen merging when needed
- Local history and progress
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download premium content?

A: The extension can only download content you can access in your browser (it won’t bypass paid access controls).

Q: Are downloads saved locally?

A: Yes — files are saved to your device via the browser download dialog.

## Permission Justifications

- downloads — To save media files.
- activeTab / tabs — To interact with pages and present a popup.
- storage — To keep download state and preferences.
- scripting — To inject download helpers and the button.
- offscreen — To process segmented streams if needed.
