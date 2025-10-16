# AlphaPorno Video Downloader — Product Writeup

## About
Download AlphaPorno videos with an in-player button and a compact download popup. The extension shows available quality options and saves the selected file directly through your browser.

Built to be simple and fast: detect, pick quality, and save — no external tools required.

## Features

- In-player download button
- Pick quality (video/audio)
- Download queue and progress
- Retry and chunked downloads
- Offscreen merging when needed
- Local history & sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I pick audio-only files?

A: Yes — the popup lets you choose audio-only when available.

Q: Will my files be uploaded to servers?

A: No. Core downloads and merging happen in your browser; files aren’t uploaded.

## Permission Justifications

- downloads — To save files to the user’s device.
- activeTab / tabs — To interact with the active page and open the popup.
- storage — To keep download state and preferences.
- scripting — To inject UI and helpers.
- offscreen — To run background processing like merging.
