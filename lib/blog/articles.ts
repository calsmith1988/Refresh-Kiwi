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
      "Your site isn't broken. It's just wearing clothes from a different decade. Here's when a refresh fixes it — and when you're kidding yourself.",
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
        heading: "A refresh is not a rebuild — know the difference",
        paragraphs: [
          "A website refresh keeps what's working and fixes how it looks and reads. It's not 'burn it down and start again with a £4,000 agency quote.'",
          "Most small businesses already have the right words — services, hours, phone number, reviews, photos from that job in Merthyr you're still proud of. The problem is presentation. Tired design. Phone number buried. Homepage that explains what you do but not why anyone should pick up the phone.",
        ],
        callout:
          "Refresh when the business hasn't changed much but the site no longer earns trust.",
      },
      {
        heading: "Signs your site needs a refresh (be honest)",
        bullets: [
          "Local competitors look sharper and you know it.",
          "Visitors hunt for your number like it's a Easter egg.",
          "Homepage says what you do, not why you're the one to call.",
          "Desktop fine. Mobile a thumb-war.",
          "Photos stretched, blurry, or from three owners ago.",
          "Good information trapped in paragraph prisons.",
          "You'd rather give out your mobile than the website URL — and the business itself is solid.",
        ],
      },
      {
        heading: "Don't throw away the good stuff",
        paragraphs: [
          "The best refreshes keep the facts customers need and rearrange them so humans can scan them.",
          "Real services. Real number. Real reviews. Real photos. Local details no template can fake. That's your edge — don't delete it for a cleaner font.",
        ],
      },
      {
        heading: "Fix these first",
        bullets: [
          "Hero: what you do, where, and the one action you want.",
          "Calls to action: phone, email, quote — visible without scrolling into exile.",
          "Services: blocks, not a single wall of text.",
          "Trust: reviews, years trading, accreditations, areas covered.",
          "Mobile: buttons big enough for actual thumbs.",
          "Clutter: if it doesn't help someone enquire, lose it.",
        ],
      },
      {
        heading: "When a refresh won't save you",
        paragraphs: [
          "Business model changed. Site structure broken. Content wrong. You need booking systems, ecommerce, portals, integrations — a refresh is lipstick. You need a rebuild.",
          "Practical rule: useful information, bad presentation? Refresh. Wrong foundation? Rebuild.",
        ],
      },
      {
        heading: "How we do it",
        paragraphs: [
          "Paste your URL. We keep the useful business information and build a fresher preview. Your live site doesn't move until you say so.",
          "Preview first means you find out if a refresh is enough before you pay for hosting, connect a domain, or switch anything live.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a website refresh cheaper than a redesign?",
        answer:
          "Usually, yes. You're keeping the content and fixing layout, clarity, and trust — not rebuilding every page from a blank screen.",
      },
      {
        question: "Will refreshing my website hurt SEO?",
        answer:
          "Not if you handle URLs, headings, and copy carefully. A refresh that improves mobile usability and clarity often helps more than it hurts.",
      },
    ],
  },
  {
    slug: "website-refresh-checklist",
    title: "Website Refresh Checklist: 21 Things to Fix Before You Rebuild",
    description:
      "Use this small business website refresh checklist to improve trust, clarity, mobile usability, and conversions.",
    excerpt:
      "Twenty-one checks before you pay someone four figures to rebuild a site that mostly needs a clearer homepage and a phone number people can tap.",
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
        heading: "Think like a stranger with two minutes",
        paragraphs: [
          "Before you touch colours or fonts, load the site like a new customer. What do you do? Do you serve their area? Do you look legit? How do I get in touch?",
          "If those four questions aren't answered fast, the refresh starts there. Not with a new logo.",
        ],
      },
      {
        heading: "Homepage — the bit that actually matters",
        bullets: [
          "First screen says what the business does. Plain English. No 'Welcome to our online home.'",
          "Location or service area obvious where it matters.",
          "One primary action: call, book, enquire, quote — not four equal buttons fighting for attention.",
          "Phone number or contact button tappable on mobile without precision thumb surgery.",
          "Key services visible without opening a maze menu.",
          "At least one trust signal before they scroll away.",
          "Copy sounds like you — not a template written for 'Acme Solutions Ltd.'",
        ],
      },
      {
        heading: "Trust — would you hand this URL to your mum?",
        bullets: [
          "Reviews or testimonials visible and specific — not 'Great service! — A.S.'",
          "Photos look like your actual business, not a stock handshake.",
          "Claims believable. No 'world-class' unless you can back it.",
          "Hours, address, contact match Google and your card.",
          "Licences, insurance, accreditations current — or remove them.",
        ],
      },
      {
        heading: "Mobile — where most of your visitors live",
        bullets: [
          "Buttons big enough to tap.",
          "Text readable without pinch-zoom.",
          "Images don't shove the phone number off the planet.",
          "Menu simple. Main action not hidden behind a hamburger that leads nowhere.",
          "Forms short. Nobody completes a twelve-field enquiry on a bus.",
        ],
      },
      {
        heading: "Content — cut the dead wood",
        bullets: [
          "Remove services you stopped offering in 2019.",
          "Add the ones people keep asking about.",
          "Break paragraph walls into short sections.",
          "Prices or 'from £X' clear if you can — or say how quotes work.",
          "Explain what happens after they contact you.",
          "Local context where it helps — 'covering Caerphilly and surrounding valleys,' not 'nationwide excellence.'",
        ],
      },
      {
        heading: "Technical — boring but worth ten minutes",
        bullets: [
          "Page titles and meta descriptions that describe the page.",
          "Important URLs stable where possible.",
          "Alt text on images — basic accessibility.",
          "Loads fast on mobile. Test on your actual phone, not just desktop.",
          "HTTPS. No broken links.",
          "Forms, tel: links, mailto: links work after any change.",
        ],
      },
      {
        heading: "Run this before you fund a rebuild",
        paragraphs: [
          "Plenty of older sites don't need a six-week project. They need a clearer homepage, a visible number, mobile that cooperates, and proof you're real.",
          "That's exactly what a refresh is for — and you can test it in minutes, not months.",
        ],
      },
    ],
    faqs: [
      {
        question: "How often should a small business refresh its website?",
        answer:
          "Review once a year minimum. Refresh when services, prices, hours, photos, or customer expectations have moved on without the site.",
      },
      {
        question: "Should I refresh every page at once?",
        answer:
          "Not necessarily. Homepage and enquiry pages first. Supporting pages once the main path works.",
      },
    ],
  },
  {
    slug: "small-business-website-redesign-cost-uk",
    title: "How Much Does a Small Business Website Redesign Cost in the UK?",
    description:
      "A realistic guide to UK small business website redesign costs, from DIY refreshes to agency rebuilds.",
    excerpt:
      "From DIY fiddling to agency quotes that make you sit down — what small business website redesign cost in the UK actually looks like, and when you're overpaying.",
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
        heading: "The short answer (before the sales call)",
        paragraphs: [
          "Small business website redesign cost in the UK runs from nearly free if you're DIY-ing a template to several thousand pounds for a custom agency rebuild. The right number depends on how much strategy, copy, development, migration, and hand-holding you actually need.",
          "If your site already has useful content and mainly needs to stop looking like 2014, a refresh beats a full redesign on price every time.",
        ],
      },
      {
        heading: "Typical bands — rough and honest",
        bullets: [
          "DIY template refresh: cheap upfront, costs your weekend, may still look like everyone else.",
          "Freelancer refresh: fine for simple brochure sites when you know exactly what's wrong.",
          "Agency redesign: brand, copy, SEO migration, integrations — the full production.",
          "Preview-first refresh: see a modernised version before committing to the big spend.",
        ],
      },
      {
        heading: "What moves the price",
        bullets: [
          "Page count.",
          "Copy rewrite vs rearrange.",
          "New photos, branding, illustrations.",
          "Booking, ecommerce, membership, CRM — the expensive words.",
          "SEO migration and redirects.",
          "Custom design requirements.",
          "Hosting, maintenance, support after launch.",
        ],
      },
      {
        heading: "When a full redesign earns its invoice",
        paragraphs: [
          "Business changed significantly. Brand needs repositioning. Complex functionality. Site structure actively hurting you.",
          "Restaurant adding online ordering. Trades firm expanding into three counties. Consultancy with a new offer — cosmetic won't cut it.",
        ],
      },
      {
        heading: "When a refresh is the smart money",
        paragraphs: [
          "Site is basically accurate but looks old, hides the number, and converts like a wet leaflet.",
          "Fastest win: clearer messaging, scannable sections, obvious calls to action, mobile that works.",
        ],
      },
      {
        heading: "How to stop the budget leaking",
        bullets: [
          "List pages that actually help someone decide to call.",
          "Keep accurate copy — don't rewrite for the sake of it.",
          "Use real customer questions to shape sections.",
          "Homepage first. Always homepage first.",
          "Skip custom functionality unless it solves a real problem.",
          "Ask for a preview or prototype before signing the big quote.",
        ],
      },
      {
        heading: "Where Refresh Kiwi sits",
        paragraphs: [
          "Built for the moment before a full redesign feels justified. Paste your URL, get a fresh preview, decide if that level of improvement is enough.",
          "Enough? Publish for £8 a month, keep asking for changes in plain English. Not enough? You've still clarified what to brief a designer.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is the cheapest website redesign usually the best choice?",
        answer:
          "Cheap works for a simple refresh. Not when you need strategy, copywriting, SEO migration, or custom functionality — then cheap becomes expensive later.",
      },
      {
        question: "Can I redesign my website in stages?",
        answer:
          "Yes. Homepage and high-intent service pages first. Lower-priority pages when the main path converts.",
      },
    ],
  },
  {
    slug: "ai-website-redesign-small-business",
    title: "AI Website Redesign for Small Businesses: What It Can and Cannot Do",
    description:
      "A practical explanation of AI website redesign for small businesses, including benefits, limits, and review steps.",
    excerpt:
      "AI can rebuild your homepage in minutes. It can also confidently put the wrong phone number on it. Here's where it helps, where it doesn't, and what to check before you publish.",
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
        heading: "Useful. Not magic. Not your business partner.",
        paragraphs: [
          "AI website redesign can turn a tired site into a cleaner draft quickly — read existing copy, spot common patterns, suggest layout, produce something that would've taken days by hand.",
          "It doesn't know your business. Wrong number. Wrong town. Over-polished copy that sounds like a LinkedIn influencer. Assumptions you have to catch before anything goes live.",
        ],
      },
      {
        heading: "Where AI actually pulls its weight",
        bullets: [
          "First design direction from an existing site.",
          "Long copy into scannable sections.",
          "Calls to action visible instead of hidden.",
          "Better headings and service blocks.",
          "Variations so you can pick a direction.",
          "Small edits from plain-English instructions.",
        ],
      },
      {
        heading: "Where you still matter",
        bullets: [
          "Phone numbers, prices, hours, legal claims — check every one.",
          "What makes you different from the other plumber in Pontypridd.",
          "Photos and tone — yours, not generic.",
          "Regulated claims, guarantees, credentials.",
          "Forms, booking links, maps, tel: links — tap them yourself.",
        ],
      },
      {
        heading: "Review like it's a strong draft, not gospel",
        paragraphs: [
          "Compare new against old. Every business-critical detail.",
          "Contact info, services, locations, pricing, photos, reviews, claims, mobile layout, calls to action — one pass, minimum.",
        ],
      },
      {
        heading: "Preview first or regret later",
        paragraphs: [
          "Safest move: generate a separate preview. Live site stays live while you inspect.",
          "That's how Refresh Kiwi works. Nothing changes on your real site until you publish.",
        ],
      },
      {
        heading: "AI and SEO — the non-panic version",
        paragraphs: [
          "Google doesn't auto-penalise AI-assisted content. It penalises rubbish — thin, wrong, spammy.",
          "For a local business site: clear services, local relevance, real proof, useful answers, obvious next step. Same as always.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will Google penalise an AI-redesigned website?",
        answer:
          "Not because AI touched it. Because the output was low-quality, inaccurate, or unhelpful. Review before publish.",
      },
      {
        question: "Can AI replace a web designer?",
        answer:
          "For simpler refresh jobs, often yes. Complex branding, strategy, integrations, high-stakes projects — still hire a human.",
      },
    ],
  },
  {
    slug: "website-redesign-agency-alternative",
    title: "Website Redesign Agency Alternative: When a Faster Refresh Is Enough",
    description:
      "Compare agency redesigns with faster website refresh options for small businesses that need a better site without a large project.",
    excerpt:
      "Agencies do brilliant work — for the right project. For a site that mostly needs to look current and convert better, you might not need the full production.",
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
        heading: "Agencies earn their money — sometimes not from you",
        paragraphs: [
          "A good agency brings brand strategy, custom design, copywriting, SEO migration, complex development, long-term support. Right project, worth every penny.",
          "Plenty of small businesses don't need that. They need the site to look current, explain the business clearly, work on mobile, and stop hiding the phone number.",
        ],
      },
      {
        heading: "When hire the agency",
        bullets: [
          "Brand, positioning, or target market changing.",
          "Ecommerce, bookings, memberships, integrations.",
          "Large site with SEO traffic needing careful migration.",
          "Photography, copy, design from scratch.",
          "Multiple stakeholders needing workshops and project management.",
        ],
      },
      {
        heading: "When a refresh is enough",
        bullets: [
          "Services and details mostly correct.",
          "Site looks old but content underneath is fine.",
          "Homepage needs structure and a visible call to action.",
          "You want proof before committing budget.",
          "No custom functionality required.",
        ],
      },
      {
        heading: "The preview-first alternative",
        paragraphs: [
          "Generate a refreshed version. Look at it. Decide if the problem is solved.",
          "Sole traders, local services, cafes, clinics, trades — website matters, but it's not a software launch.",
        ],
      },
      {
        heading: "Five questions before you sign anything",
        bullets: [
          "Cost: what do I pay before seeing anything?",
          "Speed: today, this week, or 'phase two in Q3'?",
          "Control: can I ask for changes in plain English?",
          "Risk: does my old site stay live while I decide?",
          "Scope: presentation fix or rebuild the business online?",
        ],
      },
      {
        heading: "Sensible path",
        paragraphs: [
          "Unsure? Refresh first. Preview close enough — skip the agency for now. Preview exposes deeper problems — you're better briefed when you do hire.",
          "Either way, 'my website looks old' becomes something you can compare instead of worry about.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a refresh a replacement for an agency?",
        answer:
          "For simple brochure sites, often yes. Complex sites, brand strategy, integrations — agency still wins.",
      },
      {
        question: "Can I use a refreshed preview as an agency brief?",
        answer:
          "Absolutely. Show them the direction, structure, level of change you want — even if they rebuild it properly.",
      },
    ],
  },
  {
    slug: "website-design-process",
    title: "Website Design Process: A Plain Guide for Small Businesses",
    description:
      "Understand the website design process from brief to launch — what happens at each stage, what you need to prepare, and how to avoid common delays.",
    excerpt:
      "From brief to launch without the agency jargon — what actually happens at each stage, and where projects stall because nobody collected the phone number.",
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
        heading: "What the website design process actually is",
        paragraphs: [
          "The website design process is the steps between 'we need a site' and 'it's live.' For a small business: figure out what the site should do, gather content, design layout, build pages, check it works, publish.",
          "Agencies call it discovery, wireframes, UI, development, QA. Same work underneath — make the business clear and get visitors to act.",
        ],
      },
      {
        heading: "Stage 1: Decide what winning looks like",
        bullets: [
          "What should visitors do? Call, book, buy, quote, visit?",
          "Who for? Local, national, niche?",
          "What's wrong with the current site?",
          "What must stay? Name, services, prices, legal pages.",
          "Deadline and budget — the awkward but necessary bit.",
        ],
        callout:
          "Clear goal stops drift. Most small business sites exist to explain the business and get enquiries.",
      },
      {
        heading: "Stage 2: Gather content (where timelines die)",
        paragraphs: [
          "Slowest stage. Services list, contact details, hours, areas covered, photos, reviews, accreditations, legal text.",
          "Designers can't invent your real number or prices. Accurate content in = faster process out.",
        ],
      },
      {
        heading: "Stage 3: Structure and layout",
        paragraphs: [
          "Homepage hero, services, about, trust, contact, footer. Simple site? Homepage plus about and contact is often plenty.",
          "Main action obvious on mobile. Most visitors are on a phone. Design for that thumb.",
        ],
      },
      {
        heading: "Stage 4: Design and build",
        paragraphs: [
          "Colours, type, spacing, images. Build makes it work. Refresh rather than rebuild? Content exists — mostly presentation.",
          "Refresh Kiwi compresses this: paste URL or describe the business, preview in about two minutes. Still review it — but you're not waiting three weeks for a first mockup.",
        ],
      },
      {
        heading: "Stage 5: Review and revise",
        bullets: [
          "Every number, email, address, link.",
          "Services and prices against reality.",
          "Mobile and desktop.",
          "Ask someone outside the business: is this clear?",
          "Changes in plain English — bigger button, different photo, shorter paragraph.",
        ],
      },
      {
        heading: "Stage 6: Publish and maintain",
        paragraphs: [
          "Connect domain, go live, submit sitemap if needed. Then plan updates — new services, changed hours, fresh photos, seasonal offers.",
          "Kiwi Pro: we host and handle edits on request for £8 a month. Current site stays live until you switch.",
        ],
      },
      {
        heading: "How long this takes",
        paragraphs: [
          "Agency: four to twelve weeks, depending on scope, revisions, and how fast you send content. Refresh-first: preview same day, decide if you even need the full project.",
          "See our website design packages page for how we split free preview and paid hosting.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need to write all the copy myself?",
        answer:
          "Supply accurate facts. We reshape content from your current site — you review everything before publish.",
      },
      {
        question: "How many revision rounds are normal?",
        answer:
          "Agencies: two or three rounds typically. Kiwi Pro: unlimited edits in plain English, no round counting.",
      },
    ],
  },
  {
    slug: "redesign-website-without-losing-seo",
    title: "How to Redesign a Website Without Losing SEO",
    description:
      "Practical steps to redesign a website without losing SEO rankings — URLs, redirects, content, and a safe preview-first approach for small businesses.",
    excerpt:
      "Redesign your site without Google forgetting you exist — URLs, redirects, content, and why previewing first beats flipping the switch blind.",
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
        heading: "Why redesigns tank rankings",
        paragraphs: [
          "Google ranks pages built on content, links, and trust over time. Change URLs without redirects, delete pages, swap useful copy for thin fluff — rankings drop.",
          "The new design isn't the villain. Broken connections between old and new URLs are. Weaker content than what ranked before is.",
        ],
        callout:
          "Keep what works. Improve how it looks without binning pages that bring traffic.",
      },
      {
        heading: "Before you touch anything: audit",
        bullets: [
          "Pages bringing traffic in Google Search Console.",
          "Keywords each important page targets.",
          "Export sitemap or crawl for all URLs.",
          "Keep, merge, or retire — decide deliberately.",
          "Save title tags and meta descriptions that perform.",
        ],
      },
      {
        heading: "Keep URLs stable if you can",
        paragraphs: [
          "Safest: redesign in place. Same URLs, better layout. New theme, same addresses.",
          "URLs must change? 301 redirect every old URL to its closest match. Permanent move — tell Google properly.",
        ],
      },
      {
        heading: "Protect content that ranks",
        paragraphs: [
          "Don't delete long service pages, location pages, or blog posts that bring traffic unless you're merging with a plan. Shorten copy? Keep the facts, keywords, and answers people searched for.",
          "Refresh Kiwi starts from your existing content — helps preserve useful information. Still review the preview so nothing important vanished.",
        ],
      },
      {
        heading: "Preview before you flip the switch",
        paragraphs: [
          "Preview-first helps SEO as much as sanity. Separate preview, compare to live, check key pages and details survived.",
          "Live site stays indexed while you review. No premature switch before search engines are ready.",
        ],
      },
      {
        heading: "Technical checks before launch",
        bullets: [
          "301 redirects for changed URLs.",
          "Same domain if possible.",
          "Title tags and headings on important pages — improve, don't genericise.",
          "Submit updated sitemap in Search Console after launch.",
          "Internal links, forms, phone links work.",
          "Watch Search Console for crawl errors first few weeks.",
        ],
      },
      {
        heading: "After launch — don't panic immediately",
        paragraphs: [
          "Some fluctuation is normal. Google needs time to recrawl.",
          "Sharp drop? Broken redirects, accidental noindex, missing pages. Fix fast.",
        ],
      },
      {
        heading: "Big sites need bigger plans",
        paragraphs: [
          "Hundreds of pages, ecommerce categories, multi-location SEO — migration plan beyond a simple refresh. Professional SEO help may be worth it.",
          "Typical small business brochure site, handful of pages? Careful refresh, redirects, content review — usually enough.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will changing my website design affect Google rankings?",
        answer:
          "Design alone doesn't automatically hurt. Broken URLs, lost content, missing redirects — those do.",
      },
      {
        question: "Do I need to keep the same page titles?",
        answer:
          "Same intent and keywords on pages that rank. Improve clarity — don't wipe and start generic.",
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
