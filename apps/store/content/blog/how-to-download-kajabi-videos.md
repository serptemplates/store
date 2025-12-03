# How to Download Kajabi Videos (Wistia Embed Method)

Wistia usually hides its video streams behind embed scripts, but every Wistia video ultimately loads an **HLS playlist** ending in `.m3u8`. 

Once you locate that playlist URL, downloading the video becomes simple using tools like `yt-dlp` or `ffmpeg`.

**This guide walks you through:**

1. How to find the `.m3u8` URL using Chrome DevTools  
2. How to download the video using `yt-dlp` (recommended)  
3. Alternative download methods  
4. How to fix common issues like 403 errors

---

👉 Get the [Kajabi Video Downloader](https://serp.ly/kajabi-video-downloader)

---

## 1. How to Find the Wistia `.m3u8` URL Using Chrome DevTools

Follow these steps on the page where the Wistia video is embedded.

### **Step 1 — Open Developer Tools**

Use the shortcuts:

- **Mac:** `⌥ Option + ⌘ Command + I`  
- **Windows:** `Ctrl + Shift + I`

Then switch to the **Network** tab.

---

### **Step 2 — Reload the Page**

Press:

- **Mac:** `⌘R`
- **Windows:** `Ctrl+R`

This ensures all network requests reload and appear in the list.

---

### **Step 3 — Filter for `.m3u8`**

In the Network search bar, type: `m3u8`

You should see a request similar to: `https://fast.wistia.com/embed/medias/XXXXXXXX.m3u8`

or

`https://embed-abc.wistia.com/deliveries/abcdef123456.m3u8`

### **Step 4 — Copy the Full URL**

Right-click the `.m3u8` request →  
**Copy → Copy URL**

This is your direct video stream URL.

---

## 2. Download the Wistia Video Using `yt-dlp` (Recommended)

Once you have the `.m3u8` link, run: `yt-dlp “M3U8_URL_HERE”`

Example: `yt-dlp “https://fast.wistia.com/embed/medias/vh3fhq0jkl.m3u8”`


This will:

- Detect the highest quality
- Download all HLS segments
- Merge them into a final MP4 file automatically

---

### **Download best quality explicitly**

```bash
yt-dlp -f best “https://fast.wistia.com/embed/medias/vh3fhq0jkl.m3u8”
```

### **Save with a custom filename**

```bash
yt-dlp -o “video.mp4” “https://fast.wistia.com/embed/medias/vh3fhq0jkl.m3u8”
```

## Summary

| Tool        | Best For | Command Example                                       |
|-------------|----------|--------------------------------------------------------|
| yt-dlp      | **Easiest & Best Quality** | `yt-dlp M3U8_URL`                       |
| ffmpeg      | Manual control | `ffmpeg -i M3U8_URL -c copy out.mp4`              |
| streamlink  | Live streams | `streamlink M3U8_URL best -o out.mp4`               |


## Related

- https://github.com/serpapps/kajabi-video-downloader/
- [Kajabi video downloader](https://gist.github.com/devinschumacher/fc36d6910ab8eb6a7a8f155429bb49d8)
- [How to download Kajabi videos](https://gist.github.com/devinschumacher/c5b09ecc5ef22342b9d5d605de73d6ef)