import type { Metadata } from "next";
import Link from "next/link";

import {
  contentClusters,
  getAbsoluteUrl,
  publishedArticles,
} from "@/lib/blog/articles";

export const metadata: Metadata = {
  title: "Website Refresh Blog — Refresh Kiwi",
  description:
    "Practical website refresh, redesign, AI website, and small business website advice from Refresh Kiwi.",
  alternates: {
    canonical: getAbsoluteUrl("/blog"),
  },
  openGraph: {
    title: "Website Refresh Blog — Refresh Kiwi",
    description:
      "Practical website refresh, redesign, AI website, and small business website advice from Refresh Kiwi.",
    url: getAbsoluteUrl("/blog"),
    siteName: "Refresh Kiwi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Website Refresh Blog — Refresh Kiwi",
    description:
      "Practical website refresh, redesign, AI website, and small business website advice from Refresh Kiwi.",
  },
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-black">
      <header className="border-b border-black/10 bg-white/80 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-block font-roboto text-[30px] font-[350] leading-none tracking-tight"
          >
            refresh kiwi
          </Link>
          <Link
            href="/"
            className="rounded-full bg-kiwi-green px-4 py-2 text-sm font-bold transition hover:bg-kiwi-green-hover"
          >
            Refresh my website
          </Link>
        </div>
      </header>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
            Refresh Kiwi Blog
          </p>
          <h1 className="mt-4 max-w-3xl font-fraunces text-5xl font-semibold tracking-tight sm:text-7xl">
            Practical advice for making an old website feel new again.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
            Guides for small business owners who want a clearer, fresher,
            more trustworthy website without turning it into a huge project.
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2">
          {publishedArticles.map((article) => (
            <article
              key={article.slug}
              className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
                <span>{article.category}</span>
                <span aria-hidden>•</span>
                <span>{article.readingTime}</span>
                <span aria-hidden>•</span>
                <time dateTime={article.updatedAt}>
                  Updated {new Date(article.updatedAt).toLocaleDateString("en-GB")}
                </time>
              </div>
              <h2 className="mt-4 font-fraunces text-3xl font-semibold tracking-tight">
                <Link href={`/blog/${article.slug}`} className="hover:underline">
                  {article.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/60">
                {article.excerpt}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[article.primaryKeyword, ...article.secondaryKeywords.slice(0, 2)].map(
                  (keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/55"
                    >
                      {keyword}
                    </span>
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/5 bg-white px-5 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
            Popular topics
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
            Start with the guides that match what you are trying to fix: an
            old-looking site, a redesign budget question, or uncertainty about
            using AI for your business website.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {contentClusters.map((cluster) => (
              <div
                key={cluster.name}
                className="rounded-3xl border border-black/10 bg-[#fbfaf5] p-5"
              >
                <h3 className="font-semibold">{cluster.name}</h3>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {cluster.intent}
                </p>
                <div className="mt-4 space-y-2">
                  {cluster.articleSlugs.map((slug) => {
                    const article = publishedArticles.find((item) => item.slug === slug);

                    return article ? (
                      <Link
                        key={slug}
                        href={`/blog/${article.slug}`}
                        className="block text-sm font-medium text-black/65 hover:text-black hover:underline"
                      >
                        {article.title}
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 rounded-[2rem] bg-kiwi-green p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
              Want to see your own website refreshed?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/65">
              Paste your current web address and get a separate preview before
              anything changes on your real site.
            </p>
          </div>
          <Link
            href="/#refresh-input"
            className="rounded-full bg-[#141811] px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
          >
            Try Refresh Kiwi
          </Link>
        </div>
      </section>
    </main>
  );
}
