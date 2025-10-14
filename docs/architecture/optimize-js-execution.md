# JavaScript Execution Optimization Plan

## Current Issues (1.4s total execution time)
- main-app.js: 909ms (515ms eval + 373ms parse)
- Unattributable: 407ms
- GTM: 138ms
- Facebook: 53ms

## Optimization Strategies

### 1. Reduce Main Bundle Size
```javascript
// next.config.mjs - Add more aggressive splitting
experimental: {
  optimizeCss: true,
  optimizePackageImports: [
    '@repo/ui',
    '@repo/ui/sections',
    'react-dom',
    'react'
  ],
}

// Enable module federation
webpack: (config) => {
  config.optimization.runtimeChunk = 'single';
  config.optimization.splitChunks = {
    chunks: 'all',
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    minSize: 0,
    cacheGroups: {
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        priority: 30,
      },
      libs: {
        test: /[\\/]node_modules[\\/]/,
        name(module) {
          const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
          return `npm.${packageName.replace('@', '')}`;
        },
        priority: 10,
      },
    },
  };
}
```

### 2. Use React Server Components
Convert heavy client components to server components where possible:
- ProductsFilter can be partially server-rendered
- Navigation menu can be server component with client interactivity

### 3. Implement Progressive Enhancement
```tsx
// Load non-critical features after hydration
useEffect(() => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Load analytics, tracking, etc
    });
  }
}, []);
```

### 4. Bundle Analyzer
```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer

# Add to next.config.mjs
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

### 5. Remove Unused Code
- Tree-shake unused exports
- Remove console.logs in production
- Eliminate dead code paths

### 6. Optimize React Rendering
```tsx
// Use React.memo for expensive components
const ProductCard = React.memo(({ product }) => {
  // Component code
});

// Use useMemo/useCallback for expensive computations
const expensiveValue = useMemo(() => computeExpensiveValue(deps), [deps]);
```

### 7. Preload Critical Resources
```html
<link rel="preload" href="/_next/static/chunks/main-app.js" as="script" />
<link rel="modulepreload" href="/_next/static/chunks/react.js" />
```

### 8. Use Partytown for Third-Party Scripts
```bash
pnpm add @builder.io/partytown

# Move GTM/Facebook to web worker
<Script strategy="worker" src="gtm.js" />
```
