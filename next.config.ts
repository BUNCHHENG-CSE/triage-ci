import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["@prisma/client", "prisma"],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 14400,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "clsx",
      "tailwind-merge",
    ],
    turbopackFileSystemCacheForBuild: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
