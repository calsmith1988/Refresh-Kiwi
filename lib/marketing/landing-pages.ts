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
    slug: "website-design-pay-monthly",
    title: "Website Design Pay Monthly — From £8/Month | Refresh Kiwi",
    description:
      "Get a redesigned website and pay monthly from £8 with Kiwi Pro. Free preview first, no signup, cancel anytime. UK-friendly website design without large upfront fees.",
    primaryKeyword: "website design pay monthly",
    secondaryKeywords: [
      "pay monthly website design",
      "monthly website design uk",
      "website design subscription",
    ],
    eyebrow: "Pay monthly website design",
    intro:
      "If you want a better website but do not want a large upfront bill, paying monthly can make sense. Refresh Kiwi lets you try a redesigned version of your site for free, then host it on Kiwi Pro for £8 per month if you want to publish.",
    sections: [
      {
        heading: "What pay-monthly website design usually means",
        paragraphs: [
          "Pay-monthly website design spreads the cost of a new site over a subscription instead of charging thousands upfront. Some providers bundle design, hosting, and support into one monthly fee. Others charge a setup fee plus a monthly retainer.",
          "For small businesses, the appeal is simple: lower risk, predictable costs, and a website that stays maintained without hiring an agency for every small change.",
        ],
      },
      {
        heading: "How Refresh Kiwi pricing works",
        paragraphs: [
          "Refresh Kiwi separates the try-it step from the pay-monthly step. You paste your current website address and get a refreshed preview in about two minutes. That preview is free and does not require signup.",
          "If you like the preview and want to publish it, Kiwi Pro costs £8 per month. That includes hosting, a custom domain, extra pages, unlimited edits in plain English, and the ability to cancel anytime.",
        ],
        callout:
          "There is no large upfront design fee. You see the refreshed site before you pay anything.",
      },
      {
        heading: "What is included in the free preview",
        bullets: [
          "A redesigned homepage based on your current website or business description.",
          "Your real contact details, services, and content reshaped into a clearer layout.",
          "A separate preview you can inspect while your current site stays live.",
          "No signup and no payment required to try it.",
        ],
      },
      {
        heading: "What Kiwi Pro adds for £8/month",
        bullets: [
          "Publish your refreshed site and host it on Refresh Kiwi.",
          "Connect a custom domain (for example, yourbusiness.co.uk).",
          "Add extra pages beyond the homepage.",
          "Request changes in plain English — no technical skills needed.",
          "Cancel anytime if it is not working for you.",
        ],
      },
      {
        heading: "Who pay-monthly website design suits",
        paragraphs: [
          "Pay-monthly website design works well for sole traders, local services, clinics, cafes, trades, and other small businesses that need a clear brochure-style site rather than complex software.",
          "It is a good fit if your current site has useful information but looks dated, reads poorly on mobile, or makes it hard for visitors to call, email, or book.",
        ],
      },
      {
        heading: "What pay-monthly does not replace",
        paragraphs: [
          "Refresh Kiwi is not an ecommerce platform, booking system, or membership site. If you need a full online shop with cart and checkout, or deep integrations with CRM or inventory systems, you may need a specialist platform or agency.",
          "For a straightforward business website that explains what you do and helps people get in touch, pay-monthly hosting with a refreshed design is often enough.",
        ],
      },
      {
        heading: "How to get started",
        paragraphs: [
          "Paste your website address into the form below. Refresh Kiwi reads your current site, creates a fresher preview, and shows it to you in about two minutes. Your live website does not change until you choose to publish.",
          "If the preview looks right, upgrade to Kiwi Pro for £8 per month. If not, you have lost nothing except a couple of minutes.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is there a contract with pay-monthly website design?",
        answer:
          "Kiwi Pro is billed monthly and you can cancel anytime. There is no long-term contract.",
      },
      {
        question: "Do I pay before seeing the redesigned website?",
        answer:
          "No. The preview is free. You only pay if you choose to publish with Kiwi Pro.",
      },
      {
        question: "What happens to my current website?",
        answer:
          "Nothing changes on your live site until you publish. The preview is separate so you can compare before deciding.",
      },
      {
        question: "Can I request changes after I subscribe?",
        answer:
          "Yes. Kiwi Pro includes unlimited edits in plain English. Tell us what to change and we update the site for you.",
      },
    ],
    relatedLinks: [
      { href: "/website-design-packages", label: "Website design packages" },
      { href: "/website-redesign-services", label: "Website redesign services" },
      { href: "/blog/small-business-website-redesign-cost-uk", label: "Small business website redesign cost (UK)" },
      { href: "/blog/website-design-process", label: "Website design process guide" },
      { href: "/#pricing", label: "Homepage pricing" },
    ],
  },
  {
    slug: "website-redesign-services",
    title: "Website Redesign Services — Online, UK-Wide | Refresh Kiwi",
    description:
      "Remote website redesign services for UK small businesses. Paste your URL, get a refreshed preview in minutes. No local office required — honest online redesign from Refresh Kiwi.",
    primaryKeyword: "website redesign services company",
    secondaryKeywords: [
      "website redesign services near me",
      "website redesign service uk",
      "online website redesign",
    ],
    eyebrow: "Website redesign services",
    intro:
      "Searching for website redesign services near me often means you want someone to improve your site without a long agency project. Refresh Kiwi is an online redesign service based in the UK — we work remotely with businesses across England, Wales, Scotland, and Northern Ireland.",
    sections: [
      {
        heading: "An honest note about location",
        paragraphs: [
          "Refresh Kiwi does not have local branch offices or in-person design meetings. We are an online service run by CJS Global LTD from Caerphilly, Wales. That means we can help UK businesses anywhere, but we are not a traditional local web agency with a shopfront.",
          "If you need someone to visit your premises or run workshops in person, a local freelancer or agency may suit you better. If you want a faster way to see a redesigned version of your existing site, an online refresh service can work well.",
        ],
        callout:
          "We serve UK businesses online. There is no fake local office — just a straightforward remote redesign service.",
      },
      {
        heading: "What our website redesign service includes",
        bullets: [
          "Reading your current website and keeping useful business information.",
          "Creating a fresher layout with clearer calls to action.",
          "Improving mobile readability and visual trust.",
          "A free preview you inspect before anything goes live.",
          "Optional hosting and ongoing edits with Kiwi Pro (£8/month).",
        ],
      },
      {
        heading: "How the redesign process works",
        paragraphs: [
          "Step one: paste your website address or describe your business. Refresh Kiwi generates a separate preview in about two minutes.",
          "Step two: review the preview on your phone and desktop. Check contact details, services, photos, and the overall feel.",
          "Step three: if you want to publish, subscribe to Kiwi Pro for £8 per month. Request changes in plain English anytime.",
        ],
      },
      {
        heading: "When an online redesign service is enough",
        bullets: [
          "Your services and contact details are mostly correct already.",
          "The site looks old but still contains useful content.",
          "You want a clearer homepage and stronger calls to action.",
          "You do not need ecommerce, booking integrations, or custom software.",
          "You want to see a result quickly before committing budget.",
        ],
      },
      {
        heading: "When you may need more than a refresh",
        paragraphs: [
          "A redesign service focused on presentation will not replace a full rebuild if your business model has changed, your site structure is broken, or you need ecommerce with cart and checkout.",
          "Refresh Kiwi is best for brochure-style business websites: clear services, contact details, trust signals, and a professional look. If your project needs complex development, consider an agency or specialist.",
        ],
      },
      {
        heading: "Why UK small businesses choose Refresh Kiwi",
        paragraphs: [
          "Many owners search for website redesign services near me because they want help but not a six-week project with discovery calls and revision rounds. Refresh Kiwi offers a preview-first approach: see the redesigned site, then decide.",
          "Pricing is simple — free to try, £8 per month to publish. No hidden setup fees or surprise invoices.",
        ],
      },
      {
        heading: "Get a refreshed preview today",
        paragraphs: [
          "Whether you are in London, Manchester, Cardiff, Edinburgh, Belfast, or a smaller town, the process is the same. Paste your URL below and see what a refreshed version of your site could look like.",
          "Your current website stays unchanged until you choose to switch.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do you offer website redesign services near me in person?",
        answer:
          "No. Refresh Kiwi is a remote, online service. We work with UK businesses over the internet rather than through local office visits.",
      },
      {
        question: "How long does a website redesign take?",
        answer:
          "The initial preview takes about two minutes. Publishing and any follow-up edits depend on when you subscribe and what changes you request.",
      },
      {
        question: "Will you migrate my SEO rankings?",
        answer:
          "Refresh Kiwi creates a new static site. SEO depends on content quality, redirects, and how you switch domains. See our guide on redesigning without losing SEO for practical steps.",
      },
      {
        question: "Can I keep my current domain?",
        answer:
          "Yes. Kiwi Pro includes connecting a custom domain so visitors reach your refreshed site at the same address.",
      },
    ],
    relatedLinks: [
      { href: "/website-design-pay-monthly", label: "Website design pay monthly" },
      { href: "/website-design-packages", label: "Website design packages" },
      { href: "/blog/website-redesign-agency-alternative", label: "Website redesign agency alternative" },
      { href: "/blog/redesign-website-without-losing-seo", label: "Redesign without losing SEO" },
      { href: "/#pricing", label: "Homepage pricing" },
    ],
  },
  {
    slug: "website-design-packages",
    title: "Website Design Packages — Free Preview & Kiwi Pro | Refresh Kiwi",
    description:
      "Compare Refresh Kiwi website design packages: free preview with no signup, or Kiwi Pro at £8/month for hosting, custom domain, extra pages, and unlimited edits.",
    primaryKeyword: "website design packages",
    secondaryKeywords: [
      "website design package uk",
      "small business website packages",
      "website design plans",
    ],
    eyebrow: "Website design packages",
    intro:
      "Website design packages usually bundle design, pages, hosting, and support into tiers. Refresh Kiwi keeps it simple: one free package to try and one paid package to publish. No bronze, silver, and gold tiers — just a clear choice.",
    sections: [
      {
        heading: "Why most package pages feel confusing",
        paragraphs: [
          "Many web agencies list three or four packages with different page counts, revision rounds, and add-ons. It can be hard to know what you actually need or what you are paying for before work starts.",
          "Refresh Kiwi offers two packages because that matches how the product works: try a refreshed preview for free, then pay monthly only if you want to publish and keep the site live.",
        ],
      },
      {
        heading: "Package 1: Free preview",
        bullets: [
          "Paste your website address or describe your business.",
          "Get a redesigned preview in about two minutes.",
          "No signup, no payment, no credit card.",
          "Your current website stays exactly as it is.",
          "Inspect the preview on mobile and desktop before deciding.",
        ],
        callout:
          "The free preview is the whole point. You see the redesign before spending anything.",
      },
      {
        heading: "Package 2: Kiwi Pro — £8/month",
        bullets: [
          "Publish your refreshed website and host it on Refresh Kiwi.",
          "Connect a custom domain.",
          "Add extra pages beyond the homepage.",
          "Unlimited edits — ask for changes in plain English.",
          "Cancel anytime.",
        ],
        paragraphs: [
          "Kiwi Pro is the only paid tier. There are no extra packages, setup fees, or per-page charges beyond what is included.",
        ],
      },
      {
        heading: "What both packages include",
        paragraphs: [
          "Both the free preview and Kiwi Pro use the same redesign engine. Refresh Kiwi reads your current site or business description and produces a clearer, mobile-friendly layout with your real contact details and services.",
          "The difference is whether you publish and keep the site live with ongoing hosting and edits.",
        ],
      },
      {
        heading: "What is not in either package",
        paragraphs: [
          "Refresh Kiwi does not offer ecommerce packages with shopping cart and checkout, integrated booking calendars, membership areas, or custom software development. Those need specialist platforms or agencies.",
          "Our packages are for brochure-style business websites: explain what you do, show trust signals, and make it easy to get in touch.",
        ],
      },
      {
        heading: "How to choose between the packages",
        bullets: [
          "Start with the free preview if you are unsure whether a refresh is enough.",
          "Choose Kiwi Pro if the preview looks right and you want it live on your domain.",
          "Stay on the free preview if you only wanted to see options before briefing an agency.",
          "Cancel Kiwi Pro anytime if your needs change.",
        ],
      },
      {
        heading: "Compare with typical agency packages",
        paragraphs: [
          "Agency packages often start at hundreds or thousands of pounds upfront, with page limits and defined revision rounds. Refresh Kiwi flips that: see the result first, pay £8 per month only if you publish.",
          "For many small businesses, that is enough to get a professional site without a large project.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are there hidden tiers or upsells?",
        answer:
          "No. Refresh Kiwi has a free preview and Kiwi Pro at £8 per month. There are no additional paid packages.",
      },
      {
        question: "How many pages are included in Kiwi Pro?",
        answer:
          "Kiwi Pro includes the homepage plus extra pages. There is no separate per-page fee within the subscription.",
      },
      {
        question: "Can I try the free package more than once?",
        answer:
          "Yes. You can refresh different URLs or try again if you want to compare results.",
      },
      {
        question: "What happens if I cancel Kiwi Pro?",
        answer:
          "You can cancel anytime. Check our terms for details on what happens to your hosted site after cancellation.",
      },
    ],
    relatedLinks: [
      { href: "/website-design-pay-monthly", label: "Website design pay monthly" },
      { href: "/website-redesign-services", label: "Website redesign services" },
      { href: "/blog/small-business-website-redesign-cost-uk", label: "Website redesign cost (UK)" },
      { href: "/blog/website-design-process", label: "Website design process" },
      { href: "/#pricing", label: "Homepage pricing" },
    ],
  },
  {
    slug: "ecommerce-website-redesign",
    title: "Ecommerce Website Redesign — Refresh Your Storefront | Refresh Kiwi",
    description:
      "Refresh the look of an existing ecommerce site or build a brochure-style storefront from a brief. Honest limits: no Shopify apps or cart integrations. Free preview from Refresh Kiwi.",
    primaryKeyword: "ecommerce website redesign",
    secondaryKeywords: [
      "redesign ecommerce website",
      "online store redesign",
      "ecommerce site refresh",
    ],
    eyebrow: "Ecommerce website redesign",
    intro:
      "An ecommerce website redesign usually means updating how your online store looks and reads — clearer product presentation, better mobile layout, stronger trust signals. Refresh Kiwi can refresh an existing site or build from a brief, but it is important to understand what the product can and cannot do.",
    sections: [
      {
        heading: "What Refresh Kiwi can do for ecommerce sites",
        paragraphs: [
          "Refresh Kiwi can take an existing website URL — including many ecommerce sites — and produce a refreshed preview with clearer layout, improved mobile readability, and stronger calls to action.",
          "If you are starting from scratch, you can describe your business and products in plain English and get a brochure-style storefront preview.",
        ],
        bullets: [
          "Refresh the visual design and structure of an existing site.",
          "Improve how products or services are presented on the page.",
          "Make contact details, policies, and trust signals easier to find.",
          "Create a separate preview while your current store stays live.",
        ],
      },
      {
        heading: "What Refresh Kiwi cannot do",
        paragraphs: [
          "Refresh Kiwi does not integrate with Shopify, WooCommerce, or other ecommerce platforms. There is no shopping cart, checkout, inventory sync, or product database connection in the product today.",
          "If you need a full online shop where customers add items to a basket and pay on your site, you will need your existing platform or a dedicated ecommerce solution. Refresh Kiwi is best when you want a better-looking site or a simpler brochure-style presence.",
        ],
        callout:
          "We refresh how your site looks and reads. We do not replace Shopify, WooCommerce, or platform checkout flows.",
      },
      {
        heading: "When an ecommerce redesign refresh makes sense",
        bullets: [
          "Your store runs on a platform but the theme looks dated.",
          "You want to see a fresher layout before committing to a new theme or agency.",
          "Your business sells mainly through enquiries, quotes, or in-person sales rather than online checkout.",
          "You need a cleaner landing page that links out to your existing shop.",
          "You are moving away from ecommerce toward a simpler brochure site.",
        ],
      },
      {
        heading: "When you need a platform specialist instead",
        bullets: [
          "You need cart, checkout, and payment processing on your site.",
          "You manage hundreds of SKUs with inventory sync.",
          "You rely on Shopify apps, WooCommerce plugins, or custom ecommerce APIs.",
          "You need order management, subscriptions, or customer accounts.",
        ],
      },
      {
        heading: "Protecting SEO during an ecommerce redesign",
        paragraphs: [
          "Redesigning an ecommerce site carries SEO risk if product URLs, categories, or content change without redirects. Refresh Kiwi creates a separate preview so your live store is untouched while you review.",
          "If you publish a refreshed site, plan redirects from old URLs to new ones and keep product titles and descriptions accurate. Our blog guide on redesigning without losing SEO covers practical steps.",
        ],
      },
      {
        heading: "Pricing for ecommerce refreshes",
        paragraphs: [
          "The preview is free — paste your store URL and see a refreshed version in about two minutes. If you want to publish the new site, Kiwi Pro costs £8 per month and includes hosting, a custom domain, extra pages, and unlimited edits in plain English.",
          "There is no separate ecommerce tier. The same Kiwi Pro package applies.",
        ],
      },
      {
        heading: "Try a refreshed preview of your store",
        paragraphs: [
          "Paste your current ecommerce site address below. Refresh Kiwi will read what it can from your existing pages and show you a fresher preview. Review it carefully — especially product names, prices, and links — before deciding to publish.",
          "Your live store stays unchanged until you switch.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Refresh Kiwi work with Shopify?",
        answer:
          "Refresh Kiwi can read a public Shopify storefront URL and create a refreshed preview, but it does not connect to your Shopify admin, products, or checkout. Publishing replaces your site with a static Refresh Kiwi site, not a Shopify store.",
      },
      {
        question: "Can customers buy products on a Refresh Kiwi site?",
        answer:
          "No. Refresh Kiwi sites are brochure-style. They can link to external shops or contact forms, but there is no built-in cart or checkout.",
      },
      {
        question: "Will redesigning my ecommerce site hurt SEO?",
        answer:
          "Any redesign can affect SEO if URLs or content change without redirects. Use the free preview to plan changes, then follow redirect best practices when you publish.",
      },
      {
        question: "Can I refresh a WooCommerce site?",
        answer:
          "Yes, Refresh Kiwi can read a public WooCommerce site URL and produce a preview. It does not sync with WooCommerce products or orders.",
      },
    ],
    relatedLinks: [
      { href: "/website-redesign-services", label: "Website redesign services" },
      { href: "/website-design-packages", label: "Website design packages" },
      { href: "/blog/redesign-website-without-losing-seo", label: "Redesign without losing SEO" },
      { href: "/blog/website-refresh-guide-small-business", label: "Website refresh guide" },
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
