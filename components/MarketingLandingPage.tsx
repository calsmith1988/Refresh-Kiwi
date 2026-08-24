import Link from "next/link";

import SiteLogo from "@/components/SiteLogo";
import {
  buildFaqJsonLd,
  type LandingPage,
} from "@/lib/marketing/landing-pages";

type MarketingLandingPageProps = {
  page: LandingPage;
};

export default function MarketingLandingPage({ page }: MarketingLandingPageProps) {
  const faqJsonLd = buildFaqJsonLd(page.faqs);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

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
            href="/#hero"
            className="rounded-full bg-kiwi-green px-4 py-2 text-sm font-bold transition hover:bg-kiwi-green-hover"
          >
            Refresh my website
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
          {page.eyebrow}
        </p>
        <h1 className="mt-4 font-fraunces text-4xl font-semibold tracking-tight sm:text-6xl">
          {page.title.replace(/ — Refresh Kiwi$/, "").replace(/ \| Refresh Kiwi$/, "")}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-black/65">{page.intro}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {[page.primaryKeyword, ...page.secondaryKeywords].map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/55"
            >
              {keyword}
            </span>
          ))}
        </div>

        <div className="mt-12 space-y-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-base leading-8 text-black/65"
                >
                  {paragraph}
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

        <section className="mt-12 rounded-[2rem] border border-black/10 bg-white p-6 sm:p-10">
          <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
            Questions people actually ask
          </h2>
          <div className="mt-5 divide-y divide-black/5">
            {page.faqs.map((faq) => (
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
                <p className="mt-3 text-sm leading-7 text-black/60">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] bg-kiwi-green p-8">
          <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
            See what your website could look like refreshed.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">
            Try it free on the homepage — start from your website address, your
            Google listing, or a short description of your business. Refreshing
            a URL never changes your live site.
          </p>
          <Link
            href="/#hero"
            className="mt-6 inline-flex items-center rounded-full bg-[#141811] px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
          >
            Try Refresh Kiwi free
          </Link>
        </section>

        {page.relatedLinks.length ? (
          <section className="mt-12">
            <h2 className="font-fraunces text-3xl font-semibold tracking-tight">
              Explore further
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/70 transition hover:border-black/20 hover:text-black"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
