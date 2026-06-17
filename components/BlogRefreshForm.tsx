"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import type { JobResponse } from "@/lib/jobs/types";
import {
  createMetaEventId,
  trackMetaBrowserEvent,
} from "@/lib/meta/browser";

const ACTIVE_JOB_STORAGE_KEY = "refresh-kiwi:active-job";
type RefreshResponse = Partial<JobResponse> & { error?: string };

export default function BlogRefreshForm() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const metaEventId = createMetaEventId("lead");
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, metaEventId }),
      });
      const payload = (await response.json()) as RefreshResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "We couldn't start that refresh.");
      }

      if (!payload.id) {
        throw new Error("We couldn't start that refresh.");
      }

      trackMetaBrowserEvent({
        eventName: "Lead",
        eventId: metaEventId,
        customData: {
          content_name: "Blog refresh request",
          source_url: url,
        },
      });

      try {
        window.localStorage.setItem(
          ACTIVE_JOB_STORAGE_KEY,
          JSON.stringify({ jobId: payload.id, url }),
        );
      } catch {
        // The landing page can still resume from the query string.
      }
      window.location.href = `/?job=${encodeURIComponent(
        payload.id,
      )}&url=${encodeURIComponent(url)}#refresh-input`;
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't start that refresh.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mt-7 flex flex-col gap-2 rounded-[1.75rem] border-2 border-black/15 bg-white p-2 shadow-sm transition focus-within:border-black/35 sm:flex-row sm:items-center sm:rounded-full"
    >
      <label htmlFor="blog-refresh-url" className="sr-only">
        Your current website address
      </label>
      <input
        id="blog-refresh-url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="yourbusiness.co.uk"
        inputMode="url"
        autoComplete="url"
        className="h-12 min-w-0 flex-1 rounded-full bg-transparent px-4 text-base outline-none placeholder:text-black/35"
      />
      <button
        type="submit"
        disabled={!url.trim() || isSubmitting}
        className="h-12 shrink-0 rounded-full bg-[#141811] px-6 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Starting..." : "Refresh it free"}
      </button>
      {errorMessage ? (
        <p className="px-4 pb-2 text-sm text-red-700 sm:absolute sm:left-4 sm:top-full sm:mt-2 sm:px-0 sm:pb-0">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
