# XHamster Video Downloader — Product Writeup

## About
Save XHamster videos fast with a visible download button and a small popup. Choose the quality you want and save the file to your device via the browser dialog.

Built to be resilient to site changes and to recover from partial network failures.

## Features

- In-page download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen processing when needed
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can this bypass site restrictions?

A: No — it only downloads content you can access in your browser.

Q: Are my files uploaded anywhere?

A: No — files remain local to your device.

## Permission Justifications

- downloads — To save media files.
- activeTab / tabs — To detect and interact with video pages.
- storage — To persist download history and settings.
- scripting — To inject the button and helpers.
- declarativeNetRequest — To help manage network rules where needed.
