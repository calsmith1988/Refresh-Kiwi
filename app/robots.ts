import type { MetadataRoute } from "next";

import { getAbsoluteUrl } from "@/lib/blog/articles";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/account",
        "/preview/",
        "/custom-domain/",
        "/reset-password",
        "/verify-email",
        "/unsubscribe",
      ],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
