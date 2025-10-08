import Link from "next/link";
import Image from "next/image";

import { format } from "date-fns";
import { ArrowRight, Calendar, Clock, FileText, User } from "lucide-react";

import { getAllPosts } from "@/lib/blog";
import { getAllProducts } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { buildPrimaryNavProps } from "@/lib/navigation";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const siteConfig = getSiteConfig();
  const products = getAllProducts();

  const siteName = siteConfig.site?.name ?? "SERP Downloaders";
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrimaryNavbar {...navProps} />

      <main className="flex-1 bg-background">
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wide">Insights</Badge>
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
              <p className="text-lg text-muted-foreground">
                Tips, tutorials, and deep dives on keeping your download workflows compliant and reliable.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 py-20 text-center">
                <p className="text-lg text-muted-foreground">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                      {post.image ? (
                        <div className="relative aspect-video w-full overflow-hidden">
                          <Image src={post.image} alt={post.title} fill className="object-cover transition duration-300 group-hover:scale-105" />
                        </div>
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <div className="text-center">
                            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                              <FileText className="h-7 w-7 text-primary/60" />
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                              {post.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        {!post.image && post.tags.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <CardTitle className="line-clamp-2 text-lg font-semibold">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-3 text-sm">{post.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <time dateTime={post.date}>{format(new Date(post.date), "MMM d, yyyy")}</time>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readingTime}
                          </span>
                        </div>
                        <Button variant="link" className="px-0 text-primary">
                          Read more
                          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <FooterComposite />
    </div>
  );
}
