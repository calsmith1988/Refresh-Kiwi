import type { Metadata } from "next";

import WebsiteCostCalculator from "@/components/WebsiteCostCalculator";
import { getAbsoluteUrl } from "@/lib/blog/articles";
import { buildFaqJsonLd } from "@/lib/marketing/landing-pages";
import { calculatorFaqs } from "@/lib/marketing/website-cost-calculator";
import { marketingCanonical } from "@/lib/seo/marketing";

const pageTitle = "Website Cost Calculator — Typical UK Prices vs £8/month";
const pageDescription =
  "A website cost calculator for UK small businesses. See a typical agency range for your pages and extras, then compare it with Refresh Kiwi at £8 a month. Ranges, not a quote.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: marketingCanonical("/website-cost-calculator"),
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: getAbsoluteUrl("/website-cost-calculator"),
    siteName: "Refresh Kiwi",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: pageTitle,
    description: pageDescription,
  },
};

export default function WebsiteCostCalculatorPage() {
  const faqJsonLd = buildFaqJsonLd([...calculatorFaqs]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <WebsiteCostCalculator />
    </>
  );
}
