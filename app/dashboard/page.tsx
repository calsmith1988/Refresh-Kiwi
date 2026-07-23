"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import CurrencySelector from "@/components/CurrencySelector";
import ModalCloseButton from "@/components/ModalCloseButton";
import SiteLogo from "@/components/SiteLogo";
import { usePricing } from "@/components/usePricing";
import kiwiGroupBackground from "../../kiwi-group-background.png";
import {
  isNewPageEditRequest,
  NEW_PAGE_EDIT_MESSAGE,
} from "@/lib/edits/pageRequest";
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
  customDomainDnsRecords: Array<{
    type: "A" | "CNAME";
    name: "@" | "www";
    value: string;
    purpose: string;
  }>;
  customDomainProvider: {
    id: string;
    name: string;
    loginUrl: string;
    steps: string[];
  };
  customDomainHelpUrl: string | null;
  seoSearchConsoleToken: string | null;
  seoAnalyticsId: string | null;
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

const DELETE_HOLD_MS = 3000;

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
  | "changes"
  | "seo";

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
    seo: "M10 2a8 8 0 1 0 4.9 14.3l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-3 6.5h2v3H7v-3Zm3-2.5h2v5.5h-2V8Zm3 1.5h2v4h-2v-4Z",
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
  return role === "logo" ? "Logo" : "Image";
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
  | "seo"
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
    label: "Change the phone number",
    prompt: "Change the phone number to ",
  },
  {
    label: "Change opening hours",
    prompt: "Change the opening hours to ",
  },
  {
    label: "Add a customer review",
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

const EDIT_PROMPT_SOFT_LIMIT = 500;

function isEditSuggestionSelected(prompt: string, suggestionPrompt: string) {
  return (
    prompt === suggestionPrompt ||
    (suggestionPrompt.endsWith(" ") && prompt.startsWith(suggestionPrompt))
  );
}

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
  { atMs: 130_000, message: "Saving preview…" },
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
      showUpgrade: false,
    };
  }

  if (isExpired) {
    return {
      label: "Preview ended",
      badgeClass: "bg-red-50 text-red-700",
      description: `Your free preview ended on ${formatDate(website.expiresAt)}, but your website is saved. Go Pro to bring it back exactly as it was.`,
      canView: false,
      canEdit: false,
      showUpgrade: true,
    };
  }

  if (isLive) {
    return {
      label: "Online",
      badgeClass: "bg-kiwi-green text-black",
      description: isPro ? "" : "This website is online.",
      canView: true,
      canEdit: true,
      showUpgrade: false,
    };
  }

  if (isPro) {
    return {
      label: "Online",
      badgeClass: "bg-kiwi-green text-black",
      description: "",
      canView: true,
      canEdit: true,
      showUpgrade: false,
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
    showUpgrade: true,
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
  const [domainValues, setDomainValues] = useState<Record<string, string>>({});
  const [seoValues, setSeoValues] = useState<
    Record<string, { searchConsole: string; analyticsId: string }>
  >({});
  const [savingSeoWebsiteId, setSavingSeoWebsiteId] = useState<string | null>(
    null,
  );
  const [seoSavedWebsiteId, setSeoSavedWebsiteId] = useState<string | null>(
    null,
  );
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [cancellingRefreshJobId, setCancellingRefreshJobId] = useState<string | null>(
    null,
  );
  const [cancellingEditRequestId, setCancellingEditRequestId] = useState<
    string | null
  >(null);
  const [generatingPagesWebsiteId, setGeneratingPagesWebsiteId] = useState<string | null>(
    null,
  );
  const [pageGenerationType, setPageGenerationType] =
    useState<PageGenerationType>("business");
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
  const [imagesAssetsExpanded, setImagesAssetsExpanded] = useState(false);
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
  const [copiedDomainHelpWebsiteId, setCopiedDomainHelpWebsiteId] = useState<
    string | null
  >(null);
  const [deleteHoldWebsiteId, setDeleteHoldWebsiteId] = useState<string | null>(null);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const deleteHoldFrameRef = useRef<number | null>(null);
  const deleteHoldStartedAtRef = useRef<number | null>(null);
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
  // Inline card progress is hidden; status lives in this popup (and the shimmer
  // Edit button). Auto-open for new edits; reopen anytime via Editing….
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

  const preparePageGeneration = (
    website: Website,
    type: PageGenerationType = "business",
  ) => {
    setPageGenerationType(type);
    setLegalAnswers({
      ...DEFAULT_LEGAL_ANSWERS,
      businessLegalName: website.brandName ?? "",
      tradingName: website.brandName ?? "",
      privacyEmail: user?.email ?? "",
    });
    setCustomPageRequest(DEFAULT_CUSTOM_PAGE_REQUEST);
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

    // New pages belong in the Pages flow — catch this before burning an edit.
    if (website && isNewPageEditRequest(prompt)) {
      setErrorMessage(NEW_PAGE_EDIT_MESSAGE);
      openWebsiteActionModal(website, "pages");
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

      const images = payload.images ?? [];
      setWebsiteImages((current) => ({
        ...current,
        [websiteId]: { status: "ready", images },
      }));
    } catch {
      setWebsiteImages((current) => ({
        ...current,
        [websiteId]: { status: "error" },
      }));
    }
  };

  const cancelDeleteHold = () => {
    if (deleteHoldFrameRef.current !== null) {
      window.cancelAnimationFrame(deleteHoldFrameRef.current);
      deleteHoldFrameRef.current = null;
    }

    deleteHoldStartedAtRef.current = null;
    setDeleteHoldWebsiteId(null);
    setDeleteHoldProgress(0);
  };

  const closeWebsiteActionModal = () => {
    cancelDeleteHold();
    setWebsiteActionModal(null);
    setConfirmRegenerateId(null);
  };

  const closeWebsiteActionModalOnBackdrop = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      closeWebsiteActionModal();
    }
  };

  useEffect(() => {
    return () => {
      if (deleteHoldFrameRef.current !== null) {
        window.cancelAnimationFrame(deleteHoldFrameRef.current);
      }
    };
  }, []);

  const openWebsiteActionModal = (
    website: Website,
    type: WebsiteActionModalType,
  ) => {
    setWebsiteActionModal({ websiteId: website.id, type });
    setConfirmRegenerateId(null);
    setErrorMessage(null);

    if (type === "pages") {
      preparePageGeneration(website);
    }

    if (type === "images") {
      setImagesAssetsExpanded(false);
      if (websiteImages[website.id]?.status !== "ready") {
        void loadWebsiteImages(website.id);
      }
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

  const uploadImages = async (websiteId: string, files: File[]) => {
    const selected = files.filter((file) => file.size > 0);

    if (selected.length === 0) {
      setErrorMessage("Choose at least one image to upload");
      return;
    }

    const body = new FormData();
    for (const file of selected) {
      body.append("files", file);
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
          role: "image",
          placement: "library",
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

  // Image replace/remix queues a worker screenshot — reload a couple of times
  // so the dashboard thumbnail picks up the cache-busted URL once it's ready.
  const refreshScreenshotSoon = () => {
    window.setTimeout(() => {
      void loadDashboard();
    }, 8_000);
    window.setTimeout(() => {
      void loadDashboard();
    }, 20_000);
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
      refreshScreenshotSoon();
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

  const copyDomainHelpLink = async (website: Website) => {
    if (!website.customDomainHelpUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(website.customDomainHelpUrl);
      setCopiedDomainHelpWebsiteId(website.id);
      window.setTimeout(() => {
        setCopiedDomainHelpWebsiteId((current) =>
          current === website.id ? null : current,
        );
      }, 2000);
    } catch {
      // Clipboard can be blocked — the visible link can still be copied manually.
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
      refreshScreenshotSoon();
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
      refreshScreenshotSoon();
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

  const saveSeoSettings = async (website: Website) => {
    const values = seoValues[website.id] ?? {
      searchConsole: website.seoSearchConsoleToken ?? "",
      analyticsId: website.seoAnalyticsId ?? "",
    };

    setSavingSeoWebsiteId(website.id);
    setSeoSavedWebsiteId(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}/seo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchConsoleToken: values.searchConsole,
          analyticsId: values.analyticsId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save SEO settings");
      }

      setSeoSavedWebsiteId(website.id);
      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save SEO settings",
      );
    } finally {
      setSavingSeoWebsiteId(null);
    }
  };

  const deleteWebsite = async (website: Website, confirmation: string) => {
    setDeletingWebsiteId(website.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation,
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

  const startDeleteHold = (website: Website) => {
    if (deletingWebsiteId === website.id || deleteHoldWebsiteId === website.id) {
      return;
    }

    cancelDeleteHold();
    const confirmation = website.brandName || website.slug;
    deleteHoldStartedAtRef.current = performance.now();
    setDeleteHoldWebsiteId(website.id);
    setDeleteHoldProgress(0);

    const tick = (timestamp: number) => {
      const startedAt = deleteHoldStartedAtRef.current;

      if (startedAt === null) {
        return;
      }

      const progress = Math.min(1, (timestamp - startedAt) / DELETE_HOLD_MS);
      setDeleteHoldProgress(progress);

      if (progress >= 1) {
        deleteHoldStartedAtRef.current = null;
        deleteHoldFrameRef.current = null;
        setDeleteHoldWebsiteId(null);
        setDeleteHoldProgress(0);
        void deleteWebsite(website, confirmation);
        return;
      }

      deleteHoldFrameRef.current = window.requestAnimationFrame(tick);
    };

    deleteHoldFrameRef.current = window.requestAnimationFrame(tick);
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
          <SiteLogo />
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
                Your website is online. You&apos;ve got unlimited changes,
                extra pages, and you can connect your own web address below.
              </p>
            </div>
            <ModalCloseButton
              onClick={() => setCelebration(null)}
              label="Dismiss"
              className="bg-white"
            />
          </div>
        ) : celebration === "cancelled" ? (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-3xl border border-black/10 bg-white p-5 sm:p-6">
            <p className="text-sm leading-6 text-black/60">
              No problem — nothing was charged and your preview is safe. You
              can go Pro whenever you&apos;re ready.
            </p>
            <ModalCloseButton
              onClick={() => setCelebration(null)}
              label="Dismiss"
              className="bg-white"
            />
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
                  body: "This shows the website you just made, its web address, free changes left, and whether it is online or still a free preview.",
                },
                {
                  title: "Edit",
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
                              key={screenshotUrl}
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
                            {!isPro && website.status !== "live" && state.canEdit ? (
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
                                Online since {formatDate(website.publishedAt)}
                              </span>
                            ) : null}
                            {!isPro && state.canEdit ? (
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
                                View
                              </Link>
                            ) : null}
                            {!isPro && state.showUpgrade ? (
                              <button
                                type="button"
                                onClick={openProSheet}
                                className="inline-flex items-center gap-2 rounded-2xl bg-kiwi-green px-4 py-2 text-xs font-semibold text-black transition hover:bg-kiwi-green-hover"
                              >
                                <DashboardIcon name="rocket" />
                                {state.label === "Preview ended"
                                  ? `Restore my website — ${pricing.proPriceShort}`
                                  : `Take it online — ${pricing.proPriceShort}`}
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
                                    setDismissedEditRequestIds((current) => {
                                      const next = { ...current };
                                      delete next[website.latestEditRequest!.id];
                                      return next;
                                    });
                                    setActiveEditModalRequestId(
                                      website.latestEditRequest.id,
                                    );
                                    return;
                                  }

                                  openWebsiteActionModal(website, "edit");
                                }}
                                aria-busy={hasActiveEditForWebsite}
                                aria-label={
                                  hasActiveEditForWebsite
                                    ? "Edit in progress — view status"
                                    : "Edit website"
                                }
                                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold transition ${
                                  hasActiveEditForWebsite
                                    ? "edit-button-shimmer border-transparent text-black hover:brightness-95"
                                    : "border-black/10 bg-white text-black hover:border-black/25"
                                }`}
                              >
                                <DashboardIcon name="edit" />
                                {hasActiveEditForWebsite
                                  ? "Editing…"
                                  : "Edit"}
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
                            {state.canView ? (
                              <button
                                type="button"
                                onClick={() => openWebsiteActionModal(website, "domain")}
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:border-black/25"
                              >
                                <DashboardIcon name="globe" />
                                Domain
                              </button>
                            ) : null}
                            {state.canView ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSeoSavedWebsiteId(null);
                                  openWebsiteActionModal(website, "seo");
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
                              >
                                <DashboardIcon name="seo" />
                                Advanced
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openWebsiteActionModal(website, "delete")}
                              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:text-red-700"
                            >
                              <DashboardIcon name="trash" />
                              Delete
                            </button>
                          </div>
                        </div>

                        {website.latestEditRequest &&
                        website.latestEditRequest.status !== "queued" &&
                        website.latestEditRequest.status !== "running" &&
                        website.latestEditRequest.status !== "complete" ? (
                          website.latestEditRequest.errorMessage ===
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
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div className="preview-pop max-h-[90vh] w-full max-w-2xl modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2
                                id={`pages-modal-${website.id}`}
                                className="font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Manage pages
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                View existing pages or create extra pages for{" "}
                                {website.brandName || website.slug}.
                              </p>
                            </div>
                            <ModalCloseButton onClick={closeWebsiteActionModal} />
                          </div>

                          {generatedPages.length > 0 ? (
                          <div className="mt-6 rounded-2xl bg-[#faf8f1] p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-black">
                                  Current pages
                                </p>
                                <p className="mt-1 text-xs text-black/45">
                                  View any page, then use Edit for changes.
                                </p>
                              </div>
                              <span className="text-xs font-medium text-black/40">
                                {generatedPages.length}{" "}
                                {pluralise(generatedPages.length, "page")}
                              </span>
                            </div>
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
                          </div>
                          ) : null}

                          {state.canView ? (
                            <div className="mt-6 rounded-2xl border border-black/10 bg-[#faf8f1] p-4">
                              <p className="text-sm font-semibold text-black">
                                Add pages
                              </p>
                              <p className="mt-1 text-xs leading-5 text-black/45">
                                Choose the kind of page you want to add to this
                                website.
                              </p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                  {
                                    type: "business" as const,
                                    title: "Pages from your old site",
                                    description:
                                      "About, services, gallery, contact, FAQs and other useful pages.",
                                  },
                                  {
                                    type: "legal" as const,
                                    title: "Legal pages",
                                    description:
                                      "Starter privacy, cookie and terms pages. Not legal advice.",
                                  },
                                  {
                                    type: "custom" as const,
                                    title: "A brand-new page",
                                    description:
                                      "Describe one new page and we will build it to match your site.",
                                  },
                                ].map((option) => (
                                  <button
                                    key={option.type}
                                    type="button"
                                    onClick={() => {
                                      if (!isPro) {
                                        openProSheet();
                                        return;
                                      }

                                      preparePageGeneration(website, option.type);
                                    }}
                                    disabled={
                                      isGeneratingPages ||
                                      generatingPagesWebsiteId === website.id
                                    }
                                    className={`rounded-3xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

                              {isPro && pageGenerationType === "legal" ? (
                                <div className="mt-5 rounded-3xl bg-white p-4">
                                  <p className="text-sm font-semibold text-black">
                                    Starter legal page details
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-black/45">
                                    These answers help draft a better starter
                                    template. Review it before putting them online.
                                  </p>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-black/55">
                                      Business legal name
                                      <input
                                        value={legalAnswers.businessLegalName}
                                        onChange={(event) =>
                                          updateLegalAnswer(
                                            "businessLegalName",
                                            event.target.value,
                                          )
                                        }
                                        className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                                      />
                                    </label>
                                    <label className="text-xs font-semibold text-black/55">
                                      Trading name
                                      <input
                                        value={legalAnswers.tradingName}
                                        onChange={(event) =>
                                          updateLegalAnswer(
                                            "tradingName",
                                            event.target.value,
                                          )
                                        }
                                        className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                                      />
                                    </label>
                                    <label className="text-xs font-semibold text-black/55">
                                      Country/region
                                      <input
                                        value={legalAnswers.country}
                                        onChange={(event) =>
                                          updateLegalAnswer(
                                            "country",
                                            event.target.value,
                                          )
                                        }
                                        className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                                      />
                                    </label>
                                    <label className="text-xs font-semibold text-black/55">
                                      Privacy contact email
                                      <input
                                        value={legalAnswers.privacyEmail}
                                        onChange={(event) =>
                                          updateLegalAnswer(
                                            "privacyEmail",
                                            event.target.value,
                                          )
                                        }
                                        inputMode="email"
                                        className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {LEGAL_BOOLEAN_FIELDS.map((field) => (
                                      <label
                                        key={field.key}
                                        className="flex items-center gap-2 rounded-2xl bg-[#faf8f1] px-3 py-2 text-sm font-medium text-black/60"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={legalAnswers[field.key]}
                                          onChange={(event) =>
                                            updateLegalAnswer(
                                              field.key,
                                              event.target.checked,
                                            )
                                          }
                                          className="h-4 w-4 accent-[#C5E66A]"
                                        />
                                        <span>{field.label}</span>
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
                                      className="mt-1 min-h-24 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 py-3 text-sm font-medium text-black outline-none focus:border-black/30"
                                    />
                                  </label>
                                </div>
                              ) : null}

                              {isPro && pageGenerationType === "custom" ? (
                                <div className="mt-5 rounded-3xl bg-white p-4">
                                  <p className="text-sm font-semibold text-black">
                                    New page details
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-black/45">
                                    Tell us what page to add and what it should
                                    cover.
                                  </p>
                                  <label className="mt-4 block text-xs font-semibold text-black/55">
                                    Page name
                                    <input
                                      value={customPageRequest.title}
                                      onChange={(event) =>
                                        updateCustomPageRequest(
                                          "title",
                                          event.target.value,
                                        )
                                      }
                                      maxLength={80}
                                      placeholder="Careers"
                                      className="mt-1 h-11 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 text-sm font-medium text-black outline-none focus:border-black/30"
                                    />
                                  </label>
                                  <label className="mt-4 block text-xs font-semibold text-black/55">
                                    What should be on it?
                                    <textarea
                                      value={customPageRequest.brief}
                                      onChange={(event) =>
                                        updateCustomPageRequest(
                                          "brief",
                                          event.target.value,
                                        )
                                      }
                                      maxLength={2000}
                                      placeholder="Describe the page sections, key details, tone, and any facts we should include."
                                      className="mt-1 min-h-28 w-full rounded-2xl border border-black/10 bg-[#faf8f1] px-4 py-3 text-sm font-medium text-black outline-none focus:border-black/30"
                                    />
                                  </label>
                                </div>
                              ) : null}

                              {isPro ? (
                                <div className="mt-5 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void generateAdditionalPages(
                                        website.id,
                                        pageGenerationType,
                                      )
                                    }
                                    disabled={
                                      generatingPagesWebsiteId === website.id ||
                                      !canSubmitPageGeneration
                                    }
                                    className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {generatingPagesWebsiteId === website.id
                                      ? "Starting..."
                                      : pageGenerationType === "legal"
                                        ? "Generate legal pages"
                                        : pageGenerationType === "custom"
                                          ? "Create my new page"
                                          : "Generate my other pages"}
                                  </button>
                                </div>
                              ) : null}
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
                                      void generateAdditionalPages(website.id, "business");
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
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div
                          id={`images-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-2xl modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2
                                  id={`images-modal-${website.id}`}
                                  className="font-fraunces text-3xl font-semibold tracking-tight"
                                >
                                  Manage images
                                </h2>
                                {imagesState?.status === "ready" ? (
                                  <span className="rounded-full bg-kiwi-green/40 px-2.5 py-1 text-xs font-semibold text-black/70">
                                    {imagesState.images.length}{" "}
                                    {pluralise(
                                      imagesState.images.length,
                                      "image",
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                Swap any photo or let AI recreate it. We keep
                                every old version so you can always go back.
                              </p>
                            </div>
                            <ModalCloseButton onClick={closeWebsiteActionModal} />
                          </div>

                          <section className="mt-5 rounded-2xl bg-[#faf8f1] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-black">
                              Upload images
                            </h3>
                            <div
                              className={`mt-2.5 rounded-2xl border border-dashed px-4 py-5 transition ${
                                imageActionBusy || !state.canEdit
                                  ? "cursor-not-allowed border-black/10 bg-white/60 opacity-60"
                                  : "border-black/15 bg-white hover:border-black/30"
                              }`}
                              onDragOver={(event) => {
                                event.preventDefault();
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (imageActionBusy || !state.canEdit) {
                                  return;
                                }
                                const files = [...event.dataTransfer.files].filter(
                                  (file) => file.type.startsWith("image/"),
                                );
                                if (files.length > 0) {
                                  void uploadImages(website.id, files);
                                }
                              }}
                            >
                              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-kiwi-green/30 text-[#3f8f22]">
                                  <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                  >
                                    <rect
                                      x="3.5"
                                      y="3.5"
                                      width="17"
                                      height="17"
                                      rx="4"
                                    />
                                    <path
                                      d="M12 8v8M8 12h8"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-black/70">
                                    Drag and drop images here or tap to choose
                                    files
                                  </p>
                                  <ul className="mt-1 space-y-0.5 text-xs leading-5 text-black/45">
                                    <li>• JPG, PNG, or WebP</li>
                                    <li>• Up to 15MB per file</li>
                                    <li>• Add up to 8 images</li>
                                  </ul>
                                </div>
                              </div>
                              <label
                                className={`mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover ${
                                  imageActionBusy || !state.canEdit
                                    ? "pointer-events-none opacity-50"
                                    : ""
                                }`}
                              >
                                {isUploadingImages
                                  ? "Uploading…"
                                  : hasActiveEditForWebsite
                                    ? "Edit in progress"
                                    : "Choose files"}
                                <input
                                  type="file"
                                  multiple
                                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                                  disabled={imageActionBusy || !state.canEdit}
                                  className="hidden"
                                  onChange={(event) => {
                                    const files = [
                                      ...(event.target.files ?? []),
                                    ];
                                    if (files.length > 0) {
                                      void uploadImages(website.id, files);
                                    }
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </section>

                          <section className="mt-4 rounded-2xl bg-[#faf8f1] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-black">
                              Generate an image
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-black/55">
                              Describe the image you want and we&apos;ll create
                              it for you.
                              {!isPro ? (
                                <span className="text-black/40">
                                  {" "}
                                  Uses 1 free change.
                                </span>
                              ) : null}
                            </p>
                            <form
                              className="mt-2.5"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void generateImage(
                                  website.id,
                                  event.currentTarget,
                                );
                              }}
                            >
                              <textarea
                                name="prompt"
                                required
                                minLength={10}
                                maxLength={1000}
                                disabled={imageActionBusy || !state.canEdit}
                                placeholder="e.g. warm photo-style hero image of a tidy local plumbing team beside a van"
                                className="min-h-24 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <button
                                type="submit"
                                disabled={imageActionBusy || !state.canEdit}
                                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isGeneratingImage
                                  ? "Generating…"
                                  : hasActiveEditForWebsite
                                    ? "Edit in progress"
                                    : "Generate image"}
                                <svg
                                  aria-hidden
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                >
                                  <path d="M12 2.5 13.4 9l6.6 1.4-6.6 1.4L12 18.5 10.6 11.8 4 10.4l6.6-1.4L12 2.5Zm7 11.2 1 3.3 3.3 1-3.3 1-1 3.3-1-3.3-3.3-1 3.3-1 1-3.3Z" />
                                </svg>
                              </button>
                            </form>
                          </section>

                          <section className="mt-4 rounded-2xl bg-[#faf8f1] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-black">
                              Your images
                            </h3>
                            {(() => {
                              if (
                                !imagesState ||
                                imagesState.status === "loading"
                              ) {
                                return (
                                  <p className="mt-2.5 text-sm text-black/45">
                                    Loading your images…
                                  </p>
                                );
                              }

                              if (imagesState.status === "error") {
                                return (
                                  <p className="mt-2.5 text-sm text-black/45">
                                    We couldn&apos;t load your images just now —
                                    close this and try again.
                                  </p>
                                );
                              }

                              if (imagesState.images.length === 0) {
                                return (
                                  <p className="mt-2.5 text-sm text-black/45">
                                    No images yet. Upload or generate one above
                                    and it will show up here.
                                  </p>
                                );
                              }

                              const visibleImages = imagesAssetsExpanded
                                ? imagesState.images
                                : imagesState.images.slice(0, 3);
                              const canExpand =
                                imagesState.images.length > 3;

                              return (
                                <>
                                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {visibleImages.map((image) => {
                                      const isBusy =
                                        replacingImageId === image.id ||
                                        remixingImageId === image.id ||
                                        placingImageId === image.id ||
                                        revertingImageId === image.id;
                                      const anyBusy = imageActionBusy;
                                      const versions = image.history ?? [];

                                      return (
                                        <div
                                          key={image.id}
                                          className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLightboxUrl(image.url)
                                            }
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
                                                <p className="truncate text-xs font-semibold text-black/70">
                                                  {imageRoleLabel(image.role)}
                                                </p>
                                                <p className="mt-0.5 truncate text-[11px] font-medium text-black/40">
                                                  {imageSourceLabel(
                                                    image.source,
                                                  )}
                                                </p>
                                              </div>
                                              {versions.length > 0 ? (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setHistoryOpenImageId(
                                                      (current) =>
                                                        current === image.id
                                                          ? null
                                                          : image.id,
                                                    )
                                                  }
                                                  className="shrink-0 text-[11px] font-semibold text-black/45 underline-offset-2 hover:underline"
                                                >
                                                  {historyOpenImageId ===
                                                  image.id
                                                    ? "Hide"
                                                    : `Previous (${versions.length})`}
                                                </button>
                                              ) : null}
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                              <label
                                                className={`cursor-pointer rounded-full border border-black/10 px-3 py-1 text-xs font-semibold transition hover:border-black/25 ${
                                                  isBusy
                                                    ? "cursor-wait opacity-50"
                                                    : ""
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
                                                    setRemixNoteImageId(
                                                      (current) =>
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
                                                  value={
                                                    remixNotes[image.id] ?? ""
                                                  }
                                                  onChange={(event) =>
                                                    setRemixNotes(
                                                      (current) => ({
                                                        ...current,
                                                        [image.id]:
                                                          event.target.value,
                                                      }),
                                                    )
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
                                                          setLightboxUrl(
                                                            version.url,
                                                          )
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
                                                        {revertingImageId ===
                                                        image.id
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
                                  {canExpand ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setImagesAssetsExpanded((current) => !current)
                                      }
                                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-black/55 transition hover:text-black"
                                    >
                                      {imagesAssetsExpanded
                                        ? "Show fewer images"
                                        : "View all images"}
                                      <svg
                                        aria-hidden
                                        viewBox="0 0 24 24"
                                        className={`h-4 w-4 transition ${
                                          imagesAssetsExpanded
                                            ? "rotate-180"
                                            : ""
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M6 9l6 6 6-6" />
                                      </svg>
                                    </button>
                                  ) : null}
                                </>
                              );
                            })()}
                          </section>
                        </div>
                      </div>
                    ) : null}

                    {websiteActionModal?.websiteId === website.id &&
                    websiteActionModal.type === "domain" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`domain-modal-${website.id}`}
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div
                          id={`manage-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-3xl modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
                        >
                        <div className="rounded-2xl bg-[#faf8f1] p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h2
                                id={`domain-modal-${website.id}`}
                                className="font-fraunces text-3xl font-semibold tracking-tight"
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
                            <ModalCloseButton
                              onClick={closeWebsiteActionModal}
                              className="bg-white"
                            />
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
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-black">
                                    One last step — point your domain at us
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-black/55">
                                    Your domain looks like it&apos;s with{" "}
                                    <span className="font-semibold text-black/70">
                                      {website.customDomainProvider.name}
                                    </span>
                                    . Add these two records and Refresh Kiwi will
                                    keep checking in the background.
                                  </p>
                                </div>
                                {website.customDomainProvider.loginUrl ? (
                                  <a
                                    href={website.customDomainProvider.loginUrl}
                                    target="_blank"
                                    className="rounded-full border border-black/10 bg-[#fbfaf6] px-4 py-2 text-center text-xs font-semibold text-black transition hover:border-black/25"
                                  >
                                    Open {website.customDomainProvider.name}
                                  </a>
                                ) : null}
                              </div>
                              <ol className="mt-3 space-y-1 text-xs leading-5 text-black/55">
                                {website.customDomainProvider.steps.map((step, index) => (
                                  <li key={step}>
                                    {index + 1}. {step}
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf6] text-xs">
                                {website.customDomainDnsRecords.map((record) => (
                                  <div
                                    key={`${record.type}-${record.name}`}
                                    className="grid gap-2 border-b border-black/5 p-3 last:border-b-0 sm:grid-cols-[0.7fr_0.7fr_1.6fr]"
                                  >
                                    <div>
                                      <p className="font-semibold text-black/40">Type</p>
                                      <p className="mt-1 font-bold text-black">
                                        {record.type}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-black/40">Name</p>
                                      <p className="mt-1 font-bold text-black">
                                        {record.name}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-black/40">
                                        Points to
                                      </p>
                                      <p className="mt-1 break-all font-bold text-black">
                                        {record.value}
                                      </p>
                                      <p className="mt-1 leading-4 text-black/45">
                                        {record.purpose}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 text-xs leading-5 text-black/45">
                                Not comfortable changing DNS? Send these
                                instructions to whoever looks after your domain.
                                They do not need access to your Refresh Kiwi
                                account.
                              </p>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                {website.customDomainHelpUrl ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void copyDomainHelpLink(website)}
                                      className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                                    >
                                      {copiedDomainHelpWebsiteId === website.id
                                        ? "Copied link"
                                        : "Copy instructions link"}
                                    </button>
                                    <a
                                      href={`mailto:?subject=${encodeURIComponent(
                                        `Please update DNS for ${website.customDomain}`,
                                      )}&body=${encodeURIComponent(
                                        [
                                          `Please update the DNS records for ${website.customDomain}.`,
                                          "",
                                          "Refresh Kiwi has made a simple instruction page here:",
                                          website.customDomainHelpUrl,
                                          "",
                                          "Records needed:",
                                          ...website.customDomainDnsRecords.map(
                                            (record) =>
                                              `${record.type} ${record.name} -> ${record.value}`,
                                          ),
                                        ].join("\n"),
                                      )}`}
                                      className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-center text-sm font-semibold text-black transition hover:border-black/25"
                                    >
                                      Email instructions
                                    </a>
                                  </>
                                ) : null}
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
                    websiteActionModal.type === "seo" ? (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`seo-modal-${website.id}`}
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div className="preview-pop max-h-[90vh] w-full max-w-lg modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2
                                id={`seo-modal-${website.id}`}
                                className="font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Search &amp; analytics
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                You don&apos;t need to touch this — your website
                                already comes with the SEO basics built in. If
                                someone helps you with SEO or analytics, they may
                                ask you to paste a code here.
                              </p>
                            </div>
                            <ModalCloseButton onClick={closeWebsiteActionModal} />
                          </div>

                          <form
                            className="mt-6 space-y-5"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveSeoSettings(website);
                            }}
                          >
                            <div>
                              <label
                                htmlFor={`seo-gsc-${website.id}`}
                                className="text-sm font-semibold text-black"
                              >
                                Google Search Console verification
                              </label>
                              <p className="mt-1 text-xs leading-5 text-black/45">
                                Proves to Google that you own this website. Paste
                                the verification code (or the whole meta tag)
                                Google gives you.
                              </p>
                              <input
                                id={`seo-gsc-${website.id}`}
                                value={
                                  seoValues[website.id]?.searchConsole ??
                                  website.seoSearchConsoleToken ??
                                  ""
                                }
                                onChange={(event) =>
                                  setSeoValues((current) => ({
                                    ...current,
                                    [website.id]: {
                                      searchConsole: event.target.value,
                                      analyticsId:
                                        current[website.id]?.analyticsId ??
                                        website.seoAnalyticsId ??
                                        "",
                                    },
                                  }))
                                }
                                placeholder="Verification code from Google"
                                className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`seo-ga-${website.id}`}
                                className="text-sm font-semibold text-black"
                              >
                                Google Analytics
                              </label>
                              <p className="mt-1 text-xs leading-5 text-black/45">
                                Shows you how many people visit your website. Paste
                                a measurement ID that starts with G-.
                              </p>
                              <input
                                id={`seo-ga-${website.id}`}
                                value={
                                  seoValues[website.id]?.analyticsId ??
                                  website.seoAnalyticsId ??
                                  ""
                                }
                                onChange={(event) =>
                                  setSeoValues((current) => ({
                                    ...current,
                                    [website.id]: {
                                      searchConsole:
                                        current[website.id]?.searchConsole ??
                                        website.seoSearchConsoleToken ??
                                        "",
                                      analyticsId: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="G-XXXXXXXXXX"
                                className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                disabled={savingSeoWebsiteId === website.id}
                                className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingSeoWebsiteId === website.id
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                              {seoSavedWebsiteId === website.id ? (
                                <span className="text-sm font-medium text-black/55">
                                  Saved — live on your domain within a minute.
                                </span>
                              ) : null}
                            </div>
                          </form>

                          <div className="mt-6 rounded-2xl bg-[#faf8f1] p-4">
                            <p className="text-sm font-semibold text-black">
                              For your SEO person
                            </p>
                            {website.customDomainStatus === "connected" &&
                            website.customDomain ? (
                              <>
                                <p className="mt-1 text-xs leading-5 text-black/50">
                                  These are generated automatically — nothing to
                                  set up:
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                                  <a
                                    href={`https://${website.customDomain}/sitemap.xml`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black underline decoration-black/25 underline-offset-2 transition hover:decoration-black"
                                  >
                                    sitemap.xml
                                  </a>
                                  <a
                                    href={`https://${website.customDomain}/robots.txt`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black underline decoration-black/25 underline-offset-2 transition hover:decoration-black"
                                  >
                                    robots.txt
                                  </a>
                                </div>
                              </>
                            ) : (
                              <p className="mt-1 text-xs leading-5 text-black/50">
                                A sitemap, robots.txt, and these codes take effect
                                once your own domain is connected (see Manage
                                domain).
                              </p>
                            )}
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
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div className="preview-pop w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2
                                id={`rename-modal-${website.id}`}
                                className="font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Rename website
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                Choose the display name shown on your dashboard.
                              </p>
                            </div>
                            <ModalCloseButton onClick={closeWebsiteActionModal} />
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
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <div className="preview-pop max-h-[calc(100dvh-2rem)] w-full max-w-lg modal-scroll overflow-y-auto rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-8">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2
                                id={`delete-modal-${website.id}`}
                                className="font-fraunces text-3xl font-semibold tracking-tight"
                              >
                                Delete {website.brandName || website.slug}?
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-black/55">
                                This will remove the website from your dashboard.
                                This action can&apos;t be undone.
                              </p>
                            </div>
                            <ModalCloseButton onClick={closeWebsiteActionModal} />
                          </div>
                          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                            <p className="text-sm leading-6 text-black/60">
                              You are deleting{" "}
                              <span className="font-semibold text-black">
                                {website.brandName || website.slug}
                              </span>
                              . Keep holding until the button fills.
                            </p>
                            <button
                              type="button"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.currentTarget.setPointerCapture(
                                  event.pointerId,
                                );
                                startDeleteHold(website);
                              }}
                              onPointerUp={cancelDeleteHold}
                              onPointerLeave={cancelDeleteHold}
                              onPointerCancel={cancelDeleteHold}
                              onLostPointerCapture={cancelDeleteHold}
                              onContextMenu={(event) => event.preventDefault()}
                              onKeyDown={(event) => {
                                if (event.key === " " || event.key === "Enter") {
                                  event.preventDefault();
                                  startDeleteHold(website);
                                }
                              }}
                              onKeyUp={(event) => {
                                if (event.key === " " || event.key === "Enter") {
                                  event.preventDefault();
                                  cancelDeleteHold();
                                }
                              }}
                              disabled={deletingWebsiteId === website.id}
                              aria-label={`Press and hold to delete ${
                                website.brandName || website.slug
                              }`}
                              draggable={false}
                              style={{
                                WebkitTouchCallout: "none",
                                WebkitUserSelect: "none",
                                userSelect: "none",
                              }}
                              className="relative mt-4 h-12 w-full touch-none select-none overflow-hidden rounded-full border border-red-700 bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span
                                aria-hidden
                                className="absolute inset-y-0 left-0 bg-red-900/35"
                                style={{
                                  width:
                                    deleteHoldWebsiteId === website.id
                                      ? `${Math.round(deleteHoldProgress * 100)}%`
                                      : "0%",
                                }}
                              />
                              <span className="relative inline-flex items-center justify-center gap-2">
                                <DashboardIcon
                                  name="trash"
                                  className="h-4 w-4 text-white"
                                />
                                {deletingWebsiteId === website.id
                                  ? "Deleting..."
                                  : deleteHoldWebsiteId === website.id
                                    ? "Keep holding..."
                                    : "Hold to delete website"}
                              </span>
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
                        onMouseDown={closeWebsiteActionModalOnBackdrop}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
                      >
                        <form
                          id={`edit-panel-${website.id}`}
                          className="preview-pop max-h-[90vh] w-full max-w-lg modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void submitEditRequest(website.id);
                          }}
                        >
                        {(() => {
                          const editPrompt = editPrompts[website.id] ?? "";
                          const editPromptLength = editPrompt.length;
                          const focusEditPrompt = () => {
                            document
                              .getElementById(`edit-${website.id}`)
                              ?.focus();
                          };

                          return (
                            <>
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div>
                            <h2
                              id={`edit-modal-${website.id}`}
                              className="font-fraunces text-3xl font-semibold tracking-tight"
                            >
                              Request a change
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-black/55">
                              Tell us what to change on{" "}
                              {website.brandName || website.slug}.
                            </p>
                          </div>
                          <ModalCloseButton onClick={closeWebsiteActionModal} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-black">
                            What would you like changed?
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {EDIT_SUGGESTIONS.map((suggestion) => {
                              const selected = isEditSuggestionSelected(
                                editPrompt,
                                suggestion.prompt,
                              );

                              return (
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
                                    focusEditPrompt();
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                    selected
                                      ? "border-kiwi-green bg-kiwi-green/35 text-black"
                                      : "border-black/10 bg-white text-black/60 hover:border-black/25 hover:text-black"
                                  }`}
                                >
                                  {selected ? (
                                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[#3f8f22] text-white">
                                      <DashboardIcon
                                        name="check"
                                        className="h-2.5 w-2.5"
                                      />
                                    </span>
                                  ) : null}
                                  {suggestion.label}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={focusEditPrompt}
                              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60 transition hover:border-black/25 hover:text-black"
                            >
                              Other
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="mt-5">
                          <label
                            htmlFor={`edit-target-${website.id}`}
                            className="text-sm font-semibold text-black"
                          >
                            Where on your site is this?
                          </label>
                          <div className="relative mt-2.5">
                            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-black/40">
                              <DashboardIcon
                                name="globe"
                                className="h-4 w-4"
                              />
                            </span>
                            <select
                              id={`edit-target-${website.id}`}
                              value={editTargets[website.id] ?? "__site__"}
                              onChange={(event) =>
                                setEditTargets((current) => ({
                                  ...current,
                                  [website.id]: event.target.value,
                                }))
                              }
                              className="h-12 w-full appearance-none rounded-2xl border border-black/10 bg-white py-2 pl-11 pr-10 text-sm font-medium text-black outline-none focus:border-black/30"
                            >
                              <option value="__site__">
                                Entire site (global)
                              </option>
                              {website.pages.map((page) => (
                                <option key={page.id} value={page.path}>
                                  {page.path === "/" ? "Homepage" : page.title}
                                </option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-black/40">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </span>
                          </div>
                        </div>

                        <div className="mt-5">
                          <label
                            htmlFor={`edit-${website.id}`}
                            className="text-sm font-semibold text-black"
                          >
                            Tell us more about the change
                          </label>
                          <div className="relative mt-2.5">
                            <textarea
                              id={`edit-${website.id}`}
                              value={editPrompt}
                              onChange={(event) =>
                                setEditPrompts((current) => ({
                                  ...current,
                                  [website.id]: event.target.value,
                                }))
                              }
                              rows={5}
                              placeholder="What do you want to change, and how should it look or feel?"
                              className="w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 pb-8 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                            />
                            <span
                              className={`pointer-events-none absolute bottom-3 right-4 text-xs ${
                                editPromptLength > EDIT_PROMPT_SOFT_LIMIT
                                  ? "font-semibold text-amber-700"
                                  : "text-black/35"
                              }`}
                            >
                              {editPromptLength} / {EDIT_PROMPT_SOFT_LIMIT}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 flex items-start gap-3">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kiwi-green/25 text-[#3f8f22]">
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="currentColor"
                            >
                              <path d="M12 2a1 1 0 0 1 1 1v1.1A8 8 0 0 1 20 12a1 1 0 1 1-2 0 6 6 0 1 0-6 6 1 1 0 1 1 0 2 8 8 0 0 1-7.9-9H3a1 1 0 1 1 0-2h1.1A8 8 0 0 1 11 3.1V3a1 1 0 0 1 1-1Zm0 6a1 1 0 0 1 1 1v3.6l2.2 1.3a1 1 0 1 1-1 1.7l-2.7-1.6A1 1 0 0 1 11 13V9a1 1 0 0 1 1-1Z" />
                            </svg>
                          </span>
                          <p className="text-sm leading-6 text-black/55">
                            {hasActiveEditForWebsite
                              ? "One change at a time — you can type your next one now and send it as soon as the current change is finished."
                              : "We'll make your change — it usually takes a few minutes."}
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            submittingEditId === website.id ||
                            hasActiveEditForWebsite ||
                            !editPrompt.trim()
                          }
                          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M12 2.5 13.4 9l6.6 1.4-6.6 1.4L12 18.5 10.6 11.8 4 10.4l6.6-1.4L12 2.5Zm7 11.2 1 3.3 3.3 1-3.3 1-1 3.3-1-3.3-3.3-1 3.3-1 1-3.3Z" />
                          </svg>
                          {submittingEditId === website.id
                            ? "Sending…"
                            : hasActiveEditForWebsite
                              ? "Working on your last change…"
                              : "Make the change"}
                        </button>
                            </>
                          );
                        })()}
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

      {showActivePagesModal && activePagesWebsite ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-pages-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
        >
          <div className="preview-pop w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:max-w-xl sm:p-8 md:max-w-2xl">
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
            <h2
              id="active-pages-title"
              className="mx-auto mt-5 max-w-sm font-fraunces text-3xl font-semibold leading-tight tracking-tight"
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
          <div className="preview-pop w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:max-w-xl sm:p-8 md:max-w-2xl">
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

            <h2
              id="active-edit-title"
              className="mx-auto mt-5 max-w-sm font-fraunces text-3xl font-semibold leading-tight tracking-tight"
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
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowProSheet(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                Kiwi Pro — {pricing.proPriceMonthly}
              </h2>
              <ModalCloseButton onClick={() => setShowProSheet(false)} />
            </div>
            <ul className="mt-5 space-y-2.5 text-sm leading-6 text-black/60">
              <li>Your new website online — we host it</li>
              <li>Unlimited changes, just ask in plain English</li>
              <li>Your own web address (like www.yourbusiness.com)</li>
              <li>Add extra pages whenever you need them</li>
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
