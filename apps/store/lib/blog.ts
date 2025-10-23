import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

import { titleCase } from "./string-utils";

export type BlogPostMeta = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  seoDescription: string;
  date: string;
  author: string;
  authorUrl?: string;
  tags: string[];
  image?: string;
  readingTime: string;
  category?: string;
  dateModified?: string;
};

type Frontmatter = Record<string, unknown> & {
  slug?: string;
  title?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt?: string;
  author?: string;
  authorUrl?: string;
};

// Resolve relative to the app workspace so dev server + builds find the content directory.
const blogRoot = path.join(process.cwd(), "content", "blog");

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "post";
}

function deriveSlug(fileName: string, data: Frontmatter | undefined): string {
  if (data?.slug && typeof data.slug === "string" && data.slug.trim().length > 0) {
    return slugify(data.slug);
  }
  const baseName = fileName.replace(/\.mdx?$/i, "");
  return slugify(baseName);
}

function extractTitle(data: Frontmatter | undefined, content: string, slug: string): { title: string; seoTitle: string } {
  const titleFromFrontmatter = typeof data?.title === "string" ? data.title.trim() : undefined;
  const seoTitleFromFrontmatter = typeof data?.seoTitle === "string" ? data.seoTitle.trim() : undefined;

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const heading = titleMatch?.[1]?.trim();

  const fallback = titleCase(slug.replace(/-/g, " "));
  const resolvedTitle = titleFromFrontmatter || heading || fallback;
  const resolvedSeoTitle = seoTitleFromFrontmatter || resolvedTitle;

  return {
    title: resolvedTitle,
    seoTitle: resolvedSeoTitle,
  };
}

function cleanMarkdownBlock(block: string): string {
  return block
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^>+\s?/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveDescription(content: string, data: Frontmatter | undefined): string {
  const fromFrontmatter =
    (typeof data?.seoDescription === "string" && data.seoDescription.trim()) ||
    (typeof data?.description === "string" && data.description.trim()) ||
    (typeof data?.excerpt === "string" && data.excerpt.trim()) ||
    "";

  if (fromFrontmatter.length > 0) {
    return truncateDescription(fromFrontmatter);
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => cleanMarkdownBlock(paragraph))
    .filter((paragraph) => paragraph.length > 0);

  const fallbackParagraph = paragraphs[0] ?? "";
  if (fallbackParagraph.length === 0) {
    return "";
  }

  return truncateDescription(fallbackParagraph);
}

function truncateDescription(input: string, limit = 155): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  const truncated = normalized.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(" ");
  const safeSlice = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeSlice}...`;
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(blogRoot)) {
    return [];
  }

  return fs
    .readdirSync(blogRoot)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .map<BlogPostMeta | null>((file) => {
      const filePath = path.join(blogRoot, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);
      const frontmatter = data as Frontmatter | undefined;

      const slug = deriveSlug(file, frontmatter);
      const { title, seoTitle } = extractTitle(frontmatter, content, slug);
      const description = deriveDescription(content, frontmatter);
      const seoDescription =
        (typeof frontmatter?.seoDescription === "string" && frontmatter.seoDescription.trim()) ||
        description;
      const stats = readingTime(content);

      if (frontmatter?.draft) {
        return null;
      }

      const dateModified =
        typeof frontmatter?.dateModified === "string"
          ? frontmatter.dateModified
          : typeof frontmatter?.updated === "string"
          ? frontmatter.updated
          : undefined;
      const category = typeof frontmatter?.category === "string" ? frontmatter.category : undefined;

      return {
        slug,
        title,
        seoTitle,
        description,
        seoDescription,
        date: typeof frontmatter?.date === "string" ? frontmatter.date : new Date().toISOString(),
        author: typeof frontmatter?.author === "string" ? frontmatter.author : "Devin Schumacher",
        authorUrl: typeof frontmatter?.authorUrl === "string" ? frontmatter.authorUrl : DEFAULT_AUTHOR_URL,
        tags: Array.isArray(frontmatter?.tags) ? (frontmatter.tags as string[]) : [],
        image: typeof frontmatter?.image === "string" ? frontmatter.image : undefined,
        readingTime: stats.text,
        category,
        dateModified,
      } satisfies BlogPostMeta;
    })
    .filter((post): post is BlogPostMeta => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type BlogPost = {
  meta: BlogPostMeta;
  content: string;
};

export function getPostBySlug(slug: string): BlogPost | null {
  if (!fs.existsSync(blogRoot)) {
    return null;
  }

  const files = fs
    .readdirSync(blogRoot)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));

  for (const file of files) {
    const filePath = path.join(blogRoot, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const frontmatter = data as Frontmatter | undefined;
    const derivedSlug = deriveSlug(file, frontmatter);

    if (derivedSlug !== slug) {
      continue;
    }

    const stats = readingTime(content);
    const { title, seoTitle } = extractTitle(frontmatter, content, derivedSlug);
    const description = deriveDescription(content, frontmatter);
    const seoDescription =
      (typeof frontmatter?.seoDescription === "string" && frontmatter.seoDescription.trim()) ||
      description;

    // Remove the H1 from content since it's displayed separately
    const contentWithoutTitle = content.replace(/^#\s+.+$/m, "").trim();

    const dateModified =
      typeof frontmatter?.dateModified === "string"
        ? frontmatter.dateModified
        : typeof frontmatter?.updated === "string"
        ? frontmatter.updated
        : undefined;
    const category = typeof frontmatter?.category === "string" ? frontmatter.category : undefined;

    return {
      meta: {
        slug: derivedSlug,
        title,
        seoTitle,
        description,
        seoDescription,
        date: typeof frontmatter?.date === "string" ? frontmatter.date : new Date().toISOString(),
        author: typeof frontmatter?.author === "string" ? frontmatter.author : "Devin Schumacher",
        authorUrl: typeof frontmatter?.authorUrl === "string" ? frontmatter.authorUrl : DEFAULT_AUTHOR_URL,
        tags: Array.isArray(frontmatter?.tags) ? (frontmatter.tags as string[]) : [],
        image: typeof frontmatter?.image === "string" ? frontmatter.image : undefined,
        readingTime: stats.text,
        category,
        dateModified,
      },
      content: contentWithoutTitle,
    };
  }

  return null;
}
const DEFAULT_AUTHOR_URL = "https://apps.serp.co/team/devin-schumacher";
