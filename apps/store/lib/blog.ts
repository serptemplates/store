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
// Update: Blog content is now in sites/apps.serp.co/content/blog
const blogRoot = path.join(process.cwd(), "../../sites/apps.serp.co/content/blog");

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

      // Extract title from content H1 if not in frontmatter
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = data.title || titleMatch?.[1] || slug.replace(/-/g, ' ');

      // Extract description from content if not in frontmatter
      const cleanContent = content
        .replace(/^#.*$/gm, '') // Remove headings
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
      const description = data.description || cleanContent.substring(0, 160).trim() + '...';

      return {
        slug,
        title,
        description,
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

export type BlogPost = {
  meta: BlogPostMeta;
  content: string;
};

export function getPostBySlug(slug: string): BlogPost | null {
  const fileName = fs.existsSync(path.join(blogRoot, `${slug}.md`))
    ? `${slug}.md`
    : fs.existsSync(path.join(blogRoot, `${slug}.mdx`))
    ? `${slug}.mdx`
    : null;

  if (!fileName) {
    return null;
  }

  const filePath = path.join(blogRoot, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  // Extract title from content H1 if not in frontmatter
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = data.title || titleMatch?.[1] || slug.replace(/-/g, ' ');

  // Extract description from content if not in frontmatter
  const cleanContent = content
    .replace(/^#.*$/gm, '') // Remove headings
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
  const description = data.description || cleanContent.substring(0, 160).trim() + '...';

  // Remove the H1 from content since it's displayed separately
  const contentWithoutTitle = content.replace(/^#\s+.+$/m, '').trim();

  return {
    meta: {
      slug,
      title,
      description,
      date: data.date ?? new Date().toISOString(),
      author: data.author ?? "SERP Apps",
      tags: Array.isArray(data.tags) ? data.tags : [],
      image: data.image,
      readingTime: stats.text,
    },
    content: contentWithoutTitle,
  };
}
