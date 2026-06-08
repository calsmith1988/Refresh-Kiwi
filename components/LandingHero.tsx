"use client";

import Image from "next/image";
import Link from "next/link";

interface LandingHeroProps {
  url: string;
  onUrlChange: (value: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  isRefreshing?: boolean;
  statusMessage?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  elapsedMs?: number | null;
}

function previewPath(previewUrl: string): string {
  try {
    return new URL(previewUrl, "https://refresh-kiwi.local").pathname;
  } catch {
    return previewUrl.startsWith("/") ? previewUrl : `/${previewUrl}`;
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LandingHero({
  url,
  onUrlChange,
  onRefresh,
  disabled = false,
  isRefreshing = false,
  statusMessage = null,
  previewUrl = null,
  errorMessage = null,
  elapsedMs = null,
}: LandingHeroProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRefresh();
  };
  const previewHref = previewUrl ? previewPath(previewUrl) : null;
  const hasStarted =
    isRefreshing || Boolean(statusMessage) || Boolean(previewHref);

  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-xl text-center">
        <div className="pointer-events-none absolute inset-x-[-4rem] top-[-3rem] bottom-[-4rem] -z-10 rounded-[3rem] bg-white/75 blur-3xl" />
        <div className="mb-5">
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon.png"
              alt=""
              width={28}
              height={28}
              priority
              aria-hidden
            />
            <p className="font-fraunces text-xl font-medium text-black/80 sm:text-2xl">
              Refresh Kiwi
            </p>
          </div>
          <p className="mt-1.5 text-xs font-medium tracking-wide text-black/45">
            Same website, fresher skin.
          </p>
        </div>
        <div
          className={`overflow-hidden transition-all duration-700 ease-out ${
            hasStarted
              ? "max-h-0 -translate-y-3 opacity-0"
              : "max-h-72 translate-y-0 opacity-100"
          }`}
        >
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            A fresher website in 90 seconds
          </h1>
          <p className="mb-10 text-base leading-relaxed text-black/60 sm:text-lg">
            Drop in your site&apos;s URL. We rebuild it with a fresh,
            award-worthy design in seconds. No code, no designers, no fuss.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="website-url" className="sr-only">
            Website URL
          </label>
          <input
            id="website-url"
            type="url"
            inputMode="url"
            placeholder="https://your-website.com"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            disabled={disabled}
            className="box-border h-12 min-h-12 w-full shrink-0 rounded-full border border-black/15 bg-white px-5 text-base text-black outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0 sm:flex-1"
          />
          <button
            type="submit"
            disabled={disabled || !url.trim()}
            className="box-border h-12 min-h-12 w-full shrink-0 rounded-full border-2 border-black bg-kiwi-green px-6 text-base font-medium text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isRefreshing ? "Refreshing…" : "Refresh My Website"}
          </button>
        </form>

        {isRefreshing ? (
          <div
            className="mt-7 flex flex-col items-center gap-3"
            role="status"
            aria-live="polite"
          >
            {statusMessage ? (
              <p className="text-sm text-black/60">{statusMessage}</p>
            ) : null}
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-sm font-medium text-black/70 shadow-sm">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
              />
              <span className="tabular-nums text-black">
                {formatElapsed(elapsedMs ?? 0)}
              </span>
              <span className="text-black/35">/ usually 2–3 min</span>
            </div>
          </div>
        ) : null}

        {previewHref ? (
          <div className="preview-pop mt-8 flex justify-center">
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 text-base font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-black/85 hover:shadow-xl"
            >
              View your refreshed homepage
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
