
// Example of optimized component with lazy loading
import dynamic from 'next/dynamic';
import { Suspense, lazy } from 'react';

// Heavy components loaded on demand
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false,
});

// Use React.lazy for client components
const ProductGallery = lazy(() => import('./ProductGallery'));

export default function OptimizedPage() {
  return (
    <div>
      {/* Critical content first */}
      <h1>Page Title</h1>
      <p>Critical content that loads immediately</p>

      {/* Non-critical content lazy loaded */}
      <Suspense fallback={<div>Loading gallery...</div>}>
        <ProductGallery />
      </Suspense>

      {/* Heavy components loaded on interaction */}
      <HeavyChart />
    </div>
  );
}