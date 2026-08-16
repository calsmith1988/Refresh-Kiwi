import type { Metadata } from "next";

import Link from "next/link";

import SiteLogo from "@/components/SiteLogo";
import { getAbsoluteUrl } from "@/lib/blog/articles";
import { marketingCanonical, marketingCompany } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "About us — Refresh Kiwi",
  description:
    "Refresh Kiwi helps small businesses get a fresher website in minutes. Operated by CJS Global LTD in Caerphilly, Wales.",
  alternates: marketingCanonical("/about-us"),
  openGraph: {
    title: "About us — Refresh Kiwi",
    description:
      "Refresh Kiwi helps small businesses get a fresher website in minutes. Operated by CJS Global LTD in Caerphilly, Wales.",
    url: getAbsoluteUrl("/about-us"),
    siteName: "Refresh Kiwi",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "About us — Refresh Kiwi",
    description:
      "Refresh Kiwi helps small businesses get a fresher website in minutes.",
  },
};

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-16 text-[#141811] sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <SiteLogo wordmark="always" />

        <section className="mt-10 rounded-[2rem] border border-black/10 bg-white p-8 shadow-xl shadow-black/5 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            About us
          </p>
          <h1 className="mt-3 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
            Same website, fresher skin.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60 sm:text-base">
            Refresh Kiwi is for small business owners who want a website that
            looks modern and trustworthy — without weeks of meetings, quotes, or
            learning a complicated website builder.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60 sm:text-base">
            Paste your current web address and see a fresh version in about two
            minutes. Nothing changes on your real site until you decide to switch.
            You can ask for edits in plain English, add pages when you need them,
            and put the site online on Kiwi Pro when you are ready.
          </p>

          <h2 className="mt-10 font-fraunces text-2xl font-semibold tracking-tight">
            Who runs Refresh Kiwi
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/60 sm:text-base">
            {marketingCompany.tradingName} is operated by {marketingCompany.name},
            company number {marketingCompany.number}. Our registered office is{" "}
            {marketingCompany.registeredOffice}.
          </p>
          <p className="mt-3 text-sm leading-7 text-black/60 sm:text-base">
            We built Refresh Kiwi because local businesses deserve websites that
            keep up with how they actually work — clear contact details, mobile-friendly
            layouts, and room to grow without starting from scratch every few years.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact-us"
              className="rounded-full bg-[#141811] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Contact us
            </Link>
            <Link
              href="/#hero"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Try Refresh Kiwi free
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
