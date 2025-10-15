import dynamic from "next/dynamic"

// Lazy load the homepage component to reduce initial bundle
const HomePageView = dynamic(() => import("@/components/home/HomePageView").then(mod => ({ default: mod.HomePageView })), {
  loading: () => <div className="min-h-screen" />,
  ssr: true, // Keep SSR for SEO
})

export default function Page() {
  return <HomePageView />
}