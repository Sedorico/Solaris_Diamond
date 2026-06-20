import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (several stray lockfiles exist on
  // this machine's parent directories).
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
