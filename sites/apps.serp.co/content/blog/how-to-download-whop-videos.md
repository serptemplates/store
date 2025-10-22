# 🎥 How to Download Videos from Whop (Mux Streams) with yt-dlp

Whop.com hosts its videos using **Mux**, which serves them over **HLS streaming** (`.m3u8` playlists with short-lived tokens). 

If you want to save these videos locally as clean `.mp4` files, you can do it reliably with the following process...

👉 Or you can just get the [Whop Video Downloader](https://serp.ly/whop-video-downloader)


# Click the image below to watch the video 👇

<a href="https://www.youtube.com/watch?v=oWmu4MOS2HE" target="_blank">
<img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/how-to-download-whop-videos-for-free-step-by-step-guide-to-downloading-videos-from-whopcom.jpg" width="700px">
</a>

---

## 🔎 Step 1: Capture the `.m3u8?token=...` URL

1. Open the video on Whop.
2. Open DevTools → **Network tab**.
3. Play the video.
4. Filter requests by `m3u8`.
5. Copy the `https://stream.mux.com/...m3u8?token=...` link.

* ⚠️ This link is **time-limited** (`?token=` contains an expiry). If it stops working, grab a fresh one.

---

## 💻 Step 2: Run yt-dlp

Use this command to download the video:

```bash
yt-dlp \
  --no-playlist \
  --concurrent-fragments 16 \
  -f "bv*+ba/b" \
  --merge-output-format mp4 \
  --postprocessor-args "ffmpeg:-movflags +faststart" \
  -o "video.mp4" \
  "URL"
```



## 🔑 Flag Breakdown

* `--no-playlist` → ensures only the video you give is downloaded.
* `--concurrent-fragments 16` → downloads HLS segments in parallel for speed.
* `-f "bv*+ba/b"` → grabs **best video + best audio** and merges, fallback if only one stream exists.
* `--merge-output-format mp4` → ensures the final file is `.mp4`.
* `--postprocessor-args "ffmpeg:-movflags +faststart"` → optimizes MP4 for instant playback.
* `-o "video.mp4"` → avoids filename-too-long errors caused by tokenized URLs.

