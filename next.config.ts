import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cursor/sdk", "playwright", "postgres"],
};

export default nextConfig;
