import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cursor/sdk", "playwright", "postgres", "sharp"],
};

export default nextConfig;
