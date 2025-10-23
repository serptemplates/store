import { describe, expect, it } from "vitest";

import { buildBlogListSchema } from "@/app/blog/schema";
import type { BlogPostMeta } from "@/lib/blog";

describe("buildBlogListSchema", () => {
  it("includes author URL for each blog posting", () => {
    const posts: BlogPostMeta[] = [
      {
        slug: "example-post",
        title: "Example Post",
        seoTitle: "Example Post",
        description: "An example post",
        seoDescription: "Example description",
        date: "2025-01-01T00:00:00.000Z",
        author: "SERP",
        authorUrl: "https://apps.serp.co/team/serp",
        tags: [],
        readingTime: "5 min read",
      },
    ];

    const schema = buildBlogListSchema(posts, "SERP Apps", "https://apps.serp.co");

    const blogPosting = schema.itemListElement[0].item;
    expect(blogPosting.author.url).toBe("https://apps.serp.co/team/serp");
  });
});
