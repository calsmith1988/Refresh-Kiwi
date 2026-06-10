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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({});
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | null>(
    null,
  );

  const isPro = user?.plan === "pro" && user.subscriptionStatus === "active";
  const websiteLimit = isPro ? 3 : 1;
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
          <Link
            href="/"
            className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover"
          >
            Add website
          </Link>
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
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:border-black/25"
            >
              Add another website
            </Link>
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
                const isExpired =
                  !isPro &&
                  website.status !== "live" &&
                  new Date(website.expiresAt).getTime() < Date.now();

                return (
                  <article
                    key={website.id}
                    className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-lg shadow-black/5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold">
                            {website.brandName || website.slug}
                          </h2>
                          <span className="rounded-full bg-[#f0f4e7] px-3 py-1 text-xs font-semibold capitalize text-black/60">
                            {isExpired ? "expired" : website.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-black/50">
                          Generated from {sourceHostname(website.sourceUrl)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-black/45">
                          <span>
                            Free edits: {website.freeEditsRemaining}/
                            {website.freeEditsLimit}
                          </span>
                          <span>
                            Free preview expires: {formatDate(website.expiresAt)}
                          </span>
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
                        <Link
                          href={previewHref(website.slug)}
                          target="_blank"
                          className="rounded-full bg-black px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-black/85"
                        >
                          View website
                        </Link>
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
                        {isPro ? (
                          <button
                            type="button"
                            onClick={() => void startBillingFlow("portal")}
                            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
                          >
                            Billing
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void startBillingFlow("checkout")}
                            className="rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
                          >
                            Keep live
                          </button>
                        )}
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
