export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPageContent = {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const company = {
  name: "CJS Global LTD",
  tradingName: "Refresh Kiwi",
  number: "10664657",
  registeredOffice: "8 Henfron, Energlyn, Caerphilly, CF83 2NU, United Kingdom",
  email: "info@refresh.kiwi",
  governingLaw: "England and Wales",
};

const lastUpdated = "14 June 2026";

export const legalPages = {
  privacy: {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description:
      "How Refresh Kiwi collects, uses, shares, and protects personal information.",
    lastUpdated,
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${company.tradingName} is operated by ${company.name}, a company registered in England and Wales under company number ${company.number}. Our registered office is ${company.registeredOffice}.`,
          `We are not VAT registered. You can contact us about this policy or your personal information at ${company.email}.`,
        ],
      },
      {
        heading: "What this policy covers",
        paragraphs: [
          "This policy explains how we handle personal information when you visit our website, create an account, ask us to refresh a website, use generated previews, subscribe to Pro, contact support, or connect a custom domain.",
          "Our service is mainly intended for businesses, but individuals may also use it. If you use Refresh Kiwi on behalf of a business, you should make sure you are authorised to share any relevant information with us.",
        ],
      },
      {
        heading: "Information we collect",
        bullets: [
          "Account details, such as your name, email address, password hash, plan, subscription status, and session information.",
          "Website information you provide, including source URLs, prompts, uploaded images, generated website files, preview slugs, custom domains, and DNS connection status.",
          "Usage and technical information, such as IP address, browser and device information, approximate location derived from technical data, log data, error information, and interactions with our website.",
          "Payment and billing information processed by Stripe, such as customer identifiers, subscription identifiers, checkout status, and payment events. We do not store full card numbers.",
          "Communications you send to us, including support requests, feedback, and legal or privacy enquiries.",
          "Analytics information collected through Google Analytics, subject to your browser settings and any consent controls we make available.",
        ],
      },
      {
        heading: "How we use information",
        bullets: [
          "To provide, operate, secure, and improve Refresh Kiwi.",
          "To create, host, edit, preview, publish, and support generated websites.",
          "To create and manage accounts, sessions, subscriptions, billing, cancellations, and service limits.",
          "To process AI-assisted website refreshes, edits, page generation, image localisation, and image remixing where enabled.",
          "To connect and verify custom domains through hosting providers.",
          "To prevent abuse, enforce our terms, troubleshoot errors, and maintain service security.",
          "To analyse aggregate usage and understand how people use the service.",
          "To respond to enquiries and send service-related messages.",
        ],
      },
      {
        heading: "AI processing and model training",
        paragraphs: [
          "We use AI tools to provide the service, including to generate, edit, and remix website content. We do not use your submitted website URLs, prompts, uploaded images, or generated website content to train Refresh Kiwi models.",
          "Some third-party AI providers may process inputs and outputs on our behalf to provide the service. Their handling of that data is governed by our agreements with them and their applicable service terms.",
        ],
      },
      {
        heading: "Our lawful bases",
        bullets: [
          "Contract: to provide the service you ask for, including accounts, previews, publishing, subscriptions, and support.",
          "Legitimate interests: to secure the service, prevent misuse, improve reliability, analyse usage, and develop business operations.",
          "Legal obligation: to keep records required for tax, accounting, compliance, dispute handling, or law enforcement.",
          "Consent: where required for optional cookies, analytics, marketing communications, or similar technologies.",
        ],
      },
      {
        heading: "Third-party processors",
        paragraphs: [
          "We use trusted third-party providers to run Refresh Kiwi. These may include Cursor / Anysphere for AI agent generation, Stripe for payments, Render for hosting, database, and custom domain infrastructure, GitHub for generated site repository storage, OpenAI for image remixing where enabled, and Google Analytics for analytics.",
          "These providers may process personal information in the United Kingdom, the European Economic Area, the United States, or other countries. Where required, we rely on appropriate safeguards such as contractual protections or approved transfer mechanisms.",
        ],
      },
      {
        heading: "Generated websites and public content",
        paragraphs: [
          "Generated previews may be accessible to anyone with the preview link unless access controls are added. Published websites and connected custom domains are public by nature.",
          "You should not submit private, confidential, or sensitive personal information in prompts, uploaded images, or website content unless it is necessary and you have the right to do so.",
        ],
      },
      {
        heading: "How long we keep information",
        paragraphs: [
          "We keep account, website, subscription, and support information while your account is active or while needed to provide the service. If you ask us to delete your account or data, we will delete or anonymise it where reasonably possible, subject to legal, security, backup, fraud-prevention, dispute, and accounting retention requirements.",
          "Unclaimed or free generated previews may expire or be removed after 7 days. Backups and logs may remain for a limited period before deletion in the ordinary course of business.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          `Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of your personal information. You may also have the right to complain to a data protection authority. To exercise your rights, contact ${company.email}.`,
          "If you are in the UK, you can also contact the Information Commissioner's Office. We would appreciate the chance to resolve your concern first.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "We use reasonable technical and organisational measures to protect personal information, including hashed passwords, hashed session tokens, access controls, and reputable infrastructure providers. No online service can be guaranteed to be completely secure.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We may update this policy from time to time. If changes are significant, we will take reasonable steps to tell users, such as updating the date above or providing an in-product notice.",
        ],
      },
    ],
  },
  terms: {
    slug: "terms-of-service",
    title: "Terms of Service",
    description:
      "The terms that apply when you use Refresh Kiwi and its generated website services.",
    lastUpdated,
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${company.tradingName} is operated by ${company.name}, registered in England and Wales under company number ${company.number}. Our registered office is ${company.registeredOffice}. You can contact us at ${company.email}.`,
        ],
      },
      {
        heading: "Using Refresh Kiwi",
        paragraphs: [
          "These terms apply when you visit or use Refresh Kiwi, create an account, generate a website preview, request edits, subscribe to Pro, publish a website, or connect a custom domain.",
          "You must be at least 18 years old to use Refresh Kiwi. If you use the service for a business or organisation, you confirm that you have authority to accept these terms on its behalf.",
          "Refresh Kiwi is mainly intended for business use, but consumers may also use it. Nothing in these terms limits any rights that cannot legally be limited.",
        ],
      },
      {
        heading: "What the service does",
        paragraphs: [
          "Refresh Kiwi lets you submit an existing website URL and receive an AI-assisted refreshed version of that website. Depending on your plan and account status, you may be able to claim the site, request edits, generate additional pages, replace or remix images, publish the site, and connect a custom domain.",
          "Generated websites are provided as static website files and may be hosted by us while your account and plan allow it.",
        ],
      },
      {
        heading: "Accounts and security",
        bullets: [
          "You must provide accurate account information and keep it up to date.",
          "You are responsible for keeping your login details secure.",
          "You must tell us promptly if you suspect unauthorised access to your account.",
          "We may suspend or restrict accounts where we reasonably believe there has been misuse, security risk, non-payment, or breach of these terms.",
        ],
      },
      {
        heading: "AI-generated output",
        paragraphs: [
          "Refresh Kiwi uses AI and automation. Output may contain errors, omissions, inaccurate claims, broken links, accessibility issues, inappropriate wording, intellectual property issues, or content that does not suit your business.",
          "You are responsible for reviewing and approving generated or edited content before relying on it, publishing it, sharing it, or using it with customers. You should check contact details, prices, opening hours, legal notices, claims, images, and any regulated or sensitive content.",
          "We do not guarantee that generated output will be unique, error-free, compliant with laws that apply to your business, or suitable for a particular purpose.",
        ],
      },
      {
        heading: "Your content and permissions",
        paragraphs: [
          "You keep ownership of the content, prompts, images, domain information, and other materials you provide, subject to any rights held by others.",
          "You grant us a limited worldwide licence to use, host, copy, process, modify, display, transmit, and store your submitted content and generated website content only as needed to provide, maintain, secure, support, and improve the service you requested.",
          "You confirm that you have the rights and permissions needed to submit website URLs, text, images, branding, domain names, prompts, and other content to Refresh Kiwi.",
        ],
      },
      {
        heading: "Plans, subscriptions, and payment",
        paragraphs: [
          "Paid plans are billed through Stripe. Prices, plan limits, and features are shown in the product or checkout flow before purchase. Refresh Kiwi is not VAT registered.",
          "Pro subscriptions are billed monthly unless stated otherwise. You can cancel at any time, and cancellation normally takes effect at the end of the current billing period.",
          "If payment fails, we may suspend or reduce access to paid features, including publishing, custom domains, additional websites, or additional edits.",
        ],
      },
      {
        heading: "Previews, publishing, and domains",
        bullets: [
          "Unclaimed or free generated previews may expire or be removed after 7 days.",
          "Publishing may require an active paid plan.",
          "You are responsible for your own domain name, registrar account, DNS settings, renewal fees, and the accuracy of any DNS records you configure.",
          "We may help connect your domain through our hosting provider, but we do not register, purchase, own, or guarantee availability of your domain.",
          "Domain changes can take time to propagate and may depend on third-party registrars, DNS providers, and hosting services.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You must follow our Acceptable Use Policy. You must not use Refresh Kiwi for unlawful, harmful, misleading, infringing, abusive, or security-compromising activity.",
        ],
      },
      {
        heading: "Third-party services",
        paragraphs: [
          "Refresh Kiwi depends on third-party services including AI providers, hosting providers, payment providers, analytics providers, and code or repository hosting providers. We are not responsible for outages, changes, or failures caused by third parties outside our reasonable control.",
        ],
      },
      {
        heading: "Availability and changes",
        paragraphs: [
          "We aim to provide a useful and reliable service, but we do not guarantee uninterrupted availability. We may update, change, suspend, or discontinue features where reasonably necessary, including for security, legal, operational, or product reasons.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "Refresh Kiwi is provided on an as-is and as-available basis. To the fullest extent permitted by law, we exclude implied warranties and are not liable for indirect, consequential, special, or business losses, including loss of profit, revenue, goodwill, data, or business opportunity.",
          "To the fullest extent permitted by law, our total liability arising out of or in connection with the service is limited to the amount you paid to us for the service in the 12 months before the event giving rise to the claim.",
          "Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, fraud, fraudulent misrepresentation, or any liability that cannot legally be limited or excluded.",
        ],
      },
      {
        heading: "Ending use",
        paragraphs: [
          "You may stop using Refresh Kiwi at any time. You can request account deletion by contacting us. We may suspend or terminate access if you breach these terms, fail to pay, create risk for the service, or use the service unlawfully.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          `These terms are governed by the laws of ${company.governingLaw}. The courts of ${company.governingLaw} will have jurisdiction, except where consumer protection laws give you mandatory rights to bring claims elsewhere.`,
        ],
      },
    ],
  },
  cookies: {
    slug: "cookie-policy",
    title: "Cookie Policy",
    description:
      "How Refresh Kiwi uses cookies and similar technologies, including analytics.",
    lastUpdated,
    sections: [
      {
        heading: "What cookies are",
        paragraphs: [
          "Cookies are small text files stored on your device by websites. Similar technologies, such as local storage, pixels, and analytics identifiers, can also help websites remember information or understand usage.",
        ],
      },
      {
        heading: "How we use cookies",
        bullets: [
          "Essential cookies to keep you signed in, protect sessions, remember security-related information, and operate the website.",
          "Functional storage to support product features, such as remembering an active refresh job in your browser.",
          "Payment-related cookies or redirects used by Stripe when you subscribe, manage billing, or complete checkout.",
          "Analytics cookies and similar technologies from Google Analytics to understand how visitors use Refresh Kiwi and improve the service.",
        ],
      },
      {
        heading: "Google Analytics",
        paragraphs: [
          "We use Google Analytics to collect information such as pages visited, approximate location, device and browser information, referrers, and interactions with the site. Google may set cookies or use similar identifiers to provide analytics reports.",
          "Google's handling of analytics data is governed by Google's own terms and policies. You can learn more at https://policies.google.com/technologies/partner-sites.",
        ],
      },
      {
        heading: "Managing cookies",
        paragraphs: [
          "You can control cookies through your browser settings. You may also be able to use browser extensions or device settings to limit analytics tracking. Blocking essential cookies may stop parts of Refresh Kiwi from working, including account login and checkout.",
          "Where legally required, we will provide consent controls for optional cookies or analytics technologies.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "We may update this policy if our cookie usage changes, including if we add or remove analytics, support, payment, or product tools.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions about cookies can be sent to ${company.email}.`],
      },
    ],
  },
  refunds: {
    slug: "refund-policy",
    title: "Refund Policy",
    description:
      "How cancellations and refund requests work for Refresh Kiwi subscriptions.",
    lastUpdated,
    sections: [
      {
        heading: "Subscriptions",
        paragraphs: [
          "Refresh Kiwi Pro is a monthly subscription billed through Stripe unless stated otherwise at checkout. You can cancel at any time through the billing portal or by contacting us at info@refresh.kiwi.",
          "Cancelling normally stops future renewals. You will usually keep access to paid features until the end of the billing period you have already paid for.",
        ],
      },
      {
        heading: "General refund position",
        paragraphs: [
          "Except where required by law, subscription payments are generally non-refundable once a billing period has started. This is because paid features may include immediate access to hosted publishing, edits, custom-domain setup, generated files, and third-party processing costs.",
          "This does not affect any mandatory consumer rights that apply to you.",
        ],
      },
      {
        heading: "When we may issue a refund",
        bullets: [
          "If you were charged after you had already cancelled and the charge was caused by our error.",
          "If there was a duplicate charge or clear billing mistake.",
          "If we are legally required to provide a refund.",
          "If we choose, at our discretion, to make an exception based on the circumstances.",
        ],
      },
      {
        heading: "Service dissatisfaction",
        paragraphs: [
          "AI-generated output can vary and may require review or edits. Dissatisfaction with generated output does not automatically entitle you to a refund, but we want the product to be useful. Contact us and we will consider whether support, edits, account credit, or another practical fix is appropriate.",
        ],
      },
      {
        heading: "How to request a refund",
        paragraphs: [
          "Email info@refresh.kiwi with the email address on your account, the date and amount of the charge, and a short explanation of the issue. We may need to verify your account or billing details through Stripe before responding.",
        ],
      },
    ],
  },
  acceptableUse: {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    description:
      "Rules for using Refresh Kiwi safely, lawfully, and responsibly.",
    lastUpdated,
    sections: [
      {
        heading: "Purpose",
        paragraphs: [
          "This Acceptable Use Policy explains what you must not do when using Refresh Kiwi. It applies to website URLs, prompts, uploaded images, generated websites, custom domains, published content, account activity, and support communications.",
        ],
      },
      {
        heading: "You must not use Refresh Kiwi to",
        bullets: [
          "Break the law or encourage unlawful activity.",
          "Create, host, publish, or promote fraudulent, deceptive, phishing, scam, impersonation, or misleading content.",
          "Infringe intellectual property, privacy, publicity, database, confidentiality, or other rights.",
          "Upload or generate malware, malicious scripts, credential-harvesting pages, spam, or content designed to compromise systems.",
          "Harass, abuse, threaten, exploit, or discriminate against people or groups.",
          "Create or publish sexually explicit, exploitative, hateful, extremist, or violent content.",
          "Submit sensitive personal information unless you have a lawful basis and it is necessary for your use of the service.",
          "Misrepresent a business, qualification, licence, review, endorsement, price, availability, or legal claim.",
          "Overload, scrape, reverse engineer, interfere with, or attempt to bypass the security or rate limits of Refresh Kiwi or its providers.",
          "Use generated sites or connected domains to send spam or run unsolicited marketing in breach of applicable laws.",
        ],
      },
      {
        heading: "Your responsibilities",
        bullets: [
          "Review generated output before publishing or relying on it.",
          "Make sure you have rights to use submitted URLs, images, logos, brand assets, copy, and domain names.",
          "Check that your published website includes any legal notices, policies, licence details, consumer information, or regulatory disclosures your business needs.",
          "Keep account credentials secure and do not share access in a way that creates security risk.",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "If we reasonably believe this policy has been breached, we may remove content, disable previews, disconnect domains, suspend or terminate accounts, limit access, preserve evidence, or report activity to relevant providers or authorities where appropriate.",
          "We may also take action to protect Refresh Kiwi, our users, third-party providers, and the public from security, legal, operational, or reputational risk.",
        ],
      },
      {
        heading: "Reporting abuse",
        paragraphs: [
          `To report misuse of Refresh Kiwi, contact ${company.email} with the relevant URL, account information if known, and a short explanation of the concern.`,
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export const legalPageList = [
  legalPages.privacy,
  legalPages.terms,
  legalPages.cookies,
  legalPages.refunds,
  legalPages.acceptableUse,
];
