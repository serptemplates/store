# Udemy Downloader — Product Writeup

## About
Udemy Downloader is a companion tool designed to help you save Udemy course videos locally for offline learning. The repository includes both a browser extension companion and a native helper for handling protected streams.

It’s intended for users who already have access to course content and want a reliable way to keep personal offline copies.

## Features

- Save Udemy course videos you can access
- Support for protected streams via companion native host
- Queue downloads and view progress
- Filename sanitization and save-as
- Local storage of download progress
- Privacy focused — only local processing

## FAQs

Q: Will this bypass Udemy’s access controls?

A: No. This tool requires that you have legitimate access to the course content in your account; it does not bypass paywalls.

Q: Is a native component required?

A: For some protected streams the companion native host helps with decryption/processing; follow the repo’s companion instructions if needed.

## Permission Justifications

- downloads — To save course videos locally.
- storage — To persist download state and configuration.
- native host (optional) — To assist with protected stream handling when authorized by the user.
