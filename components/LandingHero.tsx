"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  expiresAt?: string | null;
  freeEditsRemaining?: number | null;
  isClaimed?: boolean;
  onOpenAccount?: () => void;
  onUpgrade?: () => void;
  onSubmitEdit?: (prompt: string) => void;
  isSubmittingEdit?: boolean;
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
  expiresAt = null,
  freeEditsRemaining = null,
  isClaimed = false,
  onOpenAccount,
  onUpgrade,
  onSubmitEdit,
  isSubmittingEdit = false,
}: LandingHeroProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRefresh();
  };
  const previewHref = previewUrl ? previewPath(previewUrl) : null;
  const hasStarted =
    isRefreshing || Boolean(statusMessage) || Boolean(previewHref);
  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(expiresAt))
    : null;

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editPrompt.trim() || !onSubmitEdit) {
      return;
    }

    onSubmitEdit(editPrompt);
    setEditPrompt("");
  };

  return (
    <section className="relative z-10 min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-72 bg-[radial-gradient(circle_at_center,rgba(192,234,112,0.22),transparent_65%)]" />
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/refresh-kiwi-favicon.png"
                alt=""
                width={34}
                height={34}
                priority
                aria-hidden
                className="rounded-full"
              />
              <p className="font-montserrat text-xl font-bold text-black sm:text-2xl">
                Refresh Kiwi
              </p>
            </div>
            <p className="mt-1 text-xs font-medium tracking-wide text-black/45">
              Same website, fresher skin.
            </p>
          </div>
          <nav
            className="hidden items-center gap-8 text-sm font-medium text-black/70 md:flex"
            aria-label="Primary"
          >
            <a href="#how-it-works" className="transition hover:text-black">
              How it works
            </a>
            <a href="#examples" className="transition hover:text-black">
              Examples
            </a>
            <a href="#pricing" className="transition hover:text-black">
              Pricing
            </a>
          </nav>
          <a
            href="#website-url"
            className="hidden rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover sm:inline-flex"
          >
            Refresh my website
          </a>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:gap-14 lg:py-8">
          <div className="text-center lg:text-left">
            <div
              className={`overflow-hidden transition-all duration-700 ease-out ${
                hasStarted
                  ? "max-h-0 -translate-y-3 opacity-0"
                  : "max-h-[26rem] translate-y-0 opacity-100"
              }`}
            >
              <h1 className="text-balance text-5xl font-bold leading-[0.95] tracking-[-0.055em] text-black sm:text-6xl lg:text-7xl">
                Paste your website.
                <span className="block text-[#c0ea70]">
                  Get a fresh new version in 90 seconds.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-black/60 sm:text-lg lg:mx-0">
                Drop in your site&apos;s URL. We rebuild it with a fresh,
                award-worthy design in seconds. No code, no designers, no fuss.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row lg:mx-0"
            >
              <label htmlFor="website-url" className="sr-only">
                Website URL
              </label>
              <input
                id="website-url"
                type="url"
                inputMode="url"
                placeholder="https://yourwebsite.co.uk"
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                disabled={disabled}
                className="box-border h-[42px] min-h-[42px] w-full shrink-0 rounded-full border border-black/10 bg-white px-5 text-sm text-black shadow-sm outline-none transition placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0 sm:flex-1"
              />
              <button
                type="submit"
                disabled={disabled || !url.trim()}
                className="box-border h-[42px] min-h-[42px] w-full shrink-0 rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black opacity-100 shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isRefreshing ? "Refreshing…" : "Refresh my website"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-black/45 lg:justify-start">
              <span>No signup needed</span>
            </div>

            {isRefreshing ? (
              <div
                className="mt-7 flex flex-col items-center gap-3 lg:items-start"
                role="status"
                aria-live="polite"
              >
                {statusMessage ? (
                  <p className="text-sm text-black/60">{statusMessage}</p>
                ) : null}
                <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-4 py-1.5 text-sm font-medium text-black/70 shadow-sm">
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
              <div className="preview-pop mt-8 max-w-xl rounded-[2rem] border border-black/10 bg-white/85 p-4 text-left shadow-xl shadow-black/10 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">
                      Your homepage is ready
                    </p>
                    <p className="mt-1 text-xs leading-5 text-black/55">
                      {expiryLabel
                        ? `Free preview stays live until ${expiryLabel}.`
                        : "Free preview stays live for 7 days."}
                    </p>
                  </div>
                  <Link
                    href={previewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-black/85"
                  >
                    View homepage
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="rounded-2xl border border-black/10 bg-[#f7faef] p-4 text-left transition hover:border-black/20"
                  >
                    <span className="text-sm font-semibold text-black">
                      {isClaimed ? "Saved to your account" : "Save and edit"}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-black/55">
                      {isClaimed
                        ? `${freeEditsRemaining ?? 0} free edits remaining.`
                        : "Create a free account to claim 3 edits."}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="rounded-2xl border border-black bg-kiwi-green p-4 text-left shadow-sm transition hover:bg-kiwi-green-hover"
                  >
                    <span className="text-sm font-semibold text-black">
                      Keep it live
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-black/65">
                      Go Pro for unlimited edits and extra pages.
                    </span>
                  </button>
                </div>

                {isClaimed ? (
                  <form onSubmit={handleEditSubmit} className="mt-4">
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
                        onChange={(event) => setEditPrompt(event.target.value)}
                        placeholder="Make the hero more premium, swap the main image..."
                        className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm text-black outline-none placeholder:text-black/30 focus:border-black/30"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingEdit || !editPrompt.trim()}
                        className="h-11 rounded-full border border-black bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmittingEdit ? "Sending…" : "Use edit"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute left-1/2 top-1/2 z-20 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-3xl text-[#6aaa3a] shadow-xl md:flex">
              →
            </div>
            <div className="grid gap-5 md:grid-cols-2 md:items-center">
              <div className="relative rounded-[2rem] border border-black/10 bg-white/80 p-3 shadow-xl shadow-black/10 backdrop-blur">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/5 px-4 py-1.5 text-xs font-semibold text-black/60">
                  Before
                </div>
                <div className="overflow-hidden rounded-[1.35rem] border border-black/10 bg-[#f4f4f1]">
                  <div className="flex gap-1.5 border-b border-black/10 bg-white px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                  </div>
                  <div className="p-5">
                    <div className="mb-5 h-5 rounded bg-black/12" />
                    <h2 className="font-serif text-2xl font-bold leading-tight text-black">
                      Welcome to
                      <br />
                      Our Company
                    </h2>
                    <p className="mt-3 max-w-[13rem] text-xs leading-5 text-black/60">
                      We provide reliable services with a personal touch.
                    </p>
                    <div className="mt-5 grid grid-cols-[0.8fr_1fr] gap-4">
                      <div className="space-y-2 text-xs text-blue-700 underline">
                        <p>Home</p>
                        <p>About Us</p>
                        <p>Services</p>
                        <p>Contact</p>
                      </div>
                      <div className="h-24 rounded bg-gradient-to-br from-slate-300 to-slate-500" />
                    </div>
                    <div className="mt-5 space-y-2">
                      <div className="h-3 w-24 rounded bg-black/70" />
                      <div className="h-2 rounded bg-black/15" />
                      <div className="h-2 w-4/5 rounded bg-black/15" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative rounded-[2rem] border border-[#bfe982]/60 bg-white p-3 shadow-2xl shadow-[#8bbf4d]/20 md:translate-y-4 lg:translate-y-0">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-kiwi-green px-4 py-1.5 text-xs font-bold text-black">
                  After ✨
                </div>
                <div className="overflow-hidden rounded-[1.35rem] border border-black/10 bg-[#fbfdf6]">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="text-sm font-bold text-black">Nexus Studio</div>
                    <div className="h-3 w-4 rounded-sm border-y-2 border-black/45" />
                  </div>
                  <div className="relative min-h-60 bg-[radial-gradient(circle_at_80%_25%,rgba(192,234,112,0.5),transparent_32%),linear-gradient(135deg,#f7fbef,#dfece0)] p-5">
                    <div className="max-w-[14rem]">
                      <h2 className="text-2xl font-bold leading-tight tracking-tight text-black">
                        Building digital experiences that drive growth
                      </h2>
                      <p className="mt-3 text-xs leading-5 text-black/55">
                        Strategy, design and development that helps businesses
                        thrive.
                      </p>
                      <div className="mt-4 inline-flex rounded-full bg-kiwi-green px-4 py-2 text-xs font-semibold text-black">
                        Get started
                      </div>
                    </div>
                    <div className="absolute bottom-5 right-5 h-28 w-28 rounded-full border-[18px] border-white/70 bg-white/25 shadow-inner" />
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-white text-center text-[10px] font-medium text-black/60">
                    <div className="bg-white px-2 py-3">Modern design</div>
                    <div className="bg-white px-2 py-3">Better copy</div>
                    <div className="bg-white px-2 py-3">Built to grow</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-xs font-medium text-black/55 shadow-lg shadow-black/5 backdrop-blur">
              <div className="flex -space-x-2">
                <span className="h-7 w-7 rounded-full border-2 border-white bg-[#2f4636]" />
                <span className="h-7 w-7 rounded-full border-2 border-white bg-[#d7bfa6]" />
                <span className="h-7 w-7 rounded-full border-2 border-white bg-[#8da66f]" />
              </div>
              <span>Loved by 1,000+ business owners</span>
              <span className="font-bold text-black">4.9/5</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
