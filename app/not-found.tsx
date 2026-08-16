import Link from "next/link";
import type { Metadata } from "next";

import SiteLogo from "@/components/SiteLogo";
import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Page not found — Refresh Kiwi",
  robots: noindexRobots,
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-xl">
        <SiteLogo wordmark="always" className="justify-center" />
        <h1 className="mt-6 font-fraunces text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-black/60">
          That page doesn&apos;t exist. Try the homepage, or contact us if you
          think something is broken.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-kiwi-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
          >
            Back to homepage
          </Link>
          <Link
            href="/contact-us"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
