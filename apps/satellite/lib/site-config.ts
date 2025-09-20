import fs from "node:fs";
import path from "node:path";

export type SiteConfig = {
  site?: {
    name?: string;
    domain?: string;
    logo?: string;
  };
  navigation?: {
    links?: Array<{ label: string; href: string }>;
  };
  cta?: {
    text?: string;
    href?: string;
  };
  excludeSlugs?: string[];
};

const defaultConfigPath = path.join(process.cwd(), "data", "site.config.json");

type CachedConfig = {
  path: string;
  value: SiteConfig;
};

let cachedConfig: CachedConfig | null = null;

function resolveConfigPath(): string {
  const customPath = process.env.SITE_CONFIG_PATH;
  if (customPath && customPath.trim().length > 0) {
    return path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
  }
  return defaultConfigPath;
}

export function getSiteConfig(): SiteConfig {
  const configPath = resolveConfigPath();

  if (cachedConfig && cachedConfig.path === configPath) {
    return cachedConfig.value;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as SiteConfig;
    cachedConfig = { path: configPath, value: parsed ?? {} };
    return cachedConfig.value;
  } catch (error) {
    if (configPath !== defaultConfigPath) {
      console.warn(`[site-config] Failed to load ${configPath}. Falling back to default config.`);
      try {
        const raw = fs.readFileSync(defaultConfigPath, "utf8");
        const parsed = JSON.parse(raw) as SiteConfig;
        cachedConfig = { path: defaultConfigPath, value: parsed ?? {} };
        return cachedConfig.value;
      } catch (fallbackError) {
        console.warn(`[site-config] Failed to load default config:`, fallbackError);
      }
    }

    cachedConfig = { path: configPath, value: {} };
    return {};
  }
}

export function isExcludedSlug(slug: string): boolean {
  const excludes = getSiteConfig().excludeSlugs ?? [];
  return excludes.includes(slug);
}
