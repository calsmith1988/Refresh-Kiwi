"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import accountantAfterPreview from "../after-preview.png";
import engineerAfterPreview from "../after-preview2.png";
import accountantBeforePreview from "../before-preview.png";
import engineerBeforePreview from "../before-preview2.png";
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

function BeforeAfterReveal({
  before,
  after,
  beforeAlt,
  afterAlt,
  className = "",
  aspectClassName = "aspect-[2/1]",
  priority = false,
}: {
  before: StaticImageData;
  after: StaticImageData;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
  aspectClassName?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/15 bg-white p-2 shadow-2xl ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-black ${aspectClassName}`}
      >
        <Image
          src={after}
          alt={afterAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 560px, 90vw"
          className="object-cover"
        />
        <div className="before-after-reveal-clip absolute inset-0">
          <Image
            src={before}
            alt={beforeAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 560px, 90vw"
            className="object-cover"
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
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(
    null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState("");
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

  const resumeJob = useCallback(
    (stored: { jobId: string; url: string }) => {
      setUrl((current) => current || stored.url);

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
          storeJob(linkedJobId, linkedUrl);
          resumeJob({ jobId: linkedJobId, url: linkedUrl });
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
        window.location.href = "/dashboard";
        return;
      }

      await claimCurrentWebsite();
    } catch (error) {
      setErrorMessage(
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
      await claimCurrentWebsite().catch((error) => {
        console.warn("[refresh-kiwi] 2FA login claim skipped", error);
      });
      window.location.href = "/dashboard";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Invalid two-factor code",
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
                className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur sm:max-w-lg"
                role="status"
                aria-live="polite"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  Refreshing
                </p>
                <h1 className="mx-auto mt-2 max-w-[22ch] font-fraunces text-[clamp(1.6rem,4.5vw,2.15rem)] font-semibold leading-none tracking-tight [overflow-wrap:anywhere]">
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
                <p className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/50 px-4 py-1.5 text-xs font-semibold text-black/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-kiwi-green" />
                  Affordable website redesign for local businesses
                </p>
                <h1 className="mt-6 font-fraunces text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                  Website redesign.
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
                  Paste your web address. In about 2 minutes, our AI website
                  redesign service rebuilds your site with a fresh, modern
                  design — your words, your photos, your business.
                </p>

                <form
                  onSubmit={handleRefresh}
                  className="mt-8 flex max-w-lg flex-col gap-2 rounded-[1.75rem] border-2 border-black/20 bg-white p-2 shadow-xl shadow-black/10 transition focus-within:border-black/40 sm:flex-row sm:items-center sm:rounded-full"
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

              <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
                <BeforeAfterReveal
                  before={engineerBeforePreview}
                  after={engineerAfterPreview}
                  beforeAlt="Original engineering website before Refresh Kiwi"
                  afterAlt="Refreshed engineering website generated by Refresh Kiwi"
                  priority
                  aspectClassName="aspect-[16/9]"
                  className="border-black/10 shadow-[#8bbf4d]/20"
                />
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
                If you can copy and paste, you can start a small business
                website redesign.
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
                    title: "Watch the site redesign happen",
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
                Old website in, fresh website redesign out.
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-white/55">
                Real site redesign examples for the kinds of websites that
                haven&apos;t changed since 2012.
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
                The best small business website redesign example is your own
                website —{" "}
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
                One simple website redesign cost.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-base leading-7 text-black/55">
                No credits, no tokens, no surprises. An affordable website
                redesign starts free, and you only pay when you want your new
                website online.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-black/10 bg-white p-8">
                  <h3 className="text-lg font-bold">Free preview</h3>
                  <p className="mt-2 font-fraunces text-4xl font-semibold">
                    £0
                  </p>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-black/60">
                    <li>✓ See your AI website redesign — no signup</li>
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
                    <li>✓ Your redesigned website live online — we host it</li>
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
                    a: "No. We make a separate website redesign preview. Your current website stays exactly as it is until you decide to switch.",
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
                    a: "The preview is free. If you want the redesigned website hosted online, Kiwi Pro is £10/month with unlimited plain-English changes and no long contract.",
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

          {blogSnippets.length ? (
            <section className="border-t border-black/5 px-5 py-20 sm:px-8">
              <div className="mx-auto w-full max-w-6xl">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/40">
                      From the blog
                    </p>
                    <h2 className="mt-3 max-w-2xl font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
                      Quick reads before you refresh your website.
                    </h2>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25"
                  >
                    View all guides
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
            <div className="mx-auto w-full max-w-6xl rounded-[2.5rem] bg-kiwi-green px-6 py-16 text-center sm:px-12">
              <h2 className="mx-auto max-w-2xl font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
                Your website called. It wants a redesign.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-7 text-black/60">
                Revamping website design? Try it for free. It takes about 2
                minutes, and nothing changes until you say so.
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
                onClick={() => setAccountMode("closed")}
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
                  onClick={() =>
                    setAccountMode(accountMode === "login" ? "signup" : "login")
                  }
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
    </main>
  );
}
