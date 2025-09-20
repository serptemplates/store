import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { siteConfig } from '@/site.config';
import { mdxComponents } from '@/components/mdx-components';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.meta.title} | ${siteConfig.name}`,
    description: post.meta.description,
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: 'article',
      publishedTime: post.meta.date,
      authors: [post.meta.author],
      images: post.meta.image ? [post.meta.image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta.title,
      description: post.meta.description,
      images: post.meta.image ? [post.meta.image] : [],
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <article className="container max-w-4xl py-12 md:py-20">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
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

          {/* Post Header */}
          <header className="mb-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              {post.meta.title}
            </h1>
            
            <p className="mb-6 text-xl text-muted-foreground">
              {post.meta.description}
            </p>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{post.meta.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.meta.date}>
                  {format(new Date(post.meta.date), 'MMMM d, yyyy')}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.meta.readingTime}</span>
              </div>
            </div>

            {/* Tags */}
            {post.meta.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.meta.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Post Content */}
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <MDXRemote source={post.content} components={mdxComponents} />
          </div>

          {/* Post Footer */}
          <footer className="mt-12 border-t pt-8">
            <div className="flex items-center justify-between">
              <Link
                href="/blog"
                className="text-sm font-medium text-primary hover:underline"
              >
                ← Back to Blog
              </Link>
              <div className="flex gap-4">
                <Link
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    post.meta.title
                  )}&url=${encodeURIComponent(
                    `${siteConfig.url}/blog/${post.meta.slug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Share on Twitter
                </Link>
              </div>
            </div>
          </footer>
        </article>
        
        <Footer />
      </main>
    </>
  );
}
