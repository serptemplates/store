# Circle Video Downloader — Product Writeup

## About
Download videos from Circle-powered sites with a focused toolbar and popup. The extension supports Loom, Vimeo, YouTube, Wistia embeds where available and presents a simple interface to save media files.

It’s designed for course creators and learners who want reliable downloads without extra steps.

## Features

- In-page download overlays
- Support for Loom, Vimeo, YouTube, Wistia
- Pick quality and format
- Download queue with concurrent slots
- Progress and speed indicators
- Offscreen merging for separate streams
- Cross-tab sync and local history
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Which platforms does this support?

A: The extension supports embedded videos commonly used on Circle pages — Loom, Vimeo, YouTube, Wistia, and similar providers.

Q: Can I cancel downloads?

A: Yes — use the download manager panel to cancel active downloads.

## Permission Justifications

- downloads — To save files to your device.
- activeTab / tabs — To interact with Circle pages and show UI.
- storage — To persist download lists and preferences.
- scripting — To inject overlays and detectors on pages.
- offscreen — To perform merging/processing in the background.
