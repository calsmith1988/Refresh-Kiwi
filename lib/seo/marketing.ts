import type { Metadata } from "next";

import { getAbsoluteUrl } from "@/lib/blog/articles";
import type { LegalPageContent } from "@/lib/legal/pages";

export const marketingCompany = {
  name: "CJS Global LTD",
  tradingName: "Refresh Kiwi",
  number: "10664657",
  registeredOffice: "8 Henfron, Energlyn, Caerphilly, CF83 2NU, United Kingdom",
  email: "info@refresh.kiwi",
  governingLaw: "England and Wales",
} as const;

export const homepageOgImagePath = "/refresh-kiwi-og.png";

/** Default refresh-flow FAQ copy for structured data (matches homepage messaging). */
export const homepageFaqs = [
  {
    question: "Does it really take 2 minutes?",
    answer:
      "About that, yes. Paste your web address, press one button, and your redesigned website is usually ready to look at in around 2 minutes.",
  },
  {
    question: "Will this change my real website?",
    answer:
      "No. We make a separate redesigned version. Your current website stays exactly as it is until you decide to switch.",
  },
  {
    question: "Do I lose my words and photos?",
    answer:
      "No — that's the whole point. We keep your business details, services, photos and phone number, and give them a cleaner, more modern home.",
  },
  {
    question: "Is this a web redesign service or a full new build?",
    answer:
      "Refresh Kiwi is a web redesign service. We use your existing site as the starting point, then create a fresher version you can preview, edit and take online.",
  },
  {
    question: "What is the website redesign cost?",
    answer:
      "You can see the redesign for free. If you want the redesigned website online, Kiwi Pro is £8/month with changes included and no long contract.",
  },
  {
    question: "I'm not good with computers. Is this for me?",
    answer:
      'Yes. You paste your web address and press one button. If you want a change later, type it like you would say it, such as "make the phone number bigger".',
  },
  {
    question: "What happens after I pay £8/month?",
    answer:
      "Your new website goes online and we host it for you. You can ask for changes, add extra pages, and connect your own web address. Cancel anytime.",
  },
  {
    question: "What if I don't like the result?",
    answer:
      "Then it costs you nothing. You can simply walk away, ask for changes, or try again.",
  },
] as const;

export const noindexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function marketingCanonical(path: string): Metadata["alternates"] {
  return {
    canonical: getAbsoluteUrl(path),
  };
}

export function legalPageMetadata(page: LegalPageContent): Metadata {
  return {
    title: `${page.title} — Refresh Kiwi`,
    description: page.description,
    alternates: marketingCanonical(`/${page.slug}`),
    openGraph: {
      title: `${page.title} — Refresh Kiwi`,
      description: page.description,
      url: getAbsoluteUrl(`/${page.slug}`),
      siteName: "Refresh Kiwi",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${page.title} — Refresh Kiwi`,
      description: page.description,
    },
  };
}

export function buildHomepageJsonLd() {
  const siteUrl = getAbsoluteUrl("/");
  const logoUrl = getAbsoluteUrl("/refresh-kiwi-favicon-v2.png");
  const ogImageUrl = getAbsoluteUrl(homepageOgImagePath);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: marketingCompany.tradingName,
    legalName: marketingCompany.name,
    url: siteUrl,
    email: marketingCompany.email,
    logo: logoUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: "8 Henfron, Energlyn",
      addressLocality: "Caerphilly",
      postalCode: "CF83 2NU",
      addressCountry: "GB",
    },
  };

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: marketingCompany.tradingName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "Paste your web address and get a fresh, modern version of your website in about 2 minutes. Built for local businesses.",
    offers: {
      "@type": "Offer",
      name: "Kiwi Pro",
      price: "8",
      priceCurrency: "GBP",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "8",
        priceCurrency: "GBP",
        unitText: "MONTH",
      },
    },
    image: ogImageUrl,
    provider: {
      "@type": "Organization",
      name: marketingCompany.tradingName,
      url: siteUrl,
    },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return [organization, softwareApplication, faqPage];
}
