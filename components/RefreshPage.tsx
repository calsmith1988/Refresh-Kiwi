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

function normalizePreviewUrl(previewUrl: string | null): string | null {
  if (!previewUrl || typeof window === "undefined") {
    return previewUrl;
  }

  const url = new URL(previewUrl, window.location.origin);

  return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
}

export default function RefreshPage() {
  const [url, setUrl] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollFailuresRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
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
        }

        if (TERMINAL_STATUSES.has(nextJob.status)) {
          stopPolling();

          if (nextJob.status === "failed") {
            setErrorMessage(nextJob.errorMessage ?? "Refresh failed");
          }
        }
      } catch {
        pollFailuresRef.current += 1;

        if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
          stopPolling();
          setIsRefreshing(false);
          setErrorMessage(
            "Lost connection while checking refresh status. Check Render logs and try again.",
          );
        }
      }
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleRefresh = async () => {
    if (!url.trim() || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setJob(null);
    setErrorMessage(null);
    pollFailuresRef.current = 0;
    stopPolling();

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

      pollTimerRef.current = window.setInterval(() => {
        void pollJob(createdJob.id);
      }, POLL_INTERVAL_MS);
    } catch (error) {
      setIsRefreshing(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start refresh",
      );
    }
  };

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
        statusMessage={job?.statusMessage ?? null}
        previewUrl={normalizePreviewUrl(job?.previewUrl ?? null)}
        errorMessage={errorMessage}
      />
    </main>
  );
}
