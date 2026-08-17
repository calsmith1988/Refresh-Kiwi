export type LandingPageSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  callout?: string;
};

export type LandingPageFaq = {
  question: string;
  answer: string;
};

export type LandingPageLink = {
  href: string;
  label: string;
};

export type LandingPage = {
  slug: string;
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  eyebrow: string;
  intro: string;
  sections: LandingPageSection[];
  faqs: LandingPageFaq[];
  relatedLinks: LandingPageLink[];
};

export const marketingLandingPages: LandingPage[] = [
  {
    slug: "ai-website-redesign",
    title: "AI Website Redesign — Refresh What You Already Have | Refresh Kiwi",
    description:
      "AI website redesign for UK small businesses — paste your URL, pull your Google listing, or start from scratch. Preview in about two minutes. Free to try. Not a drag-and-drop builder.",
    primaryKeyword: "ai website redesign",
    secondaryKeywords: [
      "ai website redesign tool",
      "redesign website with ai",
      "ai website builder from existing website",
    ],
    eyebrow: "AI website redesign",
    intro:
      "Your site still has that 2014 beige-hero energy — right phone number, wrong everything else. AI website redesign is not another prompt box that generates a generic mall site on credits. Refresh Kiwi reads what you already have online, reshapes it in about two minutes, and shows you a preview before anything goes live. No drag-and-drop. No tokens. Not Wix ADI with a different logo.",
    sections: [
      {
        heading: "What AI website redesign means here",
        paragraphs: [
          "AI website redesign takes an existing business presence — a URL, a Google listing, or a plain-English description — and produces a fresher site without you learning a builder.",
          "That is different from an AI website builder that starts from a blank canvas and counts credits every time you tweak a headline.",
          "Refresh Kiwi is a redesign tool, not a builder mall. We keep the useful facts, lose the clutter, and let you edit in plain English or voice on Pro. CJS Global LTD, Caerphilly. info@refresh.kiwi. Remote, no fake local offices.",
        ],
      },
      {
        heading: "Can AI redesign my existing website?",
        paragraphs: [
          "Yes — that is the main job. Paste your current URL and Refresh Kiwi reads the pages, pulls the business details that matter, and generates a separate preview in about two minutes.",
          "Your live site stays exactly where it is until you choose to publish. No downtime, no \"we'll migrate you this weekend.\"",
          "AI does the reshaping. You check the phone number, the services, the photos — because AI does not know your business the way you do.",
        ],
        callout:
          "Redesign, not rebuild from scratch — unless scratch is the door you actually need.",
      },
      {
        heading: "AI website redesign from URL",
        paragraphs: [
          "URL refresh is door one and still the spine: paste the address, wait about two minutes, inspect the preview on your phone.",
          "Works for old WordPress sites, Wix pages you have outgrown, Weebly relics, agency sites from 2016 — anything with a public URL worth saving.",
          "Same output speed whether the site is embarrassing or merely tired. Kiwi Pro is £8/month to host with unlimited edits when you publish.",
        ],
      },
      {
        heading: "Is AI website redesign free?",
        paragraphs: [
          "The preview is free to try — no signup, no card, no credit meter ticking while you decide.",
          "You only pay when you choose to publish with Kiwi Pro: £8/month for hosting, custom domain, extra pages, and unlimited plain-English or voice edits.",
          "One tier. No maze. Cancel when you want. That is the whole commercial model.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Door two: type your business name and we pull your Google Business Profile — hours, reviews, contact details — and turn it into a real site, not Google's thin free stub.",
          "Door three: no listing, no site. Talk into the mic or type what you do. We transcribe and build. Same ~two minutes, same preview-first rule.",
          "All three paths land on the same free preview and the same £8/month Pro tier. Pick the door you actually have.",
        ],
      },
      {
        heading: "What we are not",
        paragraphs: [
          "Not an AI website builder page. Not Wix ADI. Not Durable on a credit budget. Not Lovable generating a new app in someone else's dashboard.",
          "Not WordPress. Not a CMS. Not Shopify — no cart claims, no checkout fiction.",
          "If you want a canvas and a widget drawer, use a builder. If you want the site you already have — or the business you can describe out loud — to look like it belongs in this decade, that is us.",
        ],
      },
      {
        heading: "Redesign website with AI — then edit like a human",
        bullets: [
          "Preview in about two minutes from URL, Google listing, or scratch.",
          "Unlimited edits on Pro — \"move the quote button up,\" by voice or text.",
          "Current site stays live until you switch.",
          "No drag-and-drop. No credits. No tokens.",
          "One Pro tier at £8/month. Free to try the preview.",
        ],
      },
      {
        heading: "Paste below. See it refreshed.",
        paragraphs: [
          "Drop your URL in the form — or use Google lookup or voice on the homepage if that is your door. We build a fresher preview while your real site keeps doing its job.",
          "Looks right? Kiwi Pro, £8 a month. Doesn't? You have lost two minutes and gained clarity. Fair trade.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can AI redesign my existing website?",
        answer:
          "Yes. Paste your URL and Refresh Kiwi generates a separate redesigned preview in about two minutes. Your live site stays untouched until you choose to publish.",
      },
      {
        question: "How does AI website redesign from URL work?",
        answer:
          "You paste your current website address. We read the public pages, keep useful business information, and produce a fresher layout and clearer structure. Preview first, pay only if you publish with Kiwi Pro.",
      },
      {
        question: "Is AI website redesign free?",
        answer:
          "The preview is free to try with no signup. Kiwi Pro is £8/month when you choose to host, connect your domain, and get unlimited plain-English or voice edits.",
      },
      {
        question: "Do I need a URL, or can I start from Google or scratch?",
        answer:
          "All three work. Paste a URL to refresh what you have, type your business name to build from your Google listing, or talk/type what you do if you are starting from nothing. Same preview-first flow.",
      },
      {
        question: "Is Refresh Kiwi an AI website builder?",
        answer:
          "No. We redesign what you already have online — or build from your listing or description — without a drag-and-drop canvas or credit meter. We win at not being a builder.",
      },
    ],
    relatedLinks: [
      { href: "/website-redesign-services", label: "Website redesign services" },
      { href: "/website-design-pay-monthly", label: "Website design pay monthly" },
      {
        href: "/blog/create-website-from-google-business-profile",
        label: "Create a website from Google Business Profile",
      },
      { href: "/blog/voice-website-builder", label: "Voice website builder" },
      {
        href: "/blog/ai-website-redesign-small-business",
        label: "AI website redesign for small business",
      },
      { href: "/blog/wix-alternative", label: "Wix alternative comparison" },
      { href: "/#pricing", label: "Homepage pricing" },
    ],
  },
];

export function getLandingPageBySlug(slug: string): LandingPage | undefined {
  return marketingLandingPages.find((page) => page.slug === slug);
}

export function buildLandingPageMetadata(page: LandingPage) {
  const url = getMarketingUrl(page.slug);

  return {
    title: page.title,
    description: page.description,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "Refresh Kiwi",
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: page.title,
      description: page.description,
    },
  };
}

export function getMarketingUrl(path: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://refresh.kiwi";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${appUrl}${normalizedPath}`;
}

export function buildFaqJsonLd(faqs: LandingPageFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
