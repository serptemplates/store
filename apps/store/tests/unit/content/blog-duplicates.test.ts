import { describe, expect, it } from "vitest";

import { getAllPosts } from "@/lib/blog";

describe("blog content", () => {
  it("uses unique slugs", () => {
    const posts = getAllPosts();
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const post of posts) {
      if (seen.has(post.slug)) {
        duplicates.push(post.slug);
      } else {
        seen.add(post.slug);
      }
    }

    expect(duplicates, `Duplicate blog slugs detected: ${duplicates.join(", ")}`).toHaveLength(0);
  });
});
