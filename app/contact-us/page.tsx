import type { Metadata } from "next";

import Link from "next/link";

import SiteLogo from "@/components/SiteLogo";
import { getAbsoluteUrl } from "@/lib/blog/articles";
import { marketingCanonical, marketingCompany } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Contact us — Refresh Kiwi",
  description:
    "Get in touch with Refresh Kiwi for product questions, billing help, or privacy enquiries. Email info@refresh.kiwi.",
  alternates: marketingCanonical("/contact-us"),
  openGraph: {
    title: "Contact us — Refresh Kiwi",
    description:
      "Get in touch with Refresh Kiwi for product questions, billing help, or privacy enquiries.",
    url: getAbsoluteUrl("/contact-us"),
    siteName: "Refresh Kiwi",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact us — Refresh Kiwi",
    description:
      "Email info@refresh.kiwi for product questions, billing help, or privacy enquiries.",
  },
};

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-16 text-[#141811] sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <SiteLogo wordmark="always" />

        <section className="mt-10 rounded-[2rem] border border-black/10 bg-white p-8 shadow-xl shadow-black/5 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            Contact
          </p>
          <h1 className="mt-3 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
            We&apos;re here to help.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60 sm:text-base">
            Questions about refreshing your website, billing, domains, or your
            account? Email us and a real person will get back to you.
          </p>

          <div className="mt-8 rounded-2xl border border-black/10 bg-[#fbfaf6] p-6">
            <h2 className="text-sm font-semibold text-black">Email</h2>
            <a
              href={`mailto:${marketingCompany.email}`}
              className="mt-2 inline-block text-lg font-semibold text-black underline-offset-2 hover:underline"
            >
              {marketingCompany.email}
            </a>
            <p className="mt-3 text-sm leading-6 text-black/55">
              For privacy or legal enquiries, include the email address on your
              Refresh Kiwi account so we can find it quickly.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-[#fbfaf6] p-6">
            <h2 className="text-sm font-semibold text-black">Registered office</h2>
            <p className="mt-2 text-sm leading-7 text-black/60">
              {marketingCompany.name}
              <br />
              {marketingCompany.registeredOffice}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/help-centre"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Help centre
            </Link>
            <Link
              href="/#hero"
              className="rounded-full bg-kiwi-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
            >
              Refresh my website
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
