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
  sourceUrl: string;
  slug: string;
  brandName: string | null;
  status: "preview" | "live" | "expired" | "archived";
  freeEditsUsed: number;
  freeEditsLimit: number;
  freeEditsRemaining: number;
  customDomain: string | null;
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
};

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
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [publishingWebsiteId, setPublishingWebsiteId] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | null>(
    null,
  );

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

    void loadDashboard(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasActiveEdit) {
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
  }, [hasActiveEdit]);

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
        body: JSON.stringify({ prompt }),
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

  return (
    <main className="min-h-screen bg-[#fbfaf6] px-5 py-5 text-black sm:px-8 lg:px-10">
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
          {canAddWebsite ? (
            <Link
              href="/"
              className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover"
            >
              Add website
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void startBillingFlow(isPro ? "portal" : "checkout")}
              disabled={billingAction !== null}
              className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPro ? "Manage plan" : "Upgrade to add more"}
            </button>
          )}
        </header>

        <section className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-black/45">Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Your refreshed websites
              </h1>
              {user ? (
                <p className="mt-3 text-sm text-black/55">{user.email}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              <div className="rounded-2xl bg-[#f7faef] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Plan
                </p>
                <p className="mt-1 text-lg font-bold capitalize">
                  {user?.plan ?? "free"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7faef] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Status
                </p>
                <p className="mt-1 text-lg font-bold capitalize">
                  {user?.subscriptionStatus?.replaceAll("_", " ") ?? "none"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7faef] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  Usage
                </p>
                <p className="mt-1 text-lg font-bold">{websiteCountLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isPro ? (
              <button
                type="button"
                onClick={() => void startBillingFlow("portal")}
                disabled={billingAction !== null}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction === "portal" ? "Opening…" : "Manage billing"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startBillingFlow("checkout")}
                disabled={billingAction !== null}
                className="rounded-full bg-kiwi-green px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction === "checkout" ? "Opening…" : "Upgrade to Pro"}
              </button>
            )}
            {canAddWebsite ? (
              <Link
                href="/"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-black/25"
              >
                Add another website
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void startBillingFlow(isPro ? "portal" : "checkout")}
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
              Checking edit progress…
            </p>
          ) : null}
        </section>

        <section className="mt-6">
          {isLoading ? (
            <div className="rounded-[2rem] border border-black/10 bg-white p-8 text-center text-sm text-black/50">
              Loading your websites…
            </div>
          ) : websites.length === 0 ? (
            <div className="rounded-[2rem] border border-black/10 bg-white p-8 text-center">
              <h2 className="text-xl font-bold">No websites saved yet</h2>
              <p className="mt-2 text-sm text-black/55">
                Generate a homepage preview, then save it to your account.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-full bg-kiwi-green px-6 py-3 text-sm font-semibold text-black"
              >
                Refresh my first website
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {websites.map((website) => {
                const state = websiteState(website, isPro);

                return (
                  <article
                    key={website.id}
                    className={`rounded-[2rem] border p-5 shadow-lg shadow-black/5 sm:p-6 ${
                      state.canView
                        ? "border-black/10 bg-white"
                        : "border-red-100 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold">
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
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-black/45">
                          <span>
                            {isPro
                              ? "Edits: unlimited"
                              : `Free edits: ${website.freeEditsRemaining}/${website.freeEditsLimit}`}
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
                            Latest edit:{" "}
                            <span className="capitalize">
                              {website.latestEditRequest.status}
                            </span>
                            {website.latestEditRequest.status === "failed" &&
                            website.latestEditRequest.errorMessage
                              ? ` — ${website.latestEditRequest.errorMessage}`
                              : null}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                        {state.canView ? (
                          <Link
                            href={previewHref(website.slug)}
                            target="_blank"
                            className="rounded-full bg-black px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-black/85"
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
                            onClick={() => void startBillingFlow("checkout")}
                            className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
                          >
                            {state.label === "Expired preview"
                              ? "Restore with Pro"
                              : "Keep live"}
                          </button>
                        ) : null}
                        {isPro && website.status === "live" ? (
                          <button
                            type="button"
                            onClick={() => void startBillingFlow("portal")}
                            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                          >
                            Billing
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {editingWebsiteId === website.id ? (
                      <form
                        className="mt-5 rounded-2xl bg-[#f7faef] p-4"
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
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <input
                            id={`edit-${website.id}`}
                            value={editPrompts[website.id] ?? ""}
                            onChange={(event) =>
                              setEditPrompts((current) => ({
                                ...current,
                                [website.id]: event.target.value,
                              }))
                            }
                            placeholder="Make the hero more premium, change the CTA, update the colours..."
                            className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                          />
                          <button
                            type="submit"
                            disabled={
                              submittingEditId === website.id ||
                              !(editPrompts[website.id] ?? "").trim()
                            }
                            className="h-11 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submittingEditId === website.id
                              ? "Sending…"
                              : "Send edit"}
                          </button>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-black/45">
                          Edits are applied by the editor agent and may take a
                          few minutes.
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
    </main>
  );
}
