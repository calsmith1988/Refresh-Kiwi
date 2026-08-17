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
    articleSlugs: [
      "wix-alternative",
      "squarespace-alternatives",
      "godaddy-airo",
      "lovable-alternative",
      "hostinger-alternatives",
      "webflow-alternatives",
      "wordpress-alternatives",
      "durable-alternative",
      "weebly-alternative",
      "10web-alternative",
    ],
  },
  {
    name: "Three ways in",
    intent: "Explain the Google listing and scratch paths without cannibalising competitor comparison keywords.",
    recommendedCadence: "Link from comparison posts and homepage messaging.",
    articleSlugs: [
      "create-website-from-google-business-profile",
      "voice-website-builder",
    ],
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
          "We are honest about the split: if you want a builder, Wix and [Squarespace alternatives](/blog/squarespace-alternatives) exist for a reason. If you want your existing site modernised without learning an editor, that is the lane we stay in — same lane as skipping [GoDaddy Airo](/blog/godaddy-airo) when you already have a URL worth saving. See also [Lovable](/blog/lovable-alternative), [Hostinger alternatives](/blog/hostinger-alternatives), [Webflow alternatives](/blog/webflow-alternatives), [WordPress alternatives](/blog/wordpress-alternatives), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative), and [10Web](/blog/10web-alternative).",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Most people compare Wix after pasting an old URL — still the fastest way to see if a refresh beats a builder. No site to paste? Type your business name and we pull your Google listing. Nothing online at all? Talk into the mic or type what you do.",
          "Same ~two-minute preview, same Kiwi Pro at £8/month, same live-site-stays-live rule if you already have one. No drag-and-drop, no credits, no tier maze.",
          "Deeper reads: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and our [voice website builder](/blog/voice-website-builder) guide.",
        ],
      },
      {
        heading: "Do I need a website URL before I can use Refresh Kiwi?",
        paragraphs: [
          "No. A URL is the quickest compare against Wix when you already have something live, but it is door one of three.",
          "Door two: find on Google. Door three: start from scratch by talking or typing. Wix wants you in the editor either way. We meet you where the facts already are.",
        ],
      },
      {
        heading: "Can I start a site from scratch without learning Wix?",
        paragraphs: [
          "Yes. Describe the business into the microphone — we transcribe — or type it plain. About two minutes to a preview.",
          "That is not Wix's template mall. It is the scratch path on Refresh Kiwi, alongside refresh-from-URL and find-on-Google.",
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
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Squarespace comparisons usually start with a URL paste — fair, when the site exists but the template date does not. No URL? Search your business name and we build from your Google listing. Brand-new business? Talk or type what you do.",
          "Same preview in about two minutes, same £8/month Kiwi Pro, unlimited plain-English or voice edits. Your current site stays live until you switch.",
          "See [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder) for the full picture.",
        ],
      },
      {
        heading: "Do I need an existing website to skip Squarespace?",
        paragraphs: [
          "No. An existing URL is the most common front door, not the only one.",
          "A Google listing alone is enough to start. So is a voice memo about what you actually do — no Squarespace trial, no font picker.",
        ],
      },
      {
        heading: "Can I make a site from my Google listing instead of Squarespace?",
        paragraphs: [
          "Yes. Type the business name, we fetch the listing, and turn it into a real site — not Google's free stub, not a Squarespace theme.",
          "About two minutes, preview first, host on Kiwi Pro when ready. Squarespace makes you build. We start from facts you already published somewhere.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Squarespace: honest pick for UK SMBs",
        paragraphs: [
          "Pick Squarespace if you want a polished builder, enjoy the editor, and are happy paying for that experience every month. Pick Refresh Kiwi if you want speed, one Pro tier, no drag-and-drop, and a preview before your current site changes.",
          "Squarespace is pricey and coherent. We are cheap and direct — free to try, live site stays up until you switch, unlimited plain-English or voice edits on Pro.",
          "Still comparing builders? Read our [Wix alternative](/blog/wix-alternative) and [GoDaddy Airo](/blog/godaddy-airo) guides for the same honest treatment. For the rest of the set — [Lovable](/blog/lovable-alternative), [Hostinger](/blog/hostinger-alternatives), [Webflow](/blog/webflow-alternatives), [WordPress](/blog/wordpress-alternatives), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative), [10Web](/blog/10web-alternative) — same voice, same rule. Still comparing services? Our [website redesign services](/website-redesign-services) page walks through what a refresh actually touches.",
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
        heading: "No URL? Two other ways in",
        paragraphs: [
          "GoDaddy Airo and Refresh Kiwi both like a URL when you have one — quickest way to see a refresh beside an AI builder. No URL? Find your business on Google and we pull the listing. Starting cold? Talk into the mic or type what you do.",
          "Same ~two-minute output, same single Pro tier at £8/month, no credits or token meter. Live site stays up until you publish the preview.",
          "More detail: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) · [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a URL before using Refresh Kiwi instead of GoDaddy Airo?",
        paragraphs: [
          "No. URL first if you have one worth saving — that is still the spine of this comparison.",
          "Without a URL, Google listing or scratch works the same way: preview in about two minutes, no Airo prompt maze, no hosting upsell before you see anything.",
        ],
      },
      {
        heading: "Can I start from scratch without GoDaddy or a domain yet?",
        paragraphs: [
          "Yes. Describe the business by voice or text — we transcribe and build the site. Free to try the preview.",
          "You do not need to buy a domain through GoDaddy first. You need a business worth putting online — the rest is door three on Refresh Kiwi.",
        ],
      },
      {
        heading: "Refresh Kiwi vs GoDaddy Airo: which should you use?",
        paragraphs: [
          "Use GoDaddy Airo if you want everything inside GoDaddy — domain, AI builder, hosting — and you are happy to edit in their system. Use Refresh Kiwi if you already have a site or listing and want a faster refresh without a builder subscription maze.",
          "We win on not being a builder: about two minutes to preview, live site stays up, £8/month Pro with unlimited plain-English or voice edits.",
          "Cross-read our [Wix alternative](/blog/wix-alternative) and [Squarespace alternatives](/blog/squarespace-alternatives) posts if you are still shopping builders. The full comparison set — [Lovable](/blog/lovable-alternative), [Hostinger](/blog/hostinger-alternatives), [Webflow](/blog/webflow-alternatives), [WordPress](/blog/wordpress-alternatives), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative), [10Web](/blog/10web-alternative) — follows the same rule: match the job, not the marketing adjective.",
        ],
        callout:
          "GoDaddy Airo builds you a new site in their world. Refresh Kiwi refreshes yours in about two minutes — then lets you talk to it in plain English until it looks right.",
      },
    ],
  },
  {
    slug: "lovable-alternative",
    title: "Refresh Kiwi vs Lovable: A Lovable Alternative for UK Small Businesses",
    description:
      "Lovable AI website builder explained — free tiers, credits, tokens, and when a refresh beats generating a whole new site in someone else's world.",
    excerpt:
      "Lovable generates a new site on credits. Refresh Kiwi refreshes the one you already have — no tokens, no canvas, about two minutes from a URL.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "lovable ai website builder",
    secondaryKeywords: [
      "lovable alternative",
      "is lovable free",
      "lovable credits",
      "lovable vs refresh",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 9,
    sections: [
      {
        heading: "What is the Lovable AI website builder?",
        paragraphs: [
          "Lovable is an AI app builder that generates websites and web apps from prompts — you describe what you want, it writes code, and you iterate inside its editor.",
          "It suits founders and makers who want to ship fast inside a new project, often with a credit or usage meter ticking in the background.",
          "Refresh Kiwi is a different job. Paste your URL, Google listing, or brief and get a refreshed preview in about two minutes — not a blank canvas, not a token budget, not a new codebase in Lovable's world.",
        ],
      },
      {
        heading: "Is Lovable free?",
        paragraphs: [
          "Lovable offers a free tier with limits — enough to try the product, not usually enough to run a serious business site indefinitely without paying or watching usage caps.",
          "Free in AI builders often means \"free until you hit the wall,\" then upgrades, credits, or monthly plans take over.",
          "Refresh Kiwi is free to try differently: generate a preview without signing up, keep your current site live until you switch, and pay one £8/month Kiwi Pro tier when you want hosting and unlimited edits. No credits. No token anxiety.",
        ],
      },
      {
        heading: "Does Lovable use credits or tokens?",
        paragraphs: [
          "Yes — Lovable runs on a credit or usage model for generations and edits. Heavy iteration burns through allowance faster than owners expect.",
          "That is normal for AI builders. The cost is not always money upfront; sometimes it is mental arithmetic every time you ask for another change.",
          "Refresh Kiwi does not meter plain-English or voice edits on Pro. One tier, unlimited changes, no \"should I spend a credit on moving the phone number\" moment. See [website design packages](/website-design-packages) for how that compares to stacking builder subscriptions.",
        ],
      },
      {
        heading: "What is a Lovable alternative?",
        paragraphs: [
          "A Lovable alternative is any route to a business website that is not generating a new project inside Lovable — another AI builder, WordPress, an agency, or a refresh tool that starts from what you already have online.",
          "Most alternatives still put you in front of a prompt box and a usage meter. Refresh Kiwi puts you in front of your existing URL.",
          "If you already have a site with the right phone number and wrong hero section, a refresh beats a rebuild. Our [pay-monthly website design](/website-design-pay-monthly) page spells out Kiwi Pro at £8/month when you are ready to host.",
        ],
      },
      {
        heading: "Lovable vs something simpler: what fits a UK small business?",
        paragraphs: [
          "Choose Lovable if you want to prototype or build a new web app from prompts and you are comfortable managing credits, code output, and iteration inside their product.",
          "Choose something simpler if your problem is \"my site looks like 2014\" rather than \"I need a new React app.\" That is the Refresh Kiwi lane.",
          "We are not competing with Lovable at being Lovable. We win at not being a builder — speed, one Pro tier, refresh from URL or listing, live site stays up until you switch. CJS Global LTD, Caerphilly. info@refresh.kiwi. Remote, no fake offices.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Lovable lives in prompts and credits; Refresh Kiwi usually starts with a URL when you have a site to save. No URL? Type your business name — we grab the Google listing. Nothing online? Talk or type what you do — same ~two minutes, no token burn.",
          "Kiwi Pro is £8/month to host with unlimited edits. No Lovable credit arithmetic every time you nudge a headline.",
          "Walkthroughs: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a URL to use Refresh Kiwi instead of Lovable?",
        paragraphs: [
          "No. URL refresh is the common path when comparing against Lovable's generate-from-scratch model, but it is not required.",
          "Google listing or scratch — voice or text — hits the same preview-first flow without spending credits in Lovable's world.",
        ],
      },
      {
        heading: "Can I describe my business instead of prompting Lovable?",
        paragraphs: [
          "Yes. Talk into the microphone or type plain English about what you do. We transcribe and turn it into a site.",
          "That is Refresh Kiwi's scratch path — not code generation on credits, not a new app in someone else's dashboard.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Lovable: honest pick",
        paragraphs: [
          "Lovable generates a new site in their world, often on credits. Refresh Kiwi refreshes the site you already have — or starts from a brief — in about two minutes, with unlimited plain-English edits on Pro.",
          "Fair split: Lovable for makers building new things. Refresh Kiwi for the plumber, salon, or cafe whose site already exists but apologises for itself.",
          "Still shopping? Compare [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [GoDaddy Airo](/blog/godaddy-airo), [Durable](/blog/durable-alternative), and the rest of our [website redesign services](/website-redesign-services) guide before you commit to a credit meter.",
        ],
        callout:
          "Lovable builds you a new thing and counts the credits. Refresh Kiwi refreshes the thing you already send customers to — no tokens, no tier maze.",
      },
    ],
  },
  {
    slug: "hostinger-alternatives",
    title: "Hostinger Alternatives for UK Small Businesses — Including Refresh Kiwi",
    description:
      "Hostinger alternatives compared honestly — website builder reviews, hosting upsells, and when a refresh beats another builder bolted onto a host.",
    excerpt:
      "Hostinger is a hosting company with a builder bolted on. Refresh Kiwi is a refresh — not another hosting upsell corridor.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "hostinger alternatives",
    secondaryKeywords: [
      "hostinger alternative",
      "hostinger website builder reviews",
      "is hostinger website builder good",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 10,
    sections: [
      {
        heading: "What are Hostinger alternatives?",
        paragraphs: [
          "Hostinger alternatives are other ways to get a business website without Hostinger's hosting-and-builder bundle — other hosts, builders like Wix, WordPress setups, agencies, or refresh tools.",
          "Most alternatives still sell you hosting first and a builder second. Refresh Kiwi sells a refreshed preview first and hosting only when you choose to publish.",
          "If you want monthly hosting with unlimited edits rather than another introductory hosting rate, see our [pay-monthly website design](/website-design-pay-monthly) page. Kiwi Pro is £8/month — one tier, no maze.",
        ],
      },
      {
        heading: "What is a Hostinger alternative?",
        paragraphs: [
          "A Hostinger alternative is any platform that gets you online without Hostinger's dashboard — GoDaddy, SiteGround with WordPress, Squarespace, or a refresh service that skips the builder entirely.",
          "Pick based on whether you want to manage hosting, manage a builder, or manage neither and just fix the site you have.",
          "Refresh Kiwi is the third option: paste a URL, Google listing, or brief, preview in about two minutes, current site stays live until you switch. Not a host shopping experience.",
        ],
      },
      {
        heading: "Is the Hostinger website builder good?",
        paragraphs: [
          "It is good enough for a quick brochure site — templates, AI assist, cheap first-term pricing, and everything inside one Hostinger account.",
          "The builder is not the main event; the hosting sale is. Renewal prices, add-ons, and the gap between intro rate and year-two bill are where owners get surprised.",
          "Refresh Kiwi does not ask you to compare hosting tiers before you see a result. Free preview first, £8/month Pro with unlimited edits when you publish. Compare the full picture on [website design packages](/website-design-packages).",
        ],
      },
      {
        heading: "What do Hostinger website builder reviews usually say?",
        paragraphs: [
          "Reviews often praise the price and speed to a first publish, then mention generic templates, upsells, renewal jumps, and the feeling that the builder exists to keep you on Hostinger hosting.",
          "That is fair — Hostinger is a host that added a builder, not a design studio that added servers.",
          "Refresh Kiwi reviews would sound different if we collected them: \"I pasted my URL, saw a preview in two minutes, my old site stayed live.\" No hosting comparison chart required. See our [website redesign services](/website-redesign-services) page for what the refresh actually touches.",
        ],
      },
      {
        heading: "Hostinger vs refresh tools: which job are you hiring for?",
        paragraphs: [
          "Hire Hostinger if you want cheap hosting, a builder in the same login, and you are starting from scratch or happy to rebuild inside their system.",
          "Hire a refresh tool if your content is mostly right but the presentation is not — wrong decade, buried phone number, hero that whispers instead of shouts.",
          "We are not Hostinger and not pretending to be a host with a builder tab. We refresh what you have. Cross-read [GoDaddy Airo](/blog/godaddy-airo) for the same hosting-plus-builder pattern from a different brand.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Hostinger wants you in hosting first; Refresh Kiwi often starts with a URL paste when a site already exists. No URL? Search your business on Google — we build from the listing. No listing? Talk or type — about two minutes, no builder bolted on.",
          "Same Kiwi Pro at £8/month, unlimited edits, preview before you pay. Not another intro hosting rate.",
          "Read [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a website before I can skip Hostinger's builder?",
        paragraphs: [
          "No. A URL is fastest when you are refreshing something live, but Hostinger's builder is not your only alternative.",
          "Google listing alone works. So does scratch by voice — no Hostinger account, no template picker, no renewal surprise.",
        ],
      },
      {
        heading: "Can I build from my Google listing without Hostinger hosting?",
        paragraphs: [
          "Yes. Type the business name, we fetch the Google Business Profile details, and produce a real preview — not a hosting upsell page.",
          "Host when ready on Kiwi Pro for £8/month. Your old site, if you have one, stays live until you switch.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Hostinger: honest pick for UK SMBs",
        paragraphs: [
          "Pick Hostinger if hosting price is the decision and a bolted-on builder is fine. Pick Refresh Kiwi if you want a sharper site from your existing URL without entering a hosting upsell funnel.",
          "We win at not being a builder: about two minutes to preview, one £8/month Pro tier, unlimited plain-English or voice edits, live site untouched until you switch.",
          "Still comparing? [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [Webflow](/blog/webflow-alternatives), [WordPress](/blog/wordpress-alternatives), [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative), [10Web](/blog/10web-alternative) — same straight talk, same rule.",
        ],
        callout:
          "Hostinger sells hosting with a builder attached. Refresh Kiwi sells a two-minute glow-up for the site you were already paying someone to host.",
      },
    ],
  },
  {
    slug: "webflow-alternatives",
    title: "Webflow Alternatives for UK Small Businesses — When You Are Not a Designer",
    description:
      "Webflow alternatives compared for UK small businesses — designer control vs the plumber who just needs a sharper site without learning a visual CMS.",
    excerpt:
      "Webflow is for designers who want control. Refresh Kiwi is for the plumber who does not — refresh in about two minutes, no canvas.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "webflow alternatives",
    secondaryKeywords: [
      "webflow alternative",
      "webflow for small business",
      "webflow vs simple website",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 11,
    sections: [
      {
        heading: "What are Webflow alternatives?",
        paragraphs: [
          "Webflow alternatives are other ways to get a business website without Webflow's visual CMS — Squarespace, WordPress, Framer, agencies, simpler builders, or refresh tools that skip the canvas entirely.",
          "Most alternatives still assume you want to design. Refresh Kiwi assumes you want to run your business.",
          "Paste a URL, Google listing, or brief and preview a refreshed site in about two minutes. Kiwi Pro is £8/month to host with unlimited edits — see [pay-monthly website design](/website-design-pay-monthly).",
        ],
      },
      {
        heading: "What is a Webflow alternative?",
        paragraphs: [
          "A Webflow alternative is any route that does not require learning Webflow's designer interface, class system, and CMS collections — unless you actually enjoy that work.",
          "Some alternatives trade control for simplicity. Others trade simplicity for polish. Refresh Kiwi trades the builder for speed.",
          "We are not Webflow and not trying to be. No CMS, no component library, no \"watch this 40-minute tutorial on flexbox in Webflow.\" Just a refresh of the business you already show online.",
        ],
      },
      {
        heading: "Who is Webflow actually for?",
        paragraphs: [
          "Webflow is for designers, agencies, and marketing teams who want pixel control, reusable components, and a visual CMS without writing raw code all day.",
          "It is a serious tool — and a serious time commitment if you are not already fluent in layout thinking.",
          "Refresh Kiwi is for the owner who will never say \"client-first.\" You have a site, it works, it looks wrong. Two minutes, preview, decide. That is the whole brief.",
        ],
      },
      {
        heading: "Is Webflow overkill for a local business website?",
        paragraphs: [
          "Often, yes — if all you need is a clear homepage, service sections, contact details, and proof you are real, Webflow's power is mostly shelf space you never open.",
          "Paying for designer-grade control you never use is how small businesses end up with a beautiful staging site and an embarrassed live one.",
          "Refresh Kiwi targets that gap: keep the useful facts, lose the beige hero, show a preview before anything goes live. Details on [website redesign services](/website-redesign-services).",
        ],
      },
      {
        heading: "Webflow vs something you do not have to learn",
        paragraphs: [
          "Webflow wins when the site is the product — portfolios, SaaS marketing sites, design-led brands with someone who owns the build.",
          "Something simpler wins when the site is a shop sign — plumbers, clinics, cafes, trades, anyone who needs enquiries, not awards.",
          "Refresh Kiwi edits in plain English or voice on Pro. No classes, no breakpoints panel, no credits. One £8/month tier on [website design packages](/website-design-packages).",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Webflow comparisons usually assume a URL worth redesigning — fair for a trades site that already exists. No URL? Find the business on Google and we pull the listing. Starting from zero? Talk or type what you do — no Webflow classes required.",
          "Same ~two-minute preview, same £8/month Kiwi Pro, unlimited plain-English edits. Not a visual CMS.",
          "More: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) · [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a URL before Refresh Kiwi can replace Webflow?",
        paragraphs: [
          "No. URL refresh is door one when you already have a site that makes you wince.",
          "Door two: Google listing. Door three: scratch by voice or text. Webflow wants a designer. We want your business facts.",
        ],
      },
      {
        heading: "Can I start a brochure site without learning Webflow?",
        paragraphs: [
          "Yes. Describe the business into the mic or type it — about two minutes to a preview, no breakpoints panel.",
          "That is the scratch path. Same output as URL refresh or Google lookup — pick the door you actually have.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Webflow: honest pick",
        paragraphs: [
          "Pick Webflow if you are a designer or hire one and want full control. Pick Refresh Kiwi if you want your existing site refreshed in about two minutes without opening a canvas.",
          "We win at not being a builder — speed, simplicity, preview-first, live site stays up until you switch. CJS Global LTD, Caerphilly. info@refresh.kiwi.",
          "More comparisons: [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [WordPress](/blog/wordpress-alternatives), [Hostinger](/blog/hostinger-alternatives), [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative), [10Web](/blog/10web-alternative).",
        ],
        callout:
          "Webflow is a design tool with a website attached. Refresh Kiwi is a refresh tool with your Tuesday evening attached — give it back.",
      },
    ],
  },
  {
    slug: "wordpress-alternatives",
    title: "WordPress Alternatives for UK Small Businesses — Without the Plugin Maze",
    description:
      "WordPress alternatives for owners who want off the hosting, theme, and plugin treadmill — honest comparison, not a how-to-install guide.",
    excerpt:
      "People searching WordPress alternatives want out of the maze. Refresh Kiwi is not a CMS — it is a two-minute refresh for the site you already have.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "wordpress alternatives",
    secondaryKeywords: [
      "wordpress alternative for small business",
      "leave wordpress",
      "wordpress vs refresh",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 12,
    sections: [
      {
        heading: "What are WordPress alternatives?",
        paragraphs: [
          "WordPress alternatives are other ways to run a business website without managing WordPress core, themes, plugins, hosting, updates, and the occasional white screen of death.",
          "Options include hosted builders like Squarespace, static site tools, agencies, and refresh services that skip the CMS entirely.",
          "Refresh Kiwi is not WordPress and not a CMS. We refresh from your URL, Google listing, or brief in about two minutes — no plugins to update, no theme conflicts.",
        ],
      },
      {
        heading: "Why do small businesses look for WordPress alternatives?",
        paragraphs: [
          "Because WordPress often means paying for hosting, a page builder plugin, a security plugin, backups, updates, and sometimes a developer to fix what broke on Sunday night.",
          "The site becomes a part-time job. Most owners wanted a shop sign, not a software project.",
          "Refresh Kiwi is for that fatigue: paste your URL, see a refreshed preview, keep the live site up until you switch. Kiwi Pro is £8/month with unlimited plain-English edits — [pay-monthly website design](/website-design-pay-monthly).",
        ],
      },
      {
        heading: "Is WordPress still worth it for a small business?",
        paragraphs: [
          "Yes — when you need a real CMS, custom functionality, ecommerce plugins, memberships, or a developer who lives in wp-admin. WordPress still earns its keep for bigger content operations.",
          "No — when you have five pages, no blog plans, and your biggest problem is that the homepage looks like 2014. That is overkill dressed as flexibility.",
          "We will not pretend to replace WordPress at being WordPress. We replace the \"I just need it to look current\" panic without installing another plugin.",
        ],
      },
      {
        heading: "What are the main WordPress alternatives for brochure sites?",
        paragraphs: [
          "Squarespace and Wix for polished builders. Webflow for design teams. Hostinger and GoDaddy for hosting bundles. Agencies when you want someone else to carry the bag.",
          "Refresh tools like Refresh Kiwi when the words and phone number are fine but the presentation is not.",
          "Match the tool to the job — not the forum thread that says WordPress powers 40% of the web. Your cafe does not need to power 40% of the web. See [website design packages](/website-design-packages) for our single-tier pricing.",
        ],
      },
      {
        heading: "Can I leave WordPress without losing my business details?",
        paragraphs: [
          "Yes — your phone number, services, and reviews are the asset. The WordPress install is just where they currently live.",
          "A refresh pulls from what you already show online and reshapes it — preview first, publish when ready, old site stays live until you switch.",
          "That is Refresh Kiwi's model. Not a migration guide, not a CMS export tutorial — a faster face for the business facts you already have. [Website redesign services](/website-redesign-services) walks through what changes.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Leaving WordPress often starts with pasting the old site URL — still the clearest before/after. No URL because you never finished WP? Type your business name and we pull your Google listing. Nothing online? Talk or type what you do — no plugins to install.",
          "Same preview in about two minutes, Kiwi Pro at £8/month, unlimited edits. Not a CMS, not WordPress.",
          "Guides: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a WordPress site or URL to use Refresh Kiwi?",
        paragraphs: [
          "No. We are not WordPress — you do not export a database or migrate plugins.",
          "URL if you have one, Google listing if that is where your hours live, voice or text if you are starting clean. Same preview-first model, none of the wp-admin maintenance.",
        ],
      },
      {
        heading: "Can I skip WordPress entirely and start from my Google listing?",
        paragraphs: [
          "Yes. That is door two — we fetch the listing and build a real site, not Google's thin free page and not a theme plus five plugins.",
          "About two minutes, free to try, host on Pro when ready. WordPress alternatives are not all WordPress-shaped.",
        ],
      },
      {
        heading: "Refresh Kiwi vs WordPress: honest pick",
        paragraphs: [
          "Pick WordPress if you need a CMS, plugins, or custom development. Pick Refresh Kiwi if you need a sharper site in about two minutes and edits in plain English, not php.ini.",
          "We are not WordPress. We will say it twice because search results won't: not a CMS, not a plugin ecosystem, not a theme marketplace. A refresh.",
          "Compare builders and hosts in our other guides — [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [Webflow](/blog/webflow-alternatives), [10Web](/blog/10web-alternative), [Hostinger](/blog/hostinger-alternatives), [GoDaddy Airo](/blog/godaddy-airo), [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative).",
        ],
        callout:
          "WordPress is a CMS with a maintenance schedule. Refresh Kiwi is a refresh with a preview — no plugins, no theme, no fake local office required.",
      },
    ],
  },
  {
    slug: "durable-alternative",
    title: "Refresh Kiwi vs Durable: A Durable Alternative for UK Small Businesses",
    description:
      "Durable alternative compared honestly — free tiers, AI generation, credits, and when refreshing your existing site beats building a new one from prompts.",
    excerpt:
      "Durable generates a new AI site fast. Refresh Kiwi refreshes the one you already have — no credit meter, about two minutes from a URL.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "durable alternative",
    secondaryKeywords: [
      "is durable website builder free",
      "durable ai website",
      "durable vs refresh kiwi",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 13,
    sections: [
      {
        heading: "What is a Durable alternative?",
        paragraphs: [
          "A Durable alternative is any way to get a business website without Durable's AI generation flow — other AI builders, WordPress, agencies, or refresh tools that start from your existing online presence.",
          "Durable is close to Refresh Kiwi in spirit — AI, speed, small business — but the shape differs: Durable generates a new site; we refresh the one you already have.",
          "Paste a URL, Google listing, or brief. Preview in about two minutes. No credits, no tokens, one £8/month Kiwi Pro tier — [pay-monthly website design](/website-design-pay-monthly).",
        ],
      },
      {
        heading: "What is Durable like as an AI website tool?",
        paragraphs: [
          "Durable asks a few business questions and generates a site quickly — copy, layout, sections — inside its own editor and hosting world.",
          "It is built for speed when you are starting from zero or want AI to draft the whole thing.",
          "Refresh Kiwi assumes you are not starting from zero. You have a URL, a Google listing, or a rough brief with real details. We reshape, not reinvent from a questionnaire.",
        ],
      },
      {
        heading: "Is the Durable website builder free?",
        paragraphs: [
          "Durable offers a free tier with limits — enough to generate and explore, with paid plans for custom domains, more features, and ongoing use.",
          "Free AI builders usually mean branded subdomains, usage caps, or upgrades once you want the site to look like a real business.",
          "Refresh Kiwi is free to try as a preview — your live site stays untouched. Kiwi Pro is £8/month for hosting and unlimited edits including voice and plain English. No credit counter. Compare on [website design packages](/website-design-packages).",
        ],
      },
      {
        heading: "Durable vs refresh: what is the actual difference?",
        paragraphs: [
          "Durable generates a new site in Durable's system — often with a usage or plan meter on changes. Refresh Kiwi refreshes your existing site or starts from your brief, with unlimited edits on Pro.",
          "Both are fast. The fork is \"new site in their world\" vs \"better version of what you already have online.\"",
          "If your Google listing already has the right hours and your current site has the right services, a refresh beats a blank-slate generator. [Website redesign services](/website-redesign-services) explains what we keep.",
        ],
      },
      {
        heading: "Is Durable or Refresh Kiwi better for SEO?",
        paragraphs: [
          "Neither tool guarantees rankings. SEO lives in useful pages, local relevance, and copy that sounds like your business — not the badge on the builder.",
          "Durable can produce generic AI copy fast. Refresh Kiwi pulls from your real details where possible, which helps specificity.",
          "Fair comparison: both need a human check before publish. We do not smear Durable; we note that speed without your real phone number is still speed in the wrong direction.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Durable and Refresh Kiwi both move fast — URL paste is still the sharpest compare when a site already exists. No URL? Find on Google. No listing? Talk or type what you do — same ~two minutes, no credit meter like Durable's.",
          "Kiwi Pro is £8/month, unlimited edits including voice. Preview first, live site stays up if you have one.",
          "See [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a URL to choose Refresh Kiwi over Durable?",
        paragraphs: [
          "No. URL refresh is the usual compare because both tools are fast — but Durable's questionnaire is not your only option.",
          "Google listing or scratch by voice works the same way here: real preview, no credits counting down.",
        ],
      },
      {
        heading: "Can I start from scratch without Durable's AI questionnaire?",
        paragraphs: [
          "Yes. Talk into the mic or type plain English — we transcribe and build. About two minutes.",
          "Closest AI-builder cousin, different shape: we refresh what exists or listen to what you say, without watching a credit bar.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Durable: honest pick",
        paragraphs: [
          "Pick Durable if you want a new AI-generated site from questions and you are happy inside their editor and plans. Pick Refresh Kiwi if you want your existing site refreshed in about two minutes with no credit meter.",
          "We are the closest AI-builder cousin who said no to tokens. One Pro tier, unlimited edits, live site stays up until you switch. CJS Global LTD, Caerphilly. info@refresh.kiwi.",
          "Related reads: [Lovable](/blog/lovable-alternative), [GoDaddy Airo](/blog/godaddy-airo), [Wix](/blog/wix-alternative), [Hostinger](/blog/hostinger-alternatives), [WordPress](/blog/wordpress-alternatives), [10Web](/blog/10web-alternative).",
        ],
        callout:
          "Durable builds you a new site and watches the credits. Refresh Kiwi refreshes yours — same AI era, different job, no meter.",
      },
    ],
  },
  {
    slug: "weebly-alternative",
    title: "Refresh Kiwi vs Weebly: A Weebly Alternative for UK Small Businesses",
    description:
      "Weebly alternative compared for UK small businesses — old-school drag-and-drop vs skipping the builder entirely with a two-minute refresh.",
    excerpt:
      "Weebly is old-school drag-and-drop. Refresh Kiwi skips the builder — refresh from your URL in about two minutes, £8/month Pro.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "weebly alternative",
    secondaryKeywords: [
      "weebly alternatives",
      "is weebly still good",
      "weebly vs refresh",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 14,
    sections: [
      {
        heading: "What is a Weebly alternative?",
        paragraphs: [
          "A Weebly alternative is any route to a business website that is not Weebly's drag-and-drop editor — Wix, Squarespace, WordPress, other builders, or refresh tools that skip the canvas.",
          "Most alternatives still hand you blocks to drag. Refresh Kiwi hands you a preview from your URL.",
          "Free to try, live site stays up until you switch, Kiwi Pro at £8/month with unlimited edits — [pay-monthly website design](/website-design-pay-monthly).",
        ],
      },
      {
        heading: "What are Weebly alternatives?",
        paragraphs: [
          "Common Weebly alternatives include Wix, Squarespace, GoDaddy's builders, WordPress, and AI tools like Durable or Lovable — plus refresh services for owners who already have a site.",
          "Pick based on whether you want to drag boxes or fix the site you already send people to.",
          "Refresh Kiwi is the second path: about two minutes from URL or Google listing, no drag-and-drop, no tier maze. Not a CMS, not WordPress — a refresh.",
        ],
      },
      {
        heading: "Is Weebly still worth using?",
        paragraphs: [
          "Weebly still works for simple sites — drag elements, publish, connect a domain through Squarespace (which owns Weebly now). It suits owners who learned Weebly years ago and tolerate the dated feel.",
          "The editor shows its age next to modern AI tools and polished templates elsewhere.",
          "If your Weebly site has the right info but wrong decade energy, you do not necessarily need a new builder — you need a refresh. That is us.",
        ],
      },
      {
        heading: "What is Weebly like today?",
        paragraphs: [
          "Weebly is old-school drag-and-drop — sections, widgets, a familiar block editor, and Squarespace account management behind the scenes.",
          "It is straightforward if you already know it. Less exciting if you are comparing it to 2026 AI builders that draft copy for you.",
          "Refresh Kiwi skips the nostalgia tour. Paste your Weebly URL, see a refreshed preview, decide without dragging a single text box.",
        ],
      },
      {
        heading: "Weebly vs skipping the builder entirely",
        paragraphs: [
          "Stay on Weebly if you know the editor, your site is small, and a few manual tweaks will do. Leave Weebly if every edit feels like moving furniture in a room you have outgrown.",
          "Refresh tools fit the second camp — same business facts, better presentation, preview before publish.",
          "See [website redesign services](/website-redesign-services) and [website design packages](/website-design-packages) for what Refresh Kiwi includes on Pro.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "Weebly owners usually paste the old drag-and-drop URL — still the honest compare. No Weebly site to paste? Type your business name for the Google listing. Brand new? Talk or type what you do — no blocks to drag.",
          "Same ~two-minute preview, £8/month Kiwi Pro, unlimited edits. Your current site stays live until you switch.",
          "Details: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) · [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a Weebly or website URL first?",
        paragraphs: [
          "No. Paste one if you have it — fastest way to leave the widget drawer behind.",
          "Without a URL, Google lookup or scratch by voice gets you the same preview without opening Weebly's editor.",
        ],
      },
      {
        heading: "Can I make a site from scratch without dragging Weebly boxes?",
        paragraphs: [
          "Yes. Describe the business by voice or text. We transcribe and publish a preview in about two minutes.",
          "That is door three — alongside refresh-from-URL and find-on-Google. Weebly is not invited.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Weebly: honest pick",
        paragraphs: [
          "Pick Weebly if drag-and-drop is your comfort zone and the site is tiny. Pick Refresh Kiwi if you want a modern preview in about two minutes and edits in plain English on Pro.",
          "We win at not being a builder — no blocks, no widgets drawer, no beige hero unless you earn it.",
          "More comparisons: [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [GoDaddy Airo](/blog/godaddy-airo), [Hostinger](/blog/hostinger-alternatives), [Webflow](/blog/webflow-alternatives), [WordPress](/blog/wordpress-alternatives), [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [10Web](/blog/10web-alternative).",
        ],
        callout:
          "Weebly wants you to drag boxes until bedtime. Refresh Kiwi wants your URL for two minutes — then your evening back.",
      },
    ],
  },
  {
    slug: "10web-alternative",
    title: "Refresh Kiwi vs 10Web: A 10Web Alternative for UK Small Businesses",
    description:
      "10Web website builder explained — WordPress with AI, hosting you still manage, and when a refresh beats another WP stack.",
    excerpt:
      "10Web is AI skin on WordPress. Refresh Kiwi is not WordPress — refresh your site in about two minutes, no hosting stack to babysit.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Comparisons",
    readingTime: "9 min read",
    primaryKeyword: "10web website builder",
    secondaryKeywords: [
      "10web alternative",
      "is 10web wordpress",
      "10web hosting",
    ],
    intent: "comparison",
    funnelStage: "comparison",
    priority: 15,
    sections: [
      {
        heading: "What is the 10Web website builder?",
        paragraphs: [
          "10Web is an AI-assisted WordPress platform — hosted WordPress, AI generation, page builders, and optimisation tools bundled into one subscription.",
          "It targets owners who want WordPress power with less manual setup, or agencies managing multiple WP sites.",
          "Refresh Kiwi is not WordPress and does not wrap it. Paste a URL, Google listing, or brief — refreshed preview in about two minutes, no wp-admin, no plugin stack.",
        ],
      },
      {
        heading: "Is 10Web just WordPress with AI?",
        paragraphs: [
          "Mostly, yes — 10Web runs on WordPress under the hood, with AI to generate pages, copy, and layouts, plus hosting and performance tools in the same product.",
          "You still inherit WordPress's world: themes, plugins, updates, and the occasional thing that breaks because two plugins disagreed.",
          "Refresh Kiwi skips that inheritance entirely. Not a CMS, not a plugin layer — a refresh with one £8/month Pro tier and unlimited plain-English edits.",
        ],
      },
      {
        heading: "Do I still manage hosting with 10Web?",
        paragraphs: [
          "10Web includes managed hosting in its plans — you are not shopping for a separate host, but you are still inside a hosting subscription with renewal pricing and plan tiers.",
          "Managed does not mean absent. You still have a dashboard, a WordPress install, and decisions about plans and add-ons.",
          "Kiwi Pro includes hosting for £8/month when you publish through Refresh Kiwi. Your current site stays live until you switch. See [pay-monthly website design](/website-design-pay-monthly).",
        ],
      },
      {
        heading: "Who is 10Web actually for?",
        paragraphs: [
          "10Web suits WordPress users who want AI speed, agencies running multiple client sites, or owners who already chose WP and want generation help.",
          "It is not a escape hatch from WordPress — it is WordPress with a faster front door.",
          "Refresh Kiwi is for owners who searched \"WordPress alternatives\" and meant it. [WordPress alternatives](/blog/wordpress-alternatives) explains that fork in plain English.",
        ],
      },
      {
        heading: "10Web vs a refresh tool: different exits from the same problem",
        paragraphs: [
          "10Web says: stay on WordPress, let AI do the heavy lifting. Refresh Kiwi says: you might not need WordPress at all for a five-page brochure site.",
          "Same symptom — old site, no time — different prescription.",
          "Preview first, publish when ready. [Website redesign services](/website-redesign-services) and [website design packages](/website-design-packages) cover what we touch.",
        ],
      },
      {
        heading: "No URL? Two other ways in",
        paragraphs: [
          "10Web assumes WordPress; Refresh Kiwi usually starts with a URL when something live needs saving. No URL? Pull your Google listing by business name. Nothing to migrate? Talk or type what you do — no wp-admin, no AI credit stack.",
          "Same preview in about two minutes, Kiwi Pro at £8/month, unlimited plain-English or voice edits.",
          "Read [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile) and [voice website builder](/blog/voice-website-builder).",
        ],
      },
      {
        heading: "Do I need a WordPress URL before Refresh Kiwi beats 10Web?",
        paragraphs: [
          "No. We are not WordPress — no install, no hosting stack to manage.",
          "URL if you have a site worth refreshing, Google if that is where your business lives online, voice or text if you are starting from zero.",
        ],
      },
      {
        heading: "Can I start without a URL or a WordPress install?",
        paragraphs: [
          "Yes. Scratch by voice or typing — we transcribe and build. About two minutes to preview.",
          "10Web wraps WordPress in AI. Refresh Kiwi gives you three doors that none of them require a plugin folder.",
        ],
      },
      {
        heading: "Refresh Kiwi vs 10Web: honest pick",
        paragraphs: [
          "Pick 10Web if you want WordPress with AI and managed hosting in one bill. Pick Refresh Kiwi if you want a refreshed site in about two minutes without entering the WP ecosystem.",
          "We are not 10Web and not WordPress. We win at not being a builder — speed, one tier, unlimited edits, live site stays up until you switch. CJS Global LTD, Caerphilly. info@refresh.kiwi.",
          "Rest of the set: [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [GoDaddy Airo](/blog/godaddy-airo), [Hostinger](/blog/hostinger-alternatives), [Webflow](/blog/webflow-alternatives), [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [Weebly](/blog/weebly-alternative).",
        ],
        callout:
          "10Web is WordPress wearing an AI jacket. Refresh Kiwi is the refresh for owners who never wanted the jacket or the stack underneath it.",
      },
    ],
  },
  {
    slug: "create-website-from-google-business-profile",
    title: "Create a Website from Your Google Business Profile",
    description:
      "How to turn a Google Business Profile into a real website — why Google's free page is not enough, and when Refresh Kiwi beats starting from scratch.",
    excerpt:
      "You already have a Google listing and no site worth sending people to. Type the name — we build a real site, not Google's stub.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Getting Started",
    readingTime: "9 min read",
    primaryKeyword: "create website from google business profile",
    secondaryKeywords: [
      "google business profile website",
      "google business profile website builder",
      "website from google listing",
    ],
    intent: "comparison",
    funnelStage: "conversion",
    priority: 16,
    sections: [
      {
        heading: "Can I create a website from my Google Business Profile?",
        paragraphs: [
          "Yes. If your hours, phone number, reviews, and photos already live on Google, that is enough to start — you do not need a separate website URL first.",
          "Refresh Kiwi lets you type your business name, we fetch the listing, and turn it into a full site preview in about two minutes.",
          "That is door two on Refresh Kiwi — alongside paste-a-URL refresh and start-from-scratch by voice or text. Same Kiwi Pro at £8/month to host, unlimited edits, preview free to try.",
        ],
      },
      {
        heading: "Is Google's own GBP website enough?",
        paragraphs: [
          "Google's free Business Profile website is a thin single page — fine as a placeholder, not fine as the shop sign you send customers to with confidence.",
          "It looks like every other Google stub, hides what makes you different, and gives you almost no room to explain services properly.",
          "Refresh Kiwi builds a real site from the same listing data — clearer sections, stronger calls to action, a preview you can inspect before anything goes live. Not a CMS, not WordPress — a proper face for the business Google already knows.",
        ],
      },
      {
        heading: "Can I make a real site from my Google listing?",
        paragraphs: [
          "Yes — that is exactly what the Google path is for. We pull name, category, hours, contact details, reviews, and photos where available, then reshape them into a site that looks like yours, not Google's template.",
          "About two minutes to preview. Your current site, if you have one, stays live until you choose to switch.",
          "See [website redesign services](/website-redesign-services) for what changes on the page, and [website design packages](/website-design-packages) for Kiwi Pro pricing — one tier, £8/month, no maze.",
        ],
      },
      {
        heading: "Do I need a URL first?",
        paragraphs: [
          "No. The Google listing path exists precisely for owners who have Google but not a site they are proud of — or no site at all.",
          "If you do have a URL, paste it — that is door one and often the fastest compare. If you do not, the listing is enough.",
          "Door three still exists: talk or type what you do with no Google presence yet. Read our [voice website builder](/blog/voice-website-builder) guide for that path.",
        ],
      },
      {
        heading: "How does Refresh Kiwi build from a Google listing?",
        paragraphs: [
          "You type the business name, we match your Google Business Profile, and generate a separate preview — nothing changes on Google or on any live site until you publish.",
          "Same ~two-minute flow as URL refresh. Same unlimited plain-English or voice edits on Kiwi Pro. No drag-and-drop, no credits, no tokens.",
          "Free to try the preview. CJS Global LTD, Caerphilly. info@refresh.kiwi. Remote, no fake local offices.",
        ],
      },
      {
        heading: "What about refresh and start-from-scratch?",
        paragraphs: [
          "Google listing is one door, not the whole house. Paste a URL if you already have a site worth saving — refresh beats rebuild. No listing and no site? Talk into the mic or type what you do — scratch path, same output speed.",
          "All three land on the same preview-first model and the same £8/month Pro tier.",
          "Comparing builders instead? The full set — [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [GoDaddy Airo](/blog/godaddy-airo), [Hostinger](/blog/hostinger-alternatives), [WordPress](/blog/wordpress-alternatives), and the rest — lives in our comparison guides. Different keywords, same honest voice.",
        ],
      },
      {
        heading: "Refresh Kiwi vs Google's free GBP site: which should you use?",
        paragraphs: [
          "Use Google's stub if you need a placeholder for five minutes. Use Refresh Kiwi if you want a site that looks like a business, not a grey Google card.",
          "Type the name, preview in about two minutes, host on Pro when ready. [Pay-monthly website design](/website-design-pay-monthly) spells out what £8/month includes.",
          "You already did the hard part — the listing, the reviews, the real phone number. We just stop making customers squint at a generic Google page.",
        ],
        callout:
          "Google gave you a listing. Refresh Kiwi turns it into a site you would actually hand to a customer — not the free stub you hope nobody clicks.",
      },
    ],
  },
  {
    slug: "voice-website-builder",
    title: "Voice Website Builder: Talk or Type Your Way to a Business Site",
    description:
      "A voice website builder for UK small businesses — describe what you do, get a site in about two minutes, no drag-and-drop and no URL required.",
    excerpt:
      "No URL, no Google listing, no builder. Talk into the mic or type what you do — Refresh Kiwi turns it into a site in about two minutes.",
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
    author: blogAuthor.name,
    category: "Getting Started",
    readingTime: "9 min read",
    primaryKeyword: "voice website builder",
    secondaryKeywords: [
      "can I talk to create a website",
      "create a website by describing my business",
      "start a website from scratch without a URL",
    ],
    intent: "comparison",
    funnelStage: "conversion",
    priority: 17,
    sections: [
      {
        heading: "What is a voice website builder?",
        paragraphs: [
          "A voice website builder lets you describe your business aloud — or in plain text — and turns that into a website without opening a drag-and-drop editor.",
          "Refresh Kiwi transcribes what you say, structures it into pages, and shows you a preview in about two minutes.",
          "That is door three: no URL required, no Google listing required. Same Kiwi Pro at £8/month to host with unlimited voice and plain-English edits. Not a CMS. Not WordPress.",
        ],
      },
      {
        heading: "Can I talk to create a website?",
        paragraphs: [
          "Yes. Talk into the microphone on Refresh Kiwi — we transcribe, you review the preview, your current site stays live if you already have one.",
          "Free to try. No credits, no tokens, no tier maze.",
          "If you would rather type, that works too. Voice is for owners standing in a van, not owners who enjoy typing.",
        ],
      },
      {
        heading: "Can I create a website by describing my business?",
        paragraphs: [
          "Yes. Tell us what you do, where you work, how to contact you — plain English, no web design vocabulary required.",
          "About two minutes to a preview. Unlimited edits on Pro, including \"move the phone number up\" by voice or text.",
          "See [website redesign services](/website-redesign-services) for what the output includes, and [pay-monthly website design](/website-design-pay-monthly) for Kiwi Pro at £8/month.",
        ],
      },
      {
        heading: "Do I need a URL or Google listing first?",
        paragraphs: [
          "No. Scratch by voice or text is built for owners with nothing to paste — new businesses, side hustles, tradespeople who have never got round to a site.",
          "If you do have a URL, paste it — door one, refresh path. If you have a Google listing but no site, type the business name — door two. Pick the door you actually have.",
          "Full walkthrough for door two: [create a website from your Google Business Profile](/blog/create-website-from-google-business-profile).",
        ],
      },
      {
        heading: "How is Refresh Kiwi different from a drag-and-drop builder?",
        paragraphs: [
          "Builders hand you a canvas — templates, blocks, credits on some AI tools, tiers on others. Refresh Kiwi hands you a preview.",
          "You describe the business; we structure it. You edit in plain English or voice on Pro — no widget drawer, no beige-hero archaeology unless you ask for it.",
          "We win at not being a builder. Speed and simplicity, not another Wix-shaped Tuesday evening.",
        ],
      },
      {
        heading: "What are the three paths on Refresh Kiwi?",
        paragraphs: [
          "One: paste a URL and refresh what you have. Two: type your business name and build from your Google listing. Three: talk or type from scratch — this page.",
          "All three hit the same ~two-minute preview, same free-to-try rule, same £8/month Pro with unlimited edits. Current site stays live until you switch.",
          "CJS Global LTD, Caerphilly. info@refresh.kiwi. Remote, no fake offices. No Shopify claims, no cart fiction.",
        ],
      },
      {
        heading: "Voice website builder vs competitor AI tools",
        paragraphs: [
          "Plenty of AI builders let you prompt a new site — often on credits, often inside their hosting world. Refresh Kiwi's scratch path is describe-and-preview, not generate-and-meter.",
          "Fair compare: [Lovable](/blog/lovable-alternative), [Durable](/blog/durable-alternative), [GoDaddy Airo](/blog/godaddy-airo) — we cover those honestly. Different job if you already have a URL worth saving.",
          "Full comparison set: [Wix](/blog/wix-alternative), [Squarespace](/blog/squarespace-alternatives), [Hostinger](/blog/hostinger-alternatives), [Webflow](/blog/webflow-alternatives), [WordPress](/blog/wordpress-alternatives), [Weebly](/blog/weebly-alternative), [10Web](/blog/10web-alternative). [Website design packages](/website-design-packages) for pricing.",
        ],
        callout:
          "No URL, no listing, no builder — just tell us what you do out loud and see a site in about two minutes. That is door three.",
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
