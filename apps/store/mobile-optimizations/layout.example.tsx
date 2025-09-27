
// Optimized layout.tsx for mobile performance
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT
  preload: true,
  fallback: ['system-ui', 'arial'],
});

// Lazy load heavy components
const Analytics = dynamic(() => import('./components/Analytics'), {
  ssr: false,
  loading: () => null,
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Resource hints for critical resources */}
        <link rel="prefetch" href="/_next/static/chunks/main-app.js" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Load analytics after main content */}
        <Analytics />
      </body>
    </html>
  );
}