import type { MetadataRoute } from "next";

import { getAbsoluteUrl, publishedArticles } from "@/lib/blog/articles";
import { legalPageList } from "@/lib/legal/pages";
import { marketingLandingPages } from "@/lib/marketing/landing-pages";

const staticRoutes = [
  {
    path: "/",
    priority: 1,
    changeFrequency: "weekly" as const,
  },
  {
    path: "/blog",
    priority: 0.8,
    changeFrequency: "weekly" as const,
  },
  ...marketingLandingPages.map((page) => ({
    path: `/${page.slug}`,
    priority: 0.85,
    changeFrequency: "monthly" as const,
  })),
];

const legalLastModified = new Date("2026-06-14");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  const legalEntries = legalPageList.map((page) => ({
    url: getAbsoluteUrl(`/${page.slug}`),
    lastModified: legalLastModified,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));
  const articleEntries = publishedArticles.map((article) => ({
    url: getAbsoluteUrl(`/blog/${article.slug}`),
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: article.priority <= 3 ? 0.7 : 0.6,
  }));

  return [...staticEntries, ...legalEntries, ...articleEntries];
}
