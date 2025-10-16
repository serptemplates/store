# M3U8 Downloader — Product Writeup

## About
Download HLS (M3U8) streams easily — the extension detects playlist manifests and assembles segments into a single file you can save. A focused popup lets you control downloads and watch progress.

Great for saving live streams and segmented video streams that don’t expose a single file URL.

## Features

- Detect M3U8 playlists
- Assemble and merge HLS segments
- Save merged MP4 via browser
- Download queue and progress
- Chunked downloads with retries
- Offscreen merging for performance
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: What is M3U8/HLS?

A: It’s a format for streaming video in small parts. The extension gathers those parts and puts them into a single file for you.

Q: Can I download live streams?

A: You can attempt to save them; success can depend on stream settings and duration.

## Permission Justifications

- downloads — To save the final merged file.
- sidePanel / webRequest / tabs — To detect and fetch playlists and segments.
- storage — To persist temporary segment data and state.
- scripting — To inject helpers when needed.
- offscreen — To do merging without blocking pages.
