"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { JobResponse } from "@/lib/jobs/types";

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

const LOADING_STAGES = [
  "Reading your old website",
  "Designing your new look",
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

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  subscriptionStatus: string;
}

function readStoredJob(): { jobId: string; url: string } | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { jobId?: string; url?: string };
    return parsed.jobId ? { jobId: parsed.jobId, url: parsed.url ?? "" } : null;
  } catch {
    return null;
  }
}

function storeJob(jobId: string, url: string) {
  try {
    window.localStorage.setItem(
      ACTIVE_JOB_STORAGE_KEY,
      JSON.stringify({ jobId, url }),
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

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function RefreshPage() {
  const [url, setUrl] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountMode, setAccountMode] = useState<"closed" | "signup" | "login">(
    "closed",
  );
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editStatus, setEditStatus] = useState<
    "idle" | "working" | "done" | "failed"
  >("idle");
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

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: AuthUser | null }) => {
        setUser(payload.user);
      })
      .catch(() => {
        setUser(null);
      });

    // "/?new=1" means the user explicitly wants to start a fresh refresh
    // (e.g. "Add website" from the dashboard) — don't resume the last job.
    const params = new URLSearchParams(window.location.search);
    if (params.has("new")) {
      clearStoredJob();
      window.history.replaceState(null, "", "/");
      return () => {
        stopPolling();
        stopEditPolling();
        stopTimer();
        stopStatusRotation();
      };
    }

    // Resume an in-flight or finished refresh after a page reload, so users
    // (and accidental tab refreshes) never lose their result.
    const stored = readStoredJob();
    if (stored) {
      setUrl((current) => current || stored.url);

      void fetch(`/api/refresh/${stored.jobId}`)
        .then(async (response) => {
          if (!response.ok) {
            clearStoredJob();
            return;
          }

          const resumedJob = (await response.json()) as JobResponse;

          // Stale jobs: the refresh failed, or the saved website has since
          // been deleted or expired — don't resurrect those on the landing
          // page.
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
          // Leave the stored job in place; a later visit may reach the API.
        });
    }

    return () => {
      stopPolling();
      stopEditPolling();
      stopTimer();
      stopStatusRotation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Account request failed");
      }

      setUser(payload.user);
      setAccountMode("closed");
      await claimCurrentWebsite();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Account request failed",
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOpenAccount = () => {
    if (user) {
      void claimCurrentWebsite().catch((error) => {
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

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start checkout");
      }

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
                latestEditRequest: { id: string; status: string } | null;
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
            } else if (latest.status === "failed") {
              stopEditPolling();
              setEditStatus("failed");
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

  const startFresh = () => {
    stopPolling();
    stopEditPolling();
    stopTimer();
    stopStatusRotation();
    clearStoredJob();
    setJob(null);
    setUrl("");
    setErrorMessage(null);
    setEditStatus("idle");
    setIsRefreshing(false);
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
    setStatusMessageIndex(0);
    stopPolling();
    stopEditPolling();
    startProgressTimers();

    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start refresh");
      }

      const createdJob = payload as JobResponse;
      setJob(createdJob);
      storeJob(createdJob.id, url);
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

  const loadingStage = !isRefreshing
    ? 0
    : elapsedMs >= STAGE_3_AT_MS
      ? 2
      : elapsedMs >= STAGE_2_AT_MS
        ? 1
        : 0;
  const previewHref = normalizePreviewUrl(job?.previewUrl ?? null);
  const showReveal = !isRefreshing && Boolean(previewHref);
  const expiryLabel = job?.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(job.expiresAt))
    : null;
  const freeEditsRemaining = job?.freeEditsRemaining ?? 0;

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#faf8f1] text-[#141811]">
      <KiwiPitCanvas active={isRefreshing} />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#faf8f1]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon.png"
              alt=""
              width={30}
              height={30}
              priority
              aria-hidden
              className="rounded-full"
            />
            <span className="font-montserrat text-lg font-bold">
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
                className="hidden rounded-full px-3 py-2 text-sm font-medium text-black/60 transition hover:text-black sm:block"
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
                Refresh another
              </button>
            ) : (
              <a
                href="#refresh-input"
                className="rounded-full bg-[#141811] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
              >
                Try it free
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ───────────────────────── Hero / Theatre / Reveal ───────────────────────── */}
      <section className="relative z-10 px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        <div className="mx-auto w-full max-w-6xl">
          {isRefreshing ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div
                className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur"
                role="status"
                aria-live="polite"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  Refreshing
                </p>
                <h1 className="mt-2 break-words font-fraunces text-3xl font-semibold">
                  {hostLabel(url)}
                </h1>

                <ol className="mx-auto mt-8 max-w-xs space-y-3.5 text-left">
                  {LOADING_STAGES.map((label, index) => {
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
                    : REFRESH_STATUS_MESSAGES[statusMessageIndex]}
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
                    ? "You can leave this page — your refresh keeps going and will be waiting in your dashboard."
                    : "Keep this tab open — your new website will appear right here in a minute or two."}
                </p>
              </div>
            </div>
          ) : showReveal && previewHref ? (
            <div className="preview-pop">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-kiwi-green px-4 py-1.5 text-sm font-bold">
                  Your new website is ready ✨
                </span>
                <h1 className="mt-5 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
                  Here&apos;s {hostLabel(url)}, refreshed.
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
                      {hostLabel(url)} — refreshed by Refresh Kiwi
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
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-black/55">
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
                          />
                          Making your change — usually takes a few minutes. You
                          can keep browsing.
                        </p>
                      ) : editStatus === "done" ? (
                        <p className="mt-3 text-xs font-medium text-[#4d8a2a]">
                          ✓ Done! The preview above has been updated.
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
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-black/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-kiwi-green" />
                  For local businesses with tired old websites
                </p>
                <h1 className="mt-6 font-fraunces text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                  Same website.
                  <br />
                  <span className="relative inline-block">
                    Fresher skin.
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-sm bg-kiwi-green/70 sm:h-5"
                    />
                  </span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-8 text-black/55">
                  Paste your web address. In about 2 minutes, we rebuild your
                  website with a fresh, modern design — your words, your
                  photos, your business.
                </p>

                <form
                  onSubmit={handleRefresh}
                  className="mt-8 flex max-w-lg flex-col gap-2 rounded-[1.75rem] border border-black/10 bg-white p-2 shadow-xl shadow-black/5 sm:flex-row sm:items-center sm:rounded-full"
                >
                  <label htmlFor="refresh-input" className="sr-only">
                    Your website address
                  </label>
                  <input
                    id="refresh-input"
                    type="url"
                    inputMode="url"
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

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-black/45">
                  <span>✓ Free to try</span>
                  <span>✓ No signup needed</span>
                  <span>✓ Nothing changes on your real website</span>
                </div>
              </div>

              {/* Hero visual: stacked before/after cards */}
              <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                <div className="relative">
                  <div className="w-[82%] -rotate-2 rounded-2xl border border-black/10 bg-white p-2.5 opacity-80 shadow-lg">
                    <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-black/35">
                      Before
                    </p>
                    <div className="rounded-xl bg-[#efeee8] p-4">
                      <div className="h-4 w-2/3 rounded bg-black/15" />
                      <div className="mt-3 space-y-1.5">
                        <div className="h-2 rounded bg-black/10" />
                        <div className="h-2 rounded bg-black/10" />
                        <div className="h-2 w-4/5 rounded bg-black/10" />
                        <div className="h-2 w-3/5 rounded bg-black/10" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="h-12 rounded bg-black/10" />
                        <div className="h-12 rounded bg-black/10" />
                        <div className="h-12 rounded bg-black/10" />
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="h-2 rounded bg-black/10" />
                        <div className="h-2 w-5/6 rounded bg-black/10" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-10 right-0 w-[82%] rotate-2 rounded-2xl border-2 border-kiwi-green bg-white p-2.5 shadow-2xl shadow-[#8bbf4d]/25">
                    <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#5d9433]">
                      After ✨
                    </p>
                    <div className="overflow-hidden rounded-xl bg-[#fbfdf6]">
                      <div className="bg-[radial-gradient(circle_at_85%_20%,rgba(192,234,112,0.55),transparent_40%),linear-gradient(135deg,#f7fbef,#e4efe2)] p-5">
                        <p className="font-fraunces text-xl font-semibold leading-snug">
                          Honest plumbing,
                          <br />
                          done properly.
                        </p>
                        <p className="mt-2 text-[11px] leading-4 text-black/50">
                          Serving the valleys for 25 years.
                        </p>
                        <span className="mt-3 inline-flex rounded-full bg-[#141811] px-3.5 py-1.5 text-[10px] font-bold text-white">
                          Call us today
                        </span>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-black/5 text-center text-[9px] font-semibold text-black/55">
                        <div className="px-1 py-2.5">★ 5.0 rated</div>
                        <div className="px-1 py-2.5">24/7 callouts</div>
                        <div className="px-1 py-2.5">Free quotes</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-12" aria-hidden />
              </div>
            </div>
          )}
        </div>
      </section>

      {!isRefreshing ? (
        <>
          {/* ───────────────────────── Social strip ───────────────────────── */}
          <section className="border-y border-black/5 bg-white px-5 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-black/40">
              <span className="font-semibold text-black/55">
                Built for businesses like yours:
              </span>
              <span>Plumbers</span>
              <span>Garages</span>
              <span>Salons</span>
              <span>Cafés</span>
              <span>Clinics</span>
              <span>Builders</span>
              <span>Cleaners</span>
            </div>
          </section>

          {/* ───────────────────────── How it works ───────────────────────── */}
          <section id="how" className="scroll-mt-20 px-5 py-20 sm:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <h2 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                Three steps. No tech skills.
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-black/55">
                If you can copy and paste, you can refresh your website.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    n: "01",
                    title: "Paste your address",
                    body: "Pop in your current website — Wix, WordPress, anything. No account, no card.",
                  },
                  {
                    n: "02",
                    title: "Watch it get refreshed",
                    body: "In about 2 minutes we rebuild it with a clean, modern design. Your words and photos stay.",
                  },
                  {
                    n: "03",
                    title: "Go live when you're happy",
                    body: "£10/month puts it online with unlimited changes — just ask in plain English.",
                  },
                ].map((step) => (
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
                Old website in, fresh website out.
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-white/55">
                Real refreshes for the kinds of websites that haven&apos;t
                changed since 2012.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    name: "Property maintenance",
                    before: "Tiny text, walls of paragraphs, broken on phones",
                    after:
                      "Phone number front and centre, five-star reviews, tap to call",
                  },
                  {
                    name: "Car body shop",
                    before: "Dated photo galleries, menus going nowhere",
                    after:
                      "Clean photo showcase, clear services, easy quote button",
                  },
                  {
                    name: "Osteopath clinic",
                    before: "Cluttered pages with buried contact details",
                    after:
                      "Calm professional look, booking info impossible to miss",
                  },
                ].map((example) => (
                  <div
                    key={example.name}
                    className="rounded-3xl border border-white/10 bg-white/5 p-7"
                  >
                    <h3 className="text-lg font-bold">{example.name}</h3>
                    <p className="mt-4 text-sm leading-6 text-white/40">
                      <span className="font-semibold text-white/55">
                        Before:
                      </span>{" "}
                      {example.before}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      <span className="font-semibold text-kiwi-green">
                        After:
                      </span>{" "}
                      {example.after}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-9 text-sm text-white/55">
                The best example is your own website —{" "}
                <a
                  href="#refresh-input"
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
                One simple price.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-base leading-7 text-black/55">
                No credits, no tokens, no surprises. Pay only when you want
                your new website online.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-black/10 bg-white p-8">
                  <h3 className="text-lg font-bold">Free preview</h3>
                  <p className="mt-2 font-fraunces text-4xl font-semibold">
                    £0
                  </p>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-black/60">
                    <li>✓ See your refreshed website — no signup</li>
                    <li>✓ Keep it for 7 days with a free account</li>
                    <li>✓ 3 free changes included</li>
                  </ul>
                  <a
                    href="#refresh-input"
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
                    <li>✓ Your website live on the internet — we host it</li>
                    <li>✓ Unlimited changes, asked for in plain English</li>
                    <li>✓ Your own web address (www.yourbusiness.com)</li>
                    <li>✓ Extra pages built for you</li>
                    <li>✓ Cancel anytime — no contracts</li>
                  </ul>
                  <a
                    href="#refresh-input"
                    className="mt-7 inline-flex h-12 items-center rounded-full bg-kiwi-green px-6 text-sm font-bold text-black transition hover:bg-kiwi-green-hover"
                  >
                    Start with a free preview
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
                {[
                  {
                    q: "Will this change my real website?",
                    a: "No. We make a separate copy with a fresh design. Your current website stays exactly as it is until you decide to switch.",
                  },
                  {
                    q: "Do I lose my words and photos?",
                    a: "No — that's the whole point. We keep your business details, services, photos and phone number, and give them a cleaner, more modern home.",
                  },
                  {
                    q: "I'm not good with computers. Is this for me?",
                    a: "Yes. You paste your web address and press one button. Changes are made by typing what you want in plain English, like \"make the phone number bigger\".",
                  },
                  {
                    q: "What happens after I pay £10/month?",
                    a: "Your new website goes live on the internet and we host it for you. You get unlimited changes and can connect your own web address. Cancel anytime.",
                  },
                  {
                    q: "What if I don't like the result?",
                    a: "Then it costs you nothing. The preview is free, and you can simply walk away — or try again with different changes.",
                  },
                ].map((item) => (
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

          {/* ───────────────────────── Final CTA ───────────────────────── */}
          <section className="px-5 py-20 sm:px-8">
            <div className="mx-auto w-full max-w-6xl rounded-[2.5rem] bg-kiwi-green px-6 py-16 text-center sm:px-12">
              <h2 className="mx-auto max-w-2xl font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
                Your website called. It wants a refresh.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-black/60">
                Free to try, takes about 2 minutes, and nothing changes until
                you say so.
              </p>
              <a
                href="#refresh-input"
                className="mt-8 inline-flex items-center rounded-full bg-[#141811] px-8 py-4 text-sm font-bold text-white transition hover:bg-black"
              >
                Refresh my website — free
              </a>
            </div>
          </section>

          {/* ───────────────────────── Footer ───────────────────────── */}
          <footer className="border-t border-black/5 px-5 py-10 sm:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/refresh-kiwi-favicon.png"
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
              <p className="text-xs text-black/45">
                Same website, fresher skin.
              </p>
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
                  {accountMode === "login" ? "Log in" : "Save your new website"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {accountMode === "login"
                    ? "Welcome back — pick up where you left off."
                    : "Save it to a free account so it's still here tomorrow — and get 3 free changes included."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccountMode("closed")}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-black/60"
              >
                Close
              </button>
            </div>

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

            <button
              type="button"
              onClick={() =>
                setAccountMode(accountMode === "login" ? "signup" : "login")
              }
              className="mt-4 text-sm font-medium text-black/60 underline underline-offset-4"
            >
              {accountMode === "login"
                ? "Need an account?"
                : "Already have an account?"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
