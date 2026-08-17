import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlogRefreshForm from "@/components/BlogRefreshForm";
import SiteLogo from "@/components/SiteLogo";
import {
  blogAuthor,
  getArticleBySlug,
  getArticleUrl,
  getRelatedArticles,
  publishedArticles,
} from "@/lib/blog/articles";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

function renderParagraphWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (match) {
      return (
        <Link
          key={`${match[1]}-${index}`}
          href={match[2]}
          className="font-medium text-black underline decoration-black/20 underline-offset-2 hover:decoration-black"
        >
          {match[1]}
        </Link>
      );
    }

    return part;
  });
}

function getSectionAnswerText(section: {
  paragraphs?: string[];
  bullets?: string[];
}) {
  const text = [
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []),
  ].join(" ");

  return text.replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1");
}

export function generateStaticParams() {
  return publishedArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {};
  }

  const url = getArticleUrl(article);

  return {
    title: `${article.title} — Refresh Kiwi`,
    description: article.description,
    keywords: [article.primaryKeyword, ...article.secondaryKeywords],
    authors: [{ name: article.author, url: blogAuthor.url }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      siteName: "Refresh Kiwi",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: [article.primaryKeyword, ...article.secondaryKeywords],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedArticles(article);
  const articleUrl = getArticleUrl(article);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author,
      url: blogAuthor.url,
    },
    publisher: {
      "@type": "Organization",
      name: "Refresh Kiwi",
      url: blogAuthor.url,
      logo: {
        "@type": "ImageObject",
        url: `${blogAuthor.url}/refresh-kiwi-favicon-v2.png`,
      },
    },
    mainEntityOfPage: articleUrl,
    keywords: [article.primaryKeyword, ...article.secondaryKeywords].join(", "),
  };
  const faqJsonLd =
    article.intent === "comparison"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.sections.map((section) => ({
            "@type": "Question",
            name: section.heading,
            acceptedAnswer: {
              "@type": "Answer",
              text: getSectionAnswerText(section),
            },
          })),
        }
      : article.faqs?.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }
        : null;

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <header className="border-b border-black/10 bg-white/80 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <SiteLogo />
            <Link
              href="/blog"
              className="hidden text-sm font-medium text-black/60 transition hover:text-black sm:inline"
            >
              Blog
            </Link>
          </div>
          <Link
            href="/#refresh-input"
            className="rounded-full bg-kiwi-green px-4 py-2 text-sm font-bold transition hover:bg-kiwi-green-hover"
          >
            Refresh my website
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
          <span>{article.category}</span>
          <span aria-hidden>•</span>
          <span>{article.readingTime}</span>
          <span aria-hidden>•</span>
          <time dateTime={article.updatedAt}>
            Updated {new Date(article.updatedAt).toLocaleDateString("en-GB")}
          </time>
        </div>

        <h1 className="mt-5 font-fraunces text-5xl font-semibold tracking-tight sm:text-7xl">
          {article.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-black/65">
          {article.description}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {[article.primaryKeyword, ...article.secondaryKeywords].map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/55"
            >
              {keyword}
            </span>
          ))}
        </div>

        <div className="mt-12 space-y-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-10">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-base leading-8 text-black/65"
                >
                  {renderParagraphWithLinks(paragraph)}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-8 text-black/65">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.callout ? (
                <p className="mt-5 rounded-2xl bg-kiwi-green/60 p-4 text-sm font-medium leading-6 text-black/75">
                  {section.callout}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        {article.faqs?.length ? (
          <section className="mt-12 rounded-[2rem] border border-black/10 bg-white p-6 sm:p-10">
            <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
              Common questions
            </h2>
            <div className="mt-5 divide-y divide-black/5">
              {article.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 text-sm text-black/50 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-black/60">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 rounded-[2rem] bg-kiwi-green p-8">
          <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
            See what your website could look like refreshed.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">
            Paste your current website address and Refresh Kiwi will create a
            separate preview. Your real website stays unchanged until you choose
            to publish.
          </p>
          <BlogRefreshForm />
        </section>

        {related.length ? (
          <section className="mt-12">
            <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
              Related guides
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="rounded-3xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <p className="text-xs text-black/45">{item.category}</p>
                  <h3 className="mt-2 font-semibold leading-6">{item.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
