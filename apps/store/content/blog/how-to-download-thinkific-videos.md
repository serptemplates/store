# How to Download Thinkific Videos for Free

In this article, I will show you walkthrough example of download videos from Thinkific. 

This Thinkific course uses **Wistia** to host all course videos. That means every Thinkific video ultimately loads as an **HLS `.m3u8` playlist**, which you can download with `yt-dlp`.

---

## Step 1 — Open DevTools on the Thinkific lesson video page

1. Open the Thinkific course lesson containing the video.  
2. Right-click anywhere → **Inspect**.  
3. Go to the **Network** tab  
4. Click **Preserve Log** 
5. Refresh the page & play the video
6. Filter for: `m3u8`


![1](https://raw.githubusercontent.com/serpapps/thinkific-downloader/refs/heads/main/images/how-to-download-thinkific-videos-1.jpg)


## Step 2 — Select the Correct m3u8 where the 'Request URL' is fast.wistia

You will usually see **multiple** `.m3u8` links, such as:

- `https://embed-cloudfront.wistia.com/deliveries/...m3u8`
- `https://fast.wistia.com/embed/medias/XXXXXXXXXX.m3u8`

### ✅ Always choose this format:

```bash
https://fast.wistia.com/embed/medias/XXXXXXXXXX.m3u8
```

This is the **master playlist**, which:

- Contains all quality levels  
- Ensures yt-dlp downloads the **best** version  
- Avoids CloudFront single-quality variants  
- Works consistently


![2](https://raw.githubusercontent.com/serpapps/thinkific-downloader/refs/heads/main/images/how-to-download-thinkific-videos-2.jpg)




## Step 3 — Download Using yt-dlp

Run this command format in your terminal program:

```bash
yt-dlp "URL"
```

Be sure to replace `URL` with the actual fast.wistia URL, for example:

```bash
yt-dlp "https://fast.wistia.com/embed/medias/gpniwm7cus.m3u8"
```

yt-dlp will:

- Pull the master playlist  
- Select the best stream  
- Download & merge all segments  
- Output a clean `.mp4`

---

## Related

- [Repository](https://github.com/serpapps/thinkific-downloader)
- [Thinkific Downloader Annoucement](https://gist.github.com/devinschumacher/d8eecdcd0b2326e9371e5b9ffe0f85b2)
- [How to Download Thinkific Videos for Free](https://gist.github.com/devinschumacher/197805b63733a570539b587cdf229391)
