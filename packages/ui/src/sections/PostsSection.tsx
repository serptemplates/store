"use client";

import type { ComponentType } from "react";
import { Calendar, FileText, User } from "lucide-react";

export type PostItem = {
  slug: string;
  title: string;
  description: string;
  date?: string;
  author?: string;
  readingTime?: string;
  tags?: string[];
  image?: string;
};

export type PostsSectionProps = {
  posts: PostItem[];
  heading?: string;
  Badge: ComponentType<any>;
  Card: ComponentType<any>;
  CardHeader: ComponentType<any>;
  CardTitle: ComponentType<any>;
  CardContent: ComponentType<any>;
  CardDescription?: ComponentType<any>;
};

export function PostsSection({
  posts,
  heading = "Posts",
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
}: PostsSectionProps) {
  if (!posts.length) {
    return null;
  }

  return (
    <section className="container py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-2xl md:text-3xl font-bold text-gray-900">{heading}</h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {posts.slice(0, 3).map((post, index) => (
            <a key={`${post.slug}-${index}`} href={`/blog/${post.slug}`} className="block">
              <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="p-6 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-8 w-8 text-primary/60" />
                    </div>
                  </div>
                </div>
                <CardHeader>
                  {(post.tags ?? []).length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {(post.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge key={`${post.slug}-header-${tag}`} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <CardTitle className="line-clamp-2 text-lg font-semibold">{post.title}</CardTitle>
                  {CardDescription ? (
                    <CardDescription className="line-clamp-3">{post.description}</CardDescription>
                  ) : (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                    )}
                    {post.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PostsSection;
