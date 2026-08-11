import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cursor/sdk", "playwright", "postgres", "sharp"],
  experimental: {
    // Middleware makes Next buffer request bodies with a 10MB default cap —
    // anything larger is silently truncated, which broke /api/fresh photo
    // uploads ("Invalid form body"). The composer enforces a 50MB total
    // client-side; this keeps headroom above that.
    middlewareClientMaxBodySize: "60mb",
  },
};

export default nextConfig;
