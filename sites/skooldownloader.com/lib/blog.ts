import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const defaultPostsDirectory = path.join(process.cwd(), 'content/blog');

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  readingTime: string;
}

export function getAllPosts(baseDir: string = defaultPostsDirectory): PostMeta[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const fileNames = fs.readdirSync(baseDir);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, '');
      const fullPath = path.join(baseDir, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      const stats = readingTime(content);

      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || new Date().toISOString(),
        author: data.author || 'Admin',
        tags: data.tags || [],
        image: data.image,
        readingTime: stats.text,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string, baseDir: string = defaultPostsDirectory) {
  const realSlug = slug.replace(/\.mdx?$/, '');
  const fullPath = path.join(baseDir, `${realSlug}.mdx`);
  const mdPath = path.join(baseDir, `${realSlug}.md`);

  let fileContents: string | undefined;
  if (fs.existsSync(fullPath)) {
    fileContents = fs.readFileSync(fullPath, 'utf8');
  } else if (fs.existsSync(mdPath)) {
    fileContents = fs.readFileSync(mdPath, 'utf8');
  } else {
    return null;
  }

  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    slug: realSlug,
    content,
    meta: {
      slug: realSlug,
      title: data.title || realSlug,
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      author: data.author || 'Admin',
      tags: data.tags || [],
      image: data.image,
      readingTime: stats.text,
    },
  };
}

