const BASE_BADGE_CLASSES =
  "inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors";

type BadgePalette = {
  background: string;
  text: string;
  hoverBackground?: string;
  hoverText?: string;
};

const CATEGORY_BADGE_PALETTE: Record<string, BadgePalette> = {
  downloader: {
    background: "bg-[#e5f4ff]",
    text: "text-[#0d4d8f]",
    hoverBackground: "hover:bg-[#d5ecff] group-hover:bg-[#d5ecff]",
    hoverText: "hover:text-[#0a3c70] group-hover:text-[#0a3c70]",
  },
  audio: {
    background: "bg-[#e6f3ff]",
    text: "text-[#0c4a7a]",
    hoverBackground: "hover:bg-[#d4eaff] group-hover:bg-[#d4eaff]",
    hoverText: "hover:text-[#08365a] group-hover:text-[#08365a]",
  },
  "artificial intelligence": {
    background: "bg-[#ede7ff]",
    text: "text-[#5530c1]",
    hoverBackground: "hover:bg-[#ded2ff] group-hover:bg-[#ded2ff]",
    hoverText: "hover:text-[#44249f] group-hover:text-[#44249f]",
  },
  adult: {
    background: "bg-[#ffe8ed]",
    text: "text-[#9b1c31]",
    hoverBackground: "hover:bg-[#ffd3dc] group-hover:bg-[#ffd3dc]",
    hoverText: "hover:text-[#851326] group-hover:text-[#851326]",
  },
  "course platforms": {
    background: "bg-[#f1f5f9]",
    text: "text-[#1e293b]",
    hoverBackground: "hover:bg-[#e2e8f0] group-hover:bg-[#e2e8f0]",
    hoverText: "hover:text-[#111827] group-hover:text-[#111827]",
  },
  comics: {
    background: "bg-[#fff3e6]",
    text: "text-[#9a3412]",
    hoverBackground: "hover:bg-[#ffe0c2] group-hover:bg-[#ffe0c2]",
    hoverText: "hover:text-[#7c260b] group-hover:text-[#7c260b]",
  },
  enterprise: {
    background: "bg-[#eef2ff]",
    text: "text-[#312e81]",
    hoverBackground: "hover:bg-[#e0e7ff] group-hover:bg-[#e0e7ff]",
    hoverText: "hover:text-[#1e1b4b] group-hover:text-[#1e1b4b]",
  },
  livestream: {
    background: "bg-[#fff1d6]",
    text: "text-[#a15c00]",
    hoverBackground: "hover:bg-[#ffe3ad] group-hover:bg-[#ffe3ad]",
    hoverText: "hover:text-[#7b4600] group-hover:text-[#7b4600]",
  },
  "creative assets": {
    background: "bg-[#fbe7ff]",
    text: "text-[#7d2a8f]",
    hoverBackground: "hover:bg-[#f4d2ff] group-hover:bg-[#f4d2ff]",
    hoverText: "hover:text-[#662175] group-hover:text-[#662175]",
  },
  "image hosting": {
    background: "bg-[#e5fbf2]",
    text: "text-[#0f766e]",
    hoverBackground: "hover:bg-[#ccf4e3] group-hover:bg-[#ccf4e3]",
    hoverText: "hover:text-[#0b5c56] group-hover:text-[#0b5c56]",
  },
  "file storage": {
    background: "bg-[#eafcf4]",
    text: "text-[#0e5f3a]",
    hoverBackground: "hover:bg-[#d7f7e8] group-hover:bg-[#d7f7e8]",
    hoverText: "hover:text-[#0b472b] group-hover:text-[#0b472b]",
  },
  "movies & tv": {
    background: "bg-[#e9edff]",
    text: "text-[#3546d3]",
    hoverBackground: "hover:bg-[#d4dbff] group-hover:bg-[#d4dbff]",
    hoverText: "hover:text-[#2b3bb1] group-hover:text-[#2b3bb1]",
  },
  "social media": {
    background: "bg-[#dbe8ff]",
    text: "text-[#1a46ad]",
    hoverBackground: "hover:bg-[#c5d8ff] group-hover:bg-[#c5d8ff]",
    hoverText: "hover:text-[#15398d] group-hover:text-[#15398d]",
  },
};

const DEFAULT_BADGE_PALETTE: BadgePalette = {
  background: "bg-[#f6f8fa]",
  text: "text-[#2f363d]",
  hoverBackground: "hover:bg-[#eaeef2] group-hover:bg-[#eaeef2]",
  hoverText: "hover:text-[#1f2328] group-hover:text-[#1f2328]",
};

const CATEGORY_SYNONYMS: Record<string, string> = {
  audio: "audio",
  "audio downloader": "audio",
  "audio downloaders": "audio",
  "audio production": "audio",
  music: "audio",
  comics: "comics",
  "community": "social media",
  communities: "social media",
  education: "course platforms",
  "file storage": "file storage",
  "image": "image hosting",
  images: "image hosting",
  "image downloader": "image hosting",
  "image downloaders": "image hosting",
  enterprise: "enterprise",
  social: "social media",
  "stock media": "creative assets",
  video: "movies & tv",
  "video downloader": "downloader",
  "video downloaders": "downloader",
};

function normalizeCategory(category?: string): string {
  return category?.trim().toLowerCase() ?? "";
}

function getBadgePalette(category?: string): BadgePalette {
  const normalized = normalizeCategory(category);
  if (!normalized) {
    return DEFAULT_BADGE_PALETTE;
  }
  const resolved = CATEGORY_SYNONYMS[normalized] ?? normalized;
  return CATEGORY_BADGE_PALETTE[resolved] ?? DEFAULT_BADGE_PALETTE;
}

export function getCategoryBadgeClasses(category?: string) {
  const palette = getBadgePalette(category);
  return [
    BASE_BADGE_CLASSES,
    palette.background,
    palette.text,
    palette.hoverBackground ?? "",
    palette.hoverText ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
