"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_SYNONYMS = exports.ACCEPTED_CATEGORIES = exports.SECONDARY_CATEGORIES = exports.CATEGORY_RULES = exports.PRIMARY_CATEGORIES = void 0;
exports.canonicalizeAcceptedCategory = canonicalizeAcceptedCategory;
exports.PRIMARY_CATEGORIES = [
    "Downloader",
    "Artificial Intelligence",
    "Adult",
    "Course Platforms",
    "Livestream",
    "Creative Assets",
    "Image Hosting",
    "Movies & TV",
    "Social Media",
];
exports.CATEGORY_RULES = [
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
exports.SECONDARY_CATEGORIES = [
    "Video Downloader",
    "Image Downloader",
    "Audio Downloader",
    "Music",
    "File Storage",
    "Productivity",
    "Utilities",
];
exports.ACCEPTED_CATEGORIES = [
    ...exports.PRIMARY_CATEGORIES,
    ...exports.SECONDARY_CATEGORIES,
];
// Synonyms and legacy labels that should map to canonical accepted labels
exports.CATEGORY_SYNONYMS = {
    "ai tools": "Artificial Intelligence",
    "video downloaders": "Video Downloader",
    "image downloaders": "Image Downloader",
    "audio downloaders": "Audio Downloader",
};
function canonicalizeAcceptedCategory(label) {
    if (typeof label !== "string")
        return null;
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    const lower = trimmed.toLowerCase();
    const synonym = exports.CATEGORY_SYNONYMS[lower];
    if (synonym)
        return synonym;
    const all = exports.ACCEPTED_CATEGORIES;
    const found = all.find((c) => c.toLowerCase() === lower);
    return found ?? null;
}
