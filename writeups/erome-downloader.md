# Erome Video Downloader — Product Writeup

## About
Save videos from Erome with a visible download control and an easy popup that lists available qualities. Downloads use the browser’s save dialog so files land where you choose.

Built to be fast and unobtrusive while offering robust fallback handling for tricky streams.

## Features

- In-player download button
- Pick quality or audio-only
- Queue multiple downloads
- Chunked downloads and retries
- Offscreen merging for A/V streams
- Local history and progress
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Does it change the video file?

A: No — it merges original media streams when needed but does not add watermarks.

Q: Can I pause or cancel downloads?

A: You can cancel active downloads from the manager; pause behavior may depend on the browser.

## Permission Justifications

- downloads — To save media files.
- activeTab / tabs — To interact with pages and open the popup.
- storage — To persist download state and settings.
- scripting — To insert UI and helper scripts.
- offscreen — To process and merge media off the main page.
