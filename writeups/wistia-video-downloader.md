# Wistia Video Downloader — Product Writeup

## About
Download Wistia-hosted videos with a simple popup and save-as flow. The extension detects Wistia players and provides quality choices where available.

Good for saving vendor-hosted marketing or course videos for offline viewing.

## Features

- Detect Wistia players and embeds
- Pick quality and save-as
- Download manager with progress
- Offscreen merging when required
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Will private Wistia videos be downloadable?

A: Only if you can play them in your browser (i.e., you have access).

Q: Are downloads altered?

A: No — the extension does not add watermarks.

## Permission Justifications

- downloads — To save videos.
- activeTab / tabs — To detect Wistia players.
- storage — To persist state and preferences.
- scripting — To inject helpers and UI.
- offscreen — For merging segmented media.
