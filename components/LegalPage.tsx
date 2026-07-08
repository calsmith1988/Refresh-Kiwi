"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { legalPageList, type LegalPageContent } from "@/lib/legal/pages";

type LegalPageProps = {
  page: LegalPageContent;
};

export default function LegalPage({ page }: LegalPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#fbfaf5] text-black">
      <header className="border-b border-black/10 bg-white/80 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/refresh-kiwi-favicon-v2.png"
                alt=""
                width={34}
                height={34}
                aria-hidden
                className="shrink-0 rounded-full"
              />
              <span className="inline-block truncate font-roboto text-[34px] font-[350] leading-none tracking-tight">
                refresh kiwi
              </span>
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:border-black/20 sm:hidden"
              aria-label="Toggle legal page menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <span className="flex flex-col gap-1.5" aria-hidden="true">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            </button>
          </div>
          <nav
            aria-label="Legal pages"
            className={`${isMenuOpen ? "flex" : "hidden"} flex-col gap-2 text-xs sm:flex sm:flex-row sm:flex-wrap sm:gap-3`}
          >
            {legalPageList.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-black/60 transition hover:border-black/20 hover:text-black"
                onClick={() => setIsMenuOpen(false)}
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

      </article>
    </main>
  );
}
