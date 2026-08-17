import type { MetadataRoute } from "next";

import { getAbsoluteUrl } from "@/lib/blog/articles";

const privatePaths = [
  "/api/",
  "/dashboard",
  "/account",
  "/admin",
  "/preview/",
  "/custom-domain/",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/change-email",
  "/unsubscribe",
  "/domain-help",
  "/help-centre",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        // ChatGPT Search indexing. This is separate from model training.
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        // User-triggered ChatGPT browsing/retrieval.
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: privatePaths,
      },
      {
        // OpenAI training crawler. Keep search visibility while opting out of training.
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        // Common training crawlers from other AI providers.
        userAgent: "CCBot",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
