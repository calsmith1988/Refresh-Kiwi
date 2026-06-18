"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Activity = {
  type: "refresh" | "edit" | "pro";
  message: string;
  occurredAt: string;
};

const DISMISSED_STORAGE_KEY = "refresh-kiwi:activity-toast-dismissed-at";
const DISMISS_FOR_MS = 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 6500;
const ROTATE_MS = 12000;
const MAX_IMPRESSIONS = 3;

function relativeActivityTime(occurredAt: string): string {
  const elapsedMs = Date.now() - new Date(occurredAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes === 1) {
    return "1 minute ago";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minutes ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours === 1) {
    return "1 hour ago";
  }

  if (elapsedHours < 24) {
    return `${elapsedHours} hours ago`;
  }

  return "Recently";
}

export default function ActivityToast() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [impressions, setImpressions] = useState(0);

  useEffect(() => {
    try {
      const dismissedAt = Number(
        window.localStorage.getItem(DISMISSED_STORAGE_KEY) ?? 0,
      );

      if (dismissedAt && Date.now() - dismissedAt < DISMISS_FOR_MS) {
        return;
      }
    } catch {
      // Storage can be unavailable; the toast can still behave per page view.
    }

    let cancelled = false;
    let showTimer: number | undefined;

    void fetch("/api/activity", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { activities?: Activity[] } | null) => {
        if (cancelled || !payload?.activities?.length) {
          return;
        }

        setActivities(payload.activities);
        showTimer = window.setTimeout(() => {
          if (!cancelled) {
            setIsVisible(true);
            setImpressions(1);
          }
        }, SHOW_DELAY_MS);
      })
      .catch(() => {
        // Social proof is optional; never interrupt the homepage for it.
      });

    return () => {
      cancelled = true;
      if (showTimer) {
        window.clearTimeout(showTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || activities.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setImpressions((current) => {
        if (current >= MAX_IMPRESSIONS) {
          setIsVisible(false);
          window.clearInterval(timer);
          return current;
        }

        setIndex((value) => (value + 1) % activities.length);
        return current + 1;
      });
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [activities.length, isVisible]);

  const activity = activities[index];

  if (!isVisible || !activity) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-40 hidden max-w-[calc(100vw-2.5rem)] sm:block">
      <div className="preview-pop relative flex w-[25.5rem] items-start gap-4 overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-5 shadow-2xl shadow-black/10 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-kiwi-green/35 blur-3xl"
        />
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f8fde9] shadow-sm">
          <Image
            src="/refresh-kiwi-favicon-v2.png"
            alt=""
            width={26}
            height={26}
            className="rounded-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-5 text-black">
            {activity.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium leading-5 text-black/40">
            <span className="inline-flex items-center gap-1.5">
              <svg
                aria-hidden
                viewBox="0 0 12 12"
                className="h-3.5 w-3.5 fill-[#76ad34]"
              >
                <path d="M6.75.75 2.2 6.35h3.25L5.25 11.25l4.55-5.6H6.55L6.75.75Z" />
              </svg>
              Live activity
            </span>
            <span aria-hidden>•</span>
            <span>{relativeActivityTime(activity.occurredAt)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            try {
              window.localStorage.setItem(
                DISMISSED_STORAGE_KEY,
                String(Date.now()),
              );
            } catch {
              // Ignore storage errors.
            }
          }}
          aria-label="Dismiss activity update"
          className="relative -mt-1 rounded-full px-2 text-xl leading-none text-black/35 transition hover:text-black"
        >
          ×
        </button>
      </div>
    </div>
  );
}
