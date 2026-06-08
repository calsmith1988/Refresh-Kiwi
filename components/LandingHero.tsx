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
}

function previewPath(previewUrl: string): string {
  try {
    return new URL(previewUrl, "https://refresh-kiwi.local").pathname;
  } catch {
    return previewUrl.startsWith("/") ? previewUrl : `/${previewUrl}`;
  }
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
}: LandingHeroProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRefresh();
  };
  const previewHref = previewUrl ? previewPath(previewUrl) : null;

  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-xl text-center">
        <div className="pointer-events-none absolute inset-x-[-4rem] top-[-3rem] bottom-[-4rem] -z-10 rounded-[3rem] bg-white/75 blur-3xl" />
        <div className="mb-4 flex items-center justify-center gap-2.5">
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
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-black sm:text-5xl">
          Modernise your website in minutes
        </h1>
        <p className="mb-10 text-base leading-relaxed text-black/60 sm:text-lg">
          Paste your current site URL. We&apos;ll rebuild it with a fresh,
          award-worthy design — no coding required.
        </p>

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
            className="h-12 flex-1 rounded-full border border-black/15 bg-white px-5 text-base text-black outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !url.trim()}
            className="h-12 shrink-0 rounded-full bg-kiwi-green px-6 text-base font-medium text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing…" : "Refresh My Website"}
          </button>
        </form>

        {isRefreshing && statusMessage ? (
          <p className="mt-6 text-sm text-black/50" role="status" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}

        {previewHref ? (
          <p className="mt-4 text-sm">
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-black underline decoration-black/30 underline-offset-4 transition hover:decoration-black"
            >
              View your refreshed homepage
            </Link>
          </p>
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
