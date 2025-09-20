import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/templates"],
  experimental: {
    typedRoutes: true,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
