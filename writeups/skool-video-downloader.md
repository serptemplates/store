# Skool Video Downloader — Product Writeup

## About
Save videos from Skool classrooms and community pages with an integrated download overlay and popup. The extension supports Loom, YouTube, Vimeo, and Wistia embeds commonly used in Skool.

Built to make course content portable for offline review.

## Features

- Detect Skool classroom videos
- Support for Loom/YouTube/Vimeo/Wistia
- Pick quality and format
- Download queue and progress
- Cross-tab sync and local history
- Offscreen merging for separate streams
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download videos from private groups?

A: If you can play the video while signed in, the extension should be able to detect and allow download.

Q: What happens to completed downloads?

A: Completed downloads are kept briefly in local history and can be cleared from the manager.

## Permission Justifications

- downloads — To save files locally.
- activeTab / tabs — To interact with Skool pages.
- storage — To store download lists and preferences.
- scripting — To inject detectors and UI.
- offscreen — To merge and finalize media.
