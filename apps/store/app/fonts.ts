import { Inter } from 'next/font/google'

// Optimize Inter font loading
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents FOIT (Flash of Invisible Text)
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  variable: '--font-inter',
  adjustFontFallback: true, // Adjusts fallback fonts to minimize CLS
})