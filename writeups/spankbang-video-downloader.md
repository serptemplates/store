# SpankBang Video Downloader — Product Writeup

## About
Quickly download SpankBang videos using a compact Download button and popup. Choose the available quality and save files locally with the browser's download dialog.

Simple UI with robust retry and fallback handling for improved success.

## Features

- In-player download button
- Quality selection
- Multiple download queue
- Chunked downloads and retries
- Offscreen merging when required
- Local history and progress
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I save multiple videos at once?

A: Yes — queue videos and the extension will process them concurrently up to platform limits.

Q: Will files be uploaded?

A: No — files are saved only to your device.

## Permission Justifications

- downloads — To save files locally.
- activeTab / tabs — To detect and interact with pages.
- storage — To persist state and history.
- scripting — To insert the download UI and helpers.
- offscreen — To merge and process segmented streams.
