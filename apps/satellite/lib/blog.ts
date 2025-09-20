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

// Resolve relative to the app workspace so dev server + builds find the content directory
const blogRoot = path.join(process.cwd(), "content/blog");

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(blogRoot)) {
    return [];
  }

  return fs
    .readdirSync(blogRoot)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .map<BlogPostMeta | null>((file) => {
      const slug = file.replace(/\.mdx?$/, "");
      const filePath = path.join(blogRoot, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);
      const stats = readingTime(content);

      if (data?.draft) {
        return null;
      }

      return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? "",
        date: data.date ?? new Date().toISOString(),
        author: data.author ?? "SERP Apps",
        tags: Array.isArray(data.tags) ? data.tags : [],
        image: data.image,
        readingTime: stats.text,
      } satisfies BlogPostMeta;
    })
    .filter((post): post is BlogPostMeta => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
