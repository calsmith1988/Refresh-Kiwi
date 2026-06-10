"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import LandingHero from "@/components/LandingHero";
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

export default function RefreshPage() {
  const [url, setUrl] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountMode, setAccountMode] = useState<"closed" | "signup" | "login">("closed");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editStatus, setEditStatus] = useState<
    "idle" | "working" | "done" | "failed"
  >("idle");
  const [showProSheet, setShowProSheet] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const editPollTimerRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
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

          if (resumedJob.status === "failed") {
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

  const handleSubmitEdit = async (prompt: string) => {
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

  const handleRefresh = async () => {
    if (!url.trim() || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setJob(null);
    setErrorMessage(null);
    setStatusMessageIndex(0);
    stopPolling();
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

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-white">
      <KiwiPitCanvas active={isRefreshing} />
      <LandingHero
        url={url}
        onUrlChange={setUrl}
        onRefresh={() => {
          void handleRefresh();
        }}
        disabled={isRefreshing}
        isRefreshing={isRefreshing}
        loadingStage={loadingStage}
        statusMessage={
          isRefreshing
            ? elapsedMs > OVERTIME_THRESHOLD_MS
              ? OVERTIME_MESSAGE
              : REFRESH_STATUS_MESSAGES[statusMessageIndex]
            : (job?.statusMessage ?? null)
        }
        previewUrl={normalizePreviewUrl(job?.previewUrl ?? null)}
        errorMessage={errorMessage}
        elapsedMs={elapsedMs}
        expiresAt={job?.expiresAt ?? null}
        freeEditsRemaining={job?.freeEditsRemaining ?? null}
        isClaimed={job?.isClaimed ?? false}
        onOpenAccount={handleOpenAccount}
        onUpgrade={handleUpgrade}
        onSubmitEdit={handleSubmitEdit}
        isSubmittingEdit={isSubmittingEdit}
        editStatus={editStatus}
        isLoggedIn={Boolean(user)}
      />

      {showProSheet ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-black">
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
                void startCheckout();
              }}
              disabled={isStartingCheckout}
              className="mt-5 h-12 w-full rounded-full border border-black bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:opacity-50"
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

      {accountMode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-black">
                  {accountMode === "login" ? "Log in" : "Save your new website"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Save it to a free account so it&apos;s still here tomorrow —
                  and get 3 free changes included.
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
                className="h-12 w-full rounded-full border border-black bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:opacity-50"
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
