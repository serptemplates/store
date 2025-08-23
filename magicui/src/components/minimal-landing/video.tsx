'use client';

import { Product } from '../../../../schema';
import { useState } from 'react';

interface MinimalVideoProps {
  product: Product;
}

export default function MinimalVideo({ product }: MinimalVideoProps) {
  const videos = [
    ...(product.product_video || []),
    ...(product.related_videos || [])
  ];
  
  const [activeIndex, setActiveIndex] = useState(0);

  if (videos.length === 0) return null;

  const getVideoEmbed = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('watch?v=') 
        ? url.split('watch?v=')[1] 
        : url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    return url;
  };

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-gray-900 dark:text-white">
          See it in action
        </h2>
        
        <div className="space-y-6">
          {/* Video Player */}
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {videos.map((video, index) => (
              <iframe
                key={index}
                src={getVideoEmbed(video)}
                className={`w-full h-full ${index === activeIndex ? 'block' : 'hidden'}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ))}
          </div>
          
          {/* Video Tabs */}
          {videos.length > 1 && (
            <div className="flex gap-2 justify-center">
              {videos.map((_, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    index === activeIndex 
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  {index === 0 ? 'Demo' : `Video ${index + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}