export function useHeroTitle(title: string, highlight?: string) {
  if (highlight && title.toLowerCase().includes(highlight.toLowerCase())) {
    const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
    return [
      title.slice(0, idx),
      title.slice(idx, idx + highlight.length),
      title.slice(idx + highlight.length),
    ];
  } else {
    const [first, ...rest] = title.split(/\s+/);
    return ["", first ?? "", rest.join(" ")];
  }
}

export function getVideoEmbedUrl(videoSrc: string) {
  try {
    const url = new URL(videoSrc);

    // Handle YouTube watch URLs and short links
    const isYouTube =
      /(^|\.)youtube\.com$/.test(url.hostname) ||
      /(^|\.)youtube-nocookie\.com$/.test(url.hostname);
    const isYoutuBe = /(^|\.)youtu\.be$/.test(url.hostname);

    if (isYouTube) {
      if (url.pathname === "/watch") {
        const v = url.searchParams.get("v");
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (url.pathname.startsWith("/live/")) {
        const id = url.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (isYoutuBe) {
      const id = url.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Default: return provided src
    return videoSrc;
  } catch {
    return videoSrc;
  }
}

export function getYoutubeThumbnail(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com"
    ) {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } else if (parsedUrl.hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.slice(1);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    return null;
  } catch {
    return null;
  }
}
