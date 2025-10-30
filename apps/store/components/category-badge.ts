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

function getBadgePalette(category?: string): BadgePalette {
  return CATEGORY_BADGE_PALETTE[category?.toLowerCase() ?? ""] ?? DEFAULT_BADGE_PALETTE;
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
