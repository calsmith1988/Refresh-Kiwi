export type ArticleSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  callout?: string;
};

export type ArticleFaq = {
  question: string;
  answer: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  category: string;
  readingTime: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: "informational" | "commercial" | "comparison" | "transactional";
  funnelStage: "awareness" | "problem-aware" | "comparison" | "conversion";
  priority: number;
  sections: ArticleSection[];
  faqs?: ArticleFaq[];
};

export type ContentCluster = {
  name: string;
  intent: string;
  recommendedCadence: string;
  articleSlugs: string[];
};

export const blogAuthor = {
  name: "Refresh Kiwi",
  url: "https://refresh.kiwi",
};

export const contentClusters: ContentCluster[] = [
  {
    name: "Website refresh basics",
    intent: "Help small business owners understand when a refresh is enough and when a rebuild is needed.",
    recommendedCadence: "Publish first because it matches broad problem-aware searches.",
    articleSlugs: ["website-refresh-guide-small-business", "website-refresh-checklist"],
  },
  {
    name: "Cost and agency alternatives",
    intent: "Capture commercial searches from owners comparing DIY, agencies, and AI-assisted website refreshes.",
    recommendedCadence: "Publish early and link from pricing or Pro messaging.",
    articleSlugs: ["small-business-website-redesign-cost-uk", "website-redesign-agency-alternative"],
  },
  {
    name: "AI website redesign",
    intent: "Explain the practical role and limits of AI for website redesign without overpromising.",
    recommendedCadence: "Use as the trust-building hub for AI and GEO-oriented queries.",
    articleSlugs: ["ai-website-redesign-small-business"],
  },
  {
    name: "Builder comparisons",
    intent: "Honest comparisons between Refresh Kiwi and popular website builders for UK small businesses.",
    recommendedCadence: "Link between comparison posts and money pages as new guides go live.",
    articleSlugs: ["wix-alternative", "squarespace-alternatives", "godaddy-airo"],
  },
];

