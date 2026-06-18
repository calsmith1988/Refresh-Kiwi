"use client";

import { useEffect, useMemo, useState } from "react";

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

function activityAccent(type: Activity["type"]) {
  if (type === "pro") {
    return "bg-kiwi-green";
  }

  if (type === "edit") {
    return "bg-[#8bbf4d]";
  }

  return "bg-black";
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
  const accentClass = useMemo(
    () => (activity ? activityAccent(activity.type) : "bg-black"),
    [activity],
  );

  if (!isVisible || !activity) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-40 hidden max-w-[calc(100vw-2.5rem)] sm:block">
      <div className="preview-pop flex w-80 items-start gap-3 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-2xl shadow-black/10 backdrop-blur">
        <span
          aria-hidden
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accentClass}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-black">
            {activity.message}
          </p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Live Refresh Kiwi activity
          </p>
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
          className="rounded-full px-2 text-lg leading-none text-black/35 transition hover:text-black"
        >
          ×
        </button>
      </div>
    </div>
  );
}
