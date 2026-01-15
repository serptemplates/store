import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import withBundleAnalyzer from '@next/bundle-analyzer';

// Standardize on a single env file for local/dev builds
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const outputFileTracingRoot = resolve(process.cwd(), "../..");

const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/payments", "@serpcompany/payments"],
  typedRoutes: true,

  // Enable compression
  compress: true,

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          },
        ],
      },
    ];
  },

  // Image optimization settings for mobile
  images: isStaticExport
    ? { unoptimized: true }
    : {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [320, 420, 768, 1024, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        qualities: [50, 75, 85, 90],
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'i.pravatar.cc',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'ui-avatars.com',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'i.ytimg.com',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'img.youtube.com',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'raw.githubusercontent.com',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'gist.github.com',
            pathname: '/user-attachments/**',
          },
          {
            protocol: 'https',
            hostname: 'github.com',
            pathname: '/user-attachments/**',
          },
        ],
      },

  experimental: {
    optimizeCss: true,
    // Optimize common package imports - Next.js will tree-shake these
    optimizePackageImports: [
      'react',
      'react-dom',
      'lucide-react',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      'react-hook-form',
      'date-fns',
      '@repo/ui',
      '@next/third-parties'
    ],
    // Reduce memory usage during builds
    workerThreads: false,
    cpus: 1,
  },

  // Server external packages optimization
  serverExternalPackages: ['sharp'],

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Reduce bundle size by replacing heavy modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Replace moment with date-fns if needed
        'moment': 'date-fns',
      };
    }
    return config;
  },

  // Disable powered by header
  poweredByHeader: false,

  // React strict mode for better error detection
  reactStrictMode: true,

  // Ensure server functions include product data files for runtime fs access
  // This allows API/Route handlers (e.g., /checkout/[slug]) to read
  // apps/store/data/products/*.json in serverless environments.
  outputFileTracingRoot,
  outputFileTracingIncludes: {
    // Include product JSON broadly for all server functions to avoid
    // route-matching edge cases in serverless packaging.
    "/(.*)": ["./data/**", "./apps/store/data/**"],
  },

  ...(isStaticExport
    ? {
        output: "export",
      }
    : {}),
};

export default bundleAnalyzer(nextConfig);
