"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CurrencySelector from "@/components/CurrencySelector";
import { usePricing } from "@/components/usePricing";
import kiwiGroupBackground from "../../kiwi-group-background.png";
import {
  createMetaEventId,
  trackMetaBrowserEvent,
} from "@/lib/meta/browser";

type User = {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  subscriptionStatus: string;
};

type Website = {
  id: string;
  jobId: string;
  sourceUrl: string | null;
  generationMode: "refresh" | "fresh";
  creationPrompt: string | null;
  slug: string;
  brandName: string | null;
  jobStatus:
    | "queued"
    | "analyzing"
    | "building_homepage"
    | "homepage_ready"
    | "building_pages"
    | "complete"
    | "failed"
    | null;
  status: "preview" | "live" | "expired" | "archived";
  freeEditsUsed: number;
  freeEditsLimit: number;
  freeEditsRemaining: number;
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "connected" | "failed" | string;
  customDomainError: string | null;
  customDomainVerifiedAt: string | null;
  customDomainLastCheckedAt: string | null;
  customDomainDnsTarget: string;
  homepageScreenshotUrl: string;
  expiresAt: string;
  publishedAt: string | null;
  updatedAt: string;
  latestEditRequest: {
    id: string;
    prompt: string;
    status: "queued" | "running" | "complete" | "failed";
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  pages: Array<{
    id: string;
    path: string;
    title: string;
    gated: boolean;
    status: "pending" | "building" | "ready";
  }>;
};

type ActiveRefreshJob = {
  id: string;
  sourceUrl: string | null;
  generationMode: "refresh" | "fresh";
  creationPrompt: string | null;
  slug: string;
  brandName: string | null;
  status: Exclude<Website["jobStatus"], null>;
  statusMessage: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type WebsiteImageVersion = {
  file: string;
  url: string;
  contentType: string;
  bytes: number;
  source: "original" | "upload" | "remix" | "generated";
  createdAt: string;
};

type WebsiteImage = {
  id: string;
  role?: "logo" | "image";
  file: string;
  url: string;
  originalUrl: string;
  contentType: string;
  bytes: number;
  source?: "original" | "upload" | "remix" | "generated";
  replacedAt?: string;
  history?: WebsiteImageVersion[];
};

const REMIXABLE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const IMAGE_PLACEMENT_OPTIONS = [
  { value: "library", label: "Just add to image library" },
  { value: "auto", label: "Let Refresh Kiwi choose" },
  { value: "hero", label: "Hero section" },
  { value: "gallery", label: "Gallery / portfolio" },
  { value: "services", label: "Services section" },
  { value: "about", label: "About section" },
  { value: "header_logo", label: "Header logo / brand mark" },
] as const;

type DashboardIconName =
  | "copy"
  | "check"
  | "external"
  | "edit"
  | "image"
  | "pages"
  | "globe"
  | "trash"
  | "rocket"
  | "calendar"
  | "changes";

function DashboardIcon({
  name,
  className = "h-4 w-4",
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const paths: Record<DashboardIconName, string> = {
    copy: "M8 7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V7Zm2 1h3a3 3 0 0 1 3 3v3h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v1Zm-3 2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H7Z",
    check: "M9.5 16.6 4.9 12l1.4-1.4 3.2 3.2 8.2-8.2L19.1 7 9.5 16.6Z",
    external: "M6 5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5h-2v4H7V7h4V5H6Zm8 0v2h3.6l-7.3 7.3 1.4 1.4L19 8.4V12h2V5h-7Z",
    edit: "M4 17.5V21h3.5L18.1 10.4l-3.5-3.5L4 17.5Zm12-12 1.2-1.2a1.6 1.6 0 0 1 2.3 0l.2.2a1.6 1.6 0 0 1 0 2.3L18.5 8 16 5.5Z",
    image: "M5 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5Zm0 12v-2.6l3.2-3.2 3.1 3.1 1.4-1.4 1.3-1.3L19 16.6v.4H5Zm10.5-6.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
    pages: "M6 3h9l4 4v14H6V3Zm8 1.8V8h3.2L14 4.8ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z",
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.1a15.8 15.8 0 0 0-1.1-5 8.02 8.02 0 0 1 4.2 5ZM12 4.1c.8 1.2 1.5 3.6 1.7 6.9h-3.4c.2-3.3.9-5.7 1.7-6.9ZM4.2 13h3.9c.1 1.8.4 3.4.9 4.8A8.02 8.02 0 0 1 4.2 13Zm3.9-2H4.2A8.02 8.02 0 0 1 9 6.2 16.9 16.9 0 0 0 8.1 11Zm3.9 8.9c-.8-1.2-1.5-3.6-1.7-6.9h3.4c-.2 3.3-.9 5.7-1.7 6.9Zm3-2.1c.5-1.4.8-3 .9-4.8h3.9a8.02 8.02 0 0 1-4.8 4.8Z",
    trash: "M8 4V3h8v1h4v2H4V4h4Zm-2 4h12l-.8 12H6.8L6 8Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z",
    rocket: "M12.6 3.1c2.5-.5 5.2.1 8.1 1.9.1 3.4-.7 6-2.4 7.9l.5 3.5-3.8 3.8-1-4a13 13 0 0 1-2.1.8l-4.8-4.8c.2-.7.5-1.4.8-2.1l-4-.9 3.8-3.8 3.5.5c.4-1.3.9-2.2 1.4-2.8Zm2.4 6.4A1.5 1.5 0 1 0 15 6.5a1.5 1.5 0 0 0 0 3ZM6.6 15.1c.6.6.6 1.7 0 2.3-.7.7-3.6 1.6-3.6 1.6s.9-2.9 1.6-3.6c.6-.6 1.7-.6 2.3 0Z",
    calendar: "M7 3h2v2h6V3h2v2h3v16H4V5h3V3Zm11 8H6v8h12v-8Z",
    changes: "M12 4V2l4 3-4 3V6a5 5 0 0 0-4.6 7h-2A7 7 0 0 1 12 4Zm6.6 7a7 7 0 0 1-6.6 9v2l-4-3 4-3v2a5 5 0 0 0 4.6-7h2Z",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function imageSourceLabel(source: WebsiteImage["source"]): string {
  if (source === "upload") {
    return "Your upload";
  }

  if (source === "remix") {
    return "AI remix";
  }

  if (source === "generated") {
    return "AI generated";
  }

  return "From your old site";
}

function imageRoleLabel(role: WebsiteImage["role"]): string {
  return role === "logo" ? "Logo / brand mark" : "Site image";
}

type WebsiteImagesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; images: WebsiteImage[] };

type PageGenerationType = "business" | "legal" | "custom";
type WebsiteActionModalType =
  | "edit"
  | "images"
  | "pages"
  | "domain"
  | "rename"
  | "delete";

type WebsiteActionModal = {
  websiteId: string;
  type: WebsiteActionModalType;
} | null;

type LegalAnswersState = {
  businessLegalName: string;
  tradingName: string;
  country: string;
  privacyEmail: string;
  hasContactForms: boolean;
  hasBookings: boolean;
  hasNewsletter: boolean;
  hasPayments: boolean;
  usesAnalytics: boolean;
  usesAds: boolean;
  usesLiveChat: boolean;
  embedsMapsOrVideos: boolean;
  hasExistingLegalPages: boolean;
  notes: string;
};

type LegalBooleanField = {
  key: keyof Pick<
    LegalAnswersState,
    | "hasContactForms"
    | "hasBookings"
    | "hasNewsletter"
    | "hasPayments"
    | "usesAnalytics"
    | "usesAds"
    | "usesLiveChat"
    | "embedsMapsOrVideos"
    | "hasExistingLegalPages"
  >;
  label: string;
};

type CustomPageRequestState = {
  title: string;
  brief: string;
};

const DEFAULT_LEGAL_ANSWERS: LegalAnswersState = {
  businessLegalName: "",
  tradingName: "",
  country: "United Kingdom",
  privacyEmail: "",
  hasContactForms: true,
  hasBookings: false,
  hasNewsletter: false,
  hasPayments: false,
  usesAnalytics: true,
  usesAds: false,
  usesLiveChat: false,
  embedsMapsOrVideos: true,
  hasExistingLegalPages: false,
  notes: "",
};

const DEFAULT_CUSTOM_PAGE_REQUEST: CustomPageRequestState = {
  title: "",
  brief: "",
};

const LEGAL_BOOLEAN_FIELDS: LegalBooleanField[] = [
  { key: "hasContactForms", label: "Contact forms" },
  { key: "hasBookings", label: "Bookings" },
  { key: "hasNewsletter", label: "Newsletter signup" },
  { key: "hasPayments", label: "Payments" },
  { key: "usesAnalytics", label: "Analytics" },
  { key: "usesAds", label: "Ads or tracking pixels" },
  { key: "usesLiveChat", label: "Live chat" },
  { key: "embedsMapsOrVideos", label: "Embedded maps or videos" },
  {
    key: "hasExistingLegalPages",
    label: "My current site already has legal pages",
  },
];

// Starter ideas for the edit box. Chips ending in "…" prefill a sentence the
// user finishes with their own details (the AI can't know their hours or
// number); the others are complete instructions the AI has context for.
const EDIT_SUGGESTIONS: Array<{ label: string; prompt: string }> = [
  {
    label: "Change the phone number to…",
    prompt: "Change the phone number to ",
  },
  {
    label: "Change the opening hours to…",
    prompt: "Change the opening hours to ",
  },
  {
    label: "Add a customer review…",
    prompt: "Add this customer review: ",
  },
  {
    label: "Make the phone number bigger",
    prompt: "Make the phone number bigger and easier to spot",
  },
  {
    label: "Try different colours",
    prompt: "Try a different colour scheme that still suits the business",
  },
];

// Shown while an edit is running, advancing with elapsed time so the page
// always feels alive. The last message holds until the edit completes.
const EDIT_PROGRESS_STAGES: Array<{ atMs: number; message: string }> = [
  { atMs: 0, message: "Reading your change…" },
  { atMs: 15_000, message: "Finding the right spot…" },
  { atMs: 45_000, message: "Making it look right…" },
  { atMs: 95_000, message: "Checking it over…" },
  { atMs: 150_000, message: "Nearly there — finishing touches…" },
];

const PAGE_PROGRESS_STAGES: Array<{ atMs: number; message: string }> = [
  { atMs: 0, message: "Checking your current site…" },
  { atMs: 20_000, message: "Writing page content…" },
  { atMs: 60_000, message: "Building pages…" },
  { atMs: 130_000, message: "Publishing preview…" },
  { atMs: 210_000, message: "Nearly there — finishing touches…" },
];

function editProgressMessage(createdAt: string, now: number): string {
  const elapsed = now - new Date(createdAt).getTime();
  let message = EDIT_PROGRESS_STAGES[0].message;

  for (const stage of EDIT_PROGRESS_STAGES) {
    if (elapsed >= stage.atMs) {
      message = stage.message;
    }
  }

  return message;
}

function pageProgressStageIndex(startedAt: string, now: number): number {
  const elapsed = now - new Date(startedAt).getTime();
  let index = 0;

  for (let current = 0; current < PAGE_PROGRESS_STAGES.length; current += 1) {
    if (elapsed >= PAGE_PROGRESS_STAGES[current].atMs) {
      index = current;
    }
  }

  return index;
}

function editProgressStageIndex(createdAt: string, now: number): number {
  const elapsed = now - new Date(createdAt).getTime();
  let index = 0;

  for (let current = 0; current < EDIT_PROGRESS_STAGES.length; current += 1) {
    if (elapsed >= EDIT_PROGRESS_STAGES[current].atMs) {
      index = current;
    }
  }

  return index;
}

const EDIT_POLL_INTERVAL_MS = 5000;
const ACTIVE_EDIT_STATUSES = new Set(["queued", "running"]);
const PRO_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_TOUR_STORAGE_KEY = "refresh-kiwi:dashboard-tour-dismissed";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function previewHref(slug: string): string {
  return `/preview/${slug}/index.html`;
}

function pageHref(slug: string, pagePath: string): string {
  const pathWithSlash = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  const normalizedPath = pathWithSlash === "/" ? "/index.html" : pathWithSlash;

  return `/preview/${slug}${normalizedPath}`;
}

function websiteAddress(website: Website): string {
  if (website.customDomainStatus === "connected" && website.customDomain) {
    return `https://${website.customDomain}`;
  }

  return previewHref(website.slug);
}

function sourceHostname(sourceUrl: string | null): string {
  if (!sourceUrl) {
    return "new website";
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
}

function promptTitle(prompt: string | null, fallback = "New website"): string {
  return prompt?.split(/\r?\n/)[0]?.trim() || fallback;
}

function websiteSourceLabel(website: Website): string {
  if (website.generationMode === "fresh") {
    return `Created from brief: ${promptTitle(website.creationPrompt, website.slug)}`;
  }

  return `Generated from ${sourceHostname(website.sourceUrl)}`;
}

function activeJobTitle(job: ActiveRefreshJob): string {
  if (job.generationMode === "fresh") {
    return job.brandName || promptTitle(job.creationPrompt);
  }

  return job.brandName || sourceHostname(job.sourceUrl);
}

function daysUntil(value: string): number {
  return Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS);
}

function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function websiteState(website: Website, isPro: boolean) {
  const daysLeft = daysUntil(website.expiresAt);
  const isDateExpired = daysLeft <= 0;
  const isExpired =
    website.status === "expired" ||
    (!isPro && website.status !== "live" && isDateExpired);
  const isArchived = website.status === "archived";
  const isLive = website.status === "live";
  const isExpiringSoon = !isPro && !isLive && !isExpired && daysLeft <= 2;

  if (isArchived) {
    return {
      label: "Archived",
      badgeClass: "bg-black/5 text-black/45",
      description: "This website is archived.",
      canView: false,
      canEdit: false,
      showKeepLive: false,
    };
  }

  if (isExpired) {
    return {
      label: "Expired preview",
      badgeClass: "bg-red-50 text-red-700",
      description: `Expired on ${formatDate(website.expiresAt)}.`,
      canView: false,
      canEdit: false,
      showKeepLive: true,
    };
  }

  if (isLive) {
    return {
      label: "Live",
      badgeClass: "bg-kiwi-green text-black",
      description: isPro ? "" : "This website is currently live.",
      canView: true,
      canEdit: true,
      showKeepLive: false,
    };
  }

  if (isPro) {
    return {
      label: "Ready to publish",
      badgeClass: "bg-[#f0f4e7] text-black/70",
      description: "Publish this preview to keep it live.",
      canView: true,
      canEdit: true,
      showKeepLive: true,
    };
  }

  return {
    label: isExpiringSoon ? "Expires soon" : "Free preview",
    badgeClass: isExpiringSoon
      ? "bg-amber-50 text-amber-700"
      : "bg-[#f0f4e7] text-black/60",
    description: `${daysLeft} ${pluralise(daysLeft, "day")} left in your free preview.`,
    canView: true,
    canEdit: true,
    showKeepLive: true,
  };
}

export default function DashboardPage() {
  const { pricing, selectedCurrency, selectPricingCurrency } = usePricing();
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [activeRefreshJobs, setActiveRefreshJobs] = useState<ActiveRefreshJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({});
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});
  const [renameValues, setRenameValues] = useState<Record<string, string>>({});
  const [deleteConfirmations, setDeleteConfirmations] = useState<Record<string, string>>({});
  const [domainValues, setDomainValues] = useState<Record<string, string>>({});
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [cancellingRefreshJobId, setCancellingRefreshJobId] = useState<string | null>(
    null,
  );
  const [cancellingEditRequestId, setCancellingEditRequestId] = useState<
    string | null
  >(null);
  const [publishingWebsiteId, setPublishingWebsiteId] = useState<string | null>(null);
  const [generatingPagesWebsiteId, setGeneratingPagesWebsiteId] = useState<string | null>(
    null,
  );
  const [pageGenerationType, setPageGenerationType] =
    useState<PageGenerationType>("business");
  const [pageChooserWebsiteId, setPageChooserWebsiteId] = useState<string | null>(
    null,
  );
  const [legalAnswers, setLegalAnswers] =
    useState<LegalAnswersState>(DEFAULT_LEGAL_ANSWERS);
  const [customPageRequest, setCustomPageRequest] =
    useState<CustomPageRequestState>(DEFAULT_CUSTOM_PAGE_REQUEST);
  const [activePagesModalWebsiteId, setActivePagesModalWebsiteId] = useState<
    string | null
  >(null);
  const [dismissedPagesJobIds, setDismissedPagesJobIds] = useState<
    Record<string, true>
  >({});
  const [websiteImages, setWebsiteImages] = useState<
    Record<string, WebsiteImagesState>
  >({});
  const [uploadingImagesWebsiteId, setUploadingImagesWebsiteId] = useState<
    string | null
  >(null);
  const [generatingImageWebsiteId, setGeneratingImageWebsiteId] = useState<
    string | null
  >(null);
  const [placingImageId, setPlacingImageId] = useState<string | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [remixingImageId, setRemixingImageId] = useState<string | null>(null);
  const [remixNoteImageId, setRemixNoteImageId] = useState<string | null>(null);
  const [remixNotes, setRemixNotes] = useState<Record<string, string>>({});
  const [historyOpenImageId, setHistoryOpenImageId] = useState<string | null>(
    null,
  );
  const [revertingImageId, setRevertingImageId] = useState<string | null>(null);
  const [copiedWebsiteId, setCopiedWebsiteId] = useState<string | null>(null);
  const [copiedDeleteNameId, setCopiedDeleteNameId] = useState<string | null>(
    null,
  );
  const [progressTick, setProgressTick] = useState(() => Date.now());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(
    null,
  );
  const [renamingWebsiteId, setRenamingWebsiteId] = useState<string | null>(null);
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<string | null>(null);
  const [domainActionWebsiteId, setDomainActionWebsiteId] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | null>(
    null,
  );
  const [showProSheet, setShowProSheet] = useState(false);
  const [activeEditModalRequestId, setActiveEditModalRequestId] = useState<
    string | null
  >(null);
  const [dismissedEditRequestIds, setDismissedEditRequestIds] = useState<
    Record<string, true>
  >({});
  const [celebration, setCelebration] = useState<
    "upgraded" | "cancelled" | null
  >(null);
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [websiteActionModal, setWebsiteActionModal] =
    useState<WebsiteActionModal>(null);

  const isPro =
    user?.plan === "pro" && PRO_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus);
  const websiteLimit = isPro ? 3 : 1;
  const activeWebsiteCount = websites.length + activeRefreshJobs.length;
  const canAddWebsite = activeWebsiteCount < websiteLimit;
  const websiteUsagePercent = Math.min(
    100,
    Math.round((activeWebsiteCount / websiteLimit) * 100),
  );
  const websitesRemaining = Math.max(0, websiteLimit - activeWebsiteCount);
  const hasActiveRefreshJobs = activeRefreshJobs.length > 0;
  const hasActiveEdit = websites.some(
    (website) =>
      website.latestEditRequest &&
      ACTIVE_EDIT_STATUSES.has(website.latestEditRequest.status),
  );
  const hasActivePageGeneration = websites.some(
    (website) => website.jobStatus === "building_pages",
  );
  const activeEditWebsites = useMemo(
    () =>
      websites.filter(
        (website) =>
          website.latestEditRequest &&
          ACTIVE_EDIT_STATUSES.has(website.latestEditRequest.status),
      ),
    [websites],
  );
  const activeEditWebsite = useMemo(
    () =>
      activeEditWebsites.find(
        (website) =>
          website.latestEditRequest?.id === activeEditModalRequestId,
      ) ??
      activeEditWebsites.find(
        (website) =>
          website.latestEditRequest &&
          !dismissedEditRequestIds[website.latestEditRequest.id],
      ) ??
      null,
    [activeEditModalRequestId, activeEditWebsites, dismissedEditRequestIds],
  );
  const activeEditRequest = activeEditWebsite?.latestEditRequest ?? null;
  const showActiveEditModal = Boolean(activeEditWebsite && activeEditRequest);
  const activeEditStageIndex = activeEditRequest
    ? editProgressStageIndex(activeEditRequest.createdAt, progressTick)
    : 0;
  const activePagesWebsites = useMemo(
    () => websites.filter((website) => website.jobStatus === "building_pages"),
    [websites],
  );
  const activePagesWebsite = useMemo(
    () =>
      activePagesWebsites.find(
        (website) => website.id === activePagesModalWebsiteId,
      ) ??
      activePagesWebsites.find(
        (website) => !dismissedPagesJobIds[website.jobId],
      ) ??
      null,
    [activePagesModalWebsiteId, activePagesWebsites, dismissedPagesJobIds],
  );
  const showActivePagesModal = Boolean(activePagesWebsite);
  const activePagesStageIndex = activePagesWebsite
    ? pageProgressStageIndex(activePagesWebsite.updatedAt, progressTick)
    : 0;
  const pageChooserWebsite = pageChooserWebsiteId
    ? websites.find((website) => website.id === pageChooserWebsiteId) ?? null
    : null;
  const canSubmitPageGeneration =
    pageGenerationType === "business" ||
    (pageGenerationType === "legal" &&
      legalAnswers.businessLegalName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalAnswers.privacyEmail.trim())) ||
    (pageGenerationType === "custom" &&
      customPageRequest.title.trim().length > 0 &&
      customPageRequest.brief.trim().length > 0);

  const loadDashboard = async (cancelled?: () => boolean) => {
    try {
      const [meResponse, websitesResponse] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/websites"),
      ]);

      const mePayload = await meResponse.json();

      if (!meResponse.ok || !mePayload.user) {
        window.location.href = "/";
        return;
      }

      const websitesPayload = await websitesResponse.json();

      if (!websitesResponse.ok) {
        throw new Error(websitesPayload.error ?? "Failed to load websites");
      }

      if (!cancelled?.()) {
        setUser(mePayload.user);
        setWebsites(websitesPayload.websites ?? []);
        setActiveRefreshJobs(websitesPayload.activeRefreshJobs ?? []);
      }
    } catch (error) {
      if (!cancelled?.()) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load dashboard",
        );
      }
    } finally {
      if (!cancelled?.()) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Returning from Stripe: celebrate (or reassure), then tidy the URL.
    const params = new URLSearchParams(window.location.search);
    if (params.has("upgraded")) {
      setCelebration("upgraded");
    } else if (params.has("upgrade_cancelled")) {
      setCelebration("cancelled");
    }

    if (
      params.has("tour") &&
      window.localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY) !== "true"
    ) {
      setShowDashboardTour(true);
    }

    if (
      params.has("upgraded") ||
      params.has("upgrade_cancelled") ||
      params.has("tour")
    ) {
      window.history.replaceState(null, "", "/dashboard");
    }

    void loadDashboard(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, []);

  // After an upgrade, the Stripe webhook can take a few seconds to flip the
  // account to Pro — keep refreshing until it lands.
  useEffect(() => {
    if (celebration !== "upgraded" || isPro) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 10) {
        window.clearInterval(timer);
        return;
      }
      void loadDashboard(() => cancelled);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [celebration, isPro]);

  useEffect(() => {
    if (!hasActiveEdit && !hasActivePageGeneration && !hasActiveRefreshJobs) {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(() => {
      void loadDashboard(() => cancelled);
    }, EDIT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasActiveEdit, hasActivePageGeneration, hasActiveRefreshJobs]);

  // Close the image preview with the Escape key.
  useEffect(() => {
    if (!lightboxUrl) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxUrl(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxUrl]);

  // Advances in-progress edit/page messages between polls.
  useEffect(() => {
    if (!hasActiveEdit && !hasActivePageGeneration) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgressTick(Date.now());
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasActiveEdit, hasActivePageGeneration]);

  const openProSheet = () => {
    setErrorMessage(null);
    setShowProSheet(true);
  };

  const dismissDashboardTour = () => {
    setShowDashboardTour(false);
    window.localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, "true");
  };

  const openPageChooser = (website: Website) => {
    setPageGenerationType("business");
    setLegalAnswers({
      ...DEFAULT_LEGAL_ANSWERS,
      businessLegalName: website.brandName ?? "",
      tradingName: website.brandName ?? "",
      privacyEmail: user?.email ?? "",
    });
    setCustomPageRequest(DEFAULT_CUSTOM_PAGE_REQUEST);
    setPageChooserWebsiteId(website.id);
    setWebsiteActionModal(null);
    setErrorMessage(null);
  };

  const updateLegalAnswer = <Key extends keyof LegalAnswersState>(
    key: Key,
    value: LegalAnswersState[Key],
  ) => {
    setLegalAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateCustomPageRequest = <Key extends keyof CustomPageRequestState>(
    key: Key,
    value: CustomPageRequestState[Key],
  ) => {
    setCustomPageRequest((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.localStorage.removeItem("refresh-kiwi:active-job");
      window.location.href = "/";
    }
  };

  const startBillingFlow = async (kind: "checkout" | "portal") => {
    if (kind === "checkout" && !pricing.checkoutAllowed) {
      setShowProSheet(false);
      setErrorMessage(
        pricing.checkoutUnavailableMessage ?? "Kiwi Pro is not available yet.",
      );
      return;
    }

    setBillingAction(kind);
    setErrorMessage(null);
    const metaEventId =
      kind === "checkout" ? createMetaEventId("checkout") : null;

    try {
      const response = await fetch(
        kind === "checkout" ? "/api/stripe/checkout" : "/api/stripe/portal",
        {
          method: "POST",
          headers: metaEventId ? { "Content-Type": "application/json" } : undefined,
          body: metaEventId
            ? JSON.stringify({ metaEventId, currency: selectedCurrency })
            : undefined,
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Billing action failed");
      }

      if (metaEventId) {
        trackMetaBrowserEvent({
          eventName: "InitiateCheckout",
          eventId: metaEventId,
          customData: {
            content_name: "Kiwi Pro",
            currency: pricing.currency,
          },
        });
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Billing action failed",
      );
      setBillingAction(null);
    }
  };

  const submitEditRequest = async (websiteId: string) => {
    const prompt = editPrompts[websiteId]?.trim() ?? "";
    const website = websites.find((item) => item.id === websiteId);
    const editTarget = editTargets[websiteId] ?? "__site__";
    const targetPage = website?.pages.find((page) => page.path === editTarget);
    const finalPrompt =
      targetPage && editTarget !== "__site__"
        ? `On the "${targetPage.title}" page (${targetPage.path}), ${prompt}`
        : prompt;

    if (prompt.length < 5) {
      setErrorMessage("Tell us what you want changed");
      return;
    }

    setSubmittingEditId(websiteId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to queue edit");
      }

      setEditPrompts((current) => ({ ...current, [websiteId]: "" }));
      closeWebsiteActionModal();
      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to queue edit",
      );
    } finally {
      setSubmittingEditId(null);
    }
  };

  const publishWebsite = async (websiteId: string) => {
    setPublishingWebsiteId(websiteId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/publish`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to keep website live");
      }

      await loadDashboard();
      closeWebsiteActionModal();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to keep website live",
      );
    } finally {
      setPublishingWebsiteId(null);
    }
  };

  const cancelRefreshJob = async (jobId: string) => {
    setCancellingRefreshJobId(jobId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/refresh/${jobId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to cancel refresh");
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to cancel refresh",
      );
    } finally {
      setCancellingRefreshJobId(null);
    }
  };

  const cancelEditRequest = async (websiteId: string, editRequestId: string) => {
    setCancellingEditRequestId(editRequestId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/websites/${websiteId}/edits/${editRequestId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to cancel edit");
      }

      setActiveEditModalRequestId(null);
      setDismissedEditRequestIds((current) => ({
        ...current,
        [editRequestId]: true,
      }));
      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to cancel edit",
      );
    } finally {
      setCancellingEditRequestId(null);
    }
  };

  const generateAdditionalPages = async (
    websiteId: string,
    type: PageGenerationType = "business",
  ) => {
    const website = websites.find((item) => item.id === websiteId);

    setGeneratingPagesWebsiteId(websiteId);
    setPageGenerationType(type);
    setActivePagesModalWebsiteId(websiteId);
    if (website) {
      setDismissedPagesJobIds((current) => {
        const next = { ...current };
        delete next[website.jobId];
        return next;
      });
    }
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "legal"
            ? { type, answers: legalAnswers }
            : type === "custom"
              ? {
                  type,
                  title: customPageRequest.title,
                  brief: customPageRequest.brief,
                }
            : { type: "business" },
        ),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate additional pages");
      }

      await loadDashboard();
      setPageChooserWebsiteId(null);
      setWebsiteActionModal(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate additional pages",
      );
    } finally {
      setGeneratingPagesWebsiteId(null);
    }
  };

  const loadWebsiteImages = async (websiteId: string) => {
    setWebsiteImages((current) => ({
      ...current,
      [websiteId]: { status: "loading" },
    }));

    try {
      const response = await fetch(`/api/websites/${websiteId}/images`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load images");
      }

      setWebsiteImages((current) => ({
        ...current,
        [websiteId]: { status: "ready", images: payload.images ?? [] },
      }));
    } catch {
      setWebsiteImages((current) => ({
        ...current,
        [websiteId]: { status: "error" },
      }));
    }
  };

  const closeWebsiteActionModal = () => {
    setWebsiteActionModal(null);
    setConfirmRegenerateId(null);
  };

  const openWebsiteActionModal = (
    website: Website,
    type: WebsiteActionModalType,
  ) => {
    setWebsiteActionModal({ websiteId: website.id, type });
    setConfirmRegenerateId(null);
    setErrorMessage(null);

    if (type === "images" && websiteImages[website.id]?.status !== "ready") {
      void loadWebsiteImages(website.id);
    }

    if (type === "domain" || type === "rename" || type === "delete") {
      setRenameValues((current) => ({
        ...current,
        [website.id]:
          current[website.id] ?? website.brandName ?? website.slug,
      }));
      setDomainValues((current) => ({
        ...current,
        [website.id]: current[website.id] ?? website.customDomain ?? "",
      }));
    }
  };

  const uploadImages = async (websiteId: string, form: HTMLFormElement) => {
    const body = new FormData(form);
    const files = body
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      setErrorMessage("Choose at least one image to upload");
      return;
    }

    setUploadingImagesWebsiteId(websiteId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/images`, {
        method: "POST",
        body,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to upload images");
      }

      const uploaded = (payload.images ?? []) as WebsiteImage[];

      setWebsiteImages((current) => {
        const state = current[websiteId];
        const existing = state?.status === "ready" ? state.images : [];
        const existingIds = new Set(existing.map((image) => image.id));

        return {
          ...current,
          [websiteId]: {
            status: "ready",
            images: [
              ...existing,
              ...uploaded.filter((image) => !existingIds.has(image.id)),
            ],
          },
        };
      });

      form.reset();

      if (payload.queued) {
        await loadDashboard();
        setWebsiteActionModal({ websiteId, type: "images" });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload images",
      );
    } finally {
      setUploadingImagesWebsiteId(null);
    }
  };

  const generateImage = async (websiteId: string, form: HTMLFormElement) => {
    const body = new FormData(form);
    const prompt = String(body.get("prompt") ?? "").trim();

    if (prompt.length < 10) {
      setErrorMessage("Describe the image you want in a little more detail");
      return;
    }

    setGeneratingImageWebsiteId(websiteId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          role: String(body.get("role") ?? "image"),
          placement: String(body.get("placement") ?? "auto"),
          note: String(body.get("note") ?? "").trim() || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate image");
      }

      const generated = payload.image as WebsiteImage;

      setWebsiteImages((current) => {
        const state = current[websiteId];
        const existing = state?.status === "ready" ? state.images : [];
        const alreadyExists = existing.some((image) => image.id === generated.id);

        return {
          ...current,
          [websiteId]: {
            status: "ready",
            images: alreadyExists ? existing : [...existing, generated],
          },
        };
      });

      form.reset();

      if (payload.website) {
        setWebsites((current) =>
          current.map((entry) =>
            entry.id === websiteId
              ? {
                  ...entry,
                  freeEditsUsed: payload.website.freeEditsUsed,
                  freeEditsLimit: payload.website.freeEditsLimit,
                  freeEditsRemaining: payload.website.freeEditsRemaining,
                }
              : entry,
          ),
        );
      }

      if (payload.queued) {
        await loadDashboard();
        setWebsiteActionModal({ websiteId, type: "images" });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate image",
      );
    } finally {
      setGeneratingImageWebsiteId(null);
    }
  };

  const replaceImage = async (
    websiteId: string,
    imageId: string,
    file: File,
  ) => {
    setReplacingImageId(imageId);
    setErrorMessage(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(
        `/api/websites/${websiteId}/images/${imageId}`,
        { method: "POST", body },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to replace image");
      }

      setWebsiteImages((current) => {
        const state = current[websiteId];

        if (state?.status !== "ready") {
          return current;
        }

        return {
          ...current,
          [websiteId]: {
            status: "ready",
            images: state.images.map((image) =>
              image.id === imageId ? (payload.image as WebsiteImage) : image,
            ),
          },
        };
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to replace image",
      );
    } finally {
      setReplacingImageId(null);
    }
  };

  const copyWebsiteAddress = async (website: Website) => {
    const address = websiteAddress(website);

    try {
      await navigator.clipboard.writeText(address);
      setCopiedWebsiteId(website.id);
      window.setTimeout(() => {
        setCopiedWebsiteId((current) =>
          current === website.id ? null : current,
        );
      }, 2000);
    } catch {
      // Clipboard can be blocked — select-and-copy still works on the text.
    }
  };

  const copyDeleteConfirmationName = async (website: Website) => {
    const name = website.brandName || website.slug;

    try {
      await navigator.clipboard.writeText(name);
      setCopiedDeleteNameId(website.id);
      window.setTimeout(() => {
        setCopiedDeleteNameId((current) =>
          current === website.id ? null : current,
        );
      }, 2000);
    } catch {
      setDeleteConfirmations((current) => ({
        ...current,
        [website.id]: name,
      }));
    }
  };

  const updateImageInState = (websiteId: string, image: WebsiteImage) => {
    setWebsiteImages((current) => {
      const state = current[websiteId];

      if (state?.status !== "ready") {
        return current;
      }

      return {
        ...current,
        [websiteId]: {
          status: "ready",
          images: state.images.map((entry) =>
            entry.id === image.id ? image : entry,
          ),
        },
      };
    });
  };

  const remixImage = async (websiteId: string, imageId: string) => {
    setRemixingImageId(imageId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/websites/${websiteId}/images/${imageId}/remix`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: remixNotes[imageId]?.trim() || undefined }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remix image");
      }

      updateImageInState(websiteId, payload.image as WebsiteImage);
      setRemixNoteImageId(null);
      setRemixNotes((current) => ({ ...current, [imageId]: "" }));

      // Remixes count as a change for free accounts — keep the counter fresh.
      if (payload.website) {
        setWebsites((current) =>
          current.map((entry) =>
            entry.id === websiteId
              ? {
                  ...entry,
                  freeEditsUsed: payload.website.freeEditsUsed,
                  freeEditsLimit: payload.website.freeEditsLimit,
                  freeEditsRemaining: payload.website.freeEditsRemaining,
                }
              : entry,
          ),
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remix image",
      );
    } finally {
      setRemixingImageId(null);
    }
  };

  const placeImageAsLogo = async (websiteId: string, imageId: string) => {
    setPlacingImageId(imageId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/websites/${websiteId}/images/${imageId}/place`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "logo",
            placement: "header_logo",
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to place image");
      }

      updateImageInState(websiteId, payload.image as WebsiteImage);

      if (payload.website) {
        setWebsites((current) =>
          current.map((entry) =>
            entry.id === websiteId
              ? {
                  ...entry,
                  freeEditsUsed: payload.website.freeEditsUsed,
                  freeEditsLimit: payload.website.freeEditsLimit,
                  freeEditsRemaining: payload.website.freeEditsRemaining,
                }
              : entry,
          ),
        );
      }

      if (payload.queued) {
        await loadDashboard();
        setWebsiteActionModal({ websiteId, type: "images" });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to place image",
      );
    } finally {
      setPlacingImageId(null);
    }
  };

  const revertImage = async (
    websiteId: string,
    imageId: string,
    file: string,
  ) => {
    setRevertingImageId(imageId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/websites/${websiteId}/images/${imageId}/revert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to restore image");
      }

      updateImageInState(websiteId, payload.image as WebsiteImage);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to restore image",
      );
    } finally {
      setRevertingImageId(null);
    }
  };

  const renameWebsite = async (website: Website) => {
    const name = (renameValues[website.id] ?? website.brandName ?? website.slug).trim();

    setRenamingWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to rename website");
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to rename website",
      );
    } finally {
      setRenamingWebsiteId(null);
    }
  };

  const deleteWebsite = async (website: Website) => {
    setDeletingWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: deleteConfirmations[website.id] ?? "",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete website");
      }

      // If the landing page still has this job stored for resume, drop it so
      // the deleted website can't reappear there.
      try {
        const raw = window.localStorage.getItem("refresh-kiwi:active-job");
        if (raw) {
          const stored = JSON.parse(raw) as { jobId?: string };
          if (stored.jobId === website.jobId) {
            window.localStorage.removeItem("refresh-kiwi:active-job");
          }
        }
      } catch {
        // Storage unavailable — the landing page will clear it via the API.
      }

      closeWebsiteActionModal();
      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete website",
      );
    } finally {
      setDeletingWebsiteId(null);
    }
  };

  const connectDomain = async (website: Website) => {
    const domain = (domainValues[website.id] ?? website.customDomain ?? "").trim();

    setDomainActionWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to connect domain");
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect domain",
      );
    } finally {
      setDomainActionWebsiteId(null);
    }
  };

  const checkDomain = async (website: Website) => {
    setDomainActionWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}/domain`, {
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to check domain");
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to check domain",
      );
    } finally {
      setDomainActionWebsiteId(null);
    }
  };

  const removeDomain = async (website: Website) => {
    setDomainActionWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}/domain`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove domain");
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remove domain",
      );
    } finally {
      setDomainActionWebsiteId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-5 text-[#141811] sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="relative flex items-center justify-between gap-4 border-b border-black/5 pb-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={34}
              height={34}
              aria-hidden
              className="shrink-0 rounded-full"
            />
            <span className="hidden truncate font-dosis text-[27px] font-medium leading-tight tracking-tight min-[380px]:inline-block">
              Refresh Kiwi
            </span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {isPro ? (
              <button
                type="button"
                onClick={() => void startBillingFlow("portal")}
                disabled={billingAction !== null}
                className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction === "portal" ? "Opening..." : "Manage billing"}
              </button>
            ) : null}
            <Link
              href="/account"
              className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Account
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Log out
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDashboardMenu((open) => !open)}
            aria-expanded={showDashboardMenu}
            aria-controls="dashboard-mobile-menu"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:border-black/25 md:hidden"
          >
            <span className="flex h-4 w-4 flex-col justify-center gap-1" aria-hidden>
              <span className="block h-0.5 rounded-full bg-current" />
              <span className="block h-0.5 rounded-full bg-current" />
              <span className="block h-0.5 rounded-full bg-current" />
            </span>
            Menu
          </button>
          {showDashboardMenu ? (
            <div
              id="dashboard-mobile-menu"
              className="absolute right-0 top-full z-30 mt-3 w-full rounded-3xl border border-black/10 bg-white p-3 shadow-2xl shadow-black/10 md:hidden"
            >
              <div className="grid gap-2">
                {isPro ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDashboardMenu(false);
                      void startBillingFlow("portal");
                    }}
                    disabled={billingAction !== null}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-semibold text-black/70 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {billingAction === "portal" ? "Opening..." : "Manage billing"}
                  </button>
                ) : null}
                <Link
                  href="/account"
                  onClick={() => setShowDashboardMenu(false)}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 transition hover:border-black/25 hover:text-black"
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowDashboardMenu(false);
                    void logout();
                  }}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-semibold text-black/70 transition hover:border-black/25 hover:text-black"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {celebration === "upgraded" ? (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-3xl border-2 border-kiwi-green bg-[#f4fbe8] p-5 sm:p-6">
            <div>
              <p className="font-fraunces text-xl font-semibold text-black">
                You&apos;re on Kiwi Pro! 🥝
              </p>
              <p className="mt-1 text-sm leading-6 text-black/60">
                Your website is going live now. You&apos;ve got unlimited
                changes, extra pages, and you can connect your own web address
                below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCelebration(null)}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/60"
              aria-label="Dismiss"
            >
              Close
            </button>
          </div>
        ) : celebration === "cancelled" ? (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-3xl border border-black/10 bg-white p-5 sm:p-6">
            <p className="text-sm leading-6 text-black/60">
              No problem — nothing was charged and your preview is safe. You
              can go Pro whenever you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => setCelebration(null)}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/60"
              aria-label="Dismiss"
            >
              Close
            </button>
          </div>
        ) : null}

        <section className="mt-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                Your websites
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
                Everything you need to edit and manage your new websites.
              </p>
            </div>

            {canAddWebsite ? (
              <Link
                href="/?new=1"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17351d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2514]"
              >
                <span aria-hidden className="text-base leading-none">
                  +
                </span>
                Create a new website
              </Link>
            ) : !isPro ? (
              <button
                type="button"
                onClick={openProSheet}
                disabled={billingAction !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#17351d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2514] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upgrade to create more
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startBillingFlow("portal")}
                disabled={billingAction !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#17351d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2514] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Plan limit reached
              </button>
            )}
          </div>

          <div className="mt-7 grid gap-4">
            <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-kiwi-green/25 text-[#3f8f22]">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.5 4A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h13a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 18.5 4h-13ZM5 8.5v-2c0-.28.22-.5.5-.5h13c.28 0 .5.22.5.5v2H5Zm2 3.25c0-.41.34-.75.75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm6 0c0-.41.34-.75.75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75ZM7.75 15a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Zm5.25.75c0-.41.34-.75.75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-normal uppercase text-black/45">
                    Websites used
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {activeWebsiteCount} of {websiteLimit}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-black/55">
                {websitesRemaining > 0
                  ? `You can create ${websitesRemaining} more ${pluralise(
                      websitesRemaining,
                      "website",
                    )}.`
                  : "You have used your current website allowance."}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[#C5E66A]"
                  style={{ width: `${websiteUsagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {hasActiveEdit ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-black/50">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
              />
              Making your change — usually takes a few minutes…
            </p>
          ) : null}
          {hasActivePageGeneration ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-black/50">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
              />
              Building your other pages — this can take a few minutes…
            </p>
          ) : null}
          {hasActiveRefreshJobs ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-black/50">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
              />
              Refreshing {activeRefreshJobs.length}{" "}
              {pluralise(activeRefreshJobs.length, "website")} — you can leave
              this page and it will keep going.
            </p>
          ) : null}
        </section>

        {showDashboardTour && !isLoading && websites.length > 0 ? (
          <section className="relative mt-6 overflow-hidden rounded-3xl border-2 border-kiwi-green bg-[#C5E66A] p-5 shadow-xl shadow-[#8bbf4d]/10 sm:p-6">
            <Image
              src={kiwiGroupBackground}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 1152px, 100vw"
              className="object-cover opacity-30 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-[#C5E66A]/82" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_38%_25%,rgba(255,255,255,0.68)_0%,rgba(255,255,255,0.36)_38%,rgba(255,255,255,0)_76%)]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
                  Quick tour
                </p>
                <h2 className="mt-2 font-fraunces text-2xl font-semibold tracking-tight">
                  Your website is saved. Here&apos;s where to make it yours.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                  Everything you need is on this dashboard. Start with your
                  website card below, then use the buttons on that card when you
                  want changes, images, or your own web address.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissDashboardTour}
                aria-label="Dismiss quick tour"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10 bg-white/90 text-black/45 shadow-sm backdrop-blur transition hover:border-black/25 hover:text-black"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                >
                  <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" />
                </svg>
              </button>
            </div>

            <div className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Your website card",
                  body: "This shows the website you just made, its web address, free changes left, and whether it is live or still a free preview.",
                },
                {
                  title: "Edit website",
                  body: "Use this when you want wording, layout, colours, sections, or contact details changed. Just type what you want.",
                },
                {
                  title: "Images",
                  body: "Replace photos with your own, recreate an image, or go back to an earlier version if you change your mind.",
                },
                {
                  title: "Manage",
                  body: "Rename the site, copy the link, remove it, or connect your own domain when you are ready to put it online.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-black/10 bg-white/88 p-4 shadow-sm backdrop-blur"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-kiwi-green text-xs font-black text-black">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-black">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-black/55">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          {isLoading ? (
            <div className="rounded-3xl border border-black/10 bg-white p-8 text-center text-sm text-black/50">
              Loading your websites…
            </div>
          ) : websites.length === 0 && activeRefreshJobs.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-white p-8 text-center">
              <h2 className="font-fraunces text-2xl font-semibold">
                No websites saved yet
              </h2>
              <p className="mt-2 text-sm text-black/55">
                Generate a homepage preview, then save it to your account.
              </p>
              <Link
                href="/?new=1"
                className="mt-5 inline-flex rounded-full bg-kiwi-green px-6 py-3 text-sm font-semibold text-black"
              >
                Refresh my first website
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeRefreshJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-3xl border-2 border-kiwi-green/70 bg-[#f8fde9] p-5 shadow-lg shadow-[#8bbf4d]/10 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-fraunces text-2xl font-semibold">
                          {activeJobTitle(job)}
                        </h2>
                        <span className="rounded-full bg-kiwi-green px-3 py-1 text-xs font-semibold text-black">
                          Processing
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-black/50">
                        {job.generationMode === "fresh"
                          ? "Creating a new website from your brief"
                          : `Refreshing ${sourceHostname(job.sourceUrl)}`}
                      </p>
                      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
                        <Image
                          src="/refresh-kiwi-favicon-v2.png"
                          alt=""
                          width={22}
                          height={22}
                          className="kiwi-bob shrink-0 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-semibold text-black">
                            {job.statusMessage}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-black/50">
                            Usually about 2 minutes. Your preview will appear
                            here automatically when it is ready.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          void cancelRefreshJob(job.id);
                        }}
                        disabled={cancellingRefreshJobId === job.id}
                        className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-center text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingRefreshJobId === job.id
                          ? "Cancelling..."
                          : job.generationMode === "fresh"
                            ? "Cancel creation"
                            : "Cancel refresh"}
                      </button>
                      <Link
                        href="/"
                        className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-center text-sm font-semibold text-black transition hover:border-black/25"
                      >
                        Back to homepage
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
              {websites.map((website) => {
                const state = websiteState(website, isPro);
                const screenshotUrl = website.homepageScreenshotUrl;
                const generatedPages = website.pages.filter(
                  (page) => page.path !== "/",
                );
                const isGeneratingPages = website.jobStatus === "building_pages";
                const imagesState = websiteImages[website.id];
                const hasActiveEditForWebsite = Boolean(
                  website.latestEditRequest &&
                    ACTIVE_EDIT_STATUSES.has(website.latestEditRequest.status),
                );
                const isUploadingImages =
                  uploadingImagesWebsiteId === website.id;
                const isGeneratingImage =
                  generatingImageWebsiteId === website.id;
                const imageActionBusy =
                  isUploadingImages ||
                  isGeneratingImage ||
                  replacingImageId !== null ||
                  remixingImageId !== null ||
                  placingImageId !== null ||
                  revertingImageId !== null ||
                  hasActiveEditForWebsite;
                const address = websiteAddress(website);
                const displayAddress = address.replace(/^https?:\/\//, "");

                return (
                  <article
                    key={website.id}
                    className={`overflow-hidden rounded-3xl border bg-white shadow-lg shadow-black/5 ${
                      state.canView
                        ? "border-black/10"
                        : "border-red-100"
                    }`}
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-[#f0f4e7] sm:h-44 sm:w-72">
                        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs font-semibold text-black/35">
                          Homepage preview
                        </div>
                        {state.canView ? (
                          <a
                            href={address}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${website.brandName || website.slug} homepage`}
                            className="absolute inset-0 block transition hover:opacity-90"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={screenshotUrl}
                              alt={`${website.brandName || website.slug} homepage screenshot`}
                              loading="lazy"
                              className="h-full w-full object-cover object-top"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          </a>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col self-stretch">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <h2 className="truncate font-fraunces text-2xl font-semibold leading-tight">
                                {website.brandName || website.slug}
                              </h2>
                              <button
                                type="button"
                                onClick={() => openWebsiteActionModal(website, "rename")}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black"
                                aria-label={`Rename ${website.brandName || website.slug}`}
                              >
                                <svg
                                  aria-hidden
                                  viewBox="0 0 16 16"
                                  className="h-3.5 w-3.5"
                                  fill="currentColor"
                                >
                                  <path d="M11.7 1.9a1.5 1.5 0 0 1 2.1 2.1l-.8.8-2.1-2.1.8-.8Zm-1.5 1.5 2.1 2.1-6.8 6.8-2.6.5.5-2.6 6.8-6.8Z" />
                                </svg>
                              </button>
                            </div>
                            {state.canView ? (
                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                                <a
                                  href={address}
                                  target="_blank"
                                  className="min-w-0 truncate text-sm font-semibold text-[#3f8f22] underline-offset-2 hover:underline"
                                >
                                  {displayAddress}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => void copyWebsiteAddress(website)}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black"
                                  aria-label={`Copy ${displayAddress}`}
                                >
                                  <DashboardIcon
                                    name={
                                      copiedWebsiteId === website.id ? "check" : "copy"
                                    }
                                    className="h-3.5 w-3.5"
                                  />
                                </button>
                              </div>
                            ) : (
                              <p className="mt-1 text-sm text-black/50">
                                {websiteSourceLabel(website)}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${state.badgeClass}`}
                          >
                            {state.label}
                          </span>
                        </div>

                        {state.description ? (
                          <p className="mt-2 text-sm font-medium text-black/55">
                            {state.description}
                          </p>
                        ) : null}
                        <div className="mt-auto pt-4">
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-black/45">
                            {generatedPages.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <DashboardIcon
                                  name="pages"
                                  className="h-3.5 w-3.5"
                                />
                                {generatedPages.length}{" "}
                                {pluralise(generatedPages.length, "page")}
                              </span>
                            ) : null}
                            {!isPro && website.status !== "live" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <DashboardIcon
                                  name="calendar"
                                  className="h-3.5 w-3.5"
                                />
                                Free preview until {formatDate(website.expiresAt)}
                              </span>
                            ) : null}
                            {website.publishedAt ? (
                              <span className="inline-flex items-center gap-1.5">
                                <DashboardIcon
                                  name="rocket"
                                  className="h-3.5 w-3.5"
                                />
                                Published: {formatDate(website.publishedAt)}
                              </span>
                            ) : null}
                            {!isPro ? (
                              <span className="inline-flex items-center gap-1.5">
                                <DashboardIcon
                                  name="changes"
                                  className="h-3.5 w-3.5"
                                />
                                Free changes left: {website.freeEditsRemaining} of{" "}
                                {website.freeEditsLimit}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/10 pt-4">
                            {state.canView ? (
                              <Link
                                href={previewHref(website.slug)}
                                target="_blank"
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#141811] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                              >
                                <DashboardIcon name="external" />
                                {website.status === "live"
                                  ? "View website"
                                  : "View preview"}
                              </Link>
                            ) : null}
                            {isPro && state.showKeepLive ? (
                              <button
                                type="button"
                                onClick={() => void publishWebsite(website.id)}
                                disabled={publishingWebsiteId === website.id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-kiwi-green px-4 py-2 text-xs font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <DashboardIcon name="rocket" />
                                {publishingWebsiteId === website.id
                                  ? "Publishing…"
                                  : state.label === "Expired preview"
                                    ? "Restore live"
                                    : "Publish live"}
                              </button>
                            ) : null}
                            {!isPro && state.showKeepLive ? (
                              <button
                                type="button"
                                onClick={openProSheet}
                                className="inline-flex items-center gap-2 rounded-2xl bg-kiwi-green px-4 py-2 text-xs font-semibold text-black transition hover:bg-kiwi-green-hover"
                              >
                                <DashboardIcon name="rocket" />
                                {state.label === "Expired preview"
                                  ? `Go live again — ${pricing.proPriceShort}`
                                  : `Put it online — ${pricing.proPriceShort}`}
                              </button>
                            ) : null}
                            {state.canEdit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    hasActiveEditForWebsite &&
                                    website.latestEditRequest
                                  ) {
                                    setActiveEditModalRequestId(
                                      website.latestEditRequest.id,
                                    );
                                    return;
                                  }

                                  openWebsiteActionModal(website, "edit");
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:border-black/25"
                              >
                                <DashboardIcon name="edit" />
                                {hasActiveEditForWebsite ? "Edit status" : "Edit website"}
                              </button>
                            ) : null}
                            {state.canEdit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openWebsiteActionModal(website, "images")
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:border-black/25"
                              >
                                <DashboardIcon name="image" />
                                Images
                              </button>
                            ) : null}
                            {state.canView ? (
                              <button
                                type="button"
                                onClick={() => openWebsiteActionModal(website, "pages")}
                                disabled={
                                  isGeneratingPages ||
                                  generatingPagesWebsiteId === website.id
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <DashboardIcon name="pages" />
                                {isGeneratingPages ||
                                generatingPagesWebsiteId === website.id
                                  ? "Generating…"
                                  : "Pages"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openWebsiteActionModal(website, "domain")}
                              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:border-black/25"
                            >
                              <DashboardIcon name="globe" />
                              Manage domain
                            </button>
                            <button
                              type="button"
                              onClick={() => openWebsiteActionModal(website, "delete")}
                              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:text-red-700"
                            >
                              <DashboardIcon name="trash" />
                              Delete website
                            </button>
                          </div>
                        </div>

                        {website.latestEditRequest ? (
                          website.latestEditRequest.status === "queued" ||
                          website.latestEditRequest.status === "running" ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <Image
                                src="/refresh-kiwi-favicon-v2.png"
                                alt=""
                                width={18}
                                height={18}
                                className="kiwi-bob shrink-0"
                              />
                              <span
                                key={editProgressMessage(
                                  website.latestEditRequest.createdAt,
                                  progressTick,
                                )}
                                className="edit-message-in text-xs font-medium text-black/55"
                              >
                                {editProgressMessage(
                                  website.latestEditRequest.createdAt,
                                  progressTick,
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void cancelEditRequest(
                                    website.id,
                                    website.latestEditRequest!.id,
                                  );
                                }}
                                disabled={
                                  cancellingEditRequestId ===
                                  website.latestEditRequest.id
                                }
                                className="text-xs font-semibold text-black/45 underline underline-offset-2 transition hover:text-black disabled:opacity-50"
                              >
                                {cancellingEditRequestId ===
                                website.latestEditRequest.id
                                  ? "Cancelling..."
                                  : "Cancel edit"}
                              </button>
                            </div>
                          ) : website.latestEditRequest.status === "complete" ? (
                            null
                          ) : website.latestEditRequest.errorMessage ===
                            "Edit cancelled." ? (
                            <p className="mt-3 text-xs font-medium text-black/45">
                              Edit cancelled. You can request another change.
                            </p>
                          ) : (
                            <p className="mt-3 text-xs font-medium text-amber-700">
                              That change didn&apos;t work — please try again.
                              {website.latestEditRequest.errorMessage
                                ? ` (${website.latestEditRequest.errorMessage})`
                                : null}
                            </p>
                          )
                        ) : null}

                        {isGeneratingPages ? (
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                            <Image
                              src="/refresh-kiwi-favicon-v2.png"
                              alt=""
                              width={18}
                              height={18}
                              className="kiwi-bob shrink-0"
                            />
                            <span className="text-xs font-medium text-black/55">
                              Building your extra pages — usually takes a few minutes…
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePagesModalWebsiteId(website.id);
                                setDismissedPagesJobIds((current) => {
                                  const next = { ...current };
                                  delete next[website.jobId];
                                  return next;
                                });
                              }}
                              className="text-xs font-semibold text-black/45 underline underline-offset-2 transition hover:text-black"
                            >
                              View status
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "pages" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`pages-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <div className="preview-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                                Pages
                              </p>
                              <h2
                                id={`pages-modal-${website.id}`}
                                className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Manage pages
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                View existing pages or create extra pages for{" "}
                                {website.brandName || website.slug}.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeWebsiteActionModal}
                              className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              Close
                            </button>
                          </div>

                          <div className="mt-6 rounded-2xl bg-[#faf8f1] p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-black">
                                  Current pages
                                </p>
                                <p className="mt-1 text-xs text-black/45">
                                  View any page, then use Edit website for changes.
                                </p>
                              </div>
                              <span className="text-xs font-medium text-black/40">
                                {generatedPages.length}{" "}
                                {pluralise(generatedPages.length, "page")}
                              </span>
                            </div>
                            {generatedPages.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {generatedPages.map((page) => (
                                  <Link
                                    key={page.id}
                                    href={pageHref(website.slug, page.path)}
                                    target="_blank"
                                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/65 transition hover:border-black/25 hover:text-black"
                                  >
                                    {page.title}
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-black/45">
                                No extra pages yet.
                              </p>
                            )}
                          </div>

                          {state.canView && generatedPages.length === 0 ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isPro) {
                                    openProSheet();
                                    return;
                                  }

                                  openPageChooser(website);
                                }}
                                disabled={
                                  isGeneratingPages ||
                                  generatingPagesWebsiteId === website.id
                                }
                                className="rounded-3xl border border-black/10 bg-white p-4 text-left transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <span className="text-sm font-semibold text-black">
                                  Other pages
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-black/50">
                                  About, services, gallery, contact, FAQs and other
                                  useful pages from the current site.
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isPro) {
                                    openProSheet();
                                    return;
                                  }

                                  openPageChooser(website);
                                  setPageGenerationType("legal");
                                }}
                                disabled={
                                  isGeneratingPages ||
                                  generatingPagesWebsiteId === website.id
                                }
                                className="rounded-3xl border border-black/10 bg-white p-4 text-left transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <span className="text-sm font-semibold text-black">
                                  Legal pages
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-black/50">
                                  Starter privacy, cookie and terms pages. This is
                                  not legal advice.
                                </span>
                              </button>
                            </div>
                          ) : null}

                          {generatedPages.length > 0 && isPro && state.canView ? (
                            confirmRegenerateId === website.id ? (
                              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-semibold leading-5 text-amber-800">
                                  This rebuilds every additional page from scratch —
                                  any changes you&apos;ve made to them will be lost.
                                  Your homepage stays as it is.
                                </p>
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmRegenerateId(null);
                                      openPageChooser(website);
                                    }}
                                    className="rounded-full bg-[#141811] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                                  >
                                    Yes, start the pages again
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRegenerateId(null)}
                                    className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:border-black/25"
                                  >
                                    Keep my pages
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRegenerateId(website.id)}
                                disabled={
                                  isGeneratingPages ||
                                  generatingPagesWebsiteId === website.id
                                }
                                className="mt-4 text-xs font-semibold text-black/45 underline-offset-2 hover:text-black hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isGeneratingPages ||
                                generatingPagesWebsiteId === website.id
                                  ? "Rebuilding pages…"
                                  : "Start these pages again"}
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "images" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`images-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <div
                          id={`images-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-black/10 bg-[#faf8f1] p-5 shadow-2xl sm:p-6"
                        >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                              Images
                            </p>
                            <h2
                              id={`images-modal-${website.id}`}
                              className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                            >
                              Your images
                            </h2>
                            <p className="mt-1 text-xs text-black/45">
                              Swap any photo for your own, or let AI recreate
                              it. Changes go live straight away — and we keep
                              every old version so you can always go back.
                            </p>
                          </div>
                          {imagesState?.status === "ready" ? (
                            <span className="text-xs font-medium text-black/40">
                              {imagesState.images.length}{" "}
                              {pluralise(imagesState.images.length, "image")}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={closeWebsiteActionModal}
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                          >
                            Close
                          </button>
                        </div>

                        <form
                          className="mt-4 rounded-2xl border border-black/10 bg-white p-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void uploadImages(website.id, event.currentTarget);
                          }}
                        >
                          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.7fr_0.9fr]">
                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Upload images
                              </span>
                              <input
                                name="files"
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                                disabled={imageActionBusy || !state.canEdit}
                                className="mt-1 block w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-3 py-2 text-xs text-black/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Asset type
                              </span>
                              <select
                                name="role"
                                disabled={imageActionBusy || !state.canEdit}
                                defaultValue="image"
                                className="mt-1 h-10 w-full rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs font-medium text-black/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="image">Images</option>
                                <option value="logo">Logo / brand mark</option>
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Placement
                              </span>
                              <select
                                name="placement"
                                disabled={imageActionBusy || !state.canEdit}
                                defaultValue="auto"
                                className="mt-1 h-10 w-full rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs font-medium text-black/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {IMAGE_PLACEMENT_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input
                              name="note"
                              maxLength={500}
                              disabled={imageActionBusy || !state.canEdit}
                              placeholder="Optional — e.g. use these in the hero, or add a small gallery"
                              className="h-10 flex-1 rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs outline-none placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                              type="submit"
                              disabled={imageActionBusy || !state.canEdit}
                              className="h-10 rounded-full bg-kiwi-green px-4 text-xs font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUploadingImages
                                ? "Uploading..."
                                : hasActiveEditForWebsite
                                  ? "Edit in progress"
                                  : "Upload images"}
                            </button>
                          </div>
                          <p className="mt-2 text-[11px] leading-4 text-black/40">
                            Add up to 8 images. Choosing a placement queues a
                            design edit; “Just add to image library” stores the
                            files for later.
                          </p>
                        </form>

                        <form
                          className="mt-3 rounded-2xl border border-black/10 bg-white p-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void generateImage(website.id, event.currentTarget);
                          }}
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold text-black/70">
                                Generate image with AI
                              </p>
                              <p className="mt-1 text-[11px] leading-4 text-black/40">
                                Creates one new asset, saves it here, and can
                                place it into your design.
                              </p>
                            </div>
                            {!isPro ? (
                              <span className="text-[11px] font-medium text-black/40">
                                Uses 1 free change
                              </span>
                            ) : null}
                          </div>

                          <textarea
                            name="prompt"
                            required
                            minLength={10}
                            maxLength={1000}
                            disabled={imageActionBusy || !state.canEdit}
                            placeholder="Describe the image — e.g. warm photo-style hero image of a tidy local plumbing team beside a van"
                            className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-black/10 bg-[#faf8f1] px-3 py-2 text-xs leading-5 outline-none placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
                          />

                          <div className="mt-3 grid gap-3 lg:grid-cols-[0.7fr_0.9fr_1fr]">
                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Asset type
                              </span>
                              <select
                                name="role"
                                disabled={imageActionBusy || !state.canEdit}
                                defaultValue="image"
                                className="mt-1 h-10 w-full rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs font-medium text-black/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="image">Image</option>
                                <option value="logo">Logo / brand mark</option>
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Placement
                              </span>
                              <select
                                name="placement"
                                disabled={imageActionBusy || !state.canEdit}
                                defaultValue="auto"
                                className="mt-1 h-10 w-full rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs font-medium text-black/70 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {IMAGE_PLACEMENT_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-xs font-semibold text-black/60">
                                Placement note
                              </span>
                              <input
                                name="note"
                                maxLength={500}
                                disabled={imageActionBusy || !state.canEdit}
                                placeholder="Optional — e.g. make it the main hero visual"
                                className="mt-1 h-10 w-full rounded-full border border-black/10 bg-[#faf8f1] px-3 text-xs outline-none placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </label>
                          </div>

                          <button
                            type="submit"
                            disabled={imageActionBusy || !state.canEdit}
                            className="mt-3 h-10 rounded-full bg-[#141811] px-4 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isGeneratingImage
                              ? "Generating..."
                              : hasActiveEditForWebsite
                                ? "Edit in progress"
                                : "Generate image"}
                          </button>
                        </form>

                        {(() => {
                          if (!imagesState || imagesState.status === "loading") {
                            return (
                              <p className="mt-4 text-sm text-black/45">
                                Loading your images…
                              </p>
                            );
                          }

                          if (imagesState.status === "error") {
                            return (
                              <p className="mt-4 text-sm text-black/45">
                                We couldn&apos;t load your images just now —
                                close this and try again.
                              </p>
                            );
                          }

                          if (imagesState.images.length === 0) {
                            return (
                              <div className="mt-4 rounded-2xl bg-white/70 p-4">
                                <p className="text-sm font-semibold text-black">
                                  No images yet
                                </p>
                                <p className="mt-1 text-sm text-black/45">
                                  Upload images above and choose where they
                                  should go. Refresh Kiwi will save them here
                                  and can place them into your design.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {imagesState.images.map((image) => {
                                const isBusy =
                                  replacingImageId === image.id ||
                                  remixingImageId === image.id ||
                                  placingImageId === image.id ||
                                  revertingImageId === image.id;
                                const anyBusy =
                                  imageActionBusy;
                                const versions = image.history ?? [];

                                return (
                                  <div
                                    key={image.id}
                                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(image.url)}
                                      className="block w-full cursor-zoom-in"
                                      title="Click to see full size"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={image.url}
                                        alt=""
                                        loading="lazy"
                                        className="h-32 w-full bg-[#f0f4e7] object-cover transition hover:opacity-90"
                                      />
                                    </button>
                                    <div className="p-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <span className="inline-flex rounded-full bg-[#f0f4e7] px-2 py-0.5 text-[10px] font-semibold text-black/60">
                                            {imageRoleLabel(image.role)}
                                          </span>
                                          <p className="mt-1 truncate text-[11px] font-medium text-black/40">
                                            {imageSourceLabel(image.source)}
                                          </p>
                                        </div>
                                        {versions.length > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setHistoryOpenImageId((current) =>
                                                current === image.id
                                                  ? null
                                                  : image.id,
                                              )
                                            }
                                            className="shrink-0 text-[11px] font-semibold text-black/45 underline-offset-2 hover:underline"
                                          >
                                            {historyOpenImageId === image.id
                                              ? "Hide previous"
                                              : `Previous (${versions.length})`}
                                          </button>
                                        ) : null}
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        <label
                                          className={`cursor-pointer rounded-full border border-black/10 px-3 py-1 text-xs font-semibold transition hover:border-black/25 ${
                                            isBusy ? "cursor-wait opacity-50" : ""
                                          }`}
                                        >
                                          {replacingImageId === image.id
                                            ? "Uploading…"
                                            : "Replace"}
                                          <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                                            className="hidden"
                                            disabled={anyBusy}
                                            onChange={(event) => {
                                              const file =
                                                event.target.files?.[0];

                                              if (file) {
                                                void replaceImage(
                                                  website.id,
                                                  image.id,
                                                  file,
                                                );
                                              }

                                              event.target.value = "";
                                            }}
                                          />
                                        </label>
                                        {image.role !== "logo" ? (
                                          <button
                                            type="button"
                                            disabled={anyBusy}
                                            onClick={() =>
                                              void placeImageAsLogo(
                                                website.id,
                                                image.id,
                                              )
                                            }
                                            className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {placingImageId === image.id
                                              ? "Placing..."
                                              : "Use as logo"}
                                          </button>
                                        ) : null}
                                        {REMIXABLE_IMAGE_TYPES.has(
                                          image.contentType,
                                        ) ? (
                                          <button
                                            type="button"
                                            disabled={anyBusy}
                                            onClick={() =>
                                              setRemixNoteImageId((current) =>
                                                current === image.id
                                                  ? null
                                                  : image.id,
                                              )
                                            }
                                            className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {remixingImageId === image.id
                                              ? "Remixing…"
                                              : "AI remix"}
                                          </button>
                                        ) : null}
                                      </div>

                                      {remixNoteImageId === image.id ? (
                                        <form
                                          className="mt-2 flex flex-col gap-1.5"
                                          onSubmit={(event) => {
                                            event.preventDefault();
                                            void remixImage(
                                              website.id,
                                              image.id,
                                            );
                                          }}
                                        >
                                          <input
                                            value={remixNotes[image.id] ?? ""}
                                            onChange={(event) =>
                                              setRemixNotes((current) => ({
                                                ...current,
                                                [image.id]: event.target.value,
                                              }))
                                            }
                                            placeholder="Optional — e.g. remove the text"
                                            maxLength={500}
                                            className="h-9 rounded-full border border-black/10 bg-white px-3 text-xs outline-none placeholder:text-black/30 focus:border-black/30"
                                          />
                                          <button
                                            type="submit"
                                            disabled={anyBusy}
                                            className="h-9 rounded-full bg-kiwi-green px-3 text-xs font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {remixingImageId === image.id
                                              ? "Remixing — takes up to a minute…"
                                              : isPro
                                                ? "Remix this image"
                                                : "Remix this image (uses 1 free change)"}
                                          </button>
                                        </form>
                                      ) : null}

                                      {historyOpenImageId === image.id &&
                                      versions.length > 0 ? (
                                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                                          {[...versions]
                                            .reverse()
                                            .map((version) => (
                                              <div
                                                key={version.file}
                                                className="overflow-hidden rounded-xl border border-black/10"
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setLightboxUrl(version.url)
                                                  }
                                                  className="block w-full cursor-zoom-in"
                                                  title="Click to see full size"
                                                >
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img
                                                    src={version.url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-12 w-full bg-[#f0f4e7] object-cover"
                                                  />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={anyBusy}
                                                  onClick={() =>
                                                    void revertImage(
                                                      website.id,
                                                      image.id,
                                                      version.file,
                                                    )
                                                  }
                                                  className="w-full bg-white py-1 text-[10px] font-semibold text-black/60 transition hover:bg-[#f0f4e7] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                  {revertingImageId === image.id
                                                    ? "Restoring…"
                                                    : "Use this"}
                                                </button>
                                              </div>
                                            ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "domain" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`domain-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <div
                          id={`manage-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
                        >
                        <div className="rounded-2xl bg-[#faf8f1] p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                                Manage domain
                              </p>
                              <h2
                                id={`domain-modal-${website.id}`}
                                className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Connect your domain
                              </h2>
                              <p className="mt-1 text-xs leading-5 text-black/50">
                                Use a domain you already own, like www.yourbusiness.com.
                                We will set up the Refresh Kiwi side automatically.
                              </p>
                              {website.customDomain ? (
                                <p className="mt-2 text-xs font-semibold text-black/60">
                                  Status:{" "}
                                  <span className="capitalize">
                                    {website.customDomainStatus}
                                  </span>
                                </p>
                              ) : null}
                              {website.customDomainError ? (
                                <p className="mt-2 text-xs text-amber-700">
                                  {website.customDomainError}
                                </p>
                              ) : null}
                            </div>
                            {website.customDomainStatus === "connected" &&
                            website.customDomain ? (
                              <a
                                href={`https://${website.customDomain}`}
                                target="_blank"
                                className="rounded-full bg-[#141811] px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-black"
                              >
                                Open domain
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={closeWebsiteActionModal}
                              className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              Close
                            </button>
                          </div>

                          <form
                            className="mt-4 flex flex-col gap-3 sm:flex-row"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void connectDomain(website);
                            }}
                          >
                            <input
                              value={
                                domainValues[website.id] ??
                                website.customDomain ??
                                ""
                              }
                              onChange={(event) =>
                                setDomainValues((current) => ({
                                  ...current,
                                  [website.id]: event.target.value,
                                }))
                              }
                              placeholder="www.yourbusiness.com"
                              className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                            />
                            <button
                              type="submit"
                              disabled={domainActionWebsiteId === website.id}
                              className="h-11 rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {domainActionWebsiteId === website.id
                                ? "Working..."
                                : website.customDomain
                                  ? "Update domain"
                                  : "Connect domain"}
                            </button>
                          </form>

                          {website.customDomain ? (
                            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                              <p className="text-sm font-semibold text-black">
                                One last step — point your domain at us
                              </p>
                              <ol className="mt-2 space-y-1 text-xs leading-5 text-black/55">
                                <li>1. Log in where you bought the domain (GoDaddy, Namecheap, 123-reg, Cloudflare…).</li>
                                <li>2. Find “DNS settings” or “Manage DNS”.</li>
                                <li>3. Add this record exactly as shown:</li>
                              </ol>
                              <div className="mt-3 grid gap-2 rounded-2xl bg-[#fbfaf6] p-3 text-xs sm:grid-cols-3">
                                <div>
                                  <p className="font-semibold text-black/40">Type</p>
                                  <p className="mt-1 font-bold text-black">CNAME</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-black/40">Name</p>
                                  <p className="mt-1 font-bold text-black">www</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-black/40">Points to</p>
                                  <p className="mt-1 break-all font-bold text-black">
                                    {website.customDomainDnsTarget}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-black/45">
                                After saving, come back and press Check
                                connection. It often works within minutes, but
                                can take up to a day. Not comfortable with
                                this? Send these three values to whoever looks
                                after your domain — it&apos;s a 2-minute job
                                for them.
                              </p>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => void checkDomain(website)}
                                  disabled={domainActionWebsiteId === website.id}
                                  className="rounded-full bg-[#141811] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Check connection
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeDomain(website)}
                                  disabled={domainActionWebsiteId === website.id}
                                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Remove domain
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "rename" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`rename-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <div className="preview-pop w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                                Rename
                              </p>
                              <h2
                                id={`rename-modal-${website.id}`}
                                className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Rename website
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                Choose the display name shown on your dashboard.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeWebsiteActionModal}
                              className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              Close
                            </button>
                          </div>
                          <form
                            className="mt-6"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void renameWebsite(website);
                            }}
                          >
                            <label
                              htmlFor={`rename-${website.id}`}
                              className="text-sm font-semibold text-black"
                            >
                              Website name
                            </label>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                              <input
                                id={`rename-${website.id}`}
                                value={
                                  renameValues[website.id] ??
                                  website.brandName ??
                                  website.slug
                                }
                                onChange={(event) =>
                                  setRenameValues((current) => ({
                                    ...current,
                                    [website.id]: event.target.value,
                                  }))
                                }
                                className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                              />
                              <button
                                type="submit"
                                disabled={renamingWebsiteId === website.id}
                                className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {renamingWebsiteId === website.id
                                  ? "Saving..."
                                  : "Save name"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "delete" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`delete-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <div className="preview-pop w-full max-w-lg rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500/70">
                                Delete website
                              </p>
                              <h2
                                id={`delete-modal-${website.id}`}
                                className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Delete {website.brandName || website.slug}?
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                This removes the website from your dashboard. Type
                                the website name to confirm.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeWebsiteActionModal}
                              className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              Close
                            </button>
                          </div>
                          <p className="mt-6 text-xs leading-5 text-black/45">
                            Type{" "}
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-black">
                                {website.brandName || website.slug}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void copyDeleteConfirmationName(website)
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-black/45 transition hover:border-black/25 hover:text-black"
                                aria-label={`Copy ${
                                  website.brandName || website.slug
                                }`}
                              >
                                {copiedDeleteNameId === website.id ? (
                                  <span className="text-[10px] font-bold">✓</span>
                                ) : (
                                  <svg
                                    aria-hidden
                                    viewBox="0 0 16 16"
                                    className="h-3.5 w-3.5"
                                  >
                                    <path
                                      fill="currentColor"
                                      d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5A1.5 1.5 0 0 1 13 2.5v5A1.5 1.5 0 0 1 11.5 9h-5A1.5 1.5 0 0 1 5 7.5v-5Zm1.5-.25a.25.25 0 0 0-.25.25v5c0 .14.11.25.25.25h5c.14 0 .25-.11.25-.25v-5a.25.25 0 0 0-.25-.25h-5ZM3.5 5.25c-.14 0-.25.11-.25.25v7c0 .14.11.25.25.25h7c.14 0 .25-.11.25-.25V11H12v1.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H4v1.25h-.5Z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </span>{" "}
                            to delete it from your dashboard.
                          </p>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                              value={deleteConfirmations[website.id] ?? ""}
                              onChange={(event) =>
                                setDeleteConfirmations((current) => ({
                                  ...current,
                                  [website.id]: event.target.value,
                                }))
                              }
                              placeholder={website.brandName || website.slug}
                              className="h-11 flex-1 rounded-full border border-red-100 bg-white px-4 text-sm outline-none placeholder:text-black/25 focus:border-red-200"
                              aria-label="Delete confirmation"
                            />
                            <button
                              type="button"
                              onClick={() => void deleteWebsite(website)}
                              disabled={deletingWebsiteId === website.id}
                              className="h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingWebsiteId === website.id
                                ? "Deleting..."
                                : "Delete website"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "edit" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`edit-modal-${website.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
                      >
                        <form
                          id={`edit-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-black/10 bg-[#faf8f1] p-6 shadow-2xl sm:p-8"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void submitEditRequest(website.id);
                          }}
                        >
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                              Edit website
                            </p>
                            <h2
                              id={`edit-modal-${website.id}`}
                              className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                            >
                              Request a change
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-black/55">
                              Tell us what to change on{" "}
                              {website.brandName || website.slug}.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeWebsiteActionModal}
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
                          >
                            Close
                          </button>
                        </div>
                        <label
                          htmlFor={`edit-${website.id}`}
                          className="text-sm font-semibold text-black"
                        >
                          What would you like changed?
                        </label>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {EDIT_SUGGESTIONS.map((suggestion) => (
                            <button
                              key={suggestion.label}
                              type="button"
                              onClick={() => {
                                setEditPrompts((current) => ({
                                  ...current,
                                  [website.id]: suggestion.prompt,
                                }));
                                // Put the cursor in the box so they can
                                // finish the sentence straight away.
                                document
                                  .getElementById(`edit-${website.id}`)
                                  ?.focus();
                              }}
                              className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          {website.pages.length > 0 ? (
                            <select
                              value={editTargets[website.id] ?? "__site__"}
                              onChange={(event) =>
                                setEditTargets((current) => ({
                                  ...current,
                                  [website.id]: event.target.value,
                                }))
                              }
                              className="h-11 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black outline-none focus:border-black/30 sm:w-48"
                              aria-label="Edit target"
                            >
                              <option value="__site__">Entire site</option>
                              {website.pages.map((page) => (
                                <option key={page.id} value={page.path}>
                                  {page.path === "/" ? "Homepage" : page.title}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <input
                            id={`edit-${website.id}`}
                            value={editPrompts[website.id] ?? ""}
                            onChange={(event) =>
                              setEditPrompts((current) => ({
                                ...current,
                                [website.id]: event.target.value,
                              }))
                            }
                            placeholder="Make the phone number bigger, swap the main photo, try different colours..."
                            className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                          />
                          <button
                            type="submit"
                            disabled={
                              submittingEditId === website.id ||
                              hasActiveEditForWebsite ||
                              !(editPrompts[website.id] ?? "").trim()
                            }
                            className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submittingEditId === website.id
                              ? "Sending…"
                              : hasActiveEditForWebsite
                                ? "Working on your last change…"
                                : "Make the change"}
                          </button>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-black/45">
                          {hasActiveEditForWebsite
                            ? "One change at a time — you can type your next one now and send it as soon as the current change is finished."
                            : "We'll make your change — it usually takes a few minutes. Check back here to see when it's done."}
                        </p>
                      </form>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-[#F5F1EA] px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 text-sm text-black/60 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kiwi-green/20 text-[#3f8f22]">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M5.7 12.7c-1.5-1.5-1.8-3.7-.8-5.5 1.8.4 3.5 1.5 4.4 3.1.7-2.7 2.9-4.9 6-5.8.7 3.2-.2 6.1-2.4 7.9 1.6-.2 3.3.2 4.8 1.1-1 1.8-3 2.8-5.1 2.5l-1.8 3.2a1 1 0 0 1-1.8-.9l1.8-3.3a6.2 6.2 0 0 1-5.1-2.3Z" />
                </svg>
              </span>
              <p>
                <span className="font-semibold text-black">
                  Need help or inspiration?
                </span>{" "}
                We&apos;re here for you!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Link
                href="/help-centre"
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-black/70 transition hover:bg-white hover:text-black"
              >
                <DashboardIcon name="pages" className="h-3.5 w-3.5" />
                Visit our help centre
              </Link>
              <a
                href="mailto:info@refresh.kiwi"
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-black/70 transition hover:bg-white hover:text-black"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5.4l-4.2 3v-3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm1 5h12V7H6v2Zm0 4h8v-2H6v2Z" />
                </svg>
                Chat with our team
              </a>
            </div>
          </div>
        </section>
      </div>

      {pageChooserWebsite ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-chooser-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  Generate pages
                </p>
                <h2
                  id="page-chooser-title"
                  className="mt-2 font-fraunces text-3xl font-semibold tracking-tight"
                >
                  What should we build?
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  Choose normal business pages, create starter legal pages, or
                  describe a brand-new page from scratch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPageChooserWebsiteId(null)}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60 transition hover:border-black/25 hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  type: "business" as const,
                  title: "My other pages",
                  description:
                    "About, services, gallery, blog, contact, FAQs and other useful pages from the current site.",
                },
                {
                  type: "legal" as const,
                  title: "Legal pages",
                  description:
                    "Starter privacy, cookie and terms pages. This is not legal advice.",
                },
                {
                  type: "custom" as const,
                  title: "A brand-new page",
                  description:
                    "Describe a page that does not exist yet and we will build it to match your site.",
                },
              ].map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setPageGenerationType(option.type)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    pageGenerationType === option.type
                      ? "border-kiwi-green bg-[#f8fde9]"
                      : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <span className="text-sm font-semibold text-black">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/50">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>

            {pageGenerationType === "legal" ? (
              <div className="mt-6 rounded-3xl bg-[#faf8f1] p-4 sm:p-5">
                <p className="text-sm font-semibold text-black">
                  Starter legal page details
                </p>
                <p className="mt-1 text-xs leading-5 text-black/45">
                  These answers help draft a better starter template. Review it
                  before publishing.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-black/55">
                    Business legal name
                    <input
                      value={legalAnswers.businessLegalName}
                      onChange={(event) =>
                        updateLegalAnswer("businessLegalName", event.target.value)
                      }
                      className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                    />
                  </label>
                  <label className="text-xs font-semibold text-black/55">
                    Trading name
                    <input
                      value={legalAnswers.tradingName}
                      onChange={(event) =>
                        updateLegalAnswer("tradingName", event.target.value)
                      }
                      className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                    />
                  </label>
                  <label className="text-xs font-semibold text-black/55">
                    Country/region
                    <input
                      value={legalAnswers.country}
                      onChange={(event) =>
                        updateLegalAnswer("country", event.target.value)
                      }
                      className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                    />
                  </label>
                  <label className="text-xs font-semibold text-black/55">
                    Privacy contact email
                    <input
                      value={legalAnswers.privacyEmail}
                      onChange={(event) =>
                        updateLegalAnswer("privacyEmail", event.target.value)
                      }
                      inputMode="email"
                      className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {LEGAL_BOOLEAN_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-black/60"
                    >
                      <input
                        type="checkbox"
                        checked={legalAnswers[field.key]}
                        onChange={(event) =>
                          updateLegalAnswer(field.key, event.target.checked)
                        }
                        className="h-4 w-4 accent-[#C5E66A]"
                      />
                      <span>
                        {field.label}
                        {field.key === "hasExistingLegalPages" ? (
                          <span className="mt-0.5 block text-xs font-normal leading-5 text-black/40">
                            We&apos;ll try to find and restyle them instead of
                            writing new starter copy.
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>

                <label className="mt-4 block text-xs font-semibold text-black/55">
                  Extra notes
                  <textarea
                    value={legalAnswers.notes}
                    onChange={(event) =>
                      updateLegalAnswer("notes", event.target.value)
                    }
                    placeholder="Any tools, policies, services, or details we should mention?"
                    className="mt-1 min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none focus:border-black/30"
                  />
                </label>
              </div>
            ) : null}

            {pageGenerationType === "custom" ? (
              <div className="mt-6 rounded-3xl bg-[#faf8f1] p-4 sm:p-5">
                <p className="text-sm font-semibold text-black">
                  New page details
                </p>
                <p className="mt-1 text-xs leading-5 text-black/45">
                  Tell us what page to add and what it should cover. We&apos;ll
                  build one page that matches this site.
                </p>

                <label className="mt-4 block text-xs font-semibold text-black/55">
                  Page name
                  <input
                    value={customPageRequest.title}
                    onChange={(event) =>
                      updateCustomPageRequest("title", event.target.value)
                    }
                    maxLength={80}
                    placeholder="Careers"
                    className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                  />
                </label>

                <label className="mt-4 block text-xs font-semibold text-black/55">
                  What should be on it?
                  <textarea
                    value={customPageRequest.brief}
                    onChange={(event) =>
                      updateCustomPageRequest("brief", event.target.value)
                    }
                    maxLength={2000}
                    placeholder="Describe the page sections, key details, tone, and any facts we should include."
                    className="mt-1 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none focus:border-black/30"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPageChooserWebsiteId(null)}
                className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() =>
                  void generateAdditionalPages(
                    pageChooserWebsite.id,
                    pageGenerationType,
                  )
                }
                disabled={
                  generatingPagesWebsiteId === pageChooserWebsite.id ||
                  !canSubmitPageGeneration
                }
                className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingPagesWebsiteId === pageChooserWebsite.id
                  ? "Starting..."
                  : pageGenerationType === "legal"
                    ? "Generate legal pages"
                    : pageGenerationType === "custom"
                      ? "Create my new page"
                      : "Generate my other pages"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showActivePagesModal && activePagesWebsite ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-pages-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="preview-pop w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:max-w-lg sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <Image
                src="/refresh-kiwi-favicon-v2.png"
                alt=""
                width={34}
                height={34}
                aria-hidden
                className="kiwi-bob rounded-full"
              />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
              Building pages
            </p>
            <h2
              id="active-pages-title"
              className="mx-auto mt-2 max-w-sm font-fraunces text-3xl font-semibold leading-tight tracking-tight"
            >
              Updating {activePagesWebsite.brandName || activePagesWebsite.slug}
            </h2>
            <p
              key={PAGE_PROGRESS_STAGES[activePagesStageIndex].message}
              className="edit-message-in mt-4 text-sm font-medium text-black/55"
              aria-live="polite"
            >
              {PAGE_PROGRESS_STAGES[activePagesStageIndex].message}
            </p>

            <ol className="mx-auto mt-7 max-w-xs space-y-3 text-left">
              {PAGE_PROGRESS_STAGES.map((stage, index) => {
                const done = index < activePagesStageIndex;
                const current = index === activePagesStageIndex;

                return (
                  <li key={stage.message} className="flex items-center gap-3">
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
                      className={`text-sm ${
                        done || current
                          ? "font-semibold text-black"
                          : "text-black/35"
                      }`}
                    >
                      {stage.message.replace("…", "")}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-5 text-xs leading-5 text-black/45">
              You can close this popup or leave the dashboard — your pages keep
              building in the background and will appear here when they&apos;re
              done.
            </p>

            <button
              type="button"
              onClick={() => {
                setDismissedPagesJobIds((current) => ({
                  ...current,
                  [activePagesWebsite.jobId]: true,
                }));
                setActivePagesModalWebsiteId(null);
              }}
              className="mt-5 h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25"
            >
              Keep working in background
            </button>
          </div>
        </div>
      ) : null}

      {showActiveEditModal && activeEditWebsite && activeEditRequest ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-edit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="preview-pop w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:max-w-lg sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <Image
                src="/refresh-kiwi-favicon-v2.png"
                alt=""
                width={34}
                height={34}
                aria-hidden
                className="kiwi-bob rounded-full"
              />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
              Making your edit
            </p>
            <h2
              id="active-edit-title"
              className="mx-auto mt-2 max-w-sm font-fraunces text-3xl font-semibold leading-tight tracking-tight"
            >
              Updating {activeEditWebsite.brandName || activeEditWebsite.slug}
            </h2>
            <p
              key={editProgressMessage(activeEditRequest.createdAt, progressTick)}
              className="edit-message-in mt-4 text-sm font-medium text-black/55"
              aria-live="polite"
            >
              {editProgressMessage(activeEditRequest.createdAt, progressTick)}
            </p>

            <ol className="mx-auto mt-7 max-w-xs space-y-3 text-left">
              {EDIT_PROGRESS_STAGES.map((stage, index) => {
                const done = index < activeEditStageIndex;
                const current = index === activeEditStageIndex;

                return (
                  <li key={stage.message} className="flex items-center gap-3">
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
                      className={`text-sm ${
                        done || current
                          ? "font-semibold text-black"
                          : "text-black/35"
                      }`}
                    >
                      {stage.message.replace("…", "")}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-7 rounded-2xl bg-[#faf8f1] p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
                Requested change
              </p>
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-black/60">
                {activeEditRequest.prompt}
              </p>
            </div>

            <p className="mt-5 text-xs leading-5 text-black/45">
              You can close this popup or leave the dashboard — your edit keeps
              running in the background and will appear here when it&apos;s done.
            </p>

            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void cancelEditRequest(activeEditWebsite.id, activeEditRequest.id);
                }}
                disabled={cancellingEditRequestId === activeEditRequest.id}
                className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black/55 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingEditRequestId === activeEditRequest.id
                  ? "Cancelling..."
                  : "Cancel edit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissedEditRequestIds((current) => ({
                    ...current,
                    [activeEditRequest.id]: true,
                  }));
                  setActiveEditModalRequestId(null);
                }}
                className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25"
              >
                Keep working in background
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              <li>Your new website live on the internet — we host it</li>
              <li>Unlimited changes, just ask in plain English</li>
              <li>Your own web address (like www.yourbusiness.com)</li>
              <li>Extra pages built for you</li>
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
                setShowProSheet(false);
                void startBillingFlow("checkout");
              }}
              disabled={billingAction !== null || !pricing.checkoutAllowed}
              className="mt-5 h-12 w-full rounded-full border border-black bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:opacity-50"
            >
              Continue to secure payment
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

      {lightboxUrl ? (
        <div
          role="dialog"
          aria-label="Image preview"
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4 sm:p-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="preview-pop max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white transition hover:bg-white/30"
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}
