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
import { getSiteConfig } from "@/lib/site-config";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { Badge } from "@repo/ui/badge";

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

  return {
    title: post.meta.title,
    description: post.meta.description,
    authors: [{ name: post.meta.author }],
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: "article",
      publishedTime: post.meta.date,
      authors: [post.meta.author],
      images: post.meta.image ? [post.meta.image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
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
  const ctaHref = siteConfig.cta?.href;
  const ctaText = siteConfig.cta?.text ?? "Checkout";

  // Generate Article schema for SEO
  const articleSchema = generateArticleSchema({
    headline: post.meta.title,
    description: post.meta.description,
    image: post.meta.image || 'https://serp.app/og-image.png',
    datePublished: post.meta.date,
    dateModified: (post.meta as any).dateModified || post.meta.date,
    author: {
      name: post.meta.author,
    },
    url: `https://serp.app/blog/${slug}`,
    wordCount: post.content.split(' ').length,
    keywords: post.meta.tags,
    articleSection: (post.meta as any).category,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.meta.title },
    ],
    storeUrl: 'https://serp.app',
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
      <SiteNavbar
        site={{ name: siteName, categories: [], buyUrl: ctaHref }}
        Link={Link}
        ctaHref={ctaHref}
        ctaText={ctaText}
        showCta={false}
      />

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
            {post.meta.description && (
              <p className="text-lg text-muted-foreground">{post.meta.description}</p>
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

          <footer className="mt-12 border-t pt-8">
            <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
              ← Back to Blog
            </Link>
          </footer>
        </article>
      </main>

      <FooterComposite />
    </div>
    </>
  );
}
