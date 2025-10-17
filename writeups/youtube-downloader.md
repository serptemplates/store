# YouTube Video Downloader — Product Writeup

## About
Download YouTube videos quickly and reliably with flexible quality options, built-in queue management, and smart fallbacks. The extension adds a one-click Download button on YouTube video pages and provides a lightweight popup where you can pick video or audio quality, manage active downloads, and see progress in real time. Whether you want a ready-to-play MP4, an audio-only file, or to merge separate video/audio streams, this tool handles the work and saves files directly to your device.

Built for everyday use, it automatically detects videos on YouTube pages, queues multiple downloads, and uses robust fallbacks (progressive fetch, HLS, or streaming-merging) to maximize success even when direct links are restricted. A small, focused UI keeps downloads organized and unobtrusive while the extension performs merging and finalization in a background processing context.

## Features

 - In-player download button
 - Pick video or audio quality
 - Auto-detect videos (including shorts & embeds)
 - Multiple-queue downloads (concurrent)
 - Progress, speed, and status
 - Fallbacks for blocked streams
 - Merge separate video/audio into MP4
 - Save-as via browser download dialog
 - Download manager panel (cancel/clear)
 - Cross-tab sync & local history
 - Auto-prune completed items
 - Chunked downloads with retries
 - Privacy focused — no data shared
 - No ads or watermarks
 - Lightweight, theme-matching UI

## FAQs

Q: Is it safe to use?

A: Yes. Everything runs in your browser, temporary data stays local, and files are saved via the browser's download dialog.

Q: Can it download more than one video?

A: Yes — you can queue multiple videos. The extension downloads several at once but won't auto-download whole playlists.

Q: What qualities can I pick?

A: The popup shows whatever quality options YouTube provides for that video (HD, SD, audio-only, etc.). Pick the one you want.

Q: Why did my download do extra steps before saving?

A: Sometimes a direct file link isn't available. The extension will try alternate methods behind the scenes so you still get a usable MP4 or audio file — you don't need to do anything.

Q: Will files have watermarks or ads?

A: No. Files are saved as original media streams without added watermarks or ads.

Q: Can I choose where to save the file?

A: Yes — the browser's save dialog lets you pick filename and location.

Q: Does it send my videos or data to servers?

A: No — core download and merging work locally. Optional license checks may contact external endpoints, but your video files are not uploaded.

Q: What if a download fails?

A: Retry the download. The extension retries segments and has fallback methods. If problems continue, check your network or other browser extensions that might block media.

## Permission Justifications

The following explains why each permission requested in the extension's manifest is necessary:

- downloads — Required to save video and audio files to the user's device using the browser's download API.
- activeTab — Allows the extension to interact with the currently focused YouTube tab when the user clicks the injected Download button.
- storage — Used to persist download manager state, queued downloads, user preferences, and temporary segment metadata between pages or sessions.
- tabs — Needed to query and control tab-level actions such as opening the popup, sending messages, and coordinating cross-tab download state.
- scripting — Used to inject UI and helper scripts into YouTube pages safely and to manage the in-page download button and UI enhancements.
- offscreen — Required to create an offscreen document that performs CPU-bound media merging (HLS/segment merging) without blocking the service worker or visible pages.
- declarativeNetRequestWithHostAccess — Allows the extension to declare necessary network request handling for host-scoped operations and to ensure proper access to video segment hosts when required by the extension's features.
 - declarativeNetRequestWithHostAccess — Allows the extension to declare necessary network request handling for host-scoped operations.

---

If you'd like adjustments to tone, length, or to include screenshots or UI copy from the popup, tell me and I will update the writeup. Once you confirm this style I will generate writeups for the remaining downloader products.
