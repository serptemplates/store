# Eporner Video Downloader — Product Writeup

## About
Download videos from Eporner with an injected Download button and a small popup. Pick quality or audio-only and save files directly through your browser.

Designed for an effortless experience: detect, choose, save.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen merging when needed
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download audio only?

A: Yes — audio-only options are available when the site provides them.

Q: What if the download doesn’t start?

A: Try again; the extension retries segments and has fallback handling. If issues persist, check your network or other browser extensions.

## Permission Justifications

- downloads — To save files.
- activeTab / tabs — To interact with pages and show UI.
- storage — For persistent download state.
- scripting — To inject the download button.
- offscreen — For background media merging.
