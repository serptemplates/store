import { getAllPosts } from '@/lib/blog';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, ArrowRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/site.config';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Blog | ${siteConfig.name}`,
  description: 'Read our latest articles.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                Blog
              </h1>
              <p className="text-lg text-muted-foreground">Tips and tutorials</p>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            {posts.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg text-muted-foreground">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`}>
                    <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                      {post.image ? (
                        <div className="aspect-video w-full overflow-hidden relative">
                          <Image src={post.image} alt={post.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <div className="text-center p-6">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                              <FileText className="h-8 w-8 text-primary/60" />
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {post.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        {!post.image && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                        <CardDescription className="line-clamp-3">{post.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{post.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <time dateTime={post.date}>{format(new Date(post.date), 'MMM d, yyyy')}</time>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{post.readingTime}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm font-medium text-primary">
                          Read more
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
        
        <Footer />
      </main>
    </>
  );
}

