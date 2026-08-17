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
      "Your site still has that 2014 energy — beige hero, phone number buried three scrolls down, mobile layout that fights back. You want it fixed. You do not want a four-figure invoice before you've seen anything. Website design pay monthly is the sensible move: see a refreshed version free, then publish for £8 a month if it earns the switch.",
    sections: [
      {
        heading: "What pay-monthly actually means (and what it doesn't)",
        paragraphs: [
          "Pay-monthly website design spreads the cost instead of hitting you with thousands upfront. Some outfits bundle design, hosting, and support into one monthly fee. Others charge a setup fee, then a retainer, then bill you again when you want the phone number moved two inches left.",
          "For a plumber in Pontypridd or a bakery that still apologises for its splash page — the appeal is simple. Lower risk. Predictable cost. A site that gets updated without booking a 'quick call' that eats your Tuesday.",
        ],
      },
      {
        heading: "How Refresh Kiwi does it",
        paragraphs: [
          "We split try-it from pay-for-it. Paste your URL. Get a refreshed preview in about two minutes. Free. No signup. No card details. No 'we'll send a proposal within five working days.'",
          "Like what you see? Kiwi Pro is £8 a month. Hosting, custom domain, extra pages, unlimited edits in plain English — 'make the quote button bigger,' not 'adjust the CTA padding.' Cancel when you want.",
        ],
        callout:
          "No upfront design fee. You see the refreshed site before a penny leaves your account.",
      },
      {
        heading: "The free preview — what's in the box",
        bullets: [
          "A redesigned homepage from your current site or a short business brief.",
          "Your real phone number, services, and copy — reshaped so humans can actually read them.",
          "A separate preview while your live site keeps doing its thing.",
          "No signup. No payment. No 'book a discovery call.'",
        ],
      },
      {
        heading: "Kiwi Pro — £8/month, the bit where it goes live",
        bullets: [
          "Publish and host the refreshed site on Refresh Kiwi.",
          "Connect your domain — yourbusiness.co.uk, not something.refreshkiwi.site.",
          "Extra pages beyond the homepage.",
          "Unlimited edits in plain English. Say what you want. We change it.",
          "Cancel anytime. Genuinely.",
        ],
      },
      {
        heading: "Who this suits",
        paragraphs: [
          "Sole traders, local services, clinics, cafes, trades — anyone who needs a clear brochure site, not a software project. If your content is mostly right but the presentation makes you wince when you hand someone your card, pay-monthly website design fits.",
          "Especially if visitors can't find your number on mobile, or your homepage reads like it was written by a committee that never met your customers.",
        ],
      },
      {
        heading: "What we are not",
        paragraphs: [
          "Not an ecommerce platform. Not a booking system. Not a membership site. If you need cart, checkout, inventory sync, or CRM plumbing, you need a specialist — and we will not pretend otherwise.",
          "If you need a straightforward site that explains what you do and makes it easy to get in touch? £8 a month and a refreshed design is often the whole story.",
        ],
      },
      {
        heading: "Two minutes. Paste below.",
        paragraphs: [
          "Drop your URL in the form. We read your current site, build a fresher preview, show it to you in about two minutes. Your live website does not budge until you say go.",
          "Preview looks right? Kiwi Pro, £8 a month. Doesn't? You've lost two minutes and gained clarity. Fair trade.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is there a contract with pay-monthly website design?",
        answer:
          "Kiwi Pro bills monthly. Cancel when you like. No twelve-month lock-in, no 'early termination fee' small print.",
      },
      {
        question: "Do I pay before seeing the redesigned website?",
        answer:
          "No. Preview first, always. You only pay if you choose to publish with Kiwi Pro.",
      },
      {
        question: "What happens to my current website?",
        answer:
          "Nothing. It stays live. The preview is separate — compare side by side, show your partner, sleep on it.",
      },
      {
        question: "Can I request changes after I subscribe?",
        answer:
          "Yes. Kiwi Pro includes unlimited edits in plain English. Tell us what to change. We update the site.",
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
      "You searched website redesign services near me because your site embarrasses you and you want someone else to fix it — without six weeks of discovery workshops and a invoice that arrives before you've seen a mockup. Refresh Kiwi is an online redesign service. UK-wide. Remote. Based in Caerphilly, run by CJS Global LTD. No shopfront. No pretending.",
    sections: [
      {
        heading: "Location — the honest bit",
        paragraphs: [
          "We do not have branch offices in Manchester, Bristol, or anywhere else. No one will visit your premises with a mood board. CJS Global LTD runs Refresh Kiwi from Caerphilly, Wales, and we work with businesses across England, Wales, Scotland, and Northern Ireland over the internet.",
          "Need someone in the room? Hire a local freelancer or agency. Want to see a redesigned version of your existing site before you commit budget or calendar? That's us.",
        ],
        callout:
          "UK businesses, served online. No fake local office on Google Maps. Just a straight remote redesign service.",
      },
      {
        heading: "What you get",
        bullets: [
          "We read your current site and keep the useful stuff — services, number, reviews, the bits customers actually need.",
          "A fresher layout with calls to action that don't hide.",
          "Mobile that doesn't feel like an afterthought.",
          "A free preview before anything goes live.",
          "Optional hosting and edits with Kiwi Pro — £8/month.",
        ],
      },
      {
        heading: "Three steps, about two minutes to start",
        paragraphs: [
          "One: paste your URL or describe the business. Preview in about two minutes.",
          "Two: check it on your phone. Verify the number, the services, the photos. Would you send a customer here?",
          "Three: like it? Kiwi Pro, £8 a month. Publish, connect your domain, ask for changes in plain English whenever.",
        ],
      },
      {
        heading: "When an online redesign service is enough",
        bullets: [
          "Your services and contact details are mostly correct already.",
          "The site looks like 2014 called and wants its template back — but the content underneath is fine.",
          "You want a clearer homepage and a phone number people can actually tap.",
          "You don't need ecommerce, booking integrations, or custom software.",
          "You want proof before you spend.",
        ],
      },
      {
        heading: "When you need more than us",
        paragraphs: [
          "If your business model has changed, your site structure is broken, or you need cart and checkout — a presentation-focused redesign service won't cut it.",
          "Refresh Kiwi is for brochure sites: clear services, contact details, trust signals, a look that doesn't make you apologise. Complex development? Agency or specialist.",
        ],
      },
      {
        heading: "Why owners pick us over a six-week project",
        paragraphs: [
          "Plenty of people search website redesign services near me because they want help, not a project plan with Gantt charts. Preview first. See the site. Then decide.",
          "Free to try. £8 a month to publish. No setup fee lurking in the footer.",
        ],
      },
      {
        heading: "Same process whether you're in London or Llanelli",
        paragraphs: [
          "Paste your URL below. See what a refreshed version looks like. Your current site stays untouched until you switch.",
          "That's the whole pitch. No calendar link required.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do you offer website redesign services near me in person?",
        answer:
          "No. Remote only. We work with UK businesses online — email info@refresh.kiwi if you want to talk, but nobody's driving to your shop with a laptop.",
      },
      {
        question: "How long does a website redesign take?",
        answer:
          "Initial preview: about two minutes. Publishing and follow-up edits depend on when you subscribe and what you ask us to change.",
      },
      {
        question: "Will you migrate my SEO rankings?",
        answer:
          "We build a new static site. Rankings depend on content, redirects, and how you switch. Our guide on redesigning without losing SEO covers the practical stuff.",
      },
      {
        question: "Can I keep my current domain?",
        answer:
          "Yes. Kiwi Pro includes connecting your custom domain — same address, refreshed site.",
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
      "Most website design packages pages read like a menu designed to confuse you into the middle tier. Bronze, silver, gold. Twelve pages, three revision rounds, SEO add-on sold separately. Refresh Kiwi has two options: free preview, Kiwi Pro at £8 a month. That's the whole website design packages story.",
    sections: [
      {
        heading: "Why package pages make your eyes glaze over",
        paragraphs: [
          "Agencies love tiers. Different page counts, revision caps, hosting bundled or not, 'strategy workshop' as a line item. You end up guessing what you need before anyone shows you a single screen.",
          "We have two packages because the product has two modes: try it free, pay monthly if you publish. No bronze medal for showing up.",
        ],
      },
      {
        heading: "Package 1: Free preview",
        bullets: [
          "Paste your URL or describe the business.",
          "Redesigned preview in about two minutes.",
          "No signup. No card. No 'quick call to discuss your needs.'",
          "Your current site stays exactly as it is.",
          "Check it on mobile before you decide anything.",
        ],
        callout:
          "The free preview is the product demo. You see the redesign before spending anything.",
      },
      {
        heading: "Package 2: Kiwi Pro — £8/month",
        bullets: [
          "Publish and host the refreshed site.",
          "Connect your custom domain.",
          "Extra pages beyond the homepage.",
          "Unlimited edits in plain English.",
          "Cancel anytime.",
        ],
        paragraphs: [
          "One paid tier. No upsells, no per-page charges, no 'enterprise' package hiding round the corner.",
        ],
      },
      {
        heading: "What both use",
        paragraphs: [
          "Same engine either way. We read your site or brief and produce a clearer, mobile-friendly layout with your real details — not lorem ipsum and a stock photo of someone in a hard hat nodding at a tablet.",
          "The difference is whether you keep it live with hosting and ongoing edits.",
        ],
      },
      {
        heading: "What's not in either package",
        paragraphs: [
          "No shopping cart. No checkout. No booking calendar integration. No membership area. No custom app development. Those need platforms and specialists built for the job.",
          "Our packages are for brochure sites: what you do, why someone should trust you, how to get in touch.",
        ],
      },
      {
        heading: "Which one to pick",
        bullets: [
          "Not sure a refresh is enough? Start free.",
          "Preview looks right and you want it on your domain? Kiwi Pro.",
          "Just wanted ammunition for briefing an agency? Free preview, no guilt.",
          "Needs changed? Cancel Kiwi Pro. No drama.",
        ],
      },
      {
        heading: "Versus a typical agency package",
        paragraphs: [
          "Agency packages often start at hundreds or thousands upfront, with page limits and two revision rounds before the meter runs again. We flip it: see the result, pay £8 a month only if you publish.",
          "For a lot of small businesses, that's the whole website. Done.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are there hidden tiers or upsells?",
        answer:
          "No. Free preview and Kiwi Pro at £8 a month. Two options. Full stop.",
      },
      {
        question: "How many pages are included in Kiwi Pro?",
        answer:
          "Homepage plus extra pages. No per-page fee on top of the subscription.",
      },
      {
        question: "Can I try the free package more than once?",
        answer:
          "Yes. Different URLs, different tries — compare until you're satisfied or bored.",
      },
      {
        question: "What happens if I cancel Kiwi Pro?",
        answer:
          "Cancel anytime. Check our terms for what happens to the hosted site after — we're not going to spring a surprise on you.",
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
      "Your online store works — orders come in, stock moves — but the storefront looks like it lost a fight with 2016. An ecommerce website redesign should fix that without breaking checkout or pretending you're getting a Shopify migration for £8. Refresh Kiwi refreshes how your site looks and reads. We will tell you straight what we cannot do.",
    sections: [
      {
        heading: "What we can do for ecommerce sites",
        paragraphs: [
          "Paste your store URL — Shopify, WooCommerce, whatever's public — and get a refreshed preview with clearer layout, better mobile readability, and trust signals that don't hide in the footer.",
          "Starting from scratch? Describe the business and products in plain English. We'll build a brochure-style storefront preview, not a warehouse system.",
        ],
        bullets: [
          "Refresh the visual design and page structure.",
          "Present products or services more clearly.",
          "Surface contact details, policies, and proof where people actually look.",
          "Keep your live store running while you review the preview.",
        ],
      },
      {
        heading: "What we cannot do — read this bit",
        paragraphs: [
          "No Shopify admin connection. No WooCommerce sync. No cart, checkout, inventory, or product database. If customers need to add to basket and pay on your site, keep your platform — or hire someone who builds that for a living.",
          "Refresh Kiwi is for when you want a better-looking site, a cleaner landing page that links to your existing shop, or you're moving toward enquiries instead of online checkout.",
        ],
        callout:
          "We refresh how your site looks and reads. We do not replace Shopify, WooCommerce, or your checkout flow.",
      },
      {
        heading: "When an ecommerce refresh makes sense",
        bullets: [
          "The platform works but the theme looks tired.",
          "You want to see a fresher layout before paying for a new theme or agency.",
          "Most sales happen via enquiry, quote, or in-person — not basket checkout.",
          "You need a clean landing page that sends people to your existing shop.",
          "You're simplifying from full ecommerce to a brochure site.",
        ],
      },
      {
        heading: "When you need a platform person, not us",
        bullets: [
          "Cart, checkout, and payment processing on-site.",
          "Hundreds of SKUs with inventory sync.",
          "Shopify apps, WooCommerce plugins, custom ecommerce APIs.",
          "Order management, subscriptions, customer accounts.",
        ],
      },
      {
        heading: "SEO during an ecommerce redesign",
        paragraphs: [
          "Change product URLs without redirects and Google forgets you exist. We build a separate preview so your live store keeps ranking while you review.",
          "If you publish, plan 301 redirects and keep product titles accurate. Our blog guide on redesigning without losing SEO walks through it.",
        ],
      },
      {
        heading: "Pricing — same as everyone else here",
        paragraphs: [
          "Preview free. Paste the store URL, see a refreshed version in about two minutes. Publish with Kiwi Pro — £8 a month, hosting, domain, extra pages, edits in plain English.",
          "No special ecommerce tier. Same package.",
        ],
      },
      {
        heading: "Paste your store URL below",
        paragraphs: [
          "We'll read what we can from your public pages and show a fresher preview. Check product names, prices, and links carefully before you publish — we're good, not psychic.",
          "Live store stays live until you switch.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does Refresh Kiwi work with Shopify?",
        answer:
          "We can read a public Shopify storefront and build a preview. We do not connect to your admin, products, or checkout. Publishing gives you a static Refresh Kiwi site — not a Shopify store.",
      },
      {
        question: "Can customers buy products on a Refresh Kiwi site?",
        answer:
          "No. Brochure-style. Link out to your shop or use a contact form. No cart, no checkout.",
      },
      {
        question: "Will redesigning my ecommerce site hurt SEO?",
        answer:
          "Any redesign can if URLs or content change without redirects. Use the free preview to plan, then redirect properly when you publish.",
      },
      {
        question: "Can I refresh a WooCommerce site?",
        answer:
          "Yes — public URL in, preview out. No sync with WooCommerce products or orders.",
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
