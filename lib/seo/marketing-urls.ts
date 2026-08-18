import { getAbsoluteUrl, publishedArticles } from "@/lib/blog/articles";
import { legalPageList } from "@/lib/legal/pages";
import { marketingLandingPages } from "@/lib/marketing/landing-pages";

/** Public marketing paths indexed in sitemap.xml and submitted to IndexNow. */
export const marketingPublicPaths = [
  "/",
  "/about-us",
  "/contact-us",
  "/blog",
  ...marketingLandingPages.map((page) => `/${page.slug}`),
  ...legalPageList.map((page) => `/${page.slug}`),
  ...publishedArticles.map((article) => `/blog/${article.slug}`),
];

export function getMarketingPublicUrls(): string[] {
  return marketingPublicPaths.map((path) => getAbsoluteUrl(path));
}
