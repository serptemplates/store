# TikTok Downloader — Product Writeup

## About
Save TikTok videos and short clips using an in-page download button and a small popup. The project contains UI and build assets rather than a standard extension manifest — it integrates with the same download manager used across our extensions to detect and save videos.

Use the popup to pick quality where available and save files locally via your browser.

## Features

- Detect TikTok videos and embeds
- One-click save-as download
- Download manager with progress
- Chunked downloads with retries
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Does this require a Chrome extension manifest?

A: This package uses the same downloader logic and UI but is built differently (see app sources). The download behavior still saves files locally via the browser.

Q: Can I download private videos?

A: Only if you can play them in your browser (i.e., you have access).

## Permission Justifications

- downloads — To save files to disk (when integrated as an extension).
- scripting / tabs / activeTab — To detect and interact with pages.
- storage — To persist download state locally.
