"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile challenge. Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the app is unchanged until
 * Turnstile is configured. Emits a single-use token via onVerify; the parent
 * should clear its stored token on submit and on onExpire.
 */

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileScriptLoading?: Promise<void>;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (!window.__turnstileScriptLoading) {
    window.__turnstileScriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        window.__turnstileScriptLoading = undefined;
        script.remove();
        reject(new Error("Failed to load Turnstile"));
      };
      document.head.appendChild(script);
    });
  }

  return window.__turnstileScriptLoading;
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  className,
  background = false,
  resetKey = 0,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
  /**
   * Runs the challenge invisibly (interaction-only) so a token can be
   * fetched ahead of time. No status UI is shown in this mode.
   */
  background?: boolean;
  /** Increment to reset the widget and fetch a fresh token. */
  resetKey?: number;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const [status, setStatus] = useState<"loading" | "checking" | "error">(
    "loading",
  );
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  }, [onExpire, onVerify]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;
    const container = containerRef.current;
    setStatus("loading");
    container.replaceChildren();

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !container) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => {
            setStatus("error");
            onExpireRef.current?.();
          },
          "error-callback": () => {
            setStatus("error");
            onExpireRef.current?.();
          },
          theme: "auto",
          appearance: background ? "interaction-only" : "always",
        });
        setStatus("checking");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [background, retryKey, siteKey]);

  useEffect(() => {
    if (resetKey === 0) {
      return;
    }

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setStatus("checking");
    }
  }, [resetKey]);

  if (!siteKey) {
    return null;
  }

  if (background) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0"
      >
        <div ref={containerRef} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      {status === "loading" ? (
        <p className="pb-2 text-center text-xs font-medium text-black/45">
          Loading secure check…
        </p>
      ) : status === "checking" ? (
        <p className="pb-2 text-center text-xs font-medium text-black/45">
          Checking…
        </p>
      ) : (
        <div className="pb-2 text-center">
          <p className="text-xs font-medium text-red-700">
            The security check could not load.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-1 text-xs font-semibold text-black underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
