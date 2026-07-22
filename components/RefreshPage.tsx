"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import accountantAfterPreview from "../after-preview.png";
import engineerAfterPreview from "../after-preview2.png";
import accountantBeforePreview from "../before-preview.png";
import engineerBeforePreview from "../before-preview2.png";
import kiwiGroupBackground from "../kiwi-group-background.png";
import ActivityToast from "@/components/ActivityToast";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import CurrencySelector from "@/components/CurrencySelector";
import TurnstileWidget from "@/components/TurnstileWidget";
import { usePricing } from "@/components/usePricing";
import type { JobResponse } from "@/lib/jobs/types";
import {
  createMetaEventId,
  trackMetaBrowserEvent,
} from "@/lib/meta/browser";

const KiwiPitCanvas = dynamic(() => import("@/components/KiwiPitCanvas"), {
  ssr: false,
});

const TERMINAL_STATUSES = new Set<JobResponse["status"]>(["complete", "failed"]);
const HOMEPAGE_READY_STATUSES = new Set<JobResponse["status"]>([
  "homepage_ready",
  "building_pages",
  "complete",
]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_FAILURES = 10;
const STATUS_ROTATION_INTERVAL_MS = 7000;
const OVERTIME_THRESHOLD_MS = 3 * 60 * 1000;
const OVERTIME_MESSAGE =
  "Taking a little longer than usual — still working on it…";
// Elapsed-time boundaries for the three visible loading stages. The backend
// only reports one long "building_homepage" status, so stage progress within
// it is time-based (healthy runs complete in ~2-3 minutes).
const STAGE_2_AT_MS = 25 * 1000;
const STAGE_3_AT_MS = 95 * 1000;
const ACTIVE_JOB_STORAGE_KEY = "refresh-kiwi:active-job";
const HERO_KIWI_FLOATINESS = 2.25;

function heroKiwiMotion(value: number, unit: "px" | "deg"): string {
  return `${Number((value * HERO_KIWI_FLOATINESS).toFixed(2))}${unit}`;
}

const HERO_KIWI_MARKS = [
  { left: "52%", top: "-2%", size: "116px", opacity: 0.13, rotate: "-12deg" },
  { left: "68%", top: "-5%", size: "158px", opacity: 0.18, rotate: "8deg" },
  { left: "88%", top: "1%", size: "124px", opacity: 0.16, rotate: "-6deg" },
  { left: "57%", top: "16%", size: "72px", opacity: 0.1, rotate: "-24deg" },
  { left: "47%", top: "28%", size: "96px", opacity: 0.12, rotate: "15deg" },
  { left: "64%", top: "24%", size: "132px", opacity: 0.18, rotate: "-18deg" },
  { left: "82%", top: "21%", size: "104px", opacity: 0.15, rotate: "10deg" },
  { left: "97%", top: "20%", size: "172px", opacity: 0.19, rotate: "-8deg" },
  { left: "55%", top: "53%", size: "144px", opacity: 0.14, rotate: "7deg" },
  { left: "72%", top: "49%", size: "190px", opacity: 0.21, rotate: "-10deg" },
  { left: "91%", top: "52%", size: "112px", opacity: 0.15, rotate: "18deg" },
  { left: "61%", top: "78%", size: "116px", opacity: 0.12, rotate: "-4deg" },
  { left: "81%", top: "78%", size: "150px", opacity: 0.16, rotate: "12deg" },
  { left: "99%", top: "83%", size: "128px", opacity: 0.14, rotate: "-14deg" },
] as const;

const MOBILE_HERO_KIWI_MARKS = [
  { left: "78%", top: "5%", size: "78px", opacity: 0.1, rotate: "8deg" },
  { left: "94%", top: "23%", size: "102px", opacity: 0.12, rotate: "-12deg" },
  { left: "76%", top: "62%", size: "86px", opacity: 0.09, rotate: "16deg" },
  { left: "96%", top: "82%", size: "96px", opacity: 0.1, rotate: "-6deg" },
] as const;

const LOADING_STAGES = [
  "Reading your old website",
  "Designing your new look",
  "Finishing touches",
] as const;

const FRESH_LOADING_STAGES = [
  "Reading your brief",
  "Designing your website",
  "Finishing touches",
] as const;

const GBP_LOADING_STAGES = [
  "Reading your Google listing",
  "Designing your website",
  "Finishing touches",
] as const;

const REFRESH_STATUS_MESSAGES = [
  "Peeling back the old homepage…",
  "Scooping up the useful bits…",
  "Picking out the juiciest proof points…",
  "Giving the hero section a squeeze…",
  "Sorting the seeds from the fluff…",
  "Blending sharper copy with cleaner design…",
  "Rolling out a fresher layout…",
  "Checking the mobile crop…",
  "Polishing the green bits…",
  "Making sure the buttons are ripe…",
  "Packing the preview basket…",
  "One last kiwi quality check…",
  "Nearly ripe — just finishing the homepage…",
] as const;

const FRESH_STATUS_MESSAGES = [
  "Reading the brief…",
  "Finding the right positioning…",
  "Shaping the homepage story…",
  "Working in your logo and images…",
  "Choosing a fresh visual direction…",
  "Writing sharper website copy…",
  "Building the responsive layout…",
  "Polishing the calls to action…",
  "Checking the mobile crop…",
  "Packing the preview basket…",
  "One last kiwi quality check…",
  "Nearly ripe — just finishing the homepage…",
] as const;

const GBP_STATUS_MESSAGES = [
  "Pulling your details from Google…",
  "Reading your opening hours and contact details…",
  "Picking out the strongest review themes…",
  "Working in your selected photos…",
  "Shaping your homepage story…",
  "Designing a fresh local-business site…",
  "Polishing the calls to action…",
  "Checking the mobile crop…",
  "Packing the preview basket…",
  "One last kiwi quality check…",
  "Nearly ripe — just finishing the homepage…",
] as const;

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  plan: "free" | "pro";
  subscriptionStatus: string;
}

type FlowMode = "refresh" | "fresh";
type FreshEntry = "describe" | "google";
type GenerationSource = FlowMode | "gbp";
type PendingGeneration = "refresh" | "fresh" | "gbp";

type PlaceSuggestion = {
  placeId: string;
  name: string;
  address: string;
};

type GbpPhoto = {
  name: string;
  widthPx: number;
  heightPx: number;
  uri: string;
};

type GbpPlace = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  photos: GbpPhoto[];
};

function readStoredJob(): {
  jobId: string;
  url: string;
  mode: FlowMode;
  prompt: string;
  token: string;
} | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      jobId?: string;
      url?: string;
      mode?: FlowMode;
      prompt?: string;
      token?: string;
    };
    return parsed.jobId
      ? {
          jobId: parsed.jobId,
          url: parsed.url ?? "",
          mode: parsed.mode ?? "refresh",
          prompt: parsed.prompt ?? "",
          token: parsed.token ?? "",
        }
      : null;
  } catch {
    return null;
  }
}

function storeJob(
  jobId: string,
  params: { url?: string; mode: FlowMode; prompt?: string; token?: string },
) {
  try {
    window.localStorage.setItem(
      ACTIVE_JOB_STORAGE_KEY,
      JSON.stringify({
        jobId,
        url: params.url ?? "",
        mode: params.mode,
        prompt: params.prompt ?? "",
        token: params.token ?? "",
      }),
    );
  } catch {
    // Storage unavailable (private mode etc.) — refresh resume just won't work.
  }
}

