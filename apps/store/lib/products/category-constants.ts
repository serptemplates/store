export const PRIMARY_CATEGORIES = [
  "Downloader",
  "Artificial Intelligence",
  "Adult",
  "Course Platforms",
  "Livestream",
  "Creative Assets",
  "Image Hosting",
  "Movies & TV",
  "Social Media",
] as const;

export type CategoryLabel = (typeof PRIMARY_CATEGORIES)[number];

export type CategoryRule = {
  label: CategoryLabel;
  keywords: string[];
};

export const CATEGORY_RULES: CategoryRule[] = [
  {
    label: "Adult",
    keywords: [
      "adult",
      "porn",
      "xxx",
      "xvideos",
      "xhamster",
      "xnxx",
      "stripchat",
      "cam",
      "camsoda",
      "bonga",
      "beeg",
      "spank",
      "erome",
      "erothots",
      "tnaflix",
      "livejasmin",
      "chaturbate",
      "myfreecams",
      "youporn",
      "redtube",
      "eporner",
      "redgifs",
      "soundgasm",
    ],
  },
  {
    label: "Course Platforms",
    keywords: [
      "course",
      "udemy",
      "skillshare",
      "teachable",
      "academy",
      "learn",
      "learning",
      "education",
      "university",
      "khan",
      "thinkific",
      "kajabi",
      "learndash",
      "moodle",
      "whop",
      "skool",
      "communities",
      "podia",
    ],
  },
  {
    label: "Livestream",
    keywords: [
      "livestream",
      "live stream",
      "stream",
      "twitch",
      "kick",
      "m3u8",
      "live",
      "broadcast",
      "webcast",
    ],
  },
  {
    label: "Creative Assets",
    keywords: [
      "stock",
      "vector",
      "graphic",
      "design",
      "creative",
      "storyblocks",
      "stocksy",
      "stockvault",
      "dreamstime",
      "123rf",
      "vectorstock",
      "freepik",
      "pixabay",
      "unsplash",
      "pexels",
      "rawpixel",
      "depositphotos",
      "shutterstock",
      "adobe",
      "canva",
      "giphy",
      "deviantart",
      "creative market",
    ],
  },
  {
    label: "Image Hosting",
    keywords: [
      "image",
      "photo",
      "gallery",
      "pixabay",
      "pexels",
      "unsplash",
      "deviantart",
      "flickr",
      "giphy",
      "terabox",
      "vectorstock",
      "image hosting",
      "thumbnail",
    ],
  },
  {
    label: "Movies & TV",
    keywords: [
      "movie",
      "movies",
      "film",
      "tv",
      "cinema",
      "123movies",
      "netflix",
      "hulu",
      "tubi",
      "prime",
      "amazon video",
      "vod",
    ],
  },
  {
    label: "Social Media",
    keywords: [
      "social",
      "facebook",
      "instagram",
      "tiktok",
      "youtube",
      "twitter",
      "snapchat",
      "vk",
      "reddit",
      "onlyfans",
      "pinterest",
      "telegram",
      "patreon",
      "circle",
      "clientclub",
      "gokollab",
      "soundcloud",
    ],
  },
];

// Secondary (allowed) categories that we support explicitly in content
export const SECONDARY_CATEGORIES = [
  "Video Downloader",
  "Image Downloader",
  "Audio Downloader",
  "Music",
  "File Storage",
  "Productivity",
  "Utilities",
  "Privacy & Security",
] as const;

export const ACCEPTED_CATEGORIES = [
  ...PRIMARY_CATEGORIES,
  ...SECONDARY_CATEGORIES,
] as const;

// Synonyms and legacy labels that should map to canonical accepted labels
export const CATEGORY_SYNONYMS: Record<string, string> = {
  "ai tools": "Artificial Intelligence",
  "video downloaders": "Video Downloader",
  "image downloaders": "Image Downloader",
  "audio downloaders": "Audio Downloader",
};

export function canonicalizeAcceptedCategory(label: string): string | null {
  if (typeof label !== "string") return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const synonym = CATEGORY_SYNONYMS[lower];
  if (synonym) return synonym;
  const all: readonly string[] = ACCEPTED_CATEGORIES as unknown as readonly string[];
  const found = all.find((c) => c.toLowerCase() === lower);
  return found ?? null;
}
