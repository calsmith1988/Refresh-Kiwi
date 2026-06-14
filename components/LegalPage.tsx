import Link from "next/link";

import { legalPageList, type LegalPageContent } from "@/lib/legal/pages";

type LegalPageProps = {
  page: LegalPageContent;
};

export default function LegalPage({ page }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-black">
      <header className="border-b border-black/10 bg-white/80 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="font-montserrat text-sm font-bold tracking-tight"
          >
            Refresh Kiwi
          </Link>
          <nav aria-label="Legal pages" className="flex flex-wrap gap-3 text-xs">
            {legalPageList.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-black/60 transition hover:border-black/20 hover:text-black"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <article className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/45">
          Legal
        </p>
        <h1 className="mt-4 font-fraunces text-4xl font-semibold tracking-tight sm:text-6xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-black/60">
          {page.description}
        </p>
        <p className="mt-6 text-sm text-black/45">
          Last updated: {page.lastUpdated}
        </p>

        <div className="mt-12 space-y-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-sm leading-7 text-black/65 sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-black/65 sm:text-base">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm leading-6 text-black/45">
          These pages are intended as practical website terms for Refresh Kiwi
          and should be reviewed by a qualified lawyer before launch or when
          your business operations change.
        </p>
      </article>
    </main>
  );
}
