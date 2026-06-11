"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  sourceUrl: string;
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

type WebsiteImageVersion = {
  file: string;
  url: string;
  contentType: string;
  bytes: number;
  source: "original" | "upload" | "remix";
  createdAt: string;
};

type WebsiteImage = {
  id: string;
  file: string;
  url: string;
  originalUrl: string;
  contentType: string;
  bytes: number;
  source?: "original" | "upload" | "remix";
  replacedAt?: string;
  history?: WebsiteImageVersion[];
};

const REMIXABLE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function imageSourceLabel(source: WebsiteImage["source"]): string {
  if (source === "upload") {
    return "Your upload";
  }

  if (source === "remix") {
    return "AI remix";
  }

  return "From your old site";
}

type WebsiteImagesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; images: WebsiteImage[] };

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

const EDIT_POLL_INTERVAL_MS = 5000;
const ACTIVE_EDIT_STATUSES = new Set(["queued", "running"]);
const PRO_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const DAY_MS = 24 * 60 * 60 * 1000;

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

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://refresh.kiwi";

  return `${origin}/preview/${website.slug}`;
}

function sourceHostname(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
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
      description: isPro
        ? "Live while your Pro plan is active."
        : "This website is currently live.",
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
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({});
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});
  const [managingWebsiteId, setManagingWebsiteId] = useState<string | null>(null);
  const [renameValues, setRenameValues] = useState<Record<string, string>>({});
  const [deleteConfirmations, setDeleteConfirmations] = useState<Record<string, string>>({});
  const [domainValues, setDomainValues] = useState<Record<string, string>>({});
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [publishingWebsiteId, setPublishingWebsiteId] = useState<string | null>(null);
  const [generatingPagesWebsiteId, setGeneratingPagesWebsiteId] = useState<string | null>(
    null,
  );
  const [imagesPanelWebsiteId, setImagesPanelWebsiteId] = useState<string | null>(
    null,
  );
  const [websiteImages, setWebsiteImages] = useState<
    Record<string, WebsiteImagesState>
  >({});
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [remixingImageId, setRemixingImageId] = useState<string | null>(null);
  const [remixNoteImageId, setRemixNoteImageId] = useState<string | null>(null);
  const [remixNotes, setRemixNotes] = useState<Record<string, string>>({});
  const [historyOpenImageId, setHistoryOpenImageId] = useState<string | null>(
    null,
  );
  const [revertingImageId, setRevertingImageId] = useState<string | null>(null);
  const [copiedWebsiteId, setCopiedWebsiteId] = useState<string | null>(null);
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
  const [celebration, setCelebration] = useState<
    "upgraded" | "cancelled" | null
  >(null);

  const isPro =
    user?.plan === "pro" && PRO_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus);
  const websiteLimit = isPro ? 3 : 1;
  const canAddWebsite = websites.length < websiteLimit;
  const websiteCountLabel = useMemo(
    () => `${websites.length}/${websiteLimit} websites`,
    [websiteLimit, websites.length],
  );
  const hasActiveEdit = websites.some(
    (website) =>
      website.latestEditRequest &&
      ACTIVE_EDIT_STATUSES.has(website.latestEditRequest.status),
  );
  const hasActivePageGeneration = websites.some(
    (website) => website.jobStatus === "building_pages",
  );

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
    if (params.has("upgraded") || params.has("upgrade_cancelled")) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration, isPro]);

  useEffect(() => {
    if (!hasActiveEdit && !hasActivePageGeneration) {
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
  }, [hasActiveEdit, hasActivePageGeneration]);

  const openProSheet = () => {
    setErrorMessage(null);
    setShowProSheet(true);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  const startBillingFlow = async (kind: "checkout" | "portal") => {
    setBillingAction(kind);
    setErrorMessage(null);

    try {
      const response = await fetch(
        kind === "checkout" ? "/api/stripe/checkout" : "/api/stripe/portal",
        { method: "POST" },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Billing action failed");
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
      setEditingWebsiteId(null);
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to keep website live",
      );
    } finally {
      setPublishingWebsiteId(null);
    }
  };

  const generateAdditionalPages = async (websiteId: string) => {
    setGeneratingPagesWebsiteId(websiteId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/pages`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate additional pages");
      }

      await loadDashboard();
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

  const toggleImagesPanel = (websiteId: string) => {
    const isOpening = imagesPanelWebsiteId !== websiteId;
    setImagesPanelWebsiteId(isOpening ? websiteId : null);

    if (isOpening && websiteImages[websiteId]?.status !== "ready") {
      void loadWebsiteImages(websiteId);
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

      setManagingWebsiteId(null);
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
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon.png"
              alt=""
              width={34}
              height={34}
              aria-hidden
              className="rounded-full"
            />
            <span className="font-montserrat text-xl font-bold">
              Refresh Kiwi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isPro ? (
              <button
                type="button"
                onClick={() => void startBillingFlow("portal")}
                disabled={billingAction !== null}
                className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction === "portal" ? "Opening..." : "Manage billing"}
              </button>
            ) : null}
            {canAddWebsite ? (
              <Link
                href="/?new=1"
                className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover"
              >
                Add website
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  isPro ? void startBillingFlow("portal") : openProSheet()
                }
                disabled={billingAction !== null}
                className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPro ? "Manage plan" : "Upgrade to add more"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Log out
            </button>
          </div>
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

        <section className="mt-10 rounded-3xl border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-black/45">Dashboard</p>
              <h1 className="mt-2 font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                Your refreshed websites
              </h1>
              {user ? (
                <p className="mt-3 text-sm text-black/55">{user.email}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              <div className="rounded-2xl bg-[#faf8f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Plan
                </p>
                <p className="mt-1 text-lg font-bold capitalize">
                  {user?.plan ?? "free"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#faf8f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Status
                </p>
                <p className="mt-1 text-lg font-bold capitalize">
                  {user?.subscriptionStatus?.replaceAll("_", " ") ?? "none"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#faf8f1] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Usage
                </p>
                <p className="mt-1 text-lg font-bold">{websiteCountLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!isPro ? (
              <button
                type="button"
                onClick={openProSheet}
                disabled={billingAction !== null}
                className="rounded-full bg-kiwi-green px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction === "checkout"
                  ? "Opening…"
                  : "Go Pro — £10/month"}
              </button>
            ) : null}
            {canAddWebsite ? (
              <Link
                href="/?new=1"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-black/25"
              >
                Add another website
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  isPro ? void startBillingFlow("portal") : openProSheet()
                }
                disabled={billingAction !== null}
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPro ? "Plan limit reached" : "Upgrade to add another"}
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
        </section>

        <section className="mt-6">
          {isLoading ? (
            <div className="rounded-3xl border border-black/10 bg-white p-8 text-center text-sm text-black/50">
              Loading your websites…
            </div>
          ) : websites.length === 0 ? (
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
              {websites.map((website) => {
                const state = websiteState(website, isPro);
                const generatedPages = website.pages.filter(
                  (page) => page.path !== "/",
                );
                const isGeneratingPages = website.jobStatus === "building_pages";
                const imagesState = websiteImages[website.id];

                return (
                  <article
                    key={website.id}
                    className={`rounded-3xl border p-5 shadow-lg shadow-black/5 sm:p-6 ${
                      state.canView
                        ? "border-black/10 bg-white"
                        : "border-red-100 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-fraunces text-2xl font-semibold">
                            {website.brandName || website.slug}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${state.badgeClass}`}
                          >
                            {state.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-black/50">
                          Generated from {sourceHostname(website.sourceUrl)}
                        </p>
                        <p className="mt-2 text-sm font-medium text-black/60">
                          {state.description}
                        </p>
                        {state.canView ? (
                          <div className="mt-3 flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-[#faf8f1] px-3 py-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-black/35">
                              Your website address
                            </span>
                            <a
                              href={websiteAddress(website)}
                              target="_blank"
                              className="min-w-0 flex-1 truncate text-sm font-semibold text-black underline-offset-2 hover:underline"
                            >
                              {websiteAddress(website).replace(/^https?:\/\//, "")}
                            </a>
                            <button
                              type="button"
                              onClick={() => void copyWebsiteAddress(website)}
                              className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold transition hover:border-black/25"
                            >
                              {copiedWebsiteId === website.id ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-black/45">
                          <span>
                            {isPro
                              ? "Changes: unlimited"
                              : `Free changes left: ${website.freeEditsRemaining} of ${website.freeEditsLimit}`}
                          </span>
                          {!isPro && website.status !== "live" ? (
                            <span>Free preview until {formatDate(website.expiresAt)}</span>
                          ) : null}
                          {website.publishedAt ? (
                            <span>Published: {formatDate(website.publishedAt)}</span>
                          ) : null}
                        </div>
                        {website.latestEditRequest ? (
                          <p className="mt-3 text-xs font-medium text-black/45">
                            Latest change:{" "}
                            {website.latestEditRequest.status === "queued" ||
                            website.latestEditRequest.status === "running"
                              ? "working on it — usually takes a few minutes"
                              : website.latestEditRequest.status === "complete"
                                ? "done — open your website to see it"
                                : "didn't work — please try again"}
                            {website.latestEditRequest.status === "failed" &&
                            website.latestEditRequest.errorMessage
                              ? ` (${website.latestEditRequest.errorMessage})`
                              : null}
                          </p>
                        ) : null}
                        {isGeneratingPages ? (
                          <p className="mt-3 text-xs font-medium text-black/45">
                            Page generation is running in the background.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                        {state.canView ? (
                          <Link
                            href={previewHref(website.slug)}
                            target="_blank"
                            className="rounded-full bg-[#141811] px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-black"
                          >
                            {website.status === "live" ? "View live site" : "View preview"}
                          </Link>
                        ) : null}
                        {state.canEdit ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingWebsiteId((current) =>
                                current === website.id ? null : website.id,
                              )
                            }
                            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                          >
                            Edit website
                          </button>
                        ) : null}
                        {state.canEdit ? (
                          <button
                            type="button"
                            onClick={() => toggleImagesPanel(website.id)}
                            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                          >
                            Images
                          </button>
                        ) : null}
                        {isPro && state.showKeepLive ? (
                          <button
                            type="button"
                            onClick={() => void publishWebsite(website.id)}
                            disabled={publishingWebsiteId === website.id}
                            className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
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
                            className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
                          >
                            {state.label === "Expired preview"
                              ? "Go live again — £10/mo"
                              : "Put it online — £10/mo"}
                          </button>
                        ) : null}
                        {state.canView && isPro && generatedPages.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => void generateAdditionalPages(website.id)}
                            disabled={
                              isGeneratingPages ||
                              generatingPagesWebsiteId === website.id
                            }
                            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isGeneratingPages ||
                            generatingPagesWebsiteId === website.id
                              ? "Generating…"
                              : "Generate additional pages"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setManagingWebsiteId((current) =>
                              current === website.id ? null : website.id,
                            );
                            setRenameValues((current) => ({
                              ...current,
                              [website.id]:
                                current[website.id] ??
                                website.brandName ??
                                website.slug,
                            }));
                          }}
                          className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    {generatedPages.length > 0 ? (
                      <div className="mt-5 rounded-2xl bg-[#faf8f1] p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-black">
                              Additional pages
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
                        {isPro && state.canView ? (
                          confirmRegenerateId === website.id ? (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-semibold leading-5 text-amber-800">
                                This rebuilds every additional page from
                                scratch — any changes you&apos;ve made to them
                                will be lost. Your homepage stays as it is.
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmRegenerateId(null);
                                    void generateAdditionalPages(website.id);
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
                    ) : null}

                    {imagesPanelWebsiteId === website.id ? (
                      <div className="mt-5 rounded-2xl bg-[#faf8f1] p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-black">
                              Your images
                            </p>
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
                        </div>

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
                              <p className="mt-4 text-sm text-black/45">
                                No images found yet. They appear here shortly
                                after your website is created or published.
                              </p>
                            );
                          }

                          return (
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {imagesState.images.map((image) => {
                                const isBusy =
                                  replacingImageId === image.id ||
                                  remixingImageId === image.id ||
                                  revertingImageId === image.id;
                                const anyBusy =
                                  replacingImageId !== null ||
                                  remixingImageId !== null ||
                                  revertingImageId !== null;
                                const versions = image.history ?? [];

                                return (
                                  <div
                                    key={image.id}
                                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={image.url}
                                      alt=""
                                      loading="lazy"
                                      className="h-32 w-full bg-[#f0f4e7] object-cover"
                                    />
                                    <div className="p-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[11px] font-medium text-black/40">
                                          {imageSourceLabel(image.source)}
                                        </span>
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
                                                <a
                                                  href={version.url}
                                                  target="_blank"
                                                  title="Open full size"
                                                >
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img
                                                    src={version.url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-12 w-full bg-[#f0f4e7] object-cover"
                                                  />
                                                </a>
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
                    ) : null}

                    {managingWebsiteId === website.id ? (
                      <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                        <div className="mb-5 rounded-2xl bg-[#faf8f1] p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-black">
                                Connect your domain
                              </p>
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

                        <div className="grid gap-4 lg:grid-cols-2">
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void renameWebsite(website);
                            }}
                          >
                            <label
                              htmlFor={`rename-${website.id}`}
                              className="text-sm font-semibold text-black"
                            >
                              Rename website
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

                          <div>
                            <p className="text-sm font-semibold text-red-700">
                              Delete website
                            </p>
                            <p className="mt-2 text-xs leading-5 text-black/45">
                              Type{" "}
                              <span className="font-semibold text-black">
                                {website.brandName || website.slug}
                              </span>{" "}
                              to delete it from your dashboard.
                            </p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
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
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {editingWebsiteId === website.id ? (
                      <form
                        className="mt-5 rounded-2xl bg-[#faf8f1] p-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitEditRequest(website.id);
                        }}
                      >
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
                              !(editPrompts[website.id] ?? "").trim()
                            }
                            className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submittingEditId === website.id
                              ? "Sending…"
                              : "Make the change"}
                          </button>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-black/45">
                          We&apos;ll make your change — it usually takes a few
                          minutes. Check back here to see when it&apos;s done.
                        </p>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

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
              <li>Your new website live on the internet — we host it</li>
              <li>Unlimited changes, just ask in plain English</li>
              <li>Your own web address (like www.yourbusiness.com)</li>
              <li>Extra pages built for you</li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-black/45">
              Cancel anytime — no contracts, no hidden fees. Payment is handled
              securely by Stripe.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowProSheet(false);
                void startBillingFlow("checkout");
              }}
              disabled={billingAction !== null}
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
    </main>
  );
}
