# SproutVideo Downloader — Product Writeup

## About
Save SproutVideo-hosted videos quickly with a small download control and popup. The extension detects playable streams and offers a simple way to save them locally.

Great for archiving hosting-provider videos for offline viewing.

## Features

- Detect SproutVideo streams
- One-click save-as download
- Download manager with progress
- Offscreen merging and processing
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Does this require extra software?

A: No — everything runs in your browser and uses the native download flow.

Q: Are files altered?

A: No — the extension saves original streams or merges parts without adding watermarks.

## Permission Justifications

- downloads — To save videos to disk.
- activeTab / tabs — To interact with pages and show the popup.
- storage — To persist state and preferences.
- scripting — To inject UI and detection helpers.
- offscreen — To process large or segmented streams.