export const articles: Article[] = [
  {
    slug: "website-refresh-guide-small-business",
    title: "Website Refresh Guide for Small Businesses",
    description:
      "A practical guide to refreshing a small business website without starting again from scratch.",
    excerpt:
      "Learn when a website refresh is enough, what to keep, what to improve, and how to make an older site look trustworthy again.",
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    author: blogAuthor.name,
    category: "Website Refresh",
    readingTime: "7 min read",
    primaryKeyword: "website refresh",
    secondaryKeywords: [
      "refresh my website",
      "small business website refresh",
      "update old website",
      "website redesign for small business",
    ],
    intent: "informational",
    funnelStage: "problem-aware",
    priority: 1,
    sections: [
      {
        heading: "What a website refresh actually means",
        paragraphs: [
          "A website refresh keeps the useful parts of your existing website and improves the way they are presented. It is not the same as throwing everything away and commissioning a full rebuild.",
          "For many small businesses, the words, services, opening hours, phone number, reviews, and photos are already good enough. The problem is that the design looks tired, the layout is hard to scan, or the page does not make the next step obvious.",
        ],
        callout:
          "A refresh is usually right when the business has not changed dramatically, but the website no longer creates confidence.",
      },
      {
        heading: "Signs your website needs a refresh",
        bullets: [
          "It looks dated compared with local competitors.",
          "Visitors have to hunt for your phone number, booking link, or address.",
          "The homepage explains what you do, but not why someone should choose you.",
          "The site works on desktop but feels awkward on a phone.",
          "Images are too small, stretched, blurry, or inconsistent.",
          "The site has useful information, but it is buried in long paragraphs.",
          "You are embarrassed to send people to it, even though the business itself is good.",
        ],
      },
      {
        heading: "What to keep from the old site",
        paragraphs: [
          "The best refreshes do not delete everything. They keep the facts that customers need and reshape them into a clearer page.",
          "Keep your real services, real contact details, real reviews, real photos, and any details that make the business feel local and trustworthy. Those are hard-earned signals that a generic template cannot invent.",
        ],
      },
      {
        heading: "What to improve first",
        bullets: [
          "Hero section: say what you do, where you do it, and the main action visitors should take.",
          "Calls to action: make phone, email, booking, or quote requests easy to find.",
          "Service sections: split services into clear blocks instead of one long list.",
          "Trust signals: show reviews, years in business, guarantees, accreditations, or local coverage.",
          "Mobile layout: check that text, buttons, and images are comfortable on a phone.",
          "Speed and clarity: remove clutter that slows down the page or distracts from conversion.",
        ],
      },
      {
        heading: "When a refresh is not enough",
        paragraphs: [
          "A refresh is not always the right answer. If your business model has changed, your site structure is broken, your content is inaccurate, or you need complex features like booking systems, ecommerce, portals, or integrations, a deeper rebuild may be better.",
          "The decision should be practical: if the current site contains useful business information and mainly needs a better presentation layer, refresh it. If the foundation is wrong, rebuild it.",
        ],
      },
      {
        heading: "How Refresh Kiwi approaches it",
        paragraphs: [
          "Refresh Kiwi starts from your current website address, keeps the useful business information, and creates a fresher preview that you can inspect before anything changes on your live site.",
          "That preview-first model matters. You can see whether a refresh is enough before paying for hosting, connecting a domain, or replacing your existing website.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a website refresh cheaper than a redesign?",
        answer:
          "Usually, yes. A refresh is narrower because it keeps the useful content and focuses on layout, clarity, trust, and presentation rather than rebuilding every part of the site.",
      },
      {
        question: "Will refreshing my website hurt SEO?",
        answer:
          "It should not if important pages, headings, copy, and URLs are handled carefully. A refresh can help if it improves mobile usability, clarity, internal linking, and conversion.",
      },
    ],
  },
  {
    slug: "website-refresh-checklist",
    title: "Website Refresh Checklist: 21 Things to Fix Before You Rebuild",
    description:
      "Use this small business website refresh checklist to improve trust, clarity, mobile usability, and conversions.",
    excerpt:
      "A practical checklist for deciding what to keep, what to update, and what to remove from an older business website.",
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    author: blogAuthor.name,
    category: "Checklists",
    readingTime: "8 min read",
    primaryKeyword: "website refresh checklist",
    secondaryKeywords: [
      "website redesign checklist",
      "update business website checklist",
      "small business website checklist",
      "improve old website",
    ],
    intent: "informational",
    funnelStage: "awareness",
    priority: 2,
    sections: [
      {
        heading: "Start with the customer journey",
        paragraphs: [
          "Before changing colours or fonts, look at the site like a new customer. They want to know what you do, whether you serve their area, whether you look trustworthy, and how to contact you.",
          "If the page does not answer those questions quickly, the refresh should focus there first.",
        ],
      },
      {
        heading: "Homepage checklist",
        bullets: [
          "The first screen says what the business does in plain language.",
          "The location or service area is obvious where it matters.",
          "There is one primary call to action, such as call, book, enquire, or get a quote.",
          "The phone number or contact button is easy to tap on mobile.",
          "The homepage shows key services without forcing visitors into a menu.",
          "The page includes at least one trust signal above or near the fold.",
          "The copy sounds like the business, not a stock template.",
        ],
      },
      {
        heading: "Trust checklist",
        bullets: [
          "Reviews or testimonials are visible and specific.",
          "Photos feel real and relevant to the business.",
          "Claims are believable and not exaggerated.",
          "Opening hours, address, and contact details match other places online.",
          "Any licences, insurance, guarantees, or accreditations are current.",
        ],
      },
      {
        heading: "Mobile checklist",
        bullets: [
          "Buttons are large enough to tap.",
          "Text is readable without zooming.",
          "Images do not push important content too far down.",
          "Menus are simple and do not hide the main action.",
          "Forms are short and easy to complete.",
        ],
      },
      {
        heading: "Content checklist",
        bullets: [
          "Remove services you no longer offer.",
          "Add missing services people ask about regularly.",
          "Rewrite long paragraphs into short sections.",
          "Make prices, starting prices, or quote expectations clear if possible.",
          "Explain what happens after someone contacts you.",
          "Add local context where it genuinely helps customers choose.",
        ],
      },
      {
        heading: "Technical checklist",
        bullets: [
          "Use descriptive page titles and meta descriptions.",
          "Keep important URLs stable where possible.",
          "Check that images have sensible alt text.",
          "Make sure the site loads quickly on mobile.",
          "Use HTTPS and avoid broken links.",
          "Check forms, phone links, and email links after launch.",
        ],
      },
      {
        heading: "Use the checklist before paying for a rebuild",
        paragraphs: [
          "Many older websites do not need a large project. They need a clearer homepage, stronger calls to action, better mobile layout, and more visible proof that the business is trustworthy.",
          "That is exactly the kind of gap a refresh can test quickly.",
        ],
      },
    ],
    faqs: [
      {
        question: "How often should a small business refresh its website?",
        answer:
          "Review it at least once a year, and refresh it whenever services, pricing, opening hours, photos, or customer expectations have changed.",
      },
      {
        question: "Should I refresh every page at once?",
        answer:
          "Not always. Start with the homepage and pages that bring enquiries. Then improve supporting pages once the main customer path is clear.",
      },
    ],
  },
  {
    slug: "small-business-website-redesign-cost-uk",
    title: "How Much Does a Small Business Website Redesign Cost in the UK?",
    description:
      "A realistic guide to UK small business website redesign costs, from DIY refreshes to agency rebuilds.",
    excerpt:
      "Understand what affects website redesign cost, when a refresh is enough, and how to avoid paying for more than you need.",
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    author: blogAuthor.name,
    category: "Costs",
    readingTime: "8 min read",
    primaryKeyword: "small business website redesign cost uk",
    secondaryKeywords: [
      "website redesign cost uk",
      "small business website cost",
      "cheap website redesign",
      "website refresh cost",
    ],
    intent: "commercial",
    funnelStage: "comparison",
    priority: 3,
    sections: [
      {
        heading: "The short answer",
        paragraphs: [
          "A UK small business website redesign can cost anything from almost nothing for a DIY template refresh to several thousand pounds for a custom agency rebuild. The right budget depends on how much strategy, design, copywriting, development, content migration, and ongoing support you need.",
          "If your current website already has useful content and you mainly need a cleaner, more modern presentation, a refresh can be a much lighter option than a full redesign.",
        ],
      },
      {
        heading: "Typical cost bands",
        bullets: [
          "DIY template update: low upfront cost, but takes your time and may still look generic.",
          "Freelancer refresh: often suitable for simple brochure sites when you know exactly what needs changing.",
          "Agency redesign: useful for larger projects with brand, copy, SEO, integrations, and custom design needs.",
          "AI-assisted preview-first refresh: useful when you want to see a modernised version before committing to a bigger project.",
        ],
      },
      {
        heading: "What changes the price",
        bullets: [
          "Number of pages.",
          "Whether copy needs rewriting or just restructuring.",
          "Whether new photography, branding, or illustrations are required.",
          "Booking, ecommerce, membership, or CRM integrations.",
          "SEO migration and redirects.",
          "Custom design requirements.",
          "Ongoing hosting, maintenance, and support.",
        ],
      },
      {
        heading: "When paying for a full redesign makes sense",
        paragraphs: [
          "A full redesign is worth considering when the business has changed significantly, the brand needs repositioning, the site needs complex functionality, or the current structure is actively holding the business back.",
          "For example, a restaurant adding online ordering, a trades business expanding into several service areas, or a consultancy changing its offer may need more than a cosmetic update.",
        ],
      },
      {
        heading: "When a refresh is more sensible",
        paragraphs: [
          "A refresh is often enough when the site is basically accurate but looks old, hides key information, or fails to convert visitors because the layout is unclear.",
          "In that case, the fastest win is usually better messaging, clearer sections, stronger calls to action, and a modern mobile-friendly design.",
        ],
      },
      {
        heading: "How to control redesign cost",
        bullets: [
          "List the pages that actually help customers make a decision.",
          "Keep accurate existing copy instead of rewriting everything from scratch.",
          "Use real customer questions to guide sections.",
          "Refresh the homepage first before expanding the whole site.",
          "Avoid custom functionality unless it solves a real business problem.",
          "Ask for a preview or prototype before committing to the full build.",
        ],
      },
      {
        heading: "Refresh Kiwi's angle",
        paragraphs: [
          "Refresh Kiwi is designed for the moment before a full redesign feels justified. You paste your current website address, get a fresh preview, and decide whether that level of improvement is enough.",
          "If it is enough, you can publish it and keep asking for changes in plain English. If it is not enough, the preview can still clarify what you want from a designer or agency.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is the cheapest website redesign usually the best choice?",
        answer:
          "No. The cheapest option can be fine for a simple refresh, but not if you need strategy, copywriting, SEO migration, or custom functionality.",
      },
      {
        question: "Can I redesign my website in stages?",
        answer:
          "Yes. Many small businesses should start with the homepage and high-intent service pages before spending money on lower-priority pages.",
      },
    ],
  },
  {
    slug: "ai-website-redesign-small-business",
    title: "AI Website Redesign for Small Businesses: What It Can and Cannot Do",
    description:
      "A practical explanation of AI website redesign for small businesses, including benefits, limits, and review steps.",
    excerpt:
      "AI can speed up website redesign, but it still needs business context, review, and sensible publishing checks.",
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    author: blogAuthor.name,
    category: "AI Websites",
    readingTime: "7 min read",
    primaryKeyword: "ai website redesign",
    secondaryKeywords: [
      "AI website redesign for small business",
      "refresh website with AI",
      "AI website builder",
      "AI website update",
    ],
    intent: "informational",
    funnelStage: "problem-aware",
    priority: 4,
    sections: [
      {
        heading: "AI is useful, but not magic",
        paragraphs: [
          "AI can help turn an old website into a cleaner, more modern version quickly. It can read existing copy, recognise common page patterns, suggest layout improvements, and produce a first draft that would otherwise take much longer.",
          "But AI does not know your business the way you do. It can misread details, over-polish copy, miss important local context, or make assumptions that need checking before anything goes live.",
        ],
      },
      {
        heading: "Where AI helps most",
        bullets: [
          "Creating a first design direction from an existing website.",
          "Restructuring long copy into clearer sections.",
          "Making calls to action more visible.",
          "Suggesting better headings and service blocks.",
          "Producing variations that help you decide what you like.",
          "Making small edits from plain-English instructions.",
        ],
      },
      {
        heading: "Where humans still matter",
        bullets: [
          "Checking phone numbers, prices, opening hours, and legal claims.",
          "Deciding what makes the business different.",
          "Approving images and brand tone.",
          "Confirming regulated claims, guarantees, or professional credentials.",
          "Testing forms, booking links, maps, and phone links.",
        ],
      },
      {
        heading: "A safe review process",
        paragraphs: [
          "Treat AI output as a strong draft, not a final answer. Before publishing, compare the new site with your current website and check every business-critical detail.",
          "A simple review pass should cover contact details, services, locations, pricing, photos, reviews, claims, accessibility, mobile layout, and calls to action.",
        ],
      },
      {
        heading: "Why preview-first matters",
        paragraphs: [
          "The safest way to use AI for a small business website is to generate a separate preview first. That means your current website stays live while you inspect the refreshed version.",
          "Refresh Kiwi follows that model. Nothing changes on your real website until you choose to publish.",
        ],
      },
      {
        heading: "AI and SEO",
        paragraphs: [
          "AI-assisted content is not automatically bad for SEO. What matters is whether the final page is useful, accurate, original, and created for people rather than only for rankings.",
          "For a local business website, that means clear services, local relevance, trustworthy proof, useful answers, and a page that helps customers take the next step.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will Google penalise an AI-redesigned website?",
        answer:
          "Not simply because AI helped create it. The risk is low-quality, unhelpful, inaccurate, or spammy content. Review and improve AI output before publishing.",
      },
      {
        question: "Can AI replace a web designer?",
        answer:
          "Sometimes it can solve simpler refresh jobs. For complex branding, strategy, integrations, or high-stakes projects, a designer or agency may still be the better choice.",
      },
    ],
  },
  {
    slug: "website-redesign-agency-alternative",
    title: "Website Redesign Agency Alternative: When a Faster Refresh Is Enough",
    description:
      "Compare agency redesigns with faster website refresh options for small businesses that need a better site without a large project.",
    excerpt:
      "A website redesign agency can be valuable, but not every small business needs a full project to get a better-looking site.",
    publishedAt: "2026-06-15",
    updatedAt: "2026-06-15",
    author: blogAuthor.name,
    category: "Alternatives",
    readingTime: "7 min read",
    primaryKeyword: "website redesign agency alternative",
    secondaryKeywords: [
      "alternative to web design agency",
      "small business website redesign",
      "quick website redesign",
      "website refresh service",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 5,
    sections: [
      {
        heading: "Agencies are useful, but not always necessary",
        paragraphs: [
          "A good web design agency can help with brand strategy, custom design, copywriting, SEO migration, complex development, and long-term support. For the right project, that is worth paying for.",
          "But many small businesses do not need that level of work. They need their existing site to look current, explain the business clearly, work better on mobile, and make enquiries easier.",
        ],
      },
      {
        heading: "When an agency is the right choice",
        bullets: [
          "You are changing brand, positioning, or target market.",
          "You need ecommerce, bookings, memberships, or integrations.",
          "You have a large site with SEO traffic that needs careful migration.",
          "You need new photography, copywriting, and design from scratch.",
          "Several stakeholders need workshops, approvals, and project management.",
        ],
      },
      {
        heading: "When a refresh is enough",
        bullets: [
          "Your services and business details are already mostly correct.",
          "The site looks old but still contains useful content.",
          "The homepage needs clearer structure and stronger calls to action.",
          "You want to see a better version before committing budget.",
          "You do not need custom functionality.",
        ],
      },
      {
        heading: "The preview-first alternative",
        paragraphs: [
          "A preview-first refresh gives you evidence before commitment. Instead of paying upfront for a full redesign, you generate a refreshed version and decide whether it solves the problem.",
          "That is especially useful for sole traders, local services, cafes, clinics, salons, trades, and other small businesses where the website is important but not a huge software project.",
        ],
      },
      {
        heading: "How to compare options",
        bullets: [
          "Cost: what do you pay before seeing anything?",
          "Speed: can you review something today, this week, or next month?",
          "Control: can you request changes in plain language?",
          "Risk: does your old website stay live while you decide?",
          "Scope: are you fixing presentation, or rebuilding the business online?",
        ],
      },
      {
        heading: "A sensible path",
        paragraphs: [
          "If you are unsure, try a refresh first. If the preview gets close, you may not need an agency project yet. If it exposes deeper issues, you will be better prepared to brief a freelancer or agency.",
          "Either outcome is useful because it turns a vague feeling - my website looks old - into something you can actually compare.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a refresh a replacement for an agency?",
        answer:
          "It can be for simple brochure-style websites. For complex sites, brand strategy, or integrations, an agency may still be the right option.",
      },
      {
        question: "Can I use a refreshed preview as an agency brief?",
        answer:
          "Yes. Even if you later hire someone, a preview can help show the direction, structure, and level of change you want.",
      },
    ],
  },
  {
    slug: "wix-alternative",
    title: "Refresh Kiwi vs Wix: A Wix Alternative for UK Small Businesses",
    description:
      "An honest wix alternative comparison for UK small businesses — what Wix is good at, where a refresh beats a builder, and what free actually means.",
    excerpt:
      "Wix is a real builder with a huge template mall. Refresh Kiwi is not that. Here is when a two-minute refresh beats dragging boxes until midnight.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "wix alternative",
    secondaryKeywords: [
      "wix alternative free",
      "are wix websites bad for seo",
      "is wix website actually free",
      "what is wix like",
      "what are wix alternatives",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 6,
    sections: [
      {
        heading: "What is a Wix alternative?",
        paragraphs: [
          "A Wix alternative is any route to a business website that is not Wix's drag-and-drop builder — another builder, WordPress, an agency, or a refresh tool that rebuilds what you already have.",
          "Most alternatives still ask you to pick a template and move pixels. Refresh Kiwi skips that entirely: paste a URL, a Google listing, or a brief, and get a redesigned preview in about two minutes.",
          "If you want monthly hosting with unlimited plain-English edits rather than a builder subscription, see our [pay-monthly website design](/website-design-pay-monthly) page. For a broader look at refresh work, our [website redesign services](/website-redesign-services) guide covers what actually changes on the page.",
        ],
      },
      {
        heading: "What is Wix like?",
        paragraphs: [
          "Wix is a full website builder — templates, an editor, apps, ecommerce tiers, and a huge library of blocks you arrange yourself.",
          "It suits people who enjoy tinkering, want granular control, or need Wix-specific features like bookings or a Wix store. The trade-off is time: a polished Wix site usually means evenings lost to layout decisions.",
          "Refresh Kiwi is the opposite energy. No canvas, no widget drawer, no \"which header style says trustworthy plumber.\" You bring the business facts; we reshape them into something that looks like it belongs in this decade — beige-hero optional.",
        ],
      },
      {
        heading: "Is a Wix website actually free?",
        paragraphs: [
          "Wix has a free plan, but it comes with Wix branding, a Wix subdomain, and limits that push most serious businesses onto paid tiers fairly quickly.",
          "Free is real for testing the editor. It is not usually where you want to send customers once you care about looking established.",
          "Refresh Kiwi is free to try in a different way: generate a preview from your current site or listing without signing up, and your live site stays untouched until you choose to switch. No credits, no token counter, no \"upgrade to remove the badge\" moment.",
        ],
      },
      {
        heading: "Is there a free Wix alternative?",
        paragraphs: [
          "Yes — several builders offer free tiers, and some refresh tools let you preview before you pay. \"Free\" just means different things depending on whether you want to build, host, or only see a draft.",
          "A free builder still costs your time. A free preview costs nothing but a URL and two minutes.",
          "Refresh Kiwi gives you the preview first. Kiwi Pro is £8/month when you want hosting and unlimited edits, including voice or plain-English changes — one tier, no maze. Compare that against stacking Wix plans, apps, and premium templates on our [website design packages](/website-design-packages) page.",
        ],
      },
      {
        heading: "Are Wix websites bad for SEO?",
        paragraphs: [
          "No — Wix websites are not automatically bad for SEO. Wix handles basics like mobile layouts, SSL, and sitemaps, and plenty of Wix sites rank fine.",
          "Where Wix sites struggle is usually content and structure, not the platform badge: thin pages, duplicate boilerplate, messy headings, or a layout that hides what you actually do.",
          "Refresh Kiwi does not promise SEO wizardry. It does give you a cleaner structure, clearer service sections, and copy pulled from your real business rather than generic filler — which helps humans and search engines alike. Fair comparison, not a smear: Wix can rank; so can a refreshed site if the words on it are worth reading.",
        ],
      },
      {
        heading: "What are Wix alternatives?",
        paragraphs: [
          "Common Wix alternatives include Squarespace, WordPress, GoDaddy's AI builders, Hostinger, agencies, freelancers, and refresh-first tools like Refresh Kiwi.",
          "Builders give you control. Agencies give you hand-holding. Refresh tools give you speed when the content is mostly there but the presentation is not.",
          "We are honest about the split: if you want a builder, Wix and [Squarespace alternatives](/blog/squarespace-alternatives) exist for a reason. If you want your existing site modernised without learning an editor, that is the lane we stay in — same lane as skipping [GoDaddy Airo](/blog/godaddy-airo) when you already have a URL worth saving.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Wix: which fits a UK small business?",
        paragraphs: [
          "Choose Wix if you want to build from scratch in a editor, need Wix-specific apps, or genuinely enjoy the process. Choose Refresh Kiwi if you already have a site, a Google listing, or a rough brief and want a fresher version in about two minutes.",
          "We are not trying to beat Wix at being Wix. We win at not being a builder — speed, simplicity, one £8/month Pro tier, unlimited edits, current site stays live until you switch.",
          "Refresh Kiwi is built by CJS Global LTD in Caerphilly — remote, no fake local offices, email info@refresh.kiwi. Paste your URL, see the preview, decide. That is the whole pitch.",
        ],
        callout:
          "Wix is a builder. Refresh Kiwi is a refresh. Pick the tool that matches how you actually want to spend your Tuesday evening.",
      },
    ],
  },
  {
    slug: "squarespace-alternatives",
    title: "Refresh Kiwi vs Squarespace: Squarespace Alternatives for UK Small Businesses",
    description:
      "Squarespace alternatives compared honestly for UK small businesses — SEO, pricing, polish, and when a refresh beats another polished builder.",
    excerpt:
      "Squarespace is gorgeous and expensive. Refresh Kiwi is the not-a-builder option for owners who want a sharper site without another subscription maze.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "squarespace alternatives",
    secondaryKeywords: [
      "squarespace alternative",
      "is squarespace any good for seo",
      "are squarespace websites any good",
      "which one is better squarespace or wordpress",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 7,
    sections: [
      {
        heading: "What are Squarespace alternatives?",
        paragraphs: [
          "Squarespace alternatives are other ways to get a business website without Squarespace's editor and pricing — builders like Wix, hosted WordPress, AI site tools, agencies, or refresh services.",
          "Most alternatives still put you in front of a template gallery. Refresh Kiwi does not: it redesigns from your URL, Google listing, or brief in about two minutes.",
          "If monthly hosting with unlimited edits matters more than another designer-grade theme, our [pay-monthly website design](/website-design-pay-monthly) page spells out Kiwi Pro at £8/month. For scope and pricing context, see [website design packages](/website-design-packages) too.",
        ],
      },
      {
        heading: "What is a Squarespace alternative?",
        paragraphs: [
          "A Squarespace alternative is simply any platform or service that gets you online without Squarespace — one tool is rarely a perfect swap because each optimises for different jobs.",
          "Some alternatives match Squarespace's polish. Others match its price (or undercut it). Refresh Kiwi matches neither: we match the moment your site looks tired but your services, reviews, and phone number are fine.",
          "We are not WordPress. We will not pretend to be. If you need a CMS with plugins and a developer on speed dial, WordPress or an agency is a fair call. If you need a faster face for the business you already run online, that is us.",
        ],
      },
      {
        heading: "Is Squarespace any good for SEO?",
        paragraphs: [
          "Yes — Squarespace is fine for SEO basics. Clean templates, SSL, sitemaps, decent mobile layouts, and sensible page settings are built in.",
          "Rankings still depend on what you publish: useful service pages, local relevance, internal links, and copy that sounds like your business rather than a stock paragraph about \"quality solutions.\"",
          "Refresh Kiwi will not out-SEO a content strategy you never write. It will give you a clearer page structure and business copy drawn from what you already show online — which is often the bit Squarespace owners skip because they were busy choosing fonts.",
        ],
      },
      {
        heading: "Are Squarespace websites any good?",
        paragraphs: [
          "Squarespace websites look good — that is the point. Templates are cohesive, typography is tasteful, and the whole thing feels designed even when the words are thin.",
          "They are a strong fit for portfolios, cafes, studios, and anyone who wants a showroom site and does not mind the subscription.",
          "Refresh Kiwi targets a different embarrassment: the trades site from 2014 that still has the right phone number. We keep the useful facts, lose the clutter, and show you a preview before anything goes live. Squarespace makes you build. We refresh what you have — or start from a brief if you are starting from scratch.",
        ],
      },
      {
        heading: "Which is better, Squarespace or WordPress?",
        paragraphs: [
          "Squarespace is better when you want polish without managing hosting, plugins, updates, or a developer. WordPress is better when you need flexibility, custom functionality, or ownership of a larger content operation.",
          "Neither is \"better\" in the abstract — they are different levels of control versus convenience.",
          "Refresh Kiwi is not WordPress and does not try to be. We are a refresh: about two minutes from a URL to a preview, £8/month to host with unlimited edits. If you are weighing Squarespace against WordPress, you are shopping for builders or CMS platforms. If you are weighing either against us, ask whether you want to build or whether you want the site you already have to stop apologising for itself.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Squarespace: honest pick for UK SMBs",
        paragraphs: [
          "Pick Squarespace if you want a polished builder, enjoy the editor, and are happy paying for that experience every month. Pick Refresh Kiwi if you want speed, one Pro tier, no drag-and-drop, and a preview before your current site changes.",
          "Squarespace is pricey and coherent. We are cheap and direct — free to try, live site stays up until you switch, unlimited plain-English or voice edits on Pro.",
          "Still comparing builders? Read our [Wix alternative](/blog/wix-alternative) and [GoDaddy Airo](/blog/godaddy-airo) guides for the same honest treatment. Still comparing services? Our [website redesign services](/website-redesign-services) page walks through what a refresh actually touches.",
        ],
        callout:
          "Squarespace sells the studio. Refresh Kiwi sells the two-minute glow-up for the site you were already sending people to.",
      },
    ],
  },
  {
    slug: "godaddy-airo",
    title: "GoDaddy Airo Explained — and How Refresh Kiwi Compares",
    description:
      "What GoDaddy Airo is, what it costs, whether it is legit, and how it compares to Refresh Kiwi and Hostinger for UK small businesses.",
    excerpt:
      "GoDaddy Airo is an AI website builder bundled with GoDaddy hosting. Here is what that means in plain English — and when a refresh beats another AI mall.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "10 min read",
    primaryKeyword: "godaddy airo",
    secondaryKeywords: [
      "is godaddy airo a good website builder",
      "godaddy airo cost",
      "godaddy airo seo",
      "godaddy airo vs hostinger",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 8,
    sections: [
      {
        heading: "What is GoDaddy Airo?",
        paragraphs: [
          "GoDaddy Airo is GoDaddy's AI-assisted website builder — you answer prompts, it generates layouts and copy, and it sits inside GoDaddy's domain and hosting ecosystem.",
          "Think of it as GoDaddy's fast lane for getting something online when you already bought a domain there or want everything in one account.",
          "Refresh Kiwi is a different shape: paste a URL, a Google listing, or a brief and get a redesigned preview in about two minutes — no builder canvas, no upsell corridor. We are built by CJS Global LTD in Caerphilly (info@refresh.kiwi), remote, no fake offices.",
        ],
      },
      {
        heading: "Is GoDaddy Airo a good website builder?",
        paragraphs: [
          "It is good enough for a quick first draft — especially if you want GoDaddy to handle domain, hosting, and editing in one place and you are starting from zero.",
          "Like most AI builders, output can feel generic until you rewrite sections, swap photos, and fix details the AI guessed wrong.",
          "Refresh Kiwi is not a builder and does not claim to be. We refresh an existing site or start from your brief, keep your live site untouched until you switch, and let you edit in plain English on Kiwi Pro (£8/month, unlimited edits). Good for owners who already have something online worth saving.",
        ],
      },
      {
        heading: "Is GoDaddy Airo easy to use?",
        paragraphs: [
          "Yes — Airo is designed to be easy. Prompts, suggested sections, and GoDaddy's familiar dashboard mean you can publish without learning HTML.",
          "Easy does not always mean fast when you still need to review every line, replace stock phrases, and click through hosting upsells.",
          "Refresh Kiwi optimises for a different kind of easy: one input, about two minutes, preview ready. No credits, no tokens, no tier maze. See our [website redesign services](/website-redesign-services) page for what happens in that window.",
        ],
      },
      {
        heading: "Is GoDaddy Airo legit?",
        paragraphs: [
          "Yes — GoDaddy Airo is a legitimate GoDaddy product, not a third-party scam. You are buying into a large registrar and host with standard terms and support channels.",
          "Legit also does not mean perfect — read renewal prices, check what is included, and treat AI copy as a draft.",
          "Refresh Kiwi is legit in the smaller sense: a real UK company (CJS Global LTD), a real preview-before-publish model, and a single Pro tier at £8/month. No invented guarantees, no fake local shopfront.",
        ],
      },
      {
        heading: "Is GoDaddy Airo good for SEO?",
        paragraphs: [
          "Airo covers basics — mobile-friendly pages, SSL through GoDaddy hosting, and standard metadata fields — but SEO still lives in your content and structure.",
          "AI-generated boilerplate and thin service pages will not rank just because GoDaddy said they would.",
          "Refresh Kiwi pulls from your real business details where possible, which gives you a head start on specificity — the thing search engines and humans both reward. We do not promise rankings. We promise a site that says what you actually do in Caerphilly, Cardiff, or wherever you work — not \"welcome to our innovative solutions hub.\"",
        ],
      },
      {
        heading: "Does GoDaddy Airo include hosting?",
        paragraphs: [
          "Yes — Airo sites are meant to run on GoDaddy hosting. The builder and hosting are bundled in GoDaddy's world, which is the point of keeping you in one ecosystem.",
          "Check the plan you are on for storage, email, and renewal pricing before you assume \"included\" means \"included forever at this price.\"",
          "Kiwi Pro includes hosting for £8/month with unlimited edits when you publish through Refresh Kiwi. Your current site stays live until you choose to switch — same safety, fewer surprise renewals. Details sit on our [pay-monthly website design](/website-design-pay-monthly) page.",
        ],
      },
      {
        heading: "What does GoDaddy Airo cost?",
        paragraphs: [
          "GoDaddy Airo pricing depends on the GoDaddy plan you attach it to — website tiers, promotional first-term prices, and renewal rates that often jump after year one.",
          "There is no single public number that stays true for every user because bundles, domains, and upsells change the total.",
          "Refresh Kiwi is simpler: free to try the preview, £8/month for Kiwi Pro hosting and unlimited edits. One tier. No credits. Compare overall value on our [website design packages](/website-design-packages) page rather than guessing at bundle maths.",
        ],
      },
      {
        heading: "GoDaddy Airo vs Hostinger",
        paragraphs: [
          "Hostinger pitches AI website tools and cheap hosting with a different dashboard and renewal rhythm. GoDaddy Airo pitches AI inside the registrar you might already use for your domain.",
          "Both are builder-plus-hosting plays. Pick whichever account you would rather log into for the next three years — and read renewal prices before the introductory rate expires.",
          "Refresh Kiwi is off that axis entirely. We are not Hostinger, not GoDaddy, not a hosting mall with an AI tab. If you want a refreshed preview in about two minutes without choosing a builder, that is us. If you want a traditional builder, Airo and Hostinger are fair options — we will not pretend to replace them.",
        ],
      },
      {
        heading: "Refresh Kiwi vs GoDaddy Airo: which should you use?",
        paragraphs: [
          "Use GoDaddy Airo if you want everything inside GoDaddy — domain, AI builder, hosting — and you are happy to edit in their system. Use Refresh Kiwi if you already have a site or listing and want a faster refresh without a builder subscription maze.",
          "We win on not being a builder: about two minutes to preview, live site stays up, £8/month Pro with unlimited plain-English or voice edits.",
          "Cross-read our [Wix alternative](/blog/wix-alternative) and [Squarespace alternatives](/blog/squarespace-alternatives) posts if you are still shopping builders. Different tools, same rule: match the job, not the marketing adjective.",
        ],
        callout:
          "GoDaddy Airo builds you a new site in their world. Refresh Kiwi refreshes yours in about two minutes — then lets you talk to it in plain English until it looks right.",
      },
    ],
  },
];

export const publishedArticles = articles
  .filter((article) => article.publishedAt)
  .sort((a, b) => a.priority - b.priority);

export function getArticleBySlug(slug: string): Article | undefined {
  return publishedArticles.find((article) => article.slug === slug);
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  return publishedArticles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({
      article: candidate,
      score:
        (candidate.category === article.category ? 2 : 0) +
        candidate.secondaryKeywords.filter((keyword) =>
          article.secondaryKeywords.includes(keyword),
        ).length,
    }))
    .sort((a, b) => b.score - a.score || a.article.priority - b.article.priority)
    .slice(0, limit)
    .map((result) => result.article);
}

export function getAbsoluteUrl(path = ""): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://refresh.kiwi";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${appUrl}${normalizedPath}`;
}

export function getArticleUrl(article: Article): string {
  return getAbsoluteUrl(`/blog/${article.slug}`);
}