function clearStoredJob() {
  try {
    window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

function normalizePreviewUrl(previewUrl: string | null): string | null {
  if (!previewUrl) {
    return previewUrl;
  }

  try {
    const url = new URL(previewUrl, "https://refresh-kiwi.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return previewUrl.startsWith("/") ? previewUrl : `/${previewUrl}`;
  }
}

function hostLabel(raw: string): string {
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function looksLikeWebAddress(raw: string): boolean {
  const value = raw.trim();

  if (!value) {
    return false;
  }

  if (/^https?:\/\//i.test(value)) {
    return true;
  }

  return /^[^\s]+\.[^\s]+/.test(value);
}

function jobLabel(
  job: JobResponse | null,
  mode: FlowMode,
  fallbackUrl: string,
) {
  if (mode === "fresh") {
    return job?.brandName || "your new website";
  }

  return hostLabel(job?.sourceUrl ?? fallbackUrl);
}

// Domains are a single unbroken "word", so on narrow screens the browser
// either overflows them or snaps them apart mid-word. Adding <wbr> break
// opportunities before each dot/hyphen lets long labels wrap cleanly at
// natural boundaries (e.g. "longbusinessname" / ".co.uk") instead.
function breakableLabel(label: string) {
  return label.split(/(?=[.-])/).map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? <wbr /> : null}
      {part}
    </Fragment>
  ));
}

function isWebsiteLimitError(message: string): boolean {
  return (
    message.includes("Your Pro plan includes up to 3 websites") ||
    message.includes("Free accounts include 1 website")
  );
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

type BusinessIconName =
  | "plumbers"
  | "garages"
  | "salons"
  | "cafes"
  | "clinics"
  | "builders"
  | "cleaners"
  | "more";

const BUSINESS_STRIP_TYPES: Array<{
  label: string;
  icon: BusinessIconName;
  mobile: boolean;
}> = [
  { label: "Plumbers", icon: "plumbers", mobile: true },
  { label: "Salons", icon: "salons", mobile: true },
  { label: "Cafés", icon: "cafes", mobile: false },
  { label: "Clinics", icon: "clinics", mobile: false },
  { label: "Builders", icon: "builders", mobile: true },
  { label: "More", icon: "more", mobile: true },
];

type PromptStarter = {
  label: string;
  description: string;
  servicesHint: string;
  customersHint: string;
  differenceHint: string;
  styleHint: string;
  sectionsHint: string;
};

const PROMPT_STARTERS: PromptStarter[] = [
  {
    label: "Plumber",
    description: "plumbing",
    servicesHint: "Boiler repairs, bathroom plumbing, leaks, emergency call-outs",
    customersHint: "Homeowners, landlords, and small businesses nearby",
    differenceHint: "Fast response times, tidy work, clear pricing",
    styleHint: "Trustworthy, local, practical",
    sectionsHint: "Emergency help, services, reviews, service areas, contact form",
  },
  {
    label: "Electrician",
    description: "electrical",
    servicesHint: "Rewires, fuse boards, lighting, inspections, emergency jobs",
    customersHint: "Homeowners, landlords, letting agents, and local businesses",
    differenceHint: "Qualified, safety-focused, reliable, neat work",
    styleHint: "Safe, certified, professional",
    sectionsHint: "Services, certifications, reviews, emergency call-outs, contact",
  },
  {
    label: "Salon",
    description: "hair or beauty salon",
    servicesHint: "Cuts, colour, styling, treatments, bookings",
    customersHint: "Local people looking for regular appointments and special occasions",
    differenceHint: "Friendly stylists, great results, relaxing experience",
    styleHint: "Stylish, friendly, premium",
    sectionsHint: "Services, prices, gallery, team, booking button, reviews",
  },
  {
    label: "Landscaper",
    description: "landscaping",
    servicesHint: "Garden design, patios, fencing, turfing, maintenance",
    customersHint: "Homeowners who want better outdoor spaces",
    differenceHint: "Strong workmanship, clear plans, before-and-after results",
    styleHint: "Natural, clean, outdoorsy",
    sectionsHint: "Services, project gallery, process, reviews, quote request",
  },
  {
    label: "Cafe",
    description: "cafe",
    servicesHint: "Coffee, breakfast, lunch, cakes, private events",
    customersHint: "Local regulars, families, remote workers, and visitors",
    differenceHint: "Independent feel, fresh food, friendly service",
    styleHint: "Warm, welcoming, independent",
    sectionsHint: "Menu, opening hours, location, gallery, events, contact",
  },
  {
    label: "Builder",
    description: "building",
    servicesHint: "Extensions, renovations, kitchens, bathrooms, repairs",
    customersHint: "Homeowners planning improvements or repairs",
    differenceHint: "Reliable team, quality finish, clear communication",
    styleHint: "Reliable, experienced, straightforward",
    sectionsHint: "Services, recent projects, process, reviews, quote request",
  },
  {
    label: "Cleaner",
    description: "cleaning",
    servicesHint: "Domestic cleaning, office cleaning, end-of-tenancy cleans",
    customersHint: "Busy households, offices, landlords, and tenants",
    differenceHint: "Consistent standards, flexible slots, trusted cleaners",
    styleHint: "Fresh, dependable, easy to book",
    sectionsHint: "Services, prices or packages, reviews, FAQs, booking form",
  },
  {
    label: "Roofer",
    description: "roofing",
    servicesHint: "Roof repairs, flat roofs, guttering, inspections, emergencies",
    customersHint: "Homeowners, landlords, and property managers",
    differenceHint: "Honest assessments, durable repairs, weather-ready workmanship",
    styleHint: "Tough, honest, weatherproof",
    sectionsHint: "Repair services, roof types, recent work, reviews, emergency contact",
  },
  {
    label: "Mechanic",
    description: "garage or mechanic",
    servicesHint: "MOTs, servicing, diagnostics, repairs, tyres",
    customersHint: "Local drivers and small business fleets",
    differenceHint: "Straight advice, fair pricing, skilled diagnostics",
    styleHint: "Straight-talking, skilled, trustworthy",
    sectionsHint: "Services, MOTs, diagnostics, reviews, booking form",
  },
  {
    label: "Dog groomer",
    description: "dog grooming",
    servicesHint: "Full grooms, baths, nail trims, puppy grooms",
    customersHint: "Dog owners who want gentle, reliable grooming",
    differenceHint: "Calm handling, happy dogs, careful finishes",
    styleHint: "Friendly, caring, bright",
    sectionsHint: "Services, prices, gallery, first visit info, booking form",
  },
  {
    label: "Florist",
    description: "florist",
    servicesHint: "Bouquets, weddings, funerals, local delivery",
    customersHint: "Gift buyers, couples, families, and local businesses",
    differenceHint: "Beautiful arrangements, personal service, reliable delivery",
    styleHint: "Elegant, colourful, personal",
    sectionsHint: "Occasions, delivery, weddings, gallery, order enquiry",
  },
  {
    label: "Gym",
    description: "gym or fitness studio",
    servicesHint: "Memberships, classes, personal training, transformation plans",
    customersHint: "Beginners, regular gym-goers, and people wanting more confidence",
    differenceHint: "Supportive coaching, clear plans, welcoming community",
    styleHint: "Energetic, motivating, clean",
    sectionsHint: "Memberships, classes, trainers, timetable, trial sign-up",
  },
  {
    label: "Tutor",
    description: "tutoring",
    servicesHint: "One-to-one lessons, exam prep, online sessions, homework support",
    customersHint: "Parents, students, adult learners, and exam candidates",
    differenceHint: "Patient teaching, clear progress, tailored support",
    styleHint: "Calm, encouraging, credible",
    sectionsHint: "Subjects, levels, testimonials, lesson options, enquiry form",
  },
  {
    label: "Takeaway",
    description: "takeaway restaurant",
    servicesHint: "Menu, online orders, delivery areas, collection times",
    customersHint: "Hungry locals, families, office lunches, and weekend customers",
    differenceHint: "Fresh food, fast service, good value",
    styleHint: "Appetising, fast, local",
    sectionsHint: "Menu, deals, delivery areas, opening times, order button",
  },
  {
    label: "Estate agent",
    description: "estate agency",
    servicesHint: "Sales, lettings, valuations, property management",
    customersHint: "Sellers, landlords, buyers, and tenants",
    differenceHint: "Local knowledge, strong marketing, helpful communication",
    styleHint: "Polished, local, confident",
    sectionsHint: "Valuations, sales, lettings, featured properties, contact form",
  },
  {
    label: "Photographer",
    description: "photography",
    servicesHint: "Weddings, portraits, events, brand photography",
    customersHint: "Couples, families, businesses, and event organisers",
    differenceHint: "Natural images, relaxed experience, polished delivery",
    styleHint: "Creative, polished, personal",
    sectionsHint: "Portfolio, packages, process, testimonials, enquiry form",
  },
  {
    label: "Shop",
    description: "local shop",
    servicesHint: "Products, opening hours, delivery, special offers",
    customersHint: "Local shoppers and people looking for easy gift or product ideas",
    differenceHint: "Helpful service, curated products, independent character",
    styleHint: "Independent, friendly, easy to browse",
    sectionsHint: "Products, offers, opening hours, location, contact",
  },
  {
    label: "Not sure",
    description: "small business",
    servicesHint: "What I sell or provide, who I help, and where I work",
    customersHint: "The type of people or businesses I want to attract",
    differenceHint: "The main reason customers should choose me",
    styleHint: "Clear, friendly, professional",
    sectionsHint: "Services, about, reviews, FAQs, contact form",
  },
];

function promptFromStarter(starter: PromptStarter): string {
  return `Create a website for my ${starter.description} business.

Business name:
Location:
Main services: ${starter.servicesHint}
Best customers: ${starter.customersHint}
What makes us different: ${starter.differenceHint}
Style I like: ${starter.styleHint}
Contact details:
Must-have sections: ${starter.sectionsHint}`;
}

function isPromptStarter(value: string): boolean {
  const trimmed = value.trim();

  return PROMPT_STARTERS.some((starter) => promptFromStarter(starter) === trimmed);
}

function BusinessIcon({ name }: { name: BusinessIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 shrink-0 text-[#141811]"
    >
      {name === "plumbers" ? (
        <>
          <path {...common} d="M7 6h6a4 4 0 0 1 4 4v1" />
          <path {...common} d="M5 6h2v6H5z" />
          <path {...common} d="M17 11h3v6a3 3 0 0 1-3 3h-2" />
          <path {...common} d="M9 9h4" />
        </>
      ) : null}
      {name === "garages" ? (
        <>
          <path {...common} d="M4 14l2-5h12l2 5" />
          <path {...common} d="M5 14h14v5H5z" />
          <path {...common} d="M7 19v1" />
          <path {...common} d="M17 19v1" />
          <circle {...common} cx="8" cy="16.5" r="1" />
          <circle {...common} cx="16" cy="16.5" r="1" />
        </>
      ) : null}
      {name === "salons" ? (
        <>
          <circle {...common} cx="7" cy="17" r="2" />
          <circle {...common} cx="17" cy="17" r="2" />
          <path {...common} d="M8.5 15.5 19 5" />
          <path {...common} d="M15.5 15.5 5 5" />
          <path {...common} d="M12 12l2 2" />
        </>
      ) : null}
      {name === "cafes" ? (
        <>
          <path {...common} d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
          <path {...common} d="M16 10h2a2 2 0 0 1 0 4h-2" />
          <path {...common} d="M7 4v2" />
          <path {...common} d="M11 4v2" />
          <path {...common} d="M4 20h14" />
        </>
      ) : null}
      {name === "clinics" ? (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 8v8" />
          <path {...common} d="M8 12h8" />
        </>
      ) : null}
      {name === "more" ? (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 8v8" />
          <path {...common} d="M8 12h8" />
        </>
      ) : null}
      {name === "builders" ? (
        <>
          <path {...common} d="M4 15h16" />
          <path {...common} d="M6 15a6 6 0 0 1 12 0" />
          <path {...common} d="M9 9v3" />
          <path {...common} d="M15 9v3" />
          <path {...common} d="M7 18h10" />
        </>
      ) : null}
      {name === "cleaners" ? (
        <>
          <path {...common} d="M13 4v8" />
          <path {...common} d="M10 12h6l2 8H8z" />
          <path {...common} d="M9 16h8" />
          <path {...common} d="M7 20h12" />
        </>
      ) : null}
    </svg>
  );
}

function PromptStarterCarousel({
  onSelect,
}: {
  onSelect: (starter: PromptStarter) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const pause = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    setIsInteracting(true);
  }, []);

  const resumeSoon = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
      resumeTimerRef.current = null;
    }, 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const segmentWidth = scroller.scrollWidth / 3;

    if (segmentWidth > 0 && scroller.scrollLeft === 0) {
      scroller.scrollLeft = segmentWidth;
    }

    if (reducedMotion.matches || isInteracting) {
      return;
    }

    let frameId = 0;

    const tick = () => {
      const width = scroller.scrollWidth / 3;

      if (width > 0) {
        scroller.scrollLeft -= 0.18;

        if (scroller.scrollLeft <= 0) {
          scroller.scrollLeft += width;
        } else if (scroller.scrollLeft >= width * 2) {
          scroller.scrollLeft -= width;
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [isInteracting]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const scroller = scrollRef.current;

    if (!scroller) {
      return;
    }

    pause();
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = scroller.scrollLeft;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;

    if (!isDraggingRef.current || !scroller) {
      return;
    }

    const deltaX = event.clientX - dragStartXRef.current;

    if (Math.abs(deltaX) > 5) {
      didDragRef.current = true;
    }

    scroller.scrollLeft = dragStartScrollRef.current - deltaX;
  };

  const finishPointerInteraction = () => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;

    resumeSoon();
  };

  const starterSets = [PROMPT_STARTERS, PROMPT_STARTERS, PROMPT_STARTERS];

  return (
    <div className="mt-4 min-w-0 max-w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-black/50">
          Not sure what to write? Start with a business type.
        </p>
        <p className="hidden text-[11px] font-medium text-black/35 sm:block">
          Drag to browse
        </p>
      </div>
      <div
        ref={scrollRef}
        className={`prompt-starter-scroll w-full max-w-full cursor-grab overflow-x-auto overscroll-x-contain rounded-2xl border border-black/10 bg-[#faf8f1] py-2 active:cursor-grabbing [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] ${
          isDraggingRef.current ? "select-none" : ""
        }`}
        aria-label="Business type prompt starters"
        onFocus={pause}
        onBlur={resumeSoon}
        onMouseEnter={pause}
        onMouseLeave={resumeSoon}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
      >
        <div className="flex w-max gap-2 px-3">
          {starterSets.map((starters, setIndex) =>
            starters.map((starter) => (
              <button
                key={`${setIndex}-${starter.label}`}
                type="button"
                className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/65 shadow-sm transition hover:border-black/25 hover:text-black focus:outline-none focus:ring-2 focus:ring-kiwi-green focus:ring-offset-2"
                onClick={(event) => {
                  if (didDragRef.current) {
                    event.preventDefault();
                    didDragRef.current = false;
                    return;
                  }

                  pause();
                  onSelect(starter);
                  resumeSoon();
                }}
              >
                {starter.label}
              </button>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

function BeforeAfterReveal({
  before,
  after,
  beforeAlt,
  afterAlt,
  className = "",
  aspectClassName = "aspect-[2/1]",
  imageClassName = "object-cover",
  priority = false,
  soft = false,
}: {
  before: StaticImageData;
  after: StaticImageData;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
  aspectClassName?: string;
  imageClassName?: string;
  priority?: boolean;
  soft?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${
        soft
          ? "border border-black/5 bg-transparent p-0 shadow-none"
          : "border border-white/15 bg-white p-2 shadow-2xl"
      } ${className}`}
    >
      <div
        className={`relative overflow-hidden ${
          soft ? "rounded-[2rem]" : "rounded-2xl"
        } bg-white ${aspectClassName}`}
      >
        <Image
          src={after}
          alt={afterAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 560px, 90vw"
          className={imageClassName}
        />
        <div className="before-after-reveal-clip absolute inset-0">
          <Image
            src={before}
            alt={beforeAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 560px, 90vw"
            className={imageClassName}
          />
        </div>
        <div
          className="before-after-reveal-handle absolute bottom-0 top-0 z-10 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_0_24px_rgba(0,0,0,0.25)]"
          aria-hidden
        >
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-black text-black shadow-lg">
            ↔
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em]">
          <span className="rounded-full bg-black/70 px-3 py-1 text-white backdrop-blur">
            Before
          </span>
          <span className="rounded-full bg-kiwi-green px-3 py-1 text-black shadow-sm">
            After
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RefreshPage({
  googleBusinessImportEnabled = false,
}: {
  googleBusinessImportEnabled?: boolean;
}) {
  const { pricing, selectedCurrency, selectPricingCurrency } = usePricing();
  const [flowMode, setFlowMode] = useState<FlowMode>("refresh");
  const [generationSource, setGenerationSource] =
    useState<GenerationSource>("refresh");
  const [hasChosenHeroMode, setHasChosenHeroMode] = useState(false);
  const [url, setUrl] = useState("");
  const [freshEntry, setFreshEntry] = useState<FreshEntry>("describe");
  const [gbpQuery, setGbpQuery] = useState("");
  const [freshPrompt, setFreshPrompt] = useState("");
  const [freshLogo, setFreshLogo] = useState<File | null>(null);
  const [freshImages, setFreshImages] = useState<File[]>([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedGbpPlace, setSelectedGbpPlace] = useState<GbpPlace | null>(null);
  const [selectedGbpPhotoNames, setSelectedGbpPhotoNames] = useState<string[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placesSearchError, setPlacesSearchError] = useState<string | null>(null);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);
  const [forceUrlRefresh, setForceUrlRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const clearTurnstileToken = useCallback(() => setTurnstileToken(null), []);
  // Tokens are single-use, so after one is spent the background widget must
  // re-run its challenge to have a fresh token ready for the next build.
  const consumeTurnstileToken = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileResetKey((current) => current + 1);
  }, []);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingGeneration, setPendingGeneration] =
    useState<PendingGeneration | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // True only when a generation job reached "failed" — renders the failure
  // card in place of the processing card instead of a message under the input.
  const [generationFailed, setGenerationFailed] = useState(false);
  const [websiteLimitErrorMessage, setWebsiteLimitErrorMessage] = useState<
    string | null
  >(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [accountMode, setAccountMode] = useState<"closed" | "signup" | "login">(
    "closed",
  );
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(
    null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isCancellingRefresh, setIsCancellingRefresh] = useState(false);
  const [showProSheet, setShowProSheet] = useState(false);
  const [pendingUpgrade, setPendingUpgrade] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [showStartAnotherWarning, setShowStartAnotherWarning] = useState(false);
  const pollTimerRef = useRef<number | null>(null);
  const pollFailuresRef = useRef(0);
  // Access token issued when the job was created; proves this browser started
  // the job so it may poll/cancel it even while signed out.
  const jobTokenRef = useRef<string | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const freshInputRef = useRef<HTMLTextAreaElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroPointerFrameRef = useRef<number | null>(null);
  const [heroPointer, setHeroPointer] = useState({ x: 0.58, y: 0.46 });

  const handleHeroPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (showVerification) {
        return;
      }

      if (heroPointerFrameRef.current !== null) {
        window.cancelAnimationFrame(heroPointerFrameRef.current);
      }

      const clientX = event.clientX;
      const clientY = event.clientY;

      heroPointerFrameRef.current = window.requestAnimationFrame(() => {
        const heroBounds = heroSectionRef.current?.getBoundingClientRect();
        const width = heroBounds?.width || window.innerWidth;
        const height = heroBounds?.height || Math.min(window.innerHeight, 760);
        const offsetX = heroBounds?.left ?? 0;
        const offsetY = heroBounds?.top ?? 0;

        setHeroPointer({
          x: Math.min(1, Math.max(0, (clientX - offsetX) / width)),
          y: Math.min(1, Math.max(0, (clientY - offsetY) / height)),
        });
      });
    },
    [showVerification],
  );

  const chooseHeroMode = useCallback((mode: FlowMode) => {
    setFlowMode(mode);
    setGenerationSource(mode);
    setHasChosenHeroMode(true);
    setErrorMessage(null);

    if (mode === "fresh") {
      setFreshEntry("describe");
      setPlaceSuggestions([]);
      setSelectedGbpPlace(null);
      setSelectedGbpPhotoNames([]);
      setForceUrlRefresh(false);
    } else {
      setFreshEntry("describe");
      setGbpQuery("");
      setPlaceSuggestions([]);
      setSelectedGbpPlace(null);
      setSelectedGbpPhotoNames([]);
    }

    window.setTimeout(() => {
      const target = document.getElementById(
        mode === "fresh" ? "fresh-input" : "refresh-input",
      );

      if (target instanceof HTMLElement) {
        target.focus();
      }
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (heroPointerFrameRef.current !== null) {
        window.cancelAnimationFrame(heroPointerFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const refreshSearchActive =
      flowMode === "refresh" &&
      !forceUrlRefresh &&
      !looksLikeWebAddress(url);
    const freshSearchActive = flowMode === "fresh" && freshEntry === "google";
    const query = (freshSearchActive ? gbpQuery : url).trim();

    if (
      !googleBusinessImportEnabled ||
      selectedGbpPlace ||
      (!refreshSearchActive && !freshSearchActive)
    ) {
      setPlaceSuggestions([]);
      setIsSearchingPlaces(false);
      setPlacesSearchError(null);
      return;
    }

    if (query.length < 3) {
      setPlaceSuggestions([]);
      setIsSearchingPlaces(false);
      setPlacesSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsSearchingPlaces(true);
      setPlacesSearchError(null);
      void fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            suggestions?: PlaceSuggestion[];
            error?: string;
          };

          if (!response.ok) {
            throw new Error(payload.error ?? "Failed to search Google");
          }

          if (!cancelled) {
            setPlaceSuggestions(payload.suggestions ?? []);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setPlaceSuggestions([]);
            setPlacesSearchError(
              error instanceof Error
                ? error.message
                : "Google business search failed.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingPlaces(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    freshEntry,
    flowMode,
    forceUrlRefresh,
    gbpQuery,
    googleBusinessImportEnabled,
    selectedGbpPlace,
    url,
  ]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
    }
  }, []);

  const stopStatusRotation = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/refresh/${jobId}`, {
          headers: jobTokenRef.current
            ? { "x-job-token": jobTokenRef.current }
            : undefined,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const nextJob = (await response.json()) as JobResponse;
        pollFailuresRef.current = 0;
        setJob(nextJob);

        if (HOMEPAGE_READY_STATUSES.has(nextJob.status)) {
          setIsRefreshing(false);
          stopTimer();
          stopStatusRotation();
        }

        if (TERMINAL_STATUSES.has(nextJob.status)) {
          stopPolling();
          stopTimer();
          stopStatusRotation();

          if (nextJob.status === "failed") {
            // Stop the kiwi animation and playful status copy the moment we
            // know the refresh failed.
            setIsRefreshing(false);
            clearStoredJob();
            setErrorMessage(
              nextJob.errorMessage ??
                "We couldn't finish refreshing your website this time.",
            );
            setGenerationFailed(true);
          }
        }
      } catch {
        pollFailuresRef.current += 1;

        if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
          stopPolling();
          stopTimer();
          stopStatusRotation();
          setIsRefreshing(false);
          setErrorMessage(
            "We lost the connection while checking on your refresh. Please try again.",
          );
        }
      }
    },
    [stopPolling, stopStatusRotation, stopTimer],
  );

  const startProgressTimers = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    stopTimer();
    elapsedTimerRef.current = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 500);
    stopStatusRotation();
    statusTimerRef.current = window.setInterval(() => {
      // Advance to the last message and hold there — never loop back to the
      // start, which read as the refresh being stuck or restarting.
      setStatusMessageIndex((current) =>
        Math.min(current + 1, REFRESH_STATUS_MESSAGES.length - 1),
      );
    }, STATUS_ROTATION_INTERVAL_MS);
  }, [stopStatusRotation, stopTimer]);

  const beginPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollFailuresRef.current = 0;
      pollTimerRef.current = window.setInterval(() => {
        void pollJob(jobId);
      }, POLL_INTERVAL_MS);
    },
    [pollJob, stopPolling],
  );

  const resumeJob = useCallback(
    (stored: {
      jobId: string;
      url: string;
      mode: FlowMode;
      prompt: string;
      token?: string;
    }) => {
      setFlowMode(stored.mode);
      setUrl((current) => current || stored.url);
      setFreshPrompt((current) => current || stored.prompt);

      if (stored.token) {
        jobTokenRef.current = stored.token;
      }

      void fetch(`/api/refresh/${stored.jobId}`, {
        headers: stored.token ? { "x-job-token": stored.token } : undefined,
      })
        .then(async (response) => {
          if (!response.ok) {
            clearStoredJob();
            return;
          }

          const resumedJob = (await response.json()) as JobResponse;

          // Stale jobs: the refresh failed, or the saved website has since
          // been deleted or expired — don't resurrect those on the landing page.
          if (
            resumedJob.status === "failed" ||
            resumedJob.websiteStatus === "archived" ||
            resumedJob.websiteStatus === "expired"
          ) {
            clearStoredJob();
            return;
          }

          setJob(resumedJob);

          if (!HOMEPAGE_READY_STATUSES.has(resumedJob.status)) {
            setIsRefreshing(true);
            setStatusMessageIndex(0);
            startProgressTimers();
            beginPolling(resumedJob.id);
          } else if (!TERMINAL_STATUSES.has(resumedJob.status)) {
            beginPolling(resumedJob.id);
          }
        })
        .catch(() => {
          // Leave the stored job in place; a later signed-in visit may reach the API.
        });
    },
    [beginPolling, startProgressTimers],
  );

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: AuthUser | null }) => {
        if (cancelled) {
          return;
        }

        setUser(payload.user);

        // "/?new=1" means the user explicitly wants to start a fresh refresh
        // (e.g. "Add website" from the dashboard) — don't resume the last job.
        const params = new URLSearchParams(window.location.search);
        if (params.has("new")) {
          clearStoredJob();
          window.history.replaceState(null, "", "/");
          return;
        }

        const linkedJobId = params.get("job");
        if (linkedJobId) {
          const linkedUrl = params.get("url") ?? "";
          const linkedToken = params.get("jobToken") ?? "";
          storeJob(linkedJobId, {
            url: linkedUrl,
            mode: "refresh",
            token: linkedToken,
          });
          resumeJob({
            jobId: linkedJobId,
            url: linkedUrl,
            mode: "refresh",
            prompt: "",
            token: linkedToken,
          });
          window.history.replaceState(null, "", "/");
          return;
        }

        // Logging out should put the landing page back into anonymous mode,
        // not resurrect a previously claimed/generated website from storage.
        if (!payload.user) {
          clearStoredJob();
          return;
        }

        // Resume an in-flight or finished refresh after a page reload, so users
        // (and accidental tab refreshes) never lose their result.
        const stored = readStoredJob();
        if (stored) {
          resumeJob(stored);
        }
      })
      .catch(() => {
        setUser(null);
        clearStoredJob();
      });

    return () => {
      cancelled = true;
      stopPolling();
      stopTimer();
      stopStatusRotation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeJob]);

  const claimCurrentWebsite = useCallback(async () => {
    if (!job) {
      return;
    }

    const response = await fetch("/api/websites/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error ?? "Failed to save website");
    }

    const refreshed = await fetch(`/api/refresh/${job.id}`, {
      headers: jobTokenRef.current
        ? { "x-job-token": jobTokenRef.current }
        : undefined,
    });
    if (refreshed.ok) {
      setJob((await refreshed.json()) as JobResponse);
    }
  }, [job]);

  const continueAfterAuthentication = async () => {
    await claimCurrentWebsite();

    if (pendingUpgrade) {
      setPendingUpgrade(false);
      setShowProSheet(true);
      return;
    }

    window.location.href = "/dashboard?tour=1";
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearStoredJob();
      setUser(null);
      setIsHeaderMenuOpen(false);
      setAccountMode("closed");
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmittingAuth(true);
    setErrorMessage(null);
    setAuthErrorMessage(null);

    try {
      const response = await fetch(
        accountMode === "login" ? "/api/auth/login" : "/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            name: authName,
          }),
        },
      );
      const payload = (await response.json()) as {
        user?: AuthUser;
        twoFactorRequired?: boolean;
        challengeToken?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Account request failed");
      }

      if (payload.twoFactorRequired && payload.challengeToken) {
        setTwoFactorChallengeToken(payload.challengeToken);
        setAuthPassword("");
        return;
      }

      if (!payload.user) {
        throw new Error("Account request failed");
      }

      setUser(payload.user);
      setAccountMode("closed");
      setTwoFactorChallengeToken(null);
      setTwoFactorCode("");
      await continueAfterAuthentication();
    } catch (error) {
      setAuthErrorMessage(
        error instanceof Error ? error.message : "Account request failed",
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleTwoFactorSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!twoFactorChallengeToken) {
      return;
    }

    setIsSubmittingAuth(true);
    setErrorMessage(null);
    setAuthErrorMessage(null);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: twoFactorChallengeToken,
          code: twoFactorCode,
        }),
      });
      const payload = (await response.json()) as {
        user?: AuthUser;
        error?: string;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Invalid two-factor code");
      }

      setUser(payload.user);
      setAccountMode("closed");
      setTwoFactorChallengeToken(null);
      setTwoFactorCode("");
      setAuthErrorMessage(null);
      await continueAfterAuthentication();
    } catch (error) {
      setAuthErrorMessage(
        error instanceof Error ? error.message : "Invalid two-factor code",
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOpenAccount = () => {
    setAuthErrorMessage(null);
    setPendingUpgrade(false);

    if (user) {
      void claimCurrentWebsite()
        .then(() => {
          window.location.href = "/dashboard?tour=1";
        })
        .catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to save website",
          );
        });
      return;
    }

    setAccountMode("signup");
  };

  const handleUpgrade = async () => {
    if (!pricing.checkoutAllowed) {
      setErrorMessage(
        pricing.checkoutUnavailableMessage ?? "Kiwi Pro is not available yet.",
      );
      return;
    }

    if (!user) {
      setPendingUpgrade(true);
      setAuthErrorMessage(null);
      setAccountMode("signup");
      return;
    }

    try {
      await claimCurrentWebsite();
      setPendingUpgrade(false);
      setShowProSheet(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save website",
      );
    }
  };

  const startCheckout = async () => {
    if (!pricing.checkoutAllowed) {
      setShowProSheet(false);
      setErrorMessage(
        pricing.checkoutUnavailableMessage ?? "Kiwi Pro is not available yet.",
      );
      return;
    }

    setIsStartingCheckout(true);
    const metaEventId = createMetaEventId("checkout");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaEventId, currency: selectedCurrency }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start checkout");
      }

      trackMetaBrowserEvent({
        eventName: "InitiateCheckout",
        eventId: metaEventId,
        customData: {
          content_name: "Kiwi Pro",
          currency: pricing.currency,
        },
      });
      window.location.href = payload.url;
    } catch (error) {
      setIsStartingCheckout(false);
      setShowProSheet(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
    }
  };

  const cancelRefresh = async () => {
    if (!job?.id || isCancellingRefresh) {
      return;
    }

    setIsCancellingRefresh(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/refresh/${job.id}`, {
        method: "DELETE",
        headers: jobTokenRef.current
          ? { "x-job-token": jobTokenRef.current }
          : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to cancel refresh");
      }

      stopPolling();
      stopTimer();
      stopStatusRotation();
      clearStoredJob();
      setIsRefreshing(false);
      setJob(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to cancel refresh",
      );
    } finally {
      setIsCancellingRefresh(false);
    }
  };

  const startFresh = () => {
    stopPolling();
    stopTimer();
    stopStatusRotation();
    clearStoredJob();
    setJob(null);
    setUrl("");
    setFreshEntry("describe");
    setGbpQuery("");
    setGenerationSource("refresh");
    setPlaceSuggestions([]);
    setSelectedGbpPlace(null);
    setSelectedGbpPhotoNames([]);
    setIsSearchingPlaces(false);
    setPlacesSearchError(null);
    setIsLoadingPlaceDetails(false);
    setForceUrlRefresh(false);
    setShowVerification(false);
    setPendingGeneration(null);
    setTurnstileToken(null);
    setFreshPrompt("");
    setFreshLogo(null);
    setFreshImages([]);
    setErrorMessage(null);
    setGenerationFailed(false);
    setWebsiteLimitErrorMessage(null);
    setIsRefreshing(false);
  };

  const requestStartFresh = () => {
    setIsHeaderMenuOpen(false);

    if (job && !job.isClaimed) {
      setShowStartAnotherWarning(true);
      return;
    }

    startFresh();
  };

  const handleSelectPromptStarter = (starter: PromptStarter) => {
    const prompt = promptFromStarter(starter);

    setFlowMode("fresh");
    setGenerationSource("fresh");
    setFreshEntry("describe");
    setErrorMessage(null);
    setFreshPrompt((current) => {
      const trimmed = current.trim();

      if (!trimmed || isPromptStarter(trimmed)) {
        return prompt;
      }

      return `${trimmed}\n\n${prompt}`;
    });

    window.requestAnimationFrame(() => {
      freshInputRef.current?.focus();
    });
  };

  const handleSelectPlace = async (suggestion: PlaceSuggestion) => {
    setIsLoadingPlaceDetails(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId }),
      });
      const payload = (await response.json()) as {
        place?: GbpPlace;
        error?: string;
      };

      if (!response.ok || !payload.place) {
        throw new Error(payload.error ?? "Failed to load that Google listing");
      }

      setSelectedGbpPlace(payload.place);
      setSelectedGbpPhotoNames(payload.place.photos.map((photo) => photo.name));
      setPlaceSuggestions([]);
      setUrl(payload.place.name);
      setGbpQuery(payload.place.name);
      setFlowMode("fresh");
      setFreshEntry("google");
      setHasChosenHeroMode(true);
      setGenerationSource("gbp");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load that Google listing",
      );
    } finally {
      setIsLoadingPlaceDetails(false);
    }
  };

  const handleBackToPlaceSearch = () => {
    setSelectedGbpPlace(null);
    setSelectedGbpPhotoNames([]);
    setGenerationSource("fresh");
    setFreshEntry("google");
  };

  const toggleSelectedGbpPhoto = (photoName: string) => {
    setSelectedGbpPhotoNames((current) =>
      current.includes(photoName)
        ? current.filter((name) => name !== photoName)
        : [...current, photoName],
    );
  };

  const handleGenerationError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (isWebsiteLimitError(message)) {
      setWebsiteLimitErrorMessage(message);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(message);
  };

  const requireVerification = (generation: PendingGeneration): boolean => {
    if (user || turnstileToken) {
      return false;
    }

    if (heroPointerFrameRef.current !== null) {
      window.cancelAnimationFrame(heroPointerFrameRef.current);
      heroPointerFrameRef.current = null;
    }
    setPendingGeneration(generation);
    setShowVerification(true);
    setErrorMessage(null);
    setWebsiteLimitErrorMessage(null);
    return true;
  };

  const handleGbpImport = async (verificationToken = turnstileToken) => {
    if (!selectedGbpPlace || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setGenerationSource("gbp");
    setJob(null);
    setErrorMessage(null);
    setGenerationFailed(false);
    setWebsiteLimitErrorMessage(null);
    setStatusMessageIndex(0);
    stopPolling();
    startProgressTimers();

    try {
      const metaEventId = createMetaEventId("lead");
      const response = await fetch("/api/import/gbp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selectedGbpPlace.placeId,
          selectedPhotoNames: selectedGbpPhotoNames,
          metaEventId,
          turnstileToken: verificationToken ?? undefined,
        }),
      });
      consumeTurnstileToken();
      setShowVerification(false);
      setPendingGeneration(null);

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start Google listing import");
      }

      const createdJob = payload as JobResponse & { accessToken?: string };
      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Google Business Profile website creation request",
        },
      });
      jobTokenRef.current = createdJob.accessToken ?? null;
      setJob(createdJob);
      storeJob(createdJob.id, {
        mode: "fresh",
        prompt: selectedGbpPlace.name,
        token: createdJob.accessToken,
      });
      beginPolling(createdJob.id);
    } catch (error) {
      setIsRefreshing(false);
      stopTimer();
      stopStatusRotation();
      handleGenerationError(error, "Failed to start Google listing import");
    }
  };

  const submitRefreshJob = async (verificationToken = turnstileToken) => {
    setIsRefreshing(true);
    setGenerationSource("refresh");
    setJob(null);
    setErrorMessage(null);
    setGenerationFailed(false);
    setWebsiteLimitErrorMessage(null);
    setStatusMessageIndex(0);
    stopPolling();
    startProgressTimers();

    try {
      const metaEventId = createMetaEventId("lead");
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          metaEventId,
          turnstileToken: verificationToken ?? undefined,
        }),
      });
      consumeTurnstileToken();
      setShowVerification(false);
      setPendingGeneration(null);

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start refresh");
      }

      const createdJob = payload as JobResponse & { accessToken?: string };
      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Website refresh request",
        },
      });
      jobTokenRef.current = createdJob.accessToken ?? null;
      setJob(createdJob);
      storeJob(createdJob.id, {
        url,
        mode: "refresh",
        token: createdJob.accessToken,
      });
      beginPolling(createdJob.id);
    } catch (error) {
      setIsRefreshing(false);
      stopTimer();
      stopStatusRotation();
      handleGenerationError(error, "Failed to start refresh");
    }
  };

  const handleRefresh = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!url.trim() || isRefreshing) {
      return;
    }

    if (requireVerification("refresh")) {
      return;
    }

    await submitRefreshJob();
  };

  const handleGbpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGbpPlace || isRefreshing) {
      return;
    }

    if (requireVerification("gbp")) {
      return;
    }

    await handleGbpImport();
  };

  const submitFreshJob = async (verificationToken = turnstileToken) => {
    setIsRefreshing(true);
    setGenerationSource("fresh");
    setJob(null);
    setErrorMessage(null);
    setGenerationFailed(false);
    setWebsiteLimitErrorMessage(null);
    setStatusMessageIndex(0);
    stopPolling();
    startProgressTimers();

    try {
      const metaEventId = createMetaEventId("lead");
      const body = new FormData();
      body.append("prompt", freshPrompt);
      body.append("metaEventId", metaEventId);

      if (freshLogo) {
        body.append("logo", freshLogo);
      }

      for (const image of freshImages) {
        body.append("images", image);
      }

      if (!freshLogo && freshImages.length === 0) {
        body.append("generateStarterVisuals", "1");
      }

      if (verificationToken) {
        body.append("turnstileToken", verificationToken);
      }

      const response = await fetch("/api/fresh", {
        method: "POST",
        body,
      });
      consumeTurnstileToken();

      const payload = await response.json();
      setShowVerification(false);
      setPendingGeneration(null);

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start website creation");
      }

      const createdJob = payload as JobResponse & { accessToken?: string };
      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Fresh website creation request",
        },
      });
      jobTokenRef.current = createdJob.accessToken ?? null;
      setJob(createdJob);
      storeJob(createdJob.id, {
        mode: "fresh",
        prompt: freshPrompt,
        token: createdJob.accessToken,
      });
      beginPolling(createdJob.id);
    } catch (error) {
      setIsRefreshing(false);
      stopTimer();
      stopStatusRotation();
      handleGenerationError(error, "Failed to start website creation");
    }
  };

  const handleFresh = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!freshPrompt.trim() || isRefreshing) {
      return;
    }

    if (requireVerification("fresh")) {
      return;
    }

    await submitFreshJob();
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);

    if (!pendingGeneration || isRefreshing) {
      return;
    }

    const generation = pendingGeneration;
    setShowVerification(false);
    setPendingGeneration(null);

    if (generation === "gbp") {
      void handleGbpImport(token);
    } else if (generation === "fresh") {
      void submitFreshJob(token);
    } else {
      void submitRefreshJob(token);
    }
  };

  // Inputs (url / prompt / selected listing) survive a failed job, so a retry
  // can re-run the exact same generation without sending the user back to the
  // form. Goes through requireVerification because Turnstile tokens are
  // single-use.
  const failedGeneration: PendingGeneration =
    generationSource === "gbp"
      ? "gbp"
      : generationSource === "fresh"
        ? "fresh"
        : "refresh";
  const canRetryGeneration =
    failedGeneration === "gbp"
      ? Boolean(selectedGbpPlace)
      : failedGeneration === "fresh"
        ? Boolean(freshPrompt.trim())
        : Boolean(url.trim());

  const retryGeneration = () => {
    setGenerationFailed(false);
    setErrorMessage(null);

    if (requireVerification(failedGeneration)) {
      return;
    }

    if (failedGeneration === "gbp") {
      void handleGbpImport();
    } else if (failedGeneration === "fresh") {
      void submitFreshJob();
    } else {
      void submitRefreshJob();
    }
  };

  const dismissGenerationFailure = () => {
    setGenerationFailed(false);
    setErrorMessage(null);
  };

  const loadingStage = !isRefreshing
    ? 0
    : elapsedMs >= STAGE_3_AT_MS
      ? 2
      : elapsedMs >= STAGE_2_AT_MS
        ? 1
        : 0;
  const previewHref = normalizePreviewUrl(job?.previewUrl ?? null);
  const showReveal = !isRefreshing && Boolean(previewHref);
  const activeMode = job?.generationMode ?? flowMode;
  const activeGenerationSource: GenerationSource =
    generationSource === "gbp" ? "gbp" : activeMode;
  const activeLabel = jobLabel(job, activeMode, url);
  const activeLoadingStages =
    activeGenerationSource === "gbp"
      ? GBP_LOADING_STAGES
      : activeMode === "fresh"
        ? FRESH_LOADING_STAGES
        : LOADING_STAGES;
  const activeStatusMessages =
    activeGenerationSource === "gbp"
      ? GBP_STATUS_MESSAGES
      : activeMode === "fresh"
        ? FRESH_STATUS_MESSAGES
        : REFRESH_STATUS_MESSAGES;
  const expiryLabel = job?.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(job.expiresAt))
    : null;
  const freeEditsRemaining = job?.freeEditsRemaining ?? 0;
  const refreshInputLooksLikeUrl = looksLikeWebAddress(url) || forceUrlRefresh;
  const isBusinessSearchInput =
    googleBusinessImportEnabled &&
    flowMode === "refresh" &&
    url.trim().length >= 3 &&
    !refreshInputLooksLikeUrl &&
    !selectedGbpPlace;
  const isFreshGoogleSearchInput =
    googleBusinessImportEnabled &&
    flowMode === "fresh" &&
    freshEntry === "google" &&
    !selectedGbpPlace;
  const refreshSubmitDisabled =
    !url.trim() ||
    isLoadingPlaceDetails ||
    (googleBusinessImportEnabled &&
      !refreshInputLooksLikeUrl &&
      !selectedGbpPlace &&
      !forceUrlRefresh);
  const heroSpotlightStyle: CSSProperties = {
    background: `radial-gradient(420px circle at ${heroPointer.x * 100}% ${
      heroPointer.y * 100
    }%, rgba(191, 226, 98, 0.18), transparent 70%)`,
  };
  const renderPlaceSuggestions = (showUrlFallback = false) => (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl shadow-black/15">
      {isSearchingPlaces ? (
        <p className="px-4 py-3 text-sm font-medium text-black/45">
          Finding Google listings…
        </p>
      ) : placesSearchError ? (
        <p className="px-4 py-3 text-sm font-medium text-black/55">
          {placesSearchError}
        </p>
      ) : placeSuggestions.length > 0 ? (
        <>
          {placeSuggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => {
                void handleSelectPlace(suggestion);
              }}
              className="block w-full border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#faf8f1]"
            >
              <span className="block text-sm font-semibold text-black">
                {suggestion.name}
              </span>
              {suggestion.address ? (
                <span className="mt-0.5 block text-xs leading-5 text-black/50">
                  {suggestion.address}
                </span>
              ) : null}
            </button>
          ))}
          {showUrlFallback ? (
            <button
              type="button"
              onClick={() => {
                setForceUrlRefresh(true);
                setPlaceSuggestions([]);
              }}
              className="block w-full px-4 py-3 text-left text-xs font-semibold text-black/45 transition hover:bg-[#faf8f1] hover:text-black"
            >
              Use &quot;{url.trim()}&quot; as a web address anyway
            </button>
          ) : null}
        </>
      ) : (
        <p className="px-4 py-3 text-sm font-medium text-black/45">
          No Google listings yet — try adding your town or postcode.
        </p>
      )}
    </div>
  );

  useEffect(() => {
    if (!showReveal) {
      setIsHeaderMenuOpen(false);
    }
  }, [showReveal]);

  return (
    <main
      className="relative isolate min-h-screen overflow-x-clip bg-[#faf8f1] text-[#141811]"
      onPointerMove={handleHeroPointerMove}
    >
      <KiwiPitCanvas active={isRefreshing} />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#faf8f1]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={30}
              height={30}
              priority
              aria-hidden
              className="rounded-full"
            />
            <span className="hidden truncate font-dosis text-[27px] font-medium leading-none tracking-tight min-[400px]:inline-block">
              Refresh Kiwi
            </span>
          </Link>
          <nav
            className="hidden items-center gap-7 whitespace-nowrap text-sm font-medium text-black/60 md:flex"
            aria-label="Primary"
          >
            {!showReveal ? (
              <>
                <a href="#how" className="transition hover:text-black">
                  How it works
                </a>
                <a href="#examples" className="transition hover:text-black">
                  Examples
                </a>
              </>
            ) : null}
            <a href="#pricing" className="transition hover:text-black">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-black">
              Questions
            </a>
          </nav>
          <div
            className={`items-center gap-2 ${
              user || showReveal ? "hidden md:flex" : "flex"
            }`}
          >
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:border-black/25 sm:px-5"
                >
                  My websites
                </Link>
                <Link
                  href="/account"
                  className={`whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black sm:px-5 ${
                    showReveal ? "hidden" : "hidden lg:inline-block"
                  }`}
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className={`whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black sm:px-5 ${
                    showReveal ? "hidden lg:inline-block" : ""
                  }`}
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAccountMode("login")}
                className="rounded-full px-3 py-2 text-sm font-medium text-black/60 transition hover:text-black"
              >
                Log in
              </button>
            )}
            {showReveal ? (
              <button
                type="button"
                onClick={requestStartFresh}
                className="whitespace-nowrap rounded-full bg-[#141811] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
              >
                Start another
              </button>
            ) : !user ? (
              <a
                href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                onClick={() => chooseHeroMode(flowMode)}
                className="rounded-full bg-[#141811] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
              >
                Try it free
              </a>
            ) : null}
          </div>
          {user || showReveal ? (
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-black/25"
                aria-label="Open menu"
                aria-expanded={isHeaderMenuOpen}
                aria-controls="header-mobile-menu"
              >
                <span className="flex h-4 w-4 flex-col justify-center gap-1" aria-hidden>
                  <span className="block h-0.5 rounded-full bg-current" />
                  <span className="block h-0.5 rounded-full bg-current" />
                  <span className="block h-0.5 rounded-full bg-current" />
                </span>
                Menu
              </button>
              {isHeaderMenuOpen ? (
                <div
                  id="header-mobile-menu"
                  className="absolute right-0 top-[3.25rem] z-50 w-56 rounded-3xl border border-black/10 bg-white p-2 shadow-2xl shadow-black/15"
                >
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsHeaderMenuOpen(false)}
                        className="block rounded-2xl px-4 py-3 text-sm font-semibold text-black transition hover:bg-black/5"
                      >
                        My websites
                      </Link>
                      <Link
                        href="/account"
                        onClick={() => setIsHeaderMenuOpen(false)}
                        className="block rounded-2xl px-4 py-3 text-sm font-semibold text-black/65 transition hover:bg-black/5 hover:text-black"
                      >
                        Account
                      </Link>
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-black/65 transition hover:bg-black/5 hover:text-black"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        setAccountMode("login");
                      }}
                      className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-black transition hover:bg-black/5"
                    >
                      Log in
                    </button>
                  )}
                  {showReveal && previewHref ? (
                    <Link
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsHeaderMenuOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-sm font-semibold text-black transition hover:bg-black/5"
                    >
                      Open preview
                    </Link>
                  ) : null}
                  {showReveal ? (
                    <button
                      type="button"
                      onClick={requestStartFresh}
                      className="mt-1 block w-full rounded-2xl bg-[#141811] px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Start another
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {/* ───────────────────────── Hero / Theatre / Reveal ───────────────────────── */}
      <section
        ref={heroSectionRef}
        className="relative z-30 px-5 pb-8 pt-14 sm:px-8 sm:pb-10 sm:pt-20"
      >
        {!showReveal && !isRefreshing ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            <div className="absolute inset-0 left-1/2 w-screen -translate-x-1/2">
              {MOBILE_HERO_KIWI_MARKS.map((mark, index) => (
                <div
                  key={`mobile-${index}`}
                  className="hero-kiwi-drift absolute rounded-full mix-blend-multiply blur-[0.2px] sm:hidden"
                  style={{
                    left: mark.left,
                    top: mark.top,
                    width: mark.size,
                    height: mark.size,
                    opacity: mark.opacity,
                    "--hero-kiwi-rotate": mark.rotate,
                    "--hero-kiwi-drift-x": heroKiwiMotion(
                      index % 2 === 0 ? 6 : -5,
                      "px",
                    ),
                    "--hero-kiwi-drift-y": heroKiwiMotion(
                      index % 2 === 0 ? -7 : 6,
                      "px",
                    ),
                    "--hero-kiwi-drift-rotate": heroKiwiMotion(
                      index % 2 === 0 ? 3 : -4,
                      "deg",
                    ),
                    "--hero-kiwi-duration": `${15 + index * 2.5}s`,
                    "--hero-kiwi-delay": `${index * -1.4}s`,
                  } as CSSProperties}
                >
                  <Image
                    src="/refresh-kiwi-favicon-v2.png"
                    alt=""
                    aria-hidden
                    fill
                    sizes="112px"
                    className="object-contain"
                  />
                </div>
              ))}
              {HERO_KIWI_MARKS.map((mark, index) => (
                <div
                  key={index}
                  className="hero-kiwi-drift absolute hidden rounded-full mix-blend-multiply blur-[0.2px] sm:block"
                  style={{
                    left: mark.left,
                    top: mark.top,
                    width: mark.size,
                    height: mark.size,
                    opacity: mark.opacity,
                    "--hero-kiwi-rotate": mark.rotate,
                    "--hero-kiwi-drift-x": heroKiwiMotion(
                      index % 2 === 0 ? 10 : -8,
                      "px",
                    ),
                    "--hero-kiwi-drift-y": heroKiwiMotion(
                      index % 3 === 0 ? -12 : 9,
                      "px",
                    ),
                    "--hero-kiwi-drift-rotate": heroKiwiMotion(
                      index % 2 === 0 ? 4 : -5,
                      "deg",
                    ),
                    "--hero-kiwi-duration": `${15 + (index % 5) * 2.5}s`,
                    "--hero-kiwi-delay": `${index * -1.7}s`,
                  } as CSSProperties}
                >
                  <Image
                    src="/refresh-kiwi-favicon-v2.png"
                    alt=""
                    aria-hidden
                    fill
                    sizes="220px"
                    className="object-contain"
                  />
                </div>
              ))}
              <div
                className="absolute inset-0 transition-opacity duration-500"
                style={heroSpotlightStyle}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,#faf8f1_0%,rgba(250,248,241,0.96)_28%,rgba(250,248,241,0.72)_44%,rgba(250,248,241,0.18)_58%,transparent_72%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_58%_at_25%_43%,rgba(250,248,241,0.92)_0%,rgba(250,248,241,0.62)_46%,transparent_76%)]" />
            </div>
          </div>
        ) : null}

        {!hasChosenHeroMode && !showReveal && !isRefreshing ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[#faf8f1]/45 backdrop-blur-[1px]"
          />
        ) : null}

        <div className="relative z-30 mx-auto w-full max-w-6xl">
          {isRefreshing ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div
                className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur sm:max-w-xl md:max-w-2xl"
                role="status"
                aria-live="polite"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  {activeMode === "fresh" ? "Creating" : "Refreshing"}
                </p>
                <h1 className="mx-auto mt-2 max-w-full font-fraunces text-[clamp(1.35rem,5.5vw,2.15rem)] font-semibold leading-tight tracking-tight break-words">
                  {activeGenerationSource === "gbp"
                    ? "Creating from your Google listing"
                    : activeMode === "fresh"
                      ? "Creating your new website"
                      : breakableLabel(activeLabel)}
                </h1>

                <ol className="mx-auto mt-8 max-w-xs space-y-3.5 text-left">
                  {activeLoadingStages.map((label, index) => {
                    const done = index < loadingStage;
                    const current = index === loadingStage;

                    return (
                      <li key={label} className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            done
                              ? "bg-kiwi-green text-black"
                              : current
                                ? "border-2 border-kiwi-green bg-white"
                                : "border border-black/15 bg-white"
                          }`}
                        >
                          {done ? (
                            "✓"
                          ) : current ? (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-kiwi-green" />
                          ) : null}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            done
                              ? "text-black/40 line-through decoration-black/20"
                              : current
                                ? "text-black"
                                : "text-black/40"
                          }`}
                        >
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <p className="mt-7 text-sm italic text-black/55">
                  {elapsedMs > OVERTIME_THRESHOLD_MS
                    ? OVERTIME_MESSAGE
                    : activeStatusMessages[
                        Math.min(statusMessageIndex, activeStatusMessages.length - 1)
                      ]}
                </p>

                <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
                  />
                  <span className="tabular-nums">
                    {formatElapsed(elapsedMs)}
                  </span>
                  <span className="text-black/35">/ usually about 2 min</span>
                </div>

                <p className="mt-5 text-xs leading-5 text-black/45">
                  {user
                    ? `You can leave this page — your ${activeMode === "fresh" ? "website" : "refresh"} keeps going and will be waiting in your dashboard.`
                    : "Keep this tab open — your new website will appear right here in a minute or two."}
                </p>
                {job?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      void cancelRefresh();
                    }}
                    disabled={isCancellingRefresh}
                    className="mt-5 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCancellingRefresh
                      ? "Cancelling..."
                      : activeMode === "fresh"
                        ? "Cancel creation"
                        : "Cancel refresh"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : generationFailed && errorMessage ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div
                className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur sm:max-w-xl md:max-w-2xl"
                role="alert"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  {activeMode === "fresh" ? "Creating" : "Refreshing"}
                </p>
                <h1 className="mx-auto mt-2 max-w-[22ch] font-fraunces text-[clamp(1.6rem,4.5vw,2.15rem)] font-semibold leading-none tracking-tight">
                  That didn&apos;t work this time
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-black/55">
                  {errorMessage}
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  {canRetryGeneration ? (
                    <button
                      type="button"
                      onClick={retryGeneration}
                      className="rounded-full bg-kiwi-green px-6 py-2.5 text-sm font-bold transition hover:bg-kiwi-green-hover"
                    >
                      Try again
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={dismissGenerationFailure}
                    className="rounded-full border border-black/10 bg-white px-6 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
                  >
                    Back to start
                  </button>
                </div>
              </div>
            </div>
          ) : showReveal && previewHref ? (
            <div className="preview-pop">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-kiwi-green px-4 py-1.5 text-sm font-bold">
                  Your homepage is ready ✨
                </span>
                <h1 className="mx-auto mt-5 max-w-full font-fraunces text-[clamp(1.75rem,7vw,2.25rem)] font-semibold leading-[1.12] tracking-tight break-words sm:text-5xl">
                  {"Here's "}
                  {breakableLabel(activeLabel)}
                  {activeMode === "fresh" ? "." : ", refreshed."}
                </h1>
                <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-black/55">
                  {job?.isClaimed
                    ? expiryLabel
                      ? `Saved to your account — yours free until ${expiryLabel}. Add your other pages when you take it online.`
                      : "Saved to your account. Add your other pages when you take it online."
                    : expiryLabel
                      ? `This is your homepage to start with. Take it online to add your other pages and keep making changes — or keep the preview free until ${expiryLabel} while you decide.`
                      : "This is your homepage to start with. Take it online to add your other pages and keep making changes — or keep the preview free for 7 days while you decide."}
                </p>
              </div>

              <div className="mx-auto mt-9 max-w-4xl rounded-3xl border border-black/10 bg-white p-3 shadow-2xl shadow-[#8bbf4d]/20 lg:max-w-6xl">
                <div className="overflow-hidden rounded-2xl border border-black/10">
                  <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#faf8f1] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                    <span className="ml-3 truncate text-xs text-black/40">
                      {activeLabel} —{" "}
                      {activeMode === "fresh" ? "created" : "refreshed"} by
                      Refresh Kiwi
                    </span>
                  </div>
                  <iframe
                    src={previewHref}
                    title="Preview of your new website"
                    className="h-[460px] w-full sm:h-[540px] lg:h-[640px]"
                  />
                </div>
              </div>

              <div className="mx-auto mt-7 max-w-2xl">
                {!job?.isClaimed ? (
                  <div>
                    <div
                      className={`grid gap-3 ${
                        pricing.checkoutAllowed ? "sm:grid-cols-2" : ""
                      }`}
                    >
                      {pricing.checkoutAllowed ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleUpgrade();
                          }}
                          className="flex min-h-24 flex-col items-center justify-center rounded-3xl bg-kiwi-green px-6 py-4 text-center transition hover:bg-kiwi-green-hover"
                        >
                          <span className="text-sm font-bold">
                            Make this my website — {pricing.proPriceShort}
                          </span>
                          <span className="mt-1 text-xs leading-5 text-black/60">
                            Add your other pages, keep making changes, and go live
                            on your own web address.
                          </span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleOpenAccount}
                        className="flex min-h-24 flex-col items-center justify-center rounded-3xl border border-black/15 bg-white px-6 py-4 text-center transition hover:border-black/30"
                      >
                        <span className="text-sm font-semibold">
                          Not sure yet? Keep it free for 7 days
                        </span>
                        <span className="mt-1 text-xs leading-5 text-black/50">
                          Free account · 3 free changes · decide anytime
                        </span>
                      </button>
                    </div>
                    {!pricing.checkoutAllowed ? (
                      <p className="mt-3 text-center text-xs leading-5 text-black/45">
                        {pricing.checkoutUnavailableMessage}
                      </p>
                    ) : null}
                    <Link
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mx-auto mt-4 block w-fit text-sm font-semibold text-black/55 underline decoration-black/20 underline-offset-4 transition hover:text-black"
                    >
                      Open full screen
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        ✓ Saved —{" "}
                        <span className="font-normal text-black/55">
                          you have {freeEditsRemaining} free{" "}
                          {freeEditsRemaining === 1 ? "change" : "changes"}{" "}
                          left
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={previewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold transition hover:border-black/30"
                        >
                          Open full screen
                        </Link>
                        {pricing.checkoutAllowed ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleUpgrade();
                            }}
                            className="rounded-full bg-kiwi-green px-4 py-2 text-xs font-bold transition hover:bg-kiwi-green-hover"
                          >
                            Take my website online — {pricing.proPriceShort}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-black/55">
                      Want something changed? Head to your dashboard to ask for
                      changes, swap photos and manage your website.
                    </p>
                    <Link
                      href="/dashboard"
                      className="mt-3 inline-flex h-11 items-center rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Make changes in my dashboard
                    </Link>
                  </div>
                )}

                {errorMessage ? (
                  <div
                    className="mt-4 rounded-3xl border border-black/10 bg-white p-5"
                    role="alert"
                  >
                    <p className="text-sm font-semibold">
                      That didn&apos;t work this time
                    </p>
                    <p className="mt-1 text-sm leading-6 text-black/55">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className={`relative ${
                hasChosenHeroMode ? "min-h-0" : "min-h-[585px]"
              } sm:min-h-[585px]`}
            >
              <div
                className={`relative z-10 min-w-0 items-center gap-14 transition duration-300 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] ${
                  hasChosenHeroMode
                    ? "grid"
                    : "hidden pointer-events-none select-none opacity-40 blur-[3px] sm:grid"
                }`}
                inert={!hasChosenHeroMode}
                aria-hidden={!hasChosenHeroMode}
              >
                <div className="col-span-full flex justify-center lg:justify-start">
                  <div className="inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
                    {(["refresh", "fresh"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          chooseHeroMode(mode);
                          setErrorMessage(null);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
                          flowMode === mode
                            ? "bg-[#141811] text-white"
                            : "text-black/50 hover:text-black"
                        }`}
                      >
                        {mode === "refresh"
                          ? "Refresh my old website"
                          : "Create a fresh website"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                <h1 className="font-fraunces text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                  {flowMode === "fresh" ? "New website." : "Same website."}
                  <br />
                  <span className="relative inline-block">
                    {flowMode === "fresh" ? "Fresh start." : "Fresher skin."}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-sm bg-kiwi-green/70 sm:h-5"
                    />
                  </span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-8 text-black/55">
                  {flowMode === "fresh"
                    ? "Describe your business, add a logo or photos if you have them, and get a polished website from a website creation company built for small businesses."
                    : googleBusinessImportEnabled
                      ? "Input your web address. In about 2 minutes, we rebuild your business online with a fresh, modern design."
                      : "Input your web address. In about 2 minutes, our website redesign service rebuilds your site with a fresh, modern design — your words, your photos, your business."}
                </p>

                <div className="mt-8 max-w-lg">
                  {flowMode === "refresh" ? (
                    <div className="mt-3">
                      <div className="relative">
                          <form
                            onSubmit={handleRefresh}
                            className="flex flex-col gap-2 rounded-[1.75rem] border-2 border-black/20 bg-white p-2 shadow-xl shadow-black/10 transition focus-within:border-black/40 sm:flex-row sm:items-center sm:rounded-full"
                          >
                            <label htmlFor="refresh-input" className="sr-only">
                              Your website address or business name
                            </label>
                            <input
                              id="refresh-input"
                              type="text"
                              inputMode="text"
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
                              placeholder={
                                googleBusinessImportEnabled
                                  ? "yourwebsite.co.uk — or type your business name"
                                  : "yourwebsite.co.uk"
                              }
                              value={url}
                              onChange={(event) => {
                                setUrl(event.target.value);
                                setForceUrlRefresh(false);
                                setSelectedGbpPlace(null);
                                setSelectedGbpPhotoNames([]);
                                setPlacesSearchError(null);
                              }}
                              className="h-12 w-full rounded-full bg-transparent px-5 text-base outline-none placeholder:text-black/30 sm:flex-1"
                            />
                            <button
                              type="submit"
                              disabled={refreshSubmitDisabled}
                              className="h-12 shrink-0 rounded-full bg-kiwi-green px-6 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusinessSearchInput
                                ? "Choose listing"
                                : "Refresh it →"}
                            </button>
                          </form>

                          {isBusinessSearchInput ? (
                            renderPlaceSuggestions(true)
                          ) : null}
                        </div>
                      {googleBusinessImportEnabled && !selectedGbpPlace ? (
                        <p className="mt-3 text-xs leading-5 text-black/40">
                          No website? Type your business name and town — we&apos;ll
                          find your Google listing and start a fresh website.
                        </p>
                      ) : null}
                      {isLoadingPlaceDetails ? (
                        <p className="mt-3 text-xs font-medium text-black/45">
                          Loading that Google listing…
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {errorMessage ? (
                  <div
                    className="mt-5 max-w-lg rounded-2xl border border-black/10 bg-white p-4"
                    role="alert"
                  >
                    <p className="text-sm font-semibold">
                      That didn&apos;t work this time
                    </p>
                    <p className="mt-1 text-sm leading-6 text-black/55">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-black/50">
                  {[
                    "Free to try",
                    "No signup needed",
                    "No changes to your current site",
                  ].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C5E66A] text-[10px] font-black leading-none text-black">
                        ✓
                      </span>
                      {item}
                    </span>
                  ))}
                </div>
                </div>

                {flowMode === "fresh" ? (
                  <div
                    key="fresh-hero-form"
                    className="relative mx-auto w-full max-w-xl min-w-0 lg:max-w-none"
                  >
                  <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle_at_58%_30%,rgba(191,226,98,0.32),transparent_58%)] blur-2xl" />
                  <div className="relative min-w-0 overflow-visible rounded-[2rem] border-2 border-black/20 bg-white p-4 shadow-2xl shadow-black/10 transition focus-within:border-black/40 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                          {freshEntry === "google"
                            ? "Find your business on Google"
                            : "Describe the website you want"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-black/45">
                          {freshEntry === "google"
                            ? "Use your Google listing details and photos to create a new website."
                            : "Start from a simple brief, then add a logo or photos if you have them."}
                        </p>
                      </div>
                      {googleBusinessImportEnabled ? (
                        <div className="inline-flex shrink-0 rounded-full border border-black/10 bg-[#faf8f1] p-1">
                          {(["describe", "google"] as const).map((entry) => (
                            <button
                              key={entry}
                              type="button"
                              onClick={() => {
                                setFreshEntry(entry);
                                setPlaceSuggestions([]);
                                setPlacesSearchError(null);
                                // Keep any Google listing selection when the user
                                // toggles to "Describe it" and back — only clear
                                // it when they explicitly hit Back on the listing.
                                setGenerationSource(
                                  entry === "google" && selectedGbpPlace
                                    ? "gbp"
                                    : "fresh",
                                );
                              }}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                freshEntry === entry
                                  ? "bg-[#141811] text-white"
                                  : "text-black/50 hover:text-black"
                              }`}
                            >
                              {entry === "google"
                                ? "Use Google listing"
                                : "Describe it"}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {freshEntry === "google" && googleBusinessImportEnabled ? (
                      selectedGbpPlace ? (
                        <form onSubmit={handleGbpSubmit} className="mt-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                                Google listing
                              </p>
                              <h3 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                                {selectedGbpPlace.name}
                              </h3>
                              <p className="mt-1 text-sm leading-6 text-black/55">
                                {selectedGbpPlace.address}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-black/45">
                                {selectedGbpPlace.category ? (
                                  <span>{selectedGbpPlace.category}</span>
                                ) : null}
                                {selectedGbpPlace.phone ? (
                                  <span>{selectedGbpPlace.phone}</span>
                                ) : null}
                                {selectedGbpPlace.rating &&
                                selectedGbpPlace.reviewCount ? (
                                  <span>
                                    {selectedGbpPlace.rating.toFixed(1)} from{" "}
                                    {selectedGbpPlace.reviewCount} Google reviews
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleBackToPlaceSearch}
                              className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/55 transition hover:border-black/25 hover:text-black"
                            >
                              Back
                            </button>
                          </div>

                          {selectedGbpPlace.photos.length > 0 ? (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-black/50">
                                Untick any Google listing photos you do not want
                                on your site.
                              </p>
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                {selectedGbpPlace.photos.map((photo) => {
                                  const selected = selectedGbpPhotoNames.includes(
                                    photo.name,
                                  );

                                  return (
                                    <button
                                      key={photo.name}
                                      type="button"
                                      onClick={() => toggleSelectedGbpPhoto(photo.name)}
                                      className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition ${
                                        selected
                                          ? "border-kiwi-green"
                                          : "border-transparent opacity-45"
                                      }`}
                                      aria-pressed={selected}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={photo.uri}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black shadow">
                                        {selected ? "✓" : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          <button
                            type="submit"
                            disabled={isRefreshing}
                            className="mt-3 h-12 w-full rounded-full bg-kiwi-green px-6 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Build my website →
                          </button>
                        </form>
                      ) : (
                        <div className="relative mt-5">
                          <label htmlFor="fresh-google-input" className="sr-only">
                            Your business name
                          </label>
                          <input
                            id="fresh-google-input"
                            type="text"
                            value={gbpQuery}
                            onChange={(event) => {
                              setGbpQuery(event.target.value);
                              setPlacesSearchError(null);
                            }}
                            placeholder="Business name and town or postcode"
                            className="h-14 w-full rounded-full bg-[#faf8f1] px-5 text-base outline-none placeholder:text-black/30"
                          />
                          {isFreshGoogleSearchInput && gbpQuery.trim().length >= 3
                            ? renderPlaceSuggestions()
                            : null}
                          {isLoadingPlaceDetails ? (
                            <p className="mt-3 text-xs font-medium text-black/45">
                              Loading that Google listing…
                            </p>
                          ) : null}
                        </div>
                      )
                    ) : (
                      <form onSubmit={handleFresh} className="mt-4">
                        <label htmlFor="fresh-input" className="sr-only">
                          Describe the website you want
                        </label>
                        <PromptStarterCarousel onSelect={handleSelectPromptStarter} />
                        <textarea
                          ref={freshInputRef}
                          id="fresh-input"
                          rows={3}
                          value={freshPrompt}
                          onChange={(event) => setFreshPrompt(event.target.value)}
                          placeholder="Tell us the business name, what you sell, who it is for, the style you like, and any must-have sections..."
                          className="mt-4 w-full resize-none rounded-3xl bg-[#faf8f1] px-5 py-4 text-base leading-7 outline-none placeholder:text-black/30"
                        />
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="flex cursor-pointer flex-col rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold transition hover:border-black/25">
                            <span>Logo</span>
                            <span className="mt-1 truncate text-xs font-normal text-black/45">
                              {freshLogo?.name ?? "Optional PNG, JPG, SVG..."}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                              className="hidden"
                              onChange={(event) => {
                                setFreshLogo(event.target.files?.[0] ?? null);
                              }}
                            />
                          </label>
                          <label className="flex cursor-pointer flex-col rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold transition hover:border-black/25">
                            <span>Photos</span>
                            <span className="mt-1 truncate text-xs font-normal text-black/45">
                              {freshImages.length > 0
                                ? `${freshImages.length} selected`
                                : "Optional, up to 8 images"}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                setFreshImages(
                                  Array.from(event.target.files ?? []).slice(0, 8),
                                );
                              }}
                            />
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={!freshPrompt.trim()}
                          className="mt-3 h-12 w-full rounded-full bg-kiwi-green px-6 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Create it →
                        </button>
                        <p className="mt-3 text-center text-xs leading-5 text-black/40">
                          Tip: include your audience, services, location, tone, and
                          any must-have sections.
                        </p>
                      </form>
                    )}
                  </div>
                  </div>
                ) : (
                  <div
                    key="refresh-hero-background-space"
                    className="pointer-events-none hidden min-h-[360px] sm:block lg:min-h-[470px]"
                    aria-hidden
                  />
                )}
              </div>

              {!hasChosenHeroMode ? (
                <div className="absolute inset-0 z-30 flex items-start justify-center px-3 pb-8 pt-6 sm:items-center sm:px-6 sm:py-8">
                  <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/85 p-3 shadow-2xl shadow-black/15 backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
                    <Image
                      src={kiwiGroupBackground}
                      alt=""
                      aria-hidden
                      fill
                      priority
                      sizes="720px"
                      className="object-cover opacity-42 mix-blend-multiply"
                    />
                    <div className="absolute inset-0 bg-[#C5E66A]/80" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_54%_at_50%_47%,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.48)_36%,rgba(255,255,255,0)_72%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_28%,transparent_72%,rgba(20,24,17,0.06))]" />
                    <div className="relative text-center">
                      <h2 className="font-fraunces text-[1.7rem] font-semibold leading-none tracking-tight sm:text-4xl">
                        What do you want to do?
                      </h2>
                    </div>

                    <div className="relative mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => chooseHeroMode("refresh")}
                        className="group rounded-[1.35rem] border-2 border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-xl hover:shadow-black/10 sm:rounded-[1.5rem] sm:p-5"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-kiwi-green text-base font-black text-black sm:h-10 sm:w-10 sm:text-lg">
                          ↻
                        </span>
                        <span className="mt-3 block font-fraunces text-[1.55rem] font-semibold leading-tight tracking-tight sm:mt-4 sm:text-2xl">
                          I want to refresh my website
                        </span>
                        <span className="mt-1.5 block text-sm leading-6 text-black/55 sm:mt-2">
                          I have a website and want a better version.
                        </span>
                        <span className="mt-3 inline-flex text-sm font-bold text-black transition group-hover:translate-x-1 sm:mt-4">
                          Refresh my site →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => chooseHeroMode("fresh")}
                        className="group rounded-[1.35rem] border-2 border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-xl hover:shadow-black/10 sm:rounded-[1.5rem] sm:p-5"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141811] text-base font-black text-white sm:h-10 sm:w-10 sm:text-lg">
                          +
                        </span>
                        <span className="mt-3 block font-fraunces text-[1.55rem] font-semibold leading-tight tracking-tight sm:mt-4 sm:text-2xl">
                          I want to create a fresh website
                        </span>
                        <span className="mt-1.5 block text-sm leading-6 text-black/55 sm:mt-2">
                          I&apos;m starting from scratch — describe it or build
                          from my Google listing.
                        </span>
                        <span className="mt-3 inline-flex text-sm font-bold text-black transition group-hover:translate-x-1 sm:mt-4">
                          Create my site →
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {!isRefreshing ? (
        <>
          {!showReveal ? (
            <>
          {/* ───────────────────────── Social strip ───────────────────────── */}
          <section className="relative z-10 border-y border-black/5 bg-white px-5 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-medium text-black/40 sm:gap-x-8">
              <span className="font-semibold text-black/55">
                Built for:
              </span>
              {BUSINESS_STRIP_TYPES.map((business) => (
                <span
                  key={business.label}
                  className={`items-center gap-2 text-black/45 ${
                    business.mobile ? "inline-flex" : "hidden sm:inline-flex"
                  }`}
                >
                  <BusinessIcon name={business.icon} />
                  {business.label}
                </span>
              ))}
            </div>
          </section>

          {/* ───────────────────────── How it works ───────────────────────── */}
          <section id="how" className="scroll-mt-20 px-5 py-20 sm:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                Three steps. No tech skills.
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-black/55">
                {flowMode === "fresh"
                  ? "Our web design services for small business help you go from a simple description to a professional website in about 2 minutes."
                  : "If you can copy and paste, you can start a small business website redesign."}
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {(flowMode === "fresh"
                  ? [
                      {
                        n: "01",
                        title: "Describe your business",
                        body: "Tell us what you do, who you help, and what style you like. Add a logo or photos if you have them.",
                      },
                      {
                        n: "02",
                        title: "Get your new website",
                        body: "In about 2 minutes we turn your notes into a modern website with words, design, colours, and buttons ready to go.",
                      },
                      {
                        n: "03",
                        title: "Take it online when you're happy",
                        body: "Save it, ask for changes in normal everyday language, add pages, and put it online when you're ready.",
                      },
                    ]
                  : [
                      {
                        n: "01",
                        title: "Paste your address",
                        body: "Pop in your current website — Wix, WordPress, anything. No account, no card.",
                      },
                      {
                        n: "02",
                        title: "Watch the site redesign happen",
                        body: "In about 2 minutes we rebuild it with a clean, modern design. Your words and photos stay.",
                      },
                      {
                        n: "03",
                        title: "Take it online when you're happy",
                        body: `${pricing.proPriceMonthly} puts it online with as many changes as you need — just ask normally.`,
                      },
                    ]
                ).map((step) => (
                  <div
                    key={step.n}
                    className="rounded-3xl border border-black/10 bg-white p-7"
                  >
                    <span className="font-fraunces text-3xl font-semibold text-kiwi-green [text-shadow:0_1px_0_rgba(0,0,0,0.15)]">
                      {step.n}
                    </span>
                    <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/55">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ───────────────────────── Examples ───────────────────────── */}
          <section
            id="examples"
            className="scroll-mt-20 bg-[#141811] px-5 py-20 text-white sm:px-8"
          >
            <div className="mx-auto w-full max-w-6xl">
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                {flowMode === "fresh"
                  ? "Local business web design, without the usual wait."
                  : "Old website in, fresh website redesign out."}
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-white/55">
                {flowMode === "fresh"
                  ? "Start from scratch or refresh what you already have. Refresh Kiwi gives local businesses a modern website they can edit by asking for changes."
                  : "Real site redesign examples for the kinds of websites that haven't changed since 2012."}
              </p>

              <div className="mt-10 grid gap-5 lg:grid-cols-2">
                {[
                  {
                    name: "Accountants",
                    before: accountantBeforePreview,
                    after: accountantAfterPreview,
                    beforeAlt: "Original accountant website before Refresh Kiwi",
                    afterAlt: "Refreshed accountant website generated by Refresh Kiwi",
                    detail:
                      "From a sidebar-heavy old layout to a calmer homepage with clear services, trust signals, and a stronger meeting CTA.",
                  },
                  {
                    name: "Precision engineering",
                    before: engineerBeforePreview,
                    after: engineerAfterPreview,
                    beforeAlt: "Original engineering website before Refresh Kiwi",
                    afterAlt: "Refreshed engineering website generated by Refresh Kiwi",
                    detail:
                      "From dense copy and dated navigation to a focused industrial hero with contact actions and proof points up front.",
                  },
                ].map((example) => (
                  <article
                    key={example.name}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 sm:p-5"
                  >
                    <BeforeAfterReveal
                      before={example.before}
                      after={example.after}
                      beforeAlt={example.beforeAlt}
                      afterAlt={example.afterAlt}
                      className="border-white/10 bg-white/10 shadow-black/20"
                      aspectClassName="h-[320px] sm:h-[390px]"
                      imageClassName="object-cover object-left-top"
                    />
                    <div className="mt-5 px-1">
                      <h3 className="text-lg font-bold">{example.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        {example.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="mt-9 text-sm text-white/55">
                {flowMode === "fresh"
                  ? "Want to start from scratch? Describe your business and "
                  : "The best small business website redesign example is your own website — "}
                <a
                  href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                  onClick={() => chooseHeroMode(flowMode)}
                  className="font-semibold text-kiwi-green underline underline-offset-4"
                >
                  try it free
                </a>
                .
              </p>
            </div>
          </section>
            </>
          ) : null}

          {/* ───────────────────────── Pricing ───────────────────────── */}
          <section id="pricing" className="scroll-mt-20 px-5 py-20 sm:px-8">
            <div className="mx-auto w-full max-w-4xl">
              <h2 className="text-center font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                {flowMode === "fresh"
                  ? "Simple website design costs for small business."
                  : "One simple website redesign cost."}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-base leading-7 text-black/55">
                {flowMode === "fresh"
                  ? "See your website for free. Only pay when you want to put it online and keep making changes."
                  : "No credits, no tokens, no surprises. An affordable website redesign starts free, and you only pay when you want your new website online."}
              </p>

              <div className="mt-5 flex justify-center">
                <CurrencySelector
                  currency={pricing.currency}
                  options={pricing.options}
                  onChange={selectPricingCurrency}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/60 shadow-sm"
                />
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-black/10 bg-white p-8">
                  <h3 className="text-lg font-bold">Try for free</h3>
                  <p className="mt-2 font-fraunces text-4xl font-semibold">
                    {pricing.freePrice}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-black/60">
                    <li>
                      ✓{" "}
                      {flowMode === "fresh"
                        ? "See your new website — no signup"
                        : "See your website redesigned — no signup"}
                    </li>
                    <li>✓ Keep it for 7 days with a free account</li>
                    <li>✓ 3 free changes included</li>
                  </ul>
                  <a
                    href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                    onClick={() => chooseHeroMode(flowMode)}
                    className="mt-7 inline-flex h-12 items-center rounded-full border border-black/15 bg-white px-6 text-sm font-semibold transition hover:border-black/30"
                  >
                    Try it free
                  </a>
                </div>

                <div className="relative rounded-3xl bg-[#141811] p-8 text-white">
                  <span className="absolute right-6 top-6 rounded-full bg-kiwi-green px-3 py-1 text-xs font-bold text-black">
                    Most popular
                  </span>
                  <h3 className="text-lg font-bold">Kiwi Pro</h3>
                  <p className="mt-2 font-fraunces text-4xl font-semibold">
                    {pricing.proPrice}
                    <span className="text-lg font-normal text-white/45">
                      /month
                    </span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-white/70">
                    <li>
                      ✓{" "}
                      {flowMode === "fresh"
                        ? "Your new website online — we host it"
                        : "Your redesigned website online — we host it"}
                    </li>
                    <li>✓ Ask for as many changes as you need</li>
                    <li>✓ Your own web address (www.yourbusiness.com)</li>
                    <li>✓ Add extra pages whenever you need them</li>
                    <li>✓ Cancel anytime — no contracts</li>
                  </ul>
                  <a
                    href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                    onClick={() => chooseHeroMode(flowMode)}
                    className="mt-7 inline-flex h-12 items-center rounded-full bg-kiwi-green px-6 text-sm font-bold text-black transition hover:bg-kiwi-green-hover"
                  >
                    {flowMode === "fresh"
                      ? "Create my website free"
                      : "Start with a free preview"}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────────────── FAQ ───────────────────────── */}
          <section
            id="faq"
            className="scroll-mt-20 border-t border-black/5 bg-white px-5 py-20 sm:px-8"
          >
            <div className="mx-auto w-full max-w-3xl">
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                Questions? Fair enough.
              </h2>

              <div className="mt-8 divide-y divide-black/5">
                {(flowMode === "fresh"
                  ? [
                      {
                        q: "Do I need an old website?",
                        a: "No. Describe your business, add a logo or photos if you have them, and we create a new website for you.",
                      },
                      {
                        q: "What if I don't have photos yet?",
                        a: "That's fine. We can still make a clean, professional website using your business details, colours, layout, and simple visual design.",
                      },
                      {
                        q: "Is this a full new website?",
                        a: "Yes. You get a new website you can save, change, add pages to, and take online when you're ready.",
                      },
                      {
                        q: "What does it cost?",
                        a: `You can see your new website for free. If you want it online, Kiwi Pro is ${pricing.proPriceMonthly} with changes included and no long contract.`,
                      },
                      {
                        q: "How is this different from local web design companies?",
                        a: "Most local web design companies need meetings, quotes, and weeks of back-and-forth. Refresh Kiwi gives you a website quickly, then lets you ask for changes whenever you need them.",
                      },
                      {
                        q: "I'm not good with computers. Is this for me?",
                        a: "Yes. You describe what you want in normal everyday language. If you want a change later, type it like you would say it.",
                      },
                      {
                        q: `What happens after I pay ${pricing.proPriceMonthly}?`,
                        a: "Your website goes online and we host it for you. You can ask for changes, add extra pages, and connect your own web address. Cancel anytime.",
                      },
                      {
                        q: "What if I don't like the result?",
                        a: "Then it costs you nothing. You can walk away, change your description, or try again.",
                      },
                    ]
                  : [
                      {
                        q: "Will this change my real website?",
                        a: "No. We make a separate redesigned version. Your current website stays exactly as it is until you decide to switch.",
                      },
                      {
                        q: "Do I lose my words and photos?",
                        a: "No — that's the whole point. We keep your business details, services, photos and phone number, and give them a cleaner, more modern home.",
                      },
                      {
                        q: "Is this a web redesign service or a full new build?",
                        a: "Refresh Kiwi is a web redesign service. We use your existing site as the starting point, then create a fresher version you can preview, edit and take online.",
                      },
                      {
                        q: "What is the website redesign cost?",
                        a: `You can see the redesign for free. If you want the redesigned website online, Kiwi Pro is ${pricing.proPriceMonthly} with changes included and no long contract.`,
                      },
                      {
                        q: "I'm not good with computers. Is this for me?",
                        a: "Yes. You paste your web address and press one button. If you want a change later, type it like you would say it, such as \"make the phone number bigger\".",
                      },
                      {
                        q: `What happens after I pay ${pricing.proPriceMonthly}?`,
                        a: "Your new website goes online and we host it for you. You can ask for changes, add extra pages, and connect your own web address. Cancel anytime.",
                      },
                      {
                        q: "What if I don't like the result?",
                        a: "Then it costs you nothing. You can simply walk away, ask for changes, or try again.",
                      },
                    ]
                ).map((item) => (
                  <details key={item.q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 text-sm text-black/50 transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {!showReveal ? (
            <section className="px-5 py-20 sm:px-8">
              <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#C5E66A] px-6 py-16 text-center sm:px-12">
                <Image
                  src={kiwiGroupBackground}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1024px) 1152px, 100vw"
                  className="object-cover opacity-42 mix-blend-multiply"
                />
                <div className="absolute inset-0 bg-[#C5E66A]/80" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_54%_at_50%_47%,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.48)_36%,rgba(255,255,255,0)_72%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_28%,transparent_72%,rgba(20,24,17,0.06))]" />
                <h2 className="relative mx-auto max-w-2xl font-fraunces text-4xl font-semibold tracking-tight text-[#11150f] sm:text-5xl">
                  {flowMode === "fresh"
                    ? "Start your website in about 2 minutes."
                    : "Your website called. It wants a redesign."}
                </h2>
                <p className="relative mx-auto mt-4 max-w-md text-base font-medium leading-7 text-[#11150f]/65">
                  {flowMode === "fresh"
                    ? "Describe your business and get a fresh website you can save, change, and take online when you're ready."
                    : "Revamping website design? Try it for free. It takes about 2 minutes, and nothing changes until you say so."}
                </p>
                <a
                  href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                  onClick={() => chooseHeroMode(flowMode)}
                  className="relative mt-8 inline-flex items-center rounded-full bg-[#141811] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-black/15 ring-1 ring-white/20 transition hover:bg-black"
                >
                  {flowMode === "fresh"
                    ? "Create my website — free"
                    : "Refresh my website — free"}
                </a>
              </div>
            </section>
          ) : null}

          {/* ───────────────────────── Footer ───────────────────────── */}
          <footer className="border-t border-black/5 px-5 py-12 sm:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-10 text-center lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.2fr)] lg:gap-8 lg:text-left">
              <div className="flex flex-col items-center lg:items-start">
                <Link href="/" className="inline-flex items-center gap-2.5">
                  <Image
                    src="/refresh-kiwi-favicon-v2.png"
                    alt=""
                    width={30}
                    height={30}
                    aria-hidden
                    className="rounded-full"
                  />
                  <span className="inline-block font-dosis text-[27px] font-medium leading-none tracking-tight">
                    Refresh Kiwi
                  </span>
                </Link>
                <p className="mt-3 max-w-xs text-xs leading-5 text-black/60 lg:max-w-none">
                  Create a new website in about two minutes.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4 lg:justify-start">
                  <a
                    href="https://www.facebook.com/profile.php?id=61590976286585"
                    aria-label="Refresh Kiwi on Facebook"
                    className="text-black/80 transition hover:text-black"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.79-3.91 1.1 0 2.25.2 2.25.2v2.47h-1.27c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22A10.02 10.02 0 0 0 22 12.06Z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/refresh.kiwi/"
                    aria-label="Refresh Kiwi on Instagram"
                    className="text-black/80 transition hover:text-black"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm8.9 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.tiktok.com/@refresh.kiwi"
                    aria-label="Refresh Kiwi on TikTok"
                    className="text-black/80 transition hover:text-black"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M16.6 3c.35 2.57 1.82 4.1 4.4 4.26v2.9a7.52 7.52 0 0 1-4.35-1.34v6.6c0 3.38-2.18 5.58-5.54 5.58-3.02 0-5.11-1.9-5.11-4.66 0-3 2.34-5.1 5.68-5.1.38 0 .74.03 1.08.1v3.05a3.6 3.6 0 0 0-1.18-.2c-1.5 0-2.49.82-2.49 2.05 0 1.12.84 1.86 2.1 1.86 1.37 0 2.18-.88 2.18-2.4V3h3.23Z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <div className="flex flex-col items-center lg:items-start">
                  <h2 className="text-sm font-bold text-black">Product</h2>
                  <nav
                    aria-label="Footer product links"
                    className="mt-3 flex flex-col items-center gap-2 text-sm text-black/55 lg:items-start"
                  >
                    <Link className="transition hover:text-black" href="/">
                      Home
                    </Link>
                    {!showReveal ? (
                      <>
                        <a className="transition hover:text-black" href="#how">
                          How it works
                        </a>
                        <a className="transition hover:text-black" href="#examples">
                          Examples
                        </a>
                      </>
                    ) : null}
                    <a className="transition hover:text-black" href="#pricing">
                      Pricing
                    </a>
                  </nav>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                  <h2 className="text-sm font-bold text-black">Company</h2>
                  <nav
                    aria-label="Footer company links"
                    className="mt-3 flex flex-col items-center gap-2 text-sm text-black/55 lg:items-start"
                  >
                    <Link className="transition hover:text-black" href="/about-us">
                      About us
                    </Link>
                    <Link className="transition hover:text-black" href="/contact-us">
                      Contact us
                    </Link>
                  </nav>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                  <h2 className="text-sm font-bold text-black">Resources</h2>
                  <nav
                    aria-label="Footer resource links"
                    className="mt-3 flex flex-col items-center gap-2 text-sm text-black/55 lg:items-start"
                  >
                    <Link className="transition hover:text-black" href="/blog">
                      Blog
                    </Link>
                  </nav>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                  <h2 className="text-sm font-bold text-black">Legal</h2>
                  <nav
                    aria-label="Footer legal links"
                    className="mt-3 flex flex-col items-center gap-2 text-sm text-black/55 lg:items-start"
                  >
                    <Link
                      className="transition hover:text-black"
                      href="/terms-of-service"
                    >
                      Terms
                    </Link>
                    <Link
                      className="transition hover:text-black"
                      href="/privacy-policy"
                    >
                      Privacy
                    </Link>
                    <Link
                      className="transition hover:text-black"
                      href="/cookie-policy"
                    >
                      Cookies
                    </Link>
                    <CookieSettingsButton />
                  </nav>
                </div>
              </div>
            </div>
          </footer>
        </>
      ) : null}

      {websiteLimitErrorMessage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="website-limit-error-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:p-8">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={44}
              height={44}
              aria-hidden
              className="mx-auto rounded-full"
            />
            <h2
              id="website-limit-error-title"
              className="mt-4 font-fraunces text-2xl font-semibold tracking-tight"
            >
              That didn&apos;t work this time
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/55">
              {websiteLimitErrorMessage}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover"
            >
              Go to dashboard
            </Link>
            <button
              type="button"
              onClick={() => setWebsiteLimitErrorMessage(null)}
              className="mt-4 text-sm font-medium text-black/50 underline decoration-black/20 underline-offset-4 transition hover:text-black"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showStartAnotherWarning ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-another-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:p-8">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={44}
              height={44}
              aria-hidden
              className="mx-auto rounded-full"
            />
            <h2
              id="start-another-warning-title"
              className="mt-4 font-fraunces text-2xl font-semibold tracking-tight"
            >
              Keep this website before starting another?
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/55">
              This preview is not saved to an account. Starting another will
              remove it from this browser.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowStartAnotherWarning(false);
                handleOpenAccount();
              }}
              className="mt-6 h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover"
            >
              Keep it free for 7 days
            </button>
            <p className="mt-2 text-xs leading-5 text-black/45">
              Free account · 3 free changes included
            </p>
            <button
              type="button"
              onClick={() => {
                setShowStartAnotherWarning(false);
                startFresh();
              }}
              className="mt-4 text-sm font-medium text-black/50 underline decoration-black/20 underline-offset-4 transition hover:text-black"
            >
              Start another anyway
            </button>
            <button
              type="button"
              onClick={() => setShowStartAnotherWarning(false)}
              className="mt-3 block w-full text-sm font-medium text-black/50 transition hover:text-black"
            >
              Go back
            </button>
          </div>
        </div>
      ) : null}

      {/* Pre-run the security check invisibly so anonymous visitors usually
          have a token ready before they click build — the modal below then
          only appears when Cloudflare insists on user interaction. */}
      {!user && !showVerification ? (
        <TurnstileWidget
          background
          resetKey={turnstileResetKey}
          onVerify={handleTurnstileVerify}
          onExpire={clearTurnstileToken}
        />
      ) : null}

      {showVerification && !user && pendingGeneration ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-check-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:p-8">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={44}
              height={44}
              aria-hidden
              className="mx-auto rounded-full"
            />
            <h2
              id="security-check-title"
              className="mt-4 font-fraunces text-2xl font-semibold tracking-tight"
            >
              Quick security check
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/55">
              This just confirms you&apos;re a real person. It usually takes a
              second.
            </p>
            <div className="mt-5 flex min-h-16 items-center justify-center overflow-hidden rounded-2xl bg-[#faf8f1] p-2">
              <TurnstileWidget
                className="overflow-hidden rounded-xl"
                onVerify={handleTurnstileVerify}
                onExpire={clearTurnstileToken}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowVerification(false);
                setPendingGeneration(null);
                clearTurnstileToken();
              }}
              className="mt-4 text-sm font-medium text-black/50 underline decoration-black/20 underline-offset-4 transition hover:text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* ───────────────────────── Pro sheet ───────────────────────── */}
      {showProSheet ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                Kiwi Pro — {pricing.proPriceMonthly}
              </h2>
              <button
                type="button"
                onClick={() => setShowProSheet(false)}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60"
              >
                Close
              </button>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm leading-6 text-black/60">
              <li>✓ Your new website online — we host it</li>
              <li>✓ Unlimited changes, just ask in plain English</li>
              <li>✓ Your own web address (like www.yourbusiness.com)</li>
              <li>✓ Add extra pages whenever you need them</li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-black/45">
              Cancel anytime — no contracts, no hidden fees. Payment is handled
              securely by Stripe.
            </p>
            <CurrencySelector
              currency={pricing.currency}
              options={pricing.options}
              onChange={selectPricingCurrency}
              className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#faf8f1] px-4 py-3 text-xs font-semibold text-black/60"
            />
            {!pricing.checkoutAllowed ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                {pricing.checkoutUnavailableMessage}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void startCheckout();
              }}
              disabled={isStartingCheckout || !pricing.checkoutAllowed}
              className="mt-5 h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:opacity-50"
            >
              {isStartingCheckout ? "Opening…" : "Continue to secure payment"}
            </button>
            <button
              type="button"
              onClick={() => setShowProSheet(false)}
              className="mt-3 h-11 w-full rounded-full text-sm font-medium text-black/55 transition hover:text-black"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {/* ───────────────────────── Auth modal ───────────────────────── */}
      {accountMode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                  {twoFactorChallengeToken
                    ? "Enter your 2FA code"
                    : accountMode === "login"
                      ? "Log in"
                      : pendingUpgrade
                        ? "Take your website online"
                        : "Keep your preview"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {twoFactorChallengeToken
                    ? "Open your authenticator app, or use one of your recovery codes."
                    : accountMode === "login"
                      ? pendingUpgrade
                        ? "Log in to continue taking your website online."
                        : "Welcome back — pick up where you left off."
                      : pendingUpgrade
                        ? "Create your account, then review Kiwi Pro before secure payment."
                        : "Not ready to decide? Keep it free for 7 days and get 3 changes included."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountMode("closed");
                  setPendingUpgrade(false);
                  setAuthErrorMessage(null);
                }}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60"
              >
                Close
              </button>
            </div>

            {twoFactorChallengeToken ? (
              <form onSubmit={handleTwoFactorSubmit} className="mt-6 space-y-3">
                <input
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  placeholder="123456 or recovery code"
                  autoComplete="one-time-code"
                  className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
                />
                {authErrorMessage ? (
                  <p
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                    role="alert"
                  >
                    {authErrorMessage}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmittingAuth || !twoFactorCode.trim()}
                  className="h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:opacity-50"
                >
                  {isSubmittingAuth ? "Checking..." : "Verify and log in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorChallengeToken(null);
                    setTwoFactorCode("");
                  }}
                  className="text-sm font-medium text-black/60 underline underline-offset-4"
                >
                  Back to login
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="mt-6 space-y-3">
                {accountMode === "signup" ? (
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Your name"
                  className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
                />
                ) : null}
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email address"
                  className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
                />
                {authErrorMessage ? (
                  <p
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                    role="alert"
                  >
                    {authErrorMessage}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:opacity-50"
                >
                  {isSubmittingAuth
                    ? "Please wait…"
                    : accountMode === "login"
                      ? "Log in"
                      : pendingUpgrade
                        ? "Create account & continue"
                        : "Create free account"}
                </button>
              </form>
            )}

            {!twoFactorChallengeToken ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMode(accountMode === "login" ? "signup" : "login");
                    setAuthErrorMessage(null);
                  }}
                  className="mt-4 text-sm font-medium text-black/60 underline underline-offset-4"
                >
                  {accountMode === "login"
                    ? "Create an account"
                    : "Already have an account? Log in"}
                </button>
                {accountMode === "login" ? (
                  <a
                    href="/forgot-password"
                    className="ml-4 text-sm font-medium text-black/60 underline underline-offset-4"
                  >
                    Forgot password?
                  </a>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isRefreshing && !showReveal ? <ActivityToast /> : null}
    </main>
  );
}
