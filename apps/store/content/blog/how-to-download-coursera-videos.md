---
slug: how-to-download-coursera-videos
title: "How to Download Coursera Videos for FREE (yt-dlp tutorial)"
seoTitle: "How to Download Coursera Videos for FREE (yt-dlp tutorial)"
description: "Download Coursera lectures with yt-dlp by capturing MP4 or HLS/DASH URLs from DevTools. Step-by-step workflow and examples."
seoDescription: "Step-by-step guide to download Coursera videos using yt-dlp by extracting MP4 or HLS/DASH stream URLs from the Network tab in DevTools."
date: '2025-11-07T00:00:00.000Z'
author: Devin Schumacher
image: https://i.ytimg.com/vi/iuX_rUFVcWg/maxresdefault.jpg
tags:
  - coursera
  - yt-dlp
  - hls
  - download
---

# How to Download Coursera Videos for FREE (yt-dlp tutorial)

## Follow along with the video 👇

<a href="https://www.youtube.com/watch?v=iuX_rUFVcWg" target="_blank">
  <img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/how-to-download-coursera-videos-for-free-yt-dlp-tutorial.jpg" width="700px" />
</a>


## Steps

1. Visit the Coursera lesson page & open devtools
2. Select the .mp4
3. Copy the URL & use yt-dlp to download
 

## Step 1: Visit the Coursera lesson page & open devtools

- Visit the Coursera lesson page (where the video is)
- Open devtools to the network tab (right click > inspect > network) & enable "preserve logs"

## Step 2: Select the .mp4

- Filter for `mp4`
- Click the entry with `Content-Type: video/mp4` and copy the `Request URL`

![post1](https://gist.github.com/user-attachments/assets/ddf248c5-14fb-499b-8d00-d38246739b0c)


## Step 3: Copy the URL & use yt-dlp to download

- Download the video using `yt-dlp` in your Terminal program

```bash
# syntax
yt-dlp "REPLACE_ME_WITH_URL"
```

```bash
# example
yt-dlp "https://d3c33hcgiwev3.cloudfront.net/kZolKy_nEemnrA4AsaAhFA.processed/full/540p/index.mp4?Expires=1762646400&Signature=MvT4Thuyt8iKf1XR9hWDL6KtmexqybB1vLcT5jnLl-9mvW65Nkx4O~AteosR4~0NJsIoVD8FUPh7yu10QboI7NCc5hrGCOGJSYClht87aZeFd1PUdnsSNdYJ4mDk2M82pRRZGx5-PONTxqkCJqyz2SC6oGBMvRiv94KnEhbHTSU_&Key-Pair-Id=APKAJLTNE6QMUY6HBC5A"
```

> Note: The URL is time‑limited. If it expires (403/AccessDenied), re‑capture a fresh link.


## Related 

- [Repository](https://github.com/serpapps/coursera-downloader)
- [How to Download Coursera Videos](https://gist.github.com/devinschumacher/c5b806b64108b6ffea25c91076d1567e)
- [Coursera Downloader Product Page](https://apps.serp.co/coursera-downloader)
- [Coursera downloader launch](https://gist.github.com/devinschumacher/5258f96225c4b1a45f1c13502c445298)
