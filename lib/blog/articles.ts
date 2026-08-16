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
    name: "Website design process and SEO-safe redesign",
    intent: "Capture process-oriented searches and owners worried about SEO during a redesign.",
    recommendedCadence: "Link from money pages and redesign service content.",
    articleSlugs: ["website-design-process", "redesign-website-without-losing-seo"],
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
    slug: "website-design-process",
    title: "Website Design Process: A Plain Guide for Small Businesses",
    description:
      "Understand the website design process from brief to launch — what happens at each stage, what you need to prepare, and how to avoid common delays.",
    excerpt:
      "A practical walkthrough of the website design process for small business owners, without agency jargon or unnecessary complexity.",
    publishedAt: "2026-08-16",
    updatedAt: "2026-08-16",
    author: blogAuthor.name,
    category: "Website Design",
    readingTime: "8 min read",
    primaryKeyword: "website design process",
    secondaryKeywords: [
      "web design process",
      "website design steps",
      "how website design works",
    ],
    intent: "informational",
    funnelStage: "problem-aware",
    priority: 6,
    sections: [
      {
        heading: "What the website design process actually covers",
        paragraphs: [
          "The website design process is the sequence of steps that turns a business need into a live website. For a small business, it usually includes understanding what the site should do, gathering content, designing the layout, building the pages, checking everything works, and publishing.",
          "Agencies often label these stages with jargon — discovery, wireframes, UI design, development, QA. The underlying work is the same: make sure the site represents the business clearly and helps visitors take the next step.",
        ],
      },
      {
        heading: "Stage 1: Define the goal",
        bullets: [
          "What should visitors do? Call, book, buy, request a quote, visit in person?",
          "Who is the site for? Local customers, national clients, or a niche audience?",
          "What is wrong with the current site, if you have one?",
          "What must stay the same? Brand name, services, prices, legal pages.",
          "What is the deadline and budget?",
        ],
        callout:
          "A clear goal stops the project drifting. Most small business sites exist to explain the business and generate enquiries.",
      },
      {
        heading: "Stage 2: Gather content",
        paragraphs: [
          "Content is the slowest part of most website projects. Before design starts, collect your services list, contact details, opening hours, service areas, photos, reviews, accreditations, and any legal text you need.",
          "Designers cannot invent your real phone number or prices. The more accurate your content, the faster the process moves.",
        ],
      },
      {
        heading: "Stage 3: Structure and layout",
        paragraphs: [
          "This is where the site takes shape: homepage hero, services blocks, about section, trust signals, contact area, and footer. For a simple business site, a single homepage plus an about page and contact page is often enough.",
          "The layout should make the main action obvious on mobile. Most visitors will see your site on a phone first.",
        ],
      },
      {
        heading: "Stage 4: Design and build",
        paragraphs: [
          "Design covers colours, typography, spacing, and imagery. Build turns the design into working pages. For a refresh rather than a full rebuild, much of the content already exists — the work is mostly presentation.",
          "Refresh Kiwi compresses this stage: paste your URL or describe your business and get a preview in about two minutes. You still review the result, but you see something concrete early instead of waiting weeks for a first draft.",
        ],
      },
      {
        heading: "Stage 5: Review and revise",
        bullets: [
          "Check every phone number, email, address, and link.",
          "Read services and prices against your real offering.",
          "Test on mobile and desktop.",
          "Ask someone outside the business if the site is clear.",
          "Request changes in plain language — bigger button, different photo, shorter paragraph.",
        ],
      },
      {
        heading: "Stage 6: Publish and maintain",
        paragraphs: [
          "Publishing means connecting your domain, making the site live, and submitting it to search engines if needed. After launch, plan for updates: new services, changed hours, fresh photos, seasonal offers.",
          "With Kiwi Pro, Refresh Kiwi hosts the site and handles edits on request for £8 per month. Your current site stays live until you choose to switch.",
        ],
      },
      {
        heading: "How long the process takes",
        paragraphs: [
          "Agency projects often run four to twelve weeks depending on scope, revisions, and how quickly you supply content. A refresh-first approach can show a preview the same day, which helps you decide whether a full project is even necessary.",
          "See our website design packages page for how Refresh Kiwi splits free preview and paid hosting.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need to write all the copy myself?",
        answer:
          "You need to supply accurate business facts. Refresh Kiwi can reshape existing content from your current site, but you should review everything before publishing.",
      },
      {
        question: "How many revision rounds are normal?",
        answer:
          "Agencies often include two or three rounds. With Refresh Kiwi, Kiwi Pro includes unlimited edits in plain English rather than numbered revision rounds.",
      },
    ],
  },
  {
    slug: "redesign-website-without-losing-seo",
    title: "How to Redesign a Website Without Losing SEO",
    description:
      "Practical steps to redesign a website without losing SEO rankings — URLs, redirects, content, and a safe preview-first approach for small businesses.",
    excerpt:
      "Redesigning a website does not have to wipe out your search traffic. Here is what to protect before, during, and after the switch.",
    publishedAt: "2026-08-16",
    updatedAt: "2026-08-16",
    author: blogAuthor.name,
    category: "SEO",
    readingTime: "9 min read",
    primaryKeyword: "redesign website without losing seo",
    secondaryKeywords: [
      "website redesign seo",
      "seo friendly website redesign",
      "website migration seo",
    ],
    intent: "informational",
    funnelStage: "problem-aware",
    priority: 7,
    sections: [
      {
        heading: "Why redesigns can hurt SEO",
        paragraphs: [
          "Search engines rank pages based on content, links, and trust built over time. A redesign that changes URLs, deletes pages, or replaces useful content with thin copy can cause rankings to drop.",
          "The risk is not the new design itself. It is breaking the connections between old URLs and new ones, or publishing weaker content than what ranked before.",
        ],
        callout:
          "Keep what works. Improve presentation without throwing away pages that bring traffic.",
      },
      {
        heading: "Before you redesign: audit what you have",
        bullets: [
          "List pages that bring the most traffic in Google Search Console.",
          "Note which keywords each important page targets.",
          "Export your current sitemap or crawl your site for all URLs.",
          "Identify pages you can keep, merge, or retire.",
          "Save title tags and meta descriptions that perform well.",
        ],
      },
      {
        heading: "Keep URLs stable where possible",
        paragraphs: [
          "The safest approach is to redesign in place — same URLs, better layout. If your platform allows it, update the theme or design without changing page addresses.",
          "When URLs must change, plan 301 redirects from every old URL to its closest match on the new site. A redirect tells search engines the page moved permanently.",
        ],
      },
      {
        heading: "Protect your best content",
        paragraphs: [
          "Do not delete long-form service pages, location pages, or blog posts that rank unless you have a deliberate merge plan. If you shorten copy, keep the facts, keywords, and answers people searched for.",
          "Refresh Kiwi starts from your existing site content, which helps preserve useful information. You still review the preview to make sure nothing important was dropped.",
        ],
      },
      {
        heading: "Use a preview before going live",
        paragraphs: [
          "The preview-first model matters for SEO as well as peace of mind. Generate a separate preview, compare it with your live site, and check that key pages and details survived the refresh.",
          "Your current site stays live and indexed while you review. That avoids a premature switch that search engines have not been prepared for.",
        ],
      },
      {
        heading: "Technical checks before launch",
        bullets: [
          "Set up 301 redirects for any changed URLs.",
          "Keep the same domain if possible.",
          "Preserve title tags and headings on important pages, or improve them rather than replacing with generic text.",
          "Submit the updated sitemap in Google Search Console after launch.",
          "Check internal links, contact forms, and phone links work.",
          "Monitor Search Console for crawl errors in the first few weeks.",
        ],
      },
      {
        heading: "After launch: what to expect",
        paragraphs: [
          "Some ranking fluctuation is normal after a redesign, even with good redirects. Search engines need time to recrawl and reassess pages.",
          "If traffic drops sharply, check for broken redirects, noindex tags accidentally added, or missing pages. Fix issues quickly rather than waiting.",
        ],
      },
      {
        heading: "When a full rebuild needs more planning",
        paragraphs: [
          "Large sites with hundreds of pages, ecommerce categories, or multi-location SEO need a migration plan beyond a simple refresh. If that describes you, consider professional SEO migration help.",
          "For a typical small business brochure site with a handful of pages, a careful refresh with redirects and content review is usually enough.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will changing my website design affect Google rankings?",
        answer:
          "A design change alone does not automatically hurt rankings. Problems come from broken URLs, lost content, or missing redirects.",
      },
      {
        question: "Do I need to keep the same page titles?",
        answer:
          "Not exactly, but keep the same intent and keywords on pages that already rank. Improve clarity rather than starting from scratch.",
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
