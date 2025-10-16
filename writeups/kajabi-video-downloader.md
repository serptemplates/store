# Kajabi Video Downloader — Product Writeup

## About
Quickly download videos embedded in Kajabi pages. The extension detects common embed providers (Loom, Vimeo, YouTube, Wistia) and provides a simple popup to select quality and save files via your browser.

Made for creators and learners who need dependable, local copies of course videos.

## Features

- Detect embedded Loom/Vimeo/YouTube/Wistia
- Pick quality and format
- Download queue with progress
- Cross-tab sync and local history
- Offscreen merging/processing
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Will it work with my course videos?

A: If you can play the video in your browser, the extension can usually detect and offer it for download.

Q: Are files uploaded anywhere?

A: No — downloads and merging occur locally in your browser.

## Permission Justifications

- downloads — To save media files locally.
- activeTab / tabs — To interact with the active page.
- storage — To persist download lists and preferences.
- scripting — To inject detectors and UI.
- offscreen — To merge separate streams safely.
