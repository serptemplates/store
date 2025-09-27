import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });

/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/templates"],

  // Enable compression
  compress: true,

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Image optimization settings for mobile
  images: isStaticExport
    ? { unoptimized: true }
    : {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [320, 420, 768, 1024, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
      },

  experimental: {
    typedRoutes: true,
    optimizeCss: true,
    // Optimize common package imports
    optimizePackageImports: [
      'lodash',
      'date-fns',
      '@repo/ui',
      '@repo/templates',
      'react',
      'react-dom'
    ],
  },

  // Optimize webpack bundle splitting for mobile
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // More aggressive code splitting
      config.optimization.runtimeChunk = 'single';
      config.optimization.splitChunks = {
        chunks: 'all',
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        minSize: 0,
        cacheGroups: {
          default: false,
          vendors: false,
          // Split React into its own bundle
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react-vendor',
            priority: 40,
            reuseExistingChunk: true,
          },
          // Split UI components
          ui: {
            test: /[\\/]@repo[\\/]ui[\\/]/,
            name: 'ui-components',
            priority: 35,
            reuseExistingChunk: true,
          },
          // Split each major vendor into its own chunk
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get package name safely
              if (!module.context) return 'vendor-common';
              const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (!match) return 'vendor-common';
              const packageName = match[1];
              // Group small packages together, split large ones
              if (packageName.includes('next')) return 'next-vendor';
              if (packageName.includes('@')) return 'vendor-scoped';
              return 'vendor-common';
            },
            priority: 20,
          },
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };

      // Minimize main thread work
      config.optimization.minimize = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    return config;
  },

  ...(isStaticExport
    ? {
        output: "export",
      }
    : {}),
};

export default nextConfig;
