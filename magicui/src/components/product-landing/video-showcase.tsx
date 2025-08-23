'use client';

import { Product } from '../../../../schema';
import { useState } from 'react';
import { Play, Monitor, Code, Zap, Settings, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoShowcaseProps {
  product: Product;
}

interface VideoTab {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  icon: React.ReactNode;
}

export default function VideoShowcase({ product }: VideoShowcaseProps) {
  // Combine product videos and related videos into tabs
  const videos: VideoTab[] = [];
  
  if (product.product_video && product.product_video.length > 0) {
    videos.push({
      id: 'main-demo',
      title: 'Product Demo',
      description: 'See ' + product.name + ' in action',
      videoUrl: product.product_video[0],
      icon: <Play className="h-4 w-4" />,
    });
    
    // Add additional product videos
    product.product_video.slice(1).forEach((video, index) => {
      const icons = [<Code className="h-4 w-4" />, <Zap className="h-4 w-4" />, <Settings className="h-4 w-4" />];
      videos.push({
        id: `demo-${index + 2}`,
        title: `Feature ${index + 2}`,
        description: 'Advanced features walkthrough',
        videoUrl: video,
        icon: icons[index % icons.length],
      });
    });
  }
  
  if (product.related_videos && product.related_videos.length > 0) {
    product.related_videos.forEach((video, index) => {
      videos.push({
        id: `related-${index}`,
        title: `Tutorial ${index + 1}`,
        description: 'Learn tips and tricks',
        videoUrl: video,
        icon: <Monitor className="h-4 w-4" />,
      });
    });
  }

  const [activeVideo, setActiveVideo] = useState(videos[0]?.id || '');

  if (videos.length === 0) return null;

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See It In Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch how {product.name} can transform your workflow with these demo videos
            </p>
          </div>

          {/* Main Video Container */}
          <div className="mb-8">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-2xl">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    activeVideo === video.id ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                  // Keep all videos in DOM, just change opacity
                  style={{ visibility: activeVideo === video.id ? 'visible' : 'hidden' }}
                >
                  {video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={`${video.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}?rel=0`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : video.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${video.videoUrl.split('/').pop()}`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Tabs/Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setActiveVideo(video.id)}
                className={`group relative text-left p-4 rounded-lg border transition-all duration-200 ${
                  activeVideo === video.id
                    ? 'bg-primary/10 border-primary shadow-lg scale-[1.02]'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
              >
                {/* Active Indicator */}
                {activeVideo === video.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                )}
                
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeVideo === video.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground group-hover:bg-primary/20'
                  }`}>
                    {video.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold mb-1 transition-colors ${
                      activeVideo === video.id ? 'text-primary' : 'text-foreground'
                    }`}>
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {video.description}
                    </p>
                  </div>
                  
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-all ${
                    activeVideo === video.id 
                      ? 'text-primary translate-x-1' 
                      : 'text-muted-foreground group-hover:text-primary group-hover:translate-x-1'
                  }`} />
                </div>

                {/* Playing Indicator */}
                {activeVideo === video.id && (
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs text-primary font-medium">Playing</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Additional CTA */}
          {product.github_repo_url && (
            <div className="mt-8 text-center">
              <Button variant="outline" size="lg" asChild>
                <a href={product.github_repo_url} target="_blank" rel="noopener noreferrer">
                  <Users className="mr-2 h-4 w-4" />
                  Join the Community on GitHub
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}