import type { Metadata } from "next";

import { getAbsoluteUrl } from "@/lib/blog/articles";
import type { LegalPageContent } from "@/lib/legal/pages";
import { type SupportedCurrency } from "@/lib/pricing/regions";

export const marketingCompany = {
  name: "CJS Global LTD",
  tradingName: "Refresh Kiwi",
  number: "10664657",
  registeredOffice: "8 Henfron, Energlyn, Caerphilly, CF83 2NU, United Kingdom",
  email: "info@refresh.kiwi",
  governingLaw: "England and Wales",
} as const;

export const homepageOgImagePath = "/refresh-kiwi-og.png";

const KIWI_PRO_OFFER_CURRENCIES: SupportedCurrency[] = [
  "GBP",
  "USD",
  "CAD",
  "AUD",
];

const KIWI_PRO_OFFER_MINOR_AMOUNTS: Record<SupportedCurrency, number> = {
  GBP: 8,
  USD: 11,
  CAD: 15,
  AUD: 17,
};

const KIWI_PRO_OFFER_DESCRIPTION =
  "Hosting, unlimited plain-English or voice edits, custom domain, extra pages, cancel anytime.";

/** Verified official profiles only — each URL HEAD-checked before inclusion. */
const OFFICIAL_PROFILE_URLS = [
  "https://www.producthunt.com/products/refresh-kiwi",
  "https://www.uneed.best/tool/refresh-kiwi",
  "https://github.com/calsmith1988/Refresh-Kiwi",
  "https://www.instagram.com/refresh.kiwi/",
] as const;

/** Visible homepage FAQ copy — shared with JSON-LD so schema matches rendered text. */
export const kiwiProCostFaqAnswer =
  "Free to try. Kiwi Pro is £8/month, US$11/month, CA$15/month, or AU$17/month — unlimited edits including voice and plain English. We host it. No credits, no token maze.";

export const homepageFaqs = [
  {
    question: "Does it really take 2 minutes?",
    answer:
      "About that, yes. Paste a URL, pick a Google listing, or describe your business — press one button and you're usually looking at a new site in around 2 minutes.",
  },
  {
    question: "Will this change my real website?",
    answer:
      "If you paste a URL, we make a separate version. Your current site stays exactly as it is until you decide to switch. Starting from Google or scratch? There's no live site to disturb.",
  },
  {
    question: "Do I need an old website?",
    answer:
      "No. Paste a URL if you've got one, find your business on Google, or start from scratch — talk into the mic or type what you do.",
  },
  {
    question: "Is this a web redesign service or a full new build?",
    answer:
      "Both, depending on which door you use. Got a site? We refresh it. Got a Google listing or a rough idea? We build from that. We're not a CMS and we're not another drag-and-drop builder page.",
  },
  {
    question: "What does Kiwi Pro cost?",
    answer: kiwiProCostFaqAnswer,
  },
  {
    question: "What if I don't have photos yet?",
    answer:
      "We pull from your site or Google listing when we can. Starting from scratch? We still make something clean from what you tell us.",
  },
  {
    question: "How is this different from local web design companies?",
    answer:
      "Most want meetings, quotes, and weeks. We give you a website in about 2 minutes, then you ask for changes whenever — in normal words.",
  },
  {
    question: "I'm not good with computers. Is this for me?",
    answer:
      "Yes. Paste a URL, pick your Google listing, or talk into the mic. Changes later? Say them like you'd say them to a friend.",
  },
  {
    question: "What happens after I pay for Kiwi Pro?",
    answer:
      "Your site goes online. We host it. Change anything in plain English, add pages, connect your domain. Cancel anytime.",
  },
  {
    question: "What if I don't like the result?",
    answer:
      "Then it costs you nothing. Walk away, try a different door, or ask for changes.",
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

function buildKiwiProOffers() {
  return KIWI_PRO_OFFER_CURRENCIES.map((currency) => {
    const price = String(KIWI_PRO_OFFER_MINOR_AMOUNTS[currency]);

    return {
      "@type": "Offer" as const,
      name: "Kiwi Pro",
      price,
      priceCurrency: currency,
      description: KIWI_PRO_OFFER_DESCRIPTION,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification" as const,
        price,
        priceCurrency: currency,
        unitText: "MONTH",
        referenceQuantity: {
          "@type": "QuantitativeValue" as const,
          value: 1,
          unitCode: "MON",
        },
      },
    };
  });
}

export function buildHomepageJsonLd() {
  const siteUrl = getAbsoluteUrl("/");
  const ogImageUrl = getAbsoluteUrl(homepageOgImagePath);

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Refresh Kiwi",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "A small-business website in about two minutes. Start from a URL, a Google listing, or a description of your business by type or voice.",
    offers: buildKiwiProOffers(),
    image: ogImageUrl,
    sameAs: [...OFFICIAL_PROFILE_URLS],
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

  return [softwareApplication, faqPage];
}
