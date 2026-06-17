import type { Metadata } from "next";

import RefreshPage from "@/components/RefreshPage";
import { publishedArticles } from "@/lib/blog/articles";

export const metadata: Metadata = {
  title: "Affordable AI Website Redesign Service | Refresh Kiwi",
  description:
    "Try an affordable AI website redesign for your small business. Paste your current site and get a modern website redesign preview in about 2 minutes.",
  openGraph: {
    title: "Affordable AI Website Redesign Service | Refresh Kiwi",
    description:
      "Refresh Kiwi is a web redesign service for small businesses that want a fast, affordable website redesign without starting from scratch.",
    url: "/",
  },
  twitter: {
    title: "Affordable AI Website Redesign Service | Refresh Kiwi",
    description:
      "Paste your current site and get a modern small business website redesign preview in about 2 minutes.",
  },
};

export default function Home() {
  const blogSnippets = publishedArticles.slice(0, 3).map((article) => ({
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    readingTime: article.readingTime,
  }));

  return <RefreshPage blogSnippets={blogSnippets} />;
}
