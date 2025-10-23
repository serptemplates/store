import type { BlogPostMeta } from "@/lib/blog";

export function buildBlogListSchema(posts: BlogPostMeta[], siteName: string, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteName} Blog Posts`,
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/blog/${post.slug}`,
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        name: post.title,
        description: post.description,
        url: `${baseUrl}/blog/${post.slug}`,
        datePublished: post.date,
        dateModified: post.dateModified ?? post.date,
        author: {
          "@type": "Person",
          name: post.author,
          ...(post.authorUrl ? { url: post.authorUrl } : {}),
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/logo.svg`,
          },
        },
        ...(post.image ? { image: post.image } : {}),
      },
    })),
  } as const;
}
