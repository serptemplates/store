# Vimeo Video Downloader — Product Writeup

## About
Download Vimeo videos directly to your computer with a small, focused popup. The extension detects Vimeo players and offers quality choices so you can save the video you need.

Ideal for creators and viewers who want local backups of Vimeo-hosted content.

## Features

- Detect Vimeo player and embeds
- Pick quality and save-as
- Download manager with progress
- Offscreen merging/processing
- Chunked downloads with retries
- Local history and sync
- Privacy focused — no data shared
- No ads or watermarks

## FAQs

Q: Can I download private Vimeo videos?

A: If you can play the video in your browser (signed in or with access), the extension can usually detect it.

Q: Will the file be changed?

A: The extension saves or merges original streams and does not add watermarks.

## Permission Justifications

- downloads — To save Vimeo videos locally.
- storage — To persist download history and state.
- tabs / activeTab — To detect players and offer UI.
- scripting — To inject page detectors and helpers.
- offscreen — To process segment merging and finalization.
