import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";

import { format } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import rehypeCodeTitles from "rehype-code-titles";

import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { getAllProducts } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { buildPrimaryNavProps } from "@/lib/navigation";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { mdxComponents } from "@/components/mdx-components";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/schema";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const metaTitle = post.meta.seoTitle ?? post.meta.title;
  const metaDescription = post.meta.seoDescription ?? post.meta.description;

  return {
    title: metaTitle,
    description: metaDescription,
    authors: [{ name: post.meta.author }],
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "article",
      publishedTime: post.meta.date,
      authors: [post.meta.author],
      images: post.meta.image ? [post.meta.image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: post.meta.image ? [post.meta.image] : undefined,
    },
  } satisfies Metadata;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const siteConfig = getSiteConfig();
  const siteName = siteConfig.site?.name ?? "SERP Downloaders";
  const products = getAllProducts();
  const navProps = buildPrimaryNavProps({ products, siteConfig });
  const recommendedPosts = getAllPosts()
    .filter((entry) => entry.slug !== slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const metaTitle = post.meta.seoTitle ?? post.meta.title;
  const metaDescription = post.meta.seoDescription ?? post.meta.description;

  // Generate Article schema for SEO
  const articleSchema = generateArticleSchema({
    headline: metaTitle,
    description: metaDescription,
    image: post.meta.image || 'https://apps.serp.co/og-image.png',
    datePublished: post.meta.date,
    dateModified: post.meta.dateModified ?? post.meta.date,
    author: {
      name: post.meta.author,
      url: post.meta.authorUrl ?? undefined,
    },
    url: `https://apps.serp.co/blog/${slug}`,
    wordCount: post.content.split(' ').length,
    keywords: post.meta.tags,
    articleSection: post.meta.category,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: metaTitle },
    ],
    storeUrl: 'https://apps.serp.co',
  });

  return (
    <>
      {/* Article schema for SEO */}
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

    <div className="flex min-h-screen flex-col bg-background">
      <PrimaryNavbar {...navProps} />

      <main className="flex-1 bg-background">
        <article className="container max-w-4xl py-12 md:py-20">
          <nav className="mb-8 text-sm text-muted-foreground">
            <ol className="flex items-center space-x-2">
              <li>
                <Link href="/" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/blog" className="hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground">{post.meta.title}</li>
            </ol>
          </nav>

          <header className="mb-12 space-y-4">
            <Badge variant="secondary" className="px-3 py-1 text-xs uppercase tracking-wide">
              Article
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{post.meta.title}</h1>
            {metaDescription && (
              <p className="text-lg text-muted-foreground">{metaDescription}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.meta.author}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.meta.date}>{format(new Date(post.meta.date), "MMMM d, yyyy")}</time>
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.meta.readingTime}
              </span>
            </div>
            {post.meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.meta.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          <div className="prose prose-slate max-w-none dark:prose-invert">
            <MDXRemote
              source={post.content}
              components={mdxComponents}
              options={{
                mdxOptions: {
                  rehypePlugins: [
                    rehypeCodeTitles,
                    [rehypeHighlight, { ignoreMissing: true }],
                  ],
                },
              }}
            />
          </div>

          {recommendedPosts.length > 0 && (
            <section className="mt-16 border-t pt-10">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Read more</h2>
                <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
                  View all posts →
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {recommendedPosts.map((related) => (
                  <Card key={related.slug} className="h-full border-border/60 bg-card/60 transition hover:-translate-y-1 hover:border-border hover:shadow-lg">
                    <CardHeader className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {format(new Date(related.date), "MMM d, yyyy")}
                      </p>
                      <CardTitle className="line-clamp-2 text-base">
                        <Link href={`/blog/${related.slug}`} className="hover:text-primary">
                          {related.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p className="line-clamp-3">{related.description}</p>
                      <Link
                        href={`/blog/${related.slug}`}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Read article
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-12 border-t pt-8">
            <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
              ← Back to Blog
            </Link>
          </footer>
        </article>
      </main>
    </div>
    </>
  );
}
