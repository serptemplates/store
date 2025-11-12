export type TrademarkedBrand = {
  label: string;
  aliases: readonly string[];
};

export const TRADEMARKED_BRANDS: readonly TrademarkedBrand[] = [
  { label: "123movies", aliases: ["123movies"] },
  { label: "123RF", aliases: ["123rf"] },
  { label: "Adobe", aliases: ["adobe", "adobe stock"] },
  { label: "Alamy", aliases: ["alamy"] },
  { label: "Amazon", aliases: ["amazon"] },
  { label: "Beeg", aliases: ["beeg"] },
  { label: "Bilibili", aliases: ["bilibili"] },
  { label: "BongaCams", aliases: ["bongacams"] },
  { label: "CamSoda", aliases: ["camsoda"] },
  { label: "Canva", aliases: ["canva"] },
  { label: "Chaturbate", aliases: ["chaturbate"] },
  { label: "Circle", aliases: ["circle"] },
  { label: "ClientClub", aliases: ["clientclub", "client club"] },
  { label: "Coursera", aliases: ["coursera"] },
  { label: "Creative Market", aliases: ["creative market"] },
  { label: "Dailymotion", aliases: ["dailymotion"] },
  { label: "Depositphotos", aliases: ["depositphotos"] },
  { label: "DeviantArt", aliases: ["deviantart"] },
  { label: "Dreamstime", aliases: ["dreamstime"] },
  { label: "Eporner", aliases: ["eporner"] },
  { label: "Erome", aliases: ["erome"] },
  { label: "Facebook", aliases: ["facebook"] },
  { label: "Flickr", aliases: ["flickr"] },
  { label: "Freepik", aliases: ["freepik"] },
  { label: "Getty Images", aliases: ["getty", "getty images"] },
  { label: "Giphy", aliases: ["giphy"] },
  { label: "GoHighLevel", aliases: ["gohighlevel", "highlevel"] },
  { label: "Gokollab", aliases: ["gokollab"] },
  { label: "Hulu", aliases: ["hulu"] },
  { label: "Instagram", aliases: ["instagram"] },
  { label: "Internet Archive", aliases: ["internet archive"] },
  { label: "iStock", aliases: ["istock", "istockphoto"] },
  { label: "Kajabi", aliases: ["kajabi"] },
  { label: "Khan Academy", aliases: ["khan academy"] },
  { label: "Kick", aliases: ["kick"] },
  { label: "LearnDash", aliases: ["learndash"] },
  { label: "LearnWorlds", aliases: ["learnworlds"] },
  { label: "LinkedIn", aliases: ["linkedin", "linkedin learning"] },
  { label: "LiveJasmin", aliases: ["livejasmin"] },
  { label: "Loom", aliases: ["loom"] },
  { label: "Moodle", aliases: ["moodle"] },
  { label: "MyFreeCams", aliases: ["myfreecams"] },
  { label: "Netflix", aliases: ["netflix"] },
  { label: "Niconico", aliases: ["niconico"] },
  { label: "OnlyFans", aliases: ["onlyfans"] },
  { label: "Patreon", aliases: ["patreon"] },
  { label: "Pexels", aliases: ["pexels"] },
  { label: "Pinterest", aliases: ["pinterest"] },
  { label: "Pixabay", aliases: ["pixabay"] },
  { label: "Podia", aliases: ["podia"] },
  { label: "Pornhub", aliases: ["pornhub"] },
  { label: "Rawpixel", aliases: ["rawpixel"] },
  { label: "Reddit", aliases: ["reddit"] },
  { label: "Redgifs", aliases: ["redgifs"] },
  { label: "Redtube", aliases: ["redtube"] },
  { label: "Scribd", aliases: ["scribd"] },
  { label: "Shutterstock", aliases: ["shutterstock"] },
  { label: "Skillshare", aliases: ["skillshare"] },
  { label: "Skool", aliases: ["skool"] },
  { label: "Snapchat", aliases: ["snapchat"] },
  { label: "SoundCloud", aliases: ["soundcloud"] },
  { label: "SpankBang", aliases: ["spankbang"] },
  { label: "Sprout", aliases: ["sprout"] },
  { label: "Stocksy", aliases: ["stocksy"] },
  { label: "Stockvault", aliases: ["stockvault"] },
  { label: "Storyblocks", aliases: ["storyblocks"] },
  { label: "Stripchat", aliases: ["stripchat"] },
  { label: "Teachable", aliases: ["teachable"] },
  { label: "Telegram", aliases: ["telegram"] },
  { label: "Terabox", aliases: ["terabox"] },
  { label: "Thinkific", aliases: ["thinkific"] },
  { label: "TikTok", aliases: ["tiktok"] },
  { label: "TNAFlix", aliases: ["tnaflix"] },
  { label: "Tubi", aliases: ["tubi"] },
  { label: "Tumblr", aliases: ["tumblr"] },
  { label: "Twitch", aliases: ["twitch"] },
  { label: "Twitter", aliases: ["twitter", "x.com", "x corp", "xcorp"] },
  { label: "Udemy", aliases: ["udemy"] },
  { label: "Unsplash", aliases: ["unsplash"] },
  { label: "VectorStock", aliases: ["vectorstock"] },
  { label: "Vimeo", aliases: ["vimeo"] },
  { label: "VK", aliases: ["vk", "vkontakte"] },
  { label: "Whop", aliases: ["whop"] },
  { label: "Wistia", aliases: ["wistia"] },
  { label: "XHamster", aliases: ["xhamster"] },
  { label: "XNXX", aliases: ["xnxx"] },
  { label: "XVideos", aliases: ["xvideos"] },
  { label: "YouPorn", aliases: ["youporn"] },
  { label: "YouTube", aliases: ["youtube"] },
] as const;

type NormalizedBrandAlias = {
  label: string;
  normalized: string;
  padded: string;
};

const NORMALIZED_BRANDS: readonly NormalizedBrandAlias[] = TRADEMARKED_BRANDS.flatMap((brand) =>
  brand.aliases
    .map((alias) => normalize(alias))
    .filter((normalized): normalized is string => normalized.length > 0)
    .map((normalized) => ({ label: brand.label, normalized, padded: ` ${normalized} ` })),
);

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectTrademarkedBrand(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    return null;
  }
  const paddedValue = ` ${normalizedValue} `;
  const match = NORMALIZED_BRANDS.find((entry) => paddedValue.includes(entry.padded));
  return match?.label ?? null;
}

type ProductLike = {
  name?: string | null;
  platform?: string | null;
  slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  keywords?: readonly unknown[] | null;
};

export function inferTrademarkedBrand(product?: ProductLike | null): string | null {
  if (!product) {
    return null;
  }

  const candidates: string[] = [];
  const push = (value?: string | null) => {
    if (typeof value === "string" && value.trim().length > 0) {
      candidates.push(value);
    }
  };

  push(product.name ?? undefined);
  push(product.platform ?? undefined);
  push(product.slug ?? undefined);
  push(product.seo_title ?? undefined);
  push(product.seo_description ?? undefined);

  if (Array.isArray(product.keywords)) {
    for (const keyword of product.keywords) {
      if (typeof keyword === "string") {
        push(keyword);
      }
    }
  }

  for (const value of candidates) {
    const detected = detectTrademarkedBrand(value);
    if (detected) {
      return detected;
    }
  }

  return null;
}
