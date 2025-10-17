# Whop Video Downloader — Product Writeup

## About
Download videos from Whop pages and members-only areas you can access. The extension detects playable media and provides a simple save dialog so you can keep local copies.

Designed to be reliable for streaming and membership-hosted content.

## Features

- Detect Whop-hosted videos
- One-click save-as download
- Download manager with progress
- Offscreen processing for merging
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Do I need to be signed in to Whop?

A: Yes — if content is behind login, you must be signed in to play and download it.

Q: Where are downloads saved?

A: Files are saved locally via the browser download dialog.

## Permission Justifications

- downloads — To save files to disk.
- activeTab / tabs — To detect playable content and offer UI.
- storage — To persist download state and preferences.
- scripting — To inject detection and UI scripts.
- offscreen — For background merging and processing.
