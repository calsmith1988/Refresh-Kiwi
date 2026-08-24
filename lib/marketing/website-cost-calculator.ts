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
    label: "Ecommerce",
    range: { low: 2500, high: 8000 },
  },
  booking: {
    label: "Booking",
    range: { low: 500, high: 2000 },
  },
  copywriting: {
    label: "Copy",
    range: { low: 300, high: 1500 },
  },
  photos: {
    label: "Photoshoot",
    range: { low: 200, high: 800 },
  },
};

export const PAGE_BAND_OPTIONS: { value: PageBand; label: string }[] = [
  { value: "1-5", label: "1–5" },
  { value: "6-10", label: "6–10" },
  { value: "11+", label: "11+" },
];

export const ADD_ON_OPTIONS: {
  key: CalculatorAddOnKey;
  label: string;
  description: string;
}[] = [
  {
    key: "ecommerce",
    label: "Ecommerce",
    description:
      "Shown so the typical UK range is honest — we are not ecommerce-first.",
  },
  {
    key: "booking",
    label: "Booking",
    description: "Appointments, calendars, or reservations.",
  },
  {
    key: "copywriting",
    label: "Copywriting",
    description: "Someone writes the words for you.",
  },
  {
    key: "photos",
    label: "Photoshoot",
    description: "A photographer, not your phone.",
  },
];

export const PAGE_BAND_REFERENCE = PAGE_BAND_OPTIONS.map((option) => ({
  label: option.label,
  range: PAGE_BANDS[option.value],
}));

export const ADD_ON_REFERENCE = ADD_ON_OPTIONS.map((option) => ({
  label: ADD_ON_BANDS[option.key].label,
  range: ADD_ON_BANDS[option.key].range,
}));

export const ONGOING_DIY_RANGE: CostRange = { low: 9, high: 29 };
export const ONGOING_AGENCY_CARE_RANGE: CostRange = { low: 40, high: 200 };

export const calculatorPdfTitle =
  "What a UK website usually costs (and what £8 a month covers)";

export function pageBandLabel(pages: PageBand): string {
  const label =
    PAGE_BAND_OPTIONS.find((option) => option.value === pages)?.label ?? pages;

  return `${label} pages`;
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

export function formatGbpAddOn(range: CostRange): string {
  return `+${formatGbpRange(range)}`;
}

export const calculatorFaqs = [
  {
    question: "Is this a quote?",
    answer: "No. Typical UK 2026 ranges from published guides.",
  },
  {
    question: "Why so wide?",
    answer: "Extras move the band. A five-page brochure is not a five-page shop.",
  },
  {
    question: "What does Refresh Kiwi cost?",
    answer:
      "£8/month UK. US$11 / CA$15 / AU$17. Free to preview. One plan.",
  },
  {
    question: "Does my live site change?",
    answer:
      "No. Refreshing a URL does not change the site you already have.",
  },
  {
    question: "Can this replace ecommerce?",
    answer:
      "Not as a shop-first product. The add-on line is there so the range is honest.",
  },
  {
    question: "Do I need a URL?",
    answer: "No. URL, Google listing, or describe what you do.",
  },
] as const;

export const KIWI_PRO_MONTHLY_GBP = 8;

export const calculatorDisclaimer =
  "These are typical 2026 ranges from published UK guides. They are not a quote.";
