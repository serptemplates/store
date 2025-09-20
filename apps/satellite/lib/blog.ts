import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  readingTime: string;
};

export type BlogPost = {
  meta: BlogPostMeta;
  content: string;
};

// Resolve relative to the app workspace so dev server + builds find the content directory
const defaultBlogRoot = path.join(process.cwd(), "content/blog");

type BlogSource = {
  path: string;
  scope: "site" | "shared";
};

type ParsedPost = {
  meta: BlogPostMeta;
  content: string;
};

let cachedPosts: ParsedPost[] | null = null;

function getSiteSlug(): string | undefined {
  if (process.env.SITE_SLUG?.trim()) {
    return process.env.SITE_SLUG.trim();
  }

  const configPath = process.env.SITE_CONFIG_PATH;
  if (configPath?.trim()) {
    const dirName = path.basename(path.dirname(configPath));
    if (dirName && dirName !== "sites") {
      return dirName;
    }
  }

  return undefined;
}

function resolveBlogSources(): BlogSource[] {
  const sources: BlogSource[] = [];

  const siteSlug = getSiteSlug();

  const explicitContentPath = process.env.SITE_CONTENT_PATH;
  if (explicitContentPath?.trim()) {
    const resolved = path.isAbsolute(explicitContentPath)
      ? explicitContentPath
      : path.join(process.cwd(), explicitContentPath);
    if (fs.existsSync(resolved)) {
      sources.push({ path: resolved, scope: "site" });
    }
  } else if (siteSlug) {
    const derived = path.join(process.cwd(), "sites", siteSlug, "content", "blog");
    if (fs.existsSync(derived)) {
      sources.push({ path: derived, scope: "site" });
    }
  }

  if (fs.existsSync(defaultBlogRoot)) {
    sources.push({ path: defaultBlogRoot, scope: "shared" });
  }

  return sources;
}

function loadPosts(): ParsedPost[] {
  if (cachedPosts) {
    return cachedPosts;
  }

  const sources = resolveBlogSources();
  if (sources.length === 0) {
    cachedPosts = [];
    return cachedPosts;
  }

  const siteSlug = getSiteSlug();
  const seenSlugs = new Set<string>();
  const posts: ParsedPost[] = [];

  for (const source of sources) {
    const files = fs
      .readdirSync(source.path)
      .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));

    for (const file of files) {
      const slug = file.replace(/\.mdx?$/, "");
      if (seenSlugs.has(slug)) {
        continue;
      }

      const filePath = path.join(source.path, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);

      if (data?.draft) {
        continue;
      }

      const allowedSites = Array.isArray(data?.sites)
        ? data.sites.map((value: unknown) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
        : undefined;

      if (allowedSites && siteSlug && !allowedSites.includes(siteSlug)) {
        continue;
      }

      const stats = readingTime(content);

      posts.push({
        meta: {
          slug,
          title: data?.title ?? slug,
          description: data?.description ?? "",
          date: data?.date ?? new Date().toISOString(),
          author: data?.author ?? "SERP Apps",
          tags: Array.isArray(data?.tags) ? data.tags : [],
          image: data?.image,
          readingTime: data?.readingTime ?? stats.text,
        },
        content,
      });

      seenSlugs.add(slug);
    }
  }

  cachedPosts = posts.sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
  return cachedPosts;
}

export function clearBlogCache() {
  cachedPosts = null;
}

export function getAllPosts(): BlogPostMeta[] {
  return loadPosts().map((entry) => entry.meta);
}

export function getPostBySlug(slug: string): BlogPost | null {
  const entry = loadPosts().find((post) => post.meta.slug === slug);
  if (!entry) {
    return null;
  }

  return {
    meta: entry.meta,
    content: entry.content,
  };
}
