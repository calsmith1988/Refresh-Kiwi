export type PageBand = "1-5" | "6-10" | "11+";

export type CalculatorAddOnKey =
  | "ecommerce"
  | "booking"
  | "copywriting"
  | "photos";

export type CalculatorInputs = {
  pages: PageBand;
  ecommerce: boolean;
  booking: boolean;
  copywriting: boolean;
  photos: boolean;
};

export type CostRange = {
  low: number;
  high: number;
};

export type CalculatorBreakdownLine = {
  label: string;
  range: CostRange;
};

export type CalculatorResult = {
  lines: CalculatorBreakdownLine[];
  total: CostRange;
};

const PAGE_BANDS: Record<PageBand, CostRange> = {
  "1-5": { low: 1200, high: 3000 },
  "6-10": { low: 2500, high: 5000 },
  "11+": { low: 4000, high: 8000 },
};

const ADD_ON_BANDS: Record<
  CalculatorAddOnKey,
  { label: string; range: CostRange }
> = {
  ecommerce: {
    label: "Ecommerce (shop & checkout)",
    range: { low: 2500, high: 8000 },
  },
  booking: {
    label: "Online booking",
    range: { low: 500, high: 2000 },
  },
  copywriting: {
    label: "Professional copywriting",
    range: { low: 300, high: 1500 },
  },
  photos: {
    label: "Professional photography",
    range: { low: 200, high: 800 },
  },
};

export const PAGE_BAND_OPTIONS: { value: PageBand; label: string }[] = [
  { value: "1-5", label: "1–5 pages" },
  { value: "6-10", label: "6–10 pages" },
  { value: "11+", label: "11+ pages" },
];

export const ADD_ON_OPTIONS: {
  key: CalculatorAddOnKey;
  label: string;
  description: string;
}[] = [
  {
    key: "ecommerce",
    label: "Ecommerce",
    description: "Product pages, cart, and checkout",
  },
  {
    key: "booking",
    label: "Online booking",
    description: "Appointments, calendars, or reservations",
  },
  {
    key: "copywriting",
    label: "Copywriting",
    description: "Someone writes the words for you",
  },
  {
    key: "photos",
    label: "Professional photos",
    description: "A photographer, not your phone",
  },
];

export function pageBandLabel(pages: PageBand): string {
  return PAGE_BAND_OPTIONS.find((option) => option.value === pages)?.label ?? pages;
}

export function calculateWebsiteCost(inputs: CalculatorInputs): CalculatorResult {
  const lines: CalculatorBreakdownLine[] = [
    {
      label: `${pageBandLabel(inputs.pages)} (base build)`,
      range: PAGE_BANDS[inputs.pages],
    },
  ];

  let low = PAGE_BANDS[inputs.pages].low;
  let high = PAGE_BANDS[inputs.pages].high;

  for (const option of ADD_ON_OPTIONS) {
    if (!inputs[option.key]) {
      continue;
    }

    const addOn = ADD_ON_BANDS[option.key];
    lines.push({
      label: addOn.label,
      range: addOn.range,
    });
    low += addOn.range.low;
    high += addOn.range.high;
  }

  return {
    lines,
    total: { low, high },
  };
}

export function formatGbpRange(range: CostRange): string {
  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

  return `${formatter.format(range.low)}–${formatter.format(range.high)}`;
}

export const calculatorFaqs = [
  {
    question: "How much does a website cost in the UK?",
    answer:
      "For a typical small-business site in 2026, UK agencies and freelancers often quote roughly £1,200–£3,000 for a simple 1–5 page build, £2,500–£5,000 for 6–10 pages, and £4,000–£8,000 for larger sites — before extras like ecommerce, booking, copy, or photography. Use the calculator above for your mix.",
  },
  {
    question: "Is this calculator a quote?",
    answer:
      "No. The ranges are typical 2026 UK market figures from published guides and agency rate cards — a ballpark, not a price from Refresh Kiwi or any specific agency. Your actual quote depends on scope, design, integrations, and who you hire.",
  },
  {
    question: "Why is Refresh Kiwi £8/month?",
    answer:
      "Refresh Kiwi is not a custom agency build. You start from your URL, Google listing, or a short description of the business — typed or spoken — and get a fresh site in about two minutes. Kiwi Pro is £8/month for hosting, unlimited plain-English or voice edits, extra pages, and a custom domain. It is not ecommerce-first and not a drag-and-drop builder.",
  },
  {
    question: "Will refreshing my URL change my live website?",
    answer:
      "No. Pasting your current web address makes a separate preview. Your existing site stays exactly as it is until you decide to switch.",
  },
  {
    question: "What if I need a shop or complex ecommerce?",
    answer:
      "Refresh Kiwi is built for local service businesses — plumbers, salons, cafés, clinics, builders. It is not an ecommerce-first platform. If you need a full online shop, the calculator’s ecommerce band reflects what agencies typically charge; Refresh Kiwi may not be the right fit.",
  },
] as const;

export const KIWI_PRO_MONTHLY_GBP = 8;

export const calculatorDisclaimer =
  "Typical 2026 UK ranges from published guides — not a quote and not what Refresh Kiwi charges for a custom agency build.";
