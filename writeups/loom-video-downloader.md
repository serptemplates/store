# Loom Video Downloader — Product Writeup

## About
Save Loom recordings and presentations directly to your computer with a single click. The extension adds a download control and popup showing available formats so you can keep local copies of Loom content.

Perfect for archiving meetings, tutorials, or lessons you want offline access to.

## Features

- Detect Loom recordings automatically
- One-click download with save-as
- Download manager with progress
- Offscreen processing for reliability
- Chunked downloads with retries
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Do I need to be logged in to Loom?

A: If the video is behind login, you’ll need to be signed in for the extension to access it in your browser.

Q: Can I download private recordings?

A: Only if you can play them in your browser (i.e., you have access).

## Permission Justifications

- downloads — To save Loom videos.
- activeTab / tabs — To interact with Loom pages.
- storage — To keep progress and preferences.
- scripting — To inject UI and helpers.
- offscreen — To process large or segmented streams.
