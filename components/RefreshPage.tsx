"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import Link from "next/link";
import {
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

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  plan: "free" | "pro";
  subscriptionStatus: string;
}

type BlogSnippet = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
};

type FlowMode = "refresh" | "fresh";

function readStoredJob(): {
  jobId: string;
  url: string;
  mode: FlowMode;
  prompt: string;
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
    };
    return parsed.jobId
      ? {
          jobId: parsed.jobId,
          url: parsed.url ?? "",
          mode: parsed.mode ?? "refresh",
          prompt: parsed.prompt ?? "",
        }
      : null;
  } catch {
    return null;
  }
}

function storeJob(
  jobId: string,
  params: { url?: string; mode: FlowMode; prompt?: string },
) {
  try {
    window.localStorage.setItem(
      ACTIVE_JOB_STORAGE_KEY,
      JSON.stringify({
        jobId,
        url: params.url ?? "",
        mode: params.mode,
        prompt: params.prompt ?? "",
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
  | "cleaners";

const BUSINESS_TYPES: Array<{ label: string; icon: BusinessIconName }> = [
  { label: "Plumbers", icon: "plumbers" },
  { label: "Salons", icon: "salons" },
  { label: "Cafés", icon: "cafes" },
  { label: "Clinics", icon: "clinics" },
  { label: "Builders", icon: "builders" },
  { label: "Cleaners", icon: "cleaners" },
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
  blogSnippets = [],
}: {
  blogSnippets?: BlogSnippet[];
}) {
  const [flowMode, setFlowMode] = useState<FlowMode>("refresh");
  const [url, setUrl] = useState("");
  const [freshPrompt, setFreshPrompt] = useState("");
  const [freshLogo, setFreshLogo] = useState<File | null>(null);
  const [freshImages, setFreshImages] = useState<File[]>([]);
  const [freshGenerateStarterVisuals, setFreshGenerateStarterVisuals] =
    useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editStatus, setEditStatus] = useState<
    "idle" | "working" | "done" | "failed" | "cancelled"
  >("idle");
  const [activeEditRequestId, setActiveEditRequestId] = useState<string | null>(
    null,
  );
  const [isCancellingRefresh, setIsCancellingRefresh] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);
  const [showProSheet, setShowProSheet] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const editPollTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollFailuresRef = useRef(0);
  const elapsedTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const freshInputRef = useRef<HTMLTextAreaElement | null>(null);
  const heroPointerFrameRef = useRef<number | null>(null);
  const [heroPointer, setHeroPointer] = useState({ x: 0.58, y: 0.46 });

  const handleHeroPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (heroPointerFrameRef.current !== null) {
        window.cancelAnimationFrame(heroPointerFrameRef.current);
      }

      const clientX = event.clientX;
      const clientY = event.clientY;

      heroPointerFrameRef.current = window.requestAnimationFrame(() => {
        const heroHeight = Math.min(window.innerHeight, 760);

        setHeroPointer({
          x: Math.min(1, Math.max(0, clientX / window.innerWidth)),
          y: Math.min(1, Math.max(0, clientY / heroHeight)),
        });
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (heroPointerFrameRef.current !== null) {
        window.cancelAnimationFrame(heroPointerFrameRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopEditPolling = useCallback(() => {
    if (editPollTimerRef.current !== null) {
      window.clearInterval(editPollTimerRef.current);
      editPollTimerRef.current = null;
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
        const response = await fetch(`/api/refresh/${jobId}`);

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
    (stored: { jobId: string; url: string; mode: FlowMode; prompt: string }) => {
      setFlowMode(stored.mode);
      setUrl((current) => current || stored.url);
      setFreshPrompt((current) => current || stored.prompt);

      void fetch(`/api/refresh/${stored.jobId}`)
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
          storeJob(linkedJobId, {
            url: linkedUrl,
            mode: "refresh",
          });
          resumeJob({
            jobId: linkedJobId,
            url: linkedUrl,
            mode: "refresh",
            prompt: "",
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
      stopEditPolling();
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

    const refreshed = await fetch(`/api/refresh/${job.id}`);
    if (refreshed.ok) {
      setJob((await refreshed.json()) as JobResponse);
    }
  }, [job]);

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
      if (accountMode === "login") {
        await claimCurrentWebsite().catch((error) => {
          console.warn("[refresh-kiwi] login claim skipped", error);
        });
        window.location.href = "/dashboard?tour=1";
        return;
      }

      await claimCurrentWebsite();
      window.location.href = "/dashboard?tour=1";
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
      await claimCurrentWebsite().catch((error) => {
        console.warn("[refresh-kiwi] 2FA login claim skipped", error);
      });
      window.location.href = "/dashboard?tour=1";
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
    if (!user) {
      setAccountMode("signup");
      return;
    }

    try {
      await claimCurrentWebsite();
      setShowProSheet(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save website",
      );
    }
  };

  const startCheckout = async () => {
    setIsStartingCheckout(true);
    const metaEventId = createMetaEventId("checkout");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaEventId }),
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
          currency: "GBP",
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

  const pollEditStatus = useCallback(
    (websiteId: string, editRequestId: string) => {
      stopEditPolling();
      setEditStatus("working");

      editPollTimerRef.current = window.setInterval(() => {
        void fetch("/api/websites")
          .then(async (response) => {
            if (!response.ok) {
              return;
            }

            const payload = (await response.json()) as {
              websites: Array<{
                id: string;
                latestEditRequest: {
                  id: string;
                  status: string;
                  errorMessage: string | null;
                } | null;
              }>;
            };
            const website = payload.websites.find((w) => w.id === websiteId);
            const latest = website?.latestEditRequest;

            if (!latest || latest.id !== editRequestId) {
              return;
            }

            if (latest.status === "complete") {
              stopEditPolling();
              setEditStatus("done");
              setActiveEditRequestId(null);
            } else if (latest.status === "failed") {
              stopEditPolling();
              setEditStatus(
                latest.errorMessage === "Edit cancelled." ? "cancelled" : "failed",
              );
              setActiveEditRequestId(null);
            }
          })
          .catch(() => {
            // Transient network error — keep polling.
          });
      }, POLL_INTERVAL_MS);
    },
    [stopEditPolling],
  );

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = editPrompt.trim();
    if (!prompt) {
      return;
    }

    if (!job?.websiteId) {
      setAccountMode("signup");
      return;
    }

    setIsSubmittingEdit(true);
    setErrorMessage(null);
    setEditStatus("idle");

    try {
      const response = await fetch(`/api/websites/${job.websiteId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to request edit");
      }

      setEditPrompt("");

      const created = payload as { editRequest?: { id: string } };
      if (created.editRequest?.id) {
        setActiveEditRequestId(created.editRequest.id);
        pollEditStatus(job.websiteId, created.editRequest.id);
      }

      const refreshed = await fetch(`/api/refresh/${job.id}`);
      if (refreshed.ok) {
        setJob((await refreshed.json()) as JobResponse);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to request edit",
      );
    } finally {
      setIsSubmittingEdit(false);
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

  const cancelActiveEdit = async () => {
    if (!job?.websiteId || !activeEditRequestId || isCancellingEdit) {
      return;
    }

    setIsCancellingEdit(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/websites/${job.websiteId}/edits/${activeEditRequestId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to cancel edit");
      }

      stopEditPolling();
      setEditStatus("cancelled");
      setActiveEditRequestId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to cancel edit",
      );
    } finally {
      setIsCancellingEdit(false);
    }
  };

  const startFresh = () => {
    stopPolling();
    stopEditPolling();
    stopTimer();
    stopStatusRotation();
    clearStoredJob();
    setJob(null);
    setUrl("");
    setFreshPrompt("");
    setFreshLogo(null);
    setFreshImages([]);
    setErrorMessage(null);
    setEditStatus("idle");
    setActiveEditRequestId(null);
    setIsRefreshing(false);
  };

  const handleSelectPromptStarter = (starter: PromptStarter) => {
    const prompt = promptFromStarter(starter);

    setFlowMode("fresh");
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

  const handleRefresh = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!url.trim() || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setJob(null);
    setErrorMessage(null);
    setEditStatus("idle");
    setActiveEditRequestId(null);
    setStatusMessageIndex(0);
    stopPolling();
    stopEditPolling();
    startProgressTimers();

    try {
      const metaEventId = createMetaEventId("lead");
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, metaEventId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start refresh");
      }

      const createdJob = payload as JobResponse;
      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Website refresh request",
        },
      });
      setJob(createdJob);
      storeJob(createdJob.id, { url, mode: "refresh" });
      beginPolling(createdJob.id);
    } catch (error) {
      setIsRefreshing(false);
      stopTimer();
      stopStatusRotation();
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start refresh",
      );
    }
  };

  const handleFresh = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!freshPrompt.trim() || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setJob(null);
    setErrorMessage(null);
    setEditStatus("idle");
    setActiveEditRequestId(null);
    setStatusMessageIndex(0);
    stopPolling();
    stopEditPolling();
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

      if (!freshLogo && freshImages.length === 0 && freshGenerateStarterVisuals) {
        body.append("generateStarterVisuals", "1");
      }

      const response = await fetch("/api/fresh", {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start website creation");
      }

      const createdJob = payload as JobResponse;
      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Fresh website creation request",
        },
      });
      setJob(createdJob);
      storeJob(createdJob.id, {
        mode: "fresh",
        prompt: freshPrompt,
      });
      beginPolling(createdJob.id);
    } catch (error) {
      setIsRefreshing(false);
      stopTimer();
      stopStatusRotation();
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start website creation",
      );
    }
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
  const activeLabel = jobLabel(job, activeMode, url);
  const activeLoadingStages =
    activeMode === "fresh" ? FRESH_LOADING_STAGES : LOADING_STAGES;
  const activeStatusMessages =
    activeMode === "fresh" ? FRESH_STATUS_MESSAGES : REFRESH_STATUS_MESSAGES;
  const expiryLabel = job?.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(job.expiresAt))
    : null;
  const freeEditsRemaining = job?.freeEditsRemaining ?? 0;
  const heroSpotlightStyle: CSSProperties = {
    background: `radial-gradient(420px circle at ${heroPointer.x * 100}% ${
      heroPointer.y * 100
    }%, rgba(191, 226, 98, 0.18), transparent 70%)`,
  };

  return (
    <main
      className="relative isolate min-h-screen overflow-x-clip bg-[#faf8f1] text-[#141811]"
      onPointerMove={handleHeroPointerMove}
    >
      <KiwiPitCanvas active={isRefreshing} />
      {!showReveal && !isRefreshing ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 z-0 min-h-[680px] w-screen -translate-x-1/2 overflow-hidden sm:min-h-[720px] lg:min-h-[760px]"
        >
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
                "--hero-kiwi-drift-x": `${index % 2 === 0 ? 10 : -8}px`,
                "--hero-kiwi-drift-y": `${index % 3 === 0 ? -12 : 9}px`,
                "--hero-kiwi-drift-rotate": `${index % 2 === 0 ? 4 : -5}deg`,
                "--hero-kiwi-duration": `${18 + (index % 5) * 3}s`,
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
      ) : null}

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
            <span className="hidden font-montserrat text-lg font-bold min-[400px]:inline">
              Refresh Kiwi
            </span>
          </Link>
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-black/60 md:flex"
            aria-label="Primary"
          >
            <a href="#how" className="transition hover:text-black">
              How it works
            </a>
            <a href="#examples" className="transition hover:text-black">
              Examples
            </a>
            <a href="#pricing" className="transition hover:text-black">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-black">
              Questions
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:border-black/25 sm:px-5"
              >
                My websites
              </Link>
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
                onClick={startFresh}
                className="rounded-full bg-[#141811] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
              >
                Start another
              </button>
            ) : (
              <a
                href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                className="rounded-full bg-[#141811] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
              >
                Try it free
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ───────────────────────── Hero / Theatre / Reveal ───────────────────────── */}
      <section className="relative z-10 px-5 pb-8 pt-14 sm:px-8 sm:pb-10 sm:pt-20">
        <div className="mx-auto w-full max-w-6xl">
          {isRefreshing ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div
                className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur sm:max-w-lg"
                role="status"
                aria-live="polite"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  {activeMode === "fresh" ? "Creating" : "Refreshing"}
                </p>
                <h1 className="mx-auto mt-2 max-w-[22ch] font-fraunces text-[clamp(1.6rem,4.5vw,2.15rem)] font-semibold leading-none tracking-tight [overflow-wrap:anywhere]">
                  {activeMode === "fresh" ? "Creating your new website" : activeLabel}
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
          ) : showReveal && previewHref ? (
            <div className="preview-pop">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-kiwi-green px-4 py-1.5 text-sm font-bold">
                  Your new website is ready ✨
                </span>
                <h1 className="mt-5 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
                  {activeMode === "fresh"
                    ? `Here's ${activeLabel}.`
                    : `Here's ${activeLabel}, refreshed.`}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-base leading-7 text-black/55">
                  {job?.isClaimed
                    ? expiryLabel
                      ? `Saved to your account — yours free until ${expiryLabel}.`
                      : "Saved to your account."
                    : expiryLabel
                      ? `This preview is yours free until ${expiryLabel}. Like it? Save it and ask for changes in plain English.`
                      : "This preview is yours free for 7 days. Like it? Save it and ask for changes in plain English."}
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
                    // Reload the frame once an edit lands so the user sees it.
                    key={editStatus === "done" ? "after-edit" : "initial"}
                    src={previewHref}
                    title="Preview of your new website"
                    className="h-[460px] w-full sm:h-[540px] lg:h-[640px]"
                  />
                </div>
              </div>

              <div className="mx-auto mt-7 max-w-2xl">
                {!job?.isClaimed ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Link
                      href={previewHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold transition hover:border-black/30"
                    >
                      Open full screen
                    </Link>
                    <button
                      type="button"
                      onClick={handleOpenAccount}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Save it &amp; make changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleUpgrade();
                      }}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-kiwi-green px-5 text-sm font-bold transition hover:bg-kiwi-green-hover"
                    >
                      Put it online — £10/mo
                    </button>
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
                      <div className="flex gap-2">
                        <Link
                          href={previewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-semibold transition hover:border-black/30"
                        >
                          Open full screen
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void handleUpgrade();
                          }}
                          className="rounded-full bg-kiwi-green px-4 py-2 text-xs font-bold transition hover:bg-kiwi-green-hover"
                        >
                          Put it online — £10/mo
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitEdit} className="mt-4">
                      <label
                        htmlFor="edit-prompt"
                        className="mb-2 block text-xs font-semibold text-black/55"
                      >
                        Ask for a change
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id="edit-prompt"
                          value={editPrompt}
                          onChange={(event) =>
                            setEditPrompt(event.target.value)
                          }
                          placeholder="Make the phone number bigger, swap the main photo..."
                          className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingEdit || !editPrompt.trim()}
                          className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmittingEdit ? "Sending…" : "Make the change"}
                        </button>
                      </div>
                      {editStatus === "working" ? (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                          <p className="flex items-center gap-2 text-xs font-medium text-black/55">
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
                            />
                            Making your change — usually takes a few minutes. You
                            can keep browsing.
                          </p>
                          {activeEditRequestId ? (
                            <button
                              type="button"
                              onClick={() => {
                                void cancelActiveEdit();
                              }}
                              disabled={isCancellingEdit}
                              className="text-xs font-semibold text-black/45 underline underline-offset-2 transition hover:text-black disabled:opacity-50"
                            >
                              {isCancellingEdit ? "Cancelling..." : "Cancel edit"}
                            </button>
                          ) : null}
                        </div>
                      ) : editStatus === "done" ? (
                        <p className="mt-3 text-xs font-medium text-[#4d8a2a]">
                          ✓ Done! The preview above has been updated.
                        </p>
                      ) : editStatus === "cancelled" ? (
                        <p className="mt-3 text-xs font-medium text-black/55">
                          Edit cancelled. You can request another change.
                        </p>
                      ) : editStatus === "failed" ? (
                        <p className="mt-3 text-xs font-medium text-black/55">
                          That change didn&apos;t work this time — please try
                          asking again.
                        </p>
                      ) : null}
                    </form>
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
            <div className="relative min-h-[560px]">
              <div className="relative z-10 grid min-w-0 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/50 px-4 py-1.5 text-xs font-semibold text-black/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-kiwi-green" />
                  {flowMode === "fresh"
                    ? "Affordable small business website design"
                    : "Affordable website redesign for small business"}
                </p>
                <h1 className="mt-6 font-fraunces text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
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
                    : "Input your web address. In about 2 minutes, our website redesign service rebuilds your site with a fresh, modern design — your words, your photos, your business."}
                </p>

                <div className="mt-8 max-w-lg">
                  <div className="inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
                    {(["refresh", "fresh"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setFlowMode(mode);
                          setErrorMessage(null);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          flowMode === mode
                            ? "bg-[#141811] text-white"
                            : "text-black/50 hover:text-black"
                        }`}
                      >
                        {mode === "refresh" ? "Refresh" : "Fresh"}
                      </button>
                    ))}
                  </div>

                  {flowMode === "refresh" ? (
                    <form
                      onSubmit={handleRefresh}
                      className="mt-3 flex flex-col gap-2 rounded-[1.75rem] border-2 border-black/20 bg-white p-2 shadow-xl shadow-black/10 transition focus-within:border-black/40 sm:flex-row sm:items-center sm:rounded-full"
                    >
                      <label htmlFor="refresh-input" className="sr-only">
                        Your website address
                      </label>
                      <input
                        id="refresh-input"
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="yourwebsite.co.uk"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        className="h-12 w-full rounded-full bg-transparent px-5 text-base outline-none placeholder:text-black/30 sm:flex-1"
                      />
                      <button
                        type="submit"
                        disabled={!url.trim()}
                        className="h-12 shrink-0 rounded-full bg-kiwi-green px-6 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refresh it →
                      </button>
                    </form>
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
                    "No changes to your live site",
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
                  <form
                    onSubmit={handleFresh}
                    className="relative min-w-0 overflow-hidden rounded-[2rem] border-2 border-black/20 bg-white p-4 shadow-2xl shadow-black/10 transition focus-within:border-black/40 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
                          Create from scratch
                        </p>
                        <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                          Describe the website you want
                        </h2>
                      </div>
                      <span className="hidden rounded-full bg-kiwi-green px-3 py-1 text-xs font-bold sm:inline-flex">
                        About 2 min
                      </span>
                    </div>
                    <label htmlFor="fresh-input" className="sr-only">
                      Describe the website you want
                    </label>
                    <PromptStarterCarousel onSelect={handleSelectPromptStarter} />
                    <textarea
                      ref={freshInputRef}
                      id="fresh-input"
                      rows={7}
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
                    {!freshLogo && freshImages.length === 0 ? (
                      <label className="mt-3 flex cursor-pointer gap-3 rounded-2xl border border-black/10 bg-[#faf8f1] px-4 py-3 text-sm transition hover:border-black/25">
                        <input
                          type="checkbox"
                          checked={freshGenerateStarterVisuals}
                          onChange={(event) =>
                            setFreshGenerateStarterVisuals(event.target.checked)
                          }
                          className="mt-1 h-4 w-4 shrink-0 accent-[#141811]"
                        />
                        <span>
                          <span className="font-semibold">
                            Generate starter visuals if I don&apos;t upload any
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-black/45">
                            We&apos;ll create one text-free website visual for
                            Cursor to use in the first design. You can replace,
                            remix, or add more images later.
                          </span>
                        </span>
                      </label>
                    ) : null}
                    <button
                      type="submit"
                      disabled={!freshPrompt.trim()}
                      className="mt-3 h-12 w-full rounded-full bg-kiwi-green px-6 text-sm font-bold transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Create it →
                    </button>
                    <p className="mt-3 text-center text-xs leading-5 text-black/40">
                      Tip: include your audience, services, location, tone, and any
                      must-have sections.
                    </p>
                    </form>
                  </div>
                ) : (
                  <div
                    key="refresh-hero-background-space"
                    className="pointer-events-none min-h-[260px] sm:min-h-[360px] lg:min-h-[470px]"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {!isRefreshing ? (
        <>
          {/* ───────────────────────── Social strip ───────────────────────── */}
          <section className="relative z-10 border-y border-black/5 bg-white px-5 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-black/40">
              <span className="font-semibold text-black/55">
                Built for businesses like yours:
              </span>
              {BUSINESS_TYPES.map((business) => (
                <span
                  key={business.label}
                  className="inline-flex items-center gap-2 text-black/45"
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
                        title: "Go live when you're happy",
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
                        title: "Go live when you're happy",
                        body: "£10/month puts it online with as many changes as you need — just ask normally.",
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
                  className="font-semibold text-kiwi-green underline underline-offset-4"
                >
                  try it free
                </a>
                .
              </p>
            </div>
          </section>

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

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-black/10 bg-white p-8">
                  <h3 className="text-lg font-bold">Try for free</h3>
                  <p className="mt-2 font-fraunces text-4xl font-semibold">
                    £0
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
                    £10
                    <span className="text-lg font-normal text-white/45">
                      /month
                    </span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-white/70">
                    <li>
                      ✓{" "}
                      {flowMode === "fresh"
                        ? "Your new website live online — we host it"
                        : "Your redesigned website live online — we host it"}
                    </li>
                    <li>✓ Ask for as many changes as you need</li>
                    <li>✓ Your own web address (www.yourbusiness.com)</li>
                    <li>✓ Extra pages built for you</li>
                    <li>✓ Cancel anytime — no contracts</li>
                  </ul>
                  <a
                    href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
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
                        a: "Yes. You get a new website you can save, change, add pages to, and publish online when you're ready.",
                      },
                      {
                        q: "What does it cost?",
                        a: "You can see your new website for free. If you want it live online, Kiwi Pro is £10/month with changes included and no long contract.",
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
                        q: "What happens after I pay £10/month?",
                        a: "Your website goes live on the internet and we host it for you. You can ask for changes, add extra pages, and connect your own web address. Cancel anytime.",
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
                        a: "Refresh Kiwi is a web redesign service. We use your existing site as the starting point, then create a fresher version you can preview, edit and publish.",
                      },
                      {
                        q: "What is the website redesign cost?",
                        a: "You can see the redesign for free. If you want the redesigned website live online, Kiwi Pro is £10/month with changes included and no long contract.",
                      },
                      {
                        q: "I'm not good with computers. Is this for me?",
                        a: "Yes. You paste your web address and press one button. If you want a change later, type it like you would say it, such as \"make the phone number bigger\".",
                      },
                      {
                        q: "What happens after I pay £10/month?",
                        a: "Your new website goes live on the internet and we host it for you. You can ask for changes and connect your own web address. Cancel anytime.",
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

          {blogSnippets.length ? (
            <section className="border-t border-black/5 px-5 py-20 sm:px-8">
              <div className="mx-auto w-full max-w-6xl">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/40">
                      From the blog
                    </p>
                    <h2 className="mt-3 max-w-2xl font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                      {flowMode === "fresh"
                        ? "Quick reads before you start your website."
                        : "Quick reads before you refresh your website."}
                    </h2>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25"
                  >
                    Read More
                  </Link>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {blogSnippets.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/blog/${article.slug}`}
                      className="group rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
                        <span>{article.category}</span>
                        <span aria-hidden>•</span>
                        <span>{article.readingTime}</span>
                      </div>
                      <h3 className="mt-4 font-fraunces text-2xl font-semibold leading-tight tracking-tight group-hover:underline">
                        {article.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-black/60">
                        {article.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* ───────────────────────── Final CTA ───────────────────────── */}
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
                  ? "Describe your business and get a fresh website you can save, change, and publish when you're ready."
                  : "Revamping website design? Try it for free. It takes about 2 minutes, and nothing changes until you say so."}
              </p>
              <a
                href={flowMode === "fresh" ? "#fresh-input" : "#refresh-input"}
                className="relative mt-8 inline-flex items-center rounded-full bg-[#141811] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-black/15 ring-1 ring-white/20 transition hover:bg-black"
              >
                {flowMode === "fresh"
                  ? "Create my website — free"
                  : "Refresh my website — free"}
              </a>
            </div>
          </section>

          {/* ───────────────────────── Footer ───────────────────────── */}
          <footer className="border-t border-black/5 px-5 py-10 sm:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/refresh-kiwi-favicon-v2.png"
                  alt=""
                  width={26}
                  height={26}
                  aria-hidden
                  className="rounded-full"
                />
                <span className="font-montserrat text-sm font-bold">
                  Refresh Kiwi
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-black/45 sm:justify-end">
                <span>Same website, fresher skin.</span>
                <Link className="hover:text-black" href="/blog">
                  Blog
                </Link>
                <Link className="hover:text-black" href="/privacy-policy">
                  Privacy
                </Link>
                <Link className="hover:text-black" href="/terms-of-service">
                  Terms
                </Link>
                <Link className="hover:text-black" href="/cookie-policy">
                  Cookies
                </Link>
                <CookieSettingsButton />
                <Link className="hover:text-black" href="/refund-policy">
                  Refunds
                </Link>
                <Link className="hover:text-black" href="/acceptable-use-policy">
                  Acceptable use
                </Link>
              </div>
            </div>
          </footer>
        </>
      ) : null}

      {/* ───────────────────────── Pro sheet ───────────────────────── */}
      {showProSheet ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                Kiwi Pro — £10/month
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
              <li>✓ Your new website live on the internet — we host it</li>
              <li>✓ Unlimited changes, just ask in plain English</li>
              <li>✓ Your own web address (like www.yourbusiness.com)</li>
              <li>✓ Extra pages built for you</li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-black/45">
              Cancel anytime — no contracts, no hidden fees. Payment is handled
              securely by Stripe.
            </p>
            <button
              type="button"
              onClick={() => {
                void startCheckout();
              }}
              disabled={isStartingCheckout}
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
                      : "Save your new website"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {twoFactorChallengeToken
                    ? "Open your authenticator app, or use one of your recovery codes."
                    : accountMode === "login"
                    ? "Welcome back — pick up where you left off."
                    : "Save it to a free account so it's still here tomorrow — and get 3 free changes included."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountMode("closed");
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
                    ? "Need an account?"
                    : "Already have an account?"}
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
