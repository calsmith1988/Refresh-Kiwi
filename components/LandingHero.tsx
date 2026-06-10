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
  /** 0-based index of the current loading stage while refreshing. */
  loadingStage?: number;
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
  editStatus?: "idle" | "working" | "done" | "failed";
  isLoggedIn?: boolean;
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

function sourceHostLabel(raw: string): string {
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

const LOADING_STAGES = [
  "Reading your old website",
  "Designing your new look",
  "Finishing touches",
] as const;

export default function LandingHero({
  url,
  onUrlChange,
  onRefresh,
  disabled = false,
  isRefreshing = false,
  loadingStage = 0,
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
  editStatus = "idle",
  isLoggedIn = false,
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
    <>
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
              Website refreshes for local businesses.
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
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
              >
                My websites
              </Link>
            ) : null}
            <a
              href="#website-url"
              className="hidden rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover sm:inline-flex"
            >
              Refresh my website
            </a>
          </div>
        </header>

        <nav
          className="mt-4 flex items-center justify-center gap-6 text-xs font-medium text-black/60 md:hidden"
          aria-label="Primary mobile"
        >
          <a href="#how-it-works">How it works</a>
          <a href="#examples">Examples</a>
          <a href="#pricing">Pricing</a>
        </nav>

        {isRefreshing ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <div
              className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-black/40">
                Refreshing
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-black">
                {sourceHostLabel(url)}
              </h2>

              <ol className="mx-auto mt-7 max-w-xs space-y-3 text-left">
                {LOADING_STAGES.map((stage, index) => {
                  const isDone = index < loadingStage;
                  const isCurrent = index === loadingStage;

                  return (
                    <li key={stage} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? "bg-kiwi-green text-black"
                            : isCurrent
                              ? "border-2 border-kiwi-green bg-white"
                              : "border border-black/15 bg-white"
                        }`}
                      >
                        {isDone ? (
                          "✓"
                        ) : isCurrent ? (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-kiwi-green" />
                        ) : null}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isDone
                            ? "text-black/45 line-through decoration-black/20"
                            : isCurrent
                              ? "text-black"
                              : "text-black/40"
                        }`}
                      >
                        {stage}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {statusMessage ? (
                <p className="mt-6 text-sm italic text-black/55">
                  {statusMessage}
                </p>
              ) : null}

              <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-black/70 shadow-sm">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-kiwi-green"
                />
                <span className="tabular-nums text-black">
                  {formatElapsed(elapsedMs ?? 0)}
                </span>
                <span className="text-black/35">/ usually about 2 min</span>
              </div>

              <p className="mt-5 text-xs leading-5 text-black/45">
                You can leave this page — your refresh keeps going and will be
                here when you come back.
              </p>
            </div>
          </div>
        ) : (
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
                Same website.
                <span className="block text-[#c0ea70]">Fresher skin.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-black/60 sm:text-lg lg:mx-0">
                Paste your web address and we rebuild your website with a
                fresh, modern design in about 2 minutes. Your words, your
                photos, your business — no code, no designers, no fuss.
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
                className="box-border h-[42px] min-h-[42px] w-full shrink-0 rounded-full border border-black/10 bg-white px-5 text-sm text-black opacity-100 shadow-sm outline-none transition placeholder:text-black/30 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-100 sm:min-w-0 sm:flex-1"
              />
              <button
                type="submit"
                disabled={disabled || !url.trim()}
                className="box-border h-[42px] min-h-[42px] w-full shrink-0 rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black opacity-100 shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-100 sm:w-auto"
              >
                {isRefreshing ? "Refreshing…" : "Refresh my website"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-black/45 lg:justify-start">
              <span>No signup needed</span>
            </div>

            {previewHref ? (
              <div className="preview-pop mt-8 max-w-xl rounded-[2rem] border border-black/10 bg-white/85 p-4 text-left shadow-xl shadow-black/10 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">
                      Your new website is ready
                    </p>
                    <p className="mt-1 text-xs leading-5 text-black/55">
                      {expiryLabel
                        ? `This preview is yours free until ${expiryLabel}.`
                        : "This preview is yours free for 7 days."}
                    </p>
                  </div>
                  <Link
                    href={previewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-black/85"
                  >
                    See your new website
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="rounded-2xl border border-black/10 bg-[#f7faef] p-4 text-left transition hover:border-black/20"
                  >
                    <span className="text-sm font-semibold text-black">
                      {isClaimed ? "✓ Saved to your account" : "Save and edit"}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-black/55">
                      {isClaimed
                        ? `You have ${freeEditsRemaining ?? 0} free ${
                            (freeEditsRemaining ?? 0) === 1
                              ? "change"
                              : "changes"
                          } left.`
                        : "Free account — keep your new website and get 3 free changes."}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="rounded-2xl border border-black bg-kiwi-green p-4 text-left shadow-sm transition hover:bg-kiwi-green-hover"
                  >
                    <span className="text-sm font-semibold text-black">
                      Put it online — £10/month
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-black/65">
                      Unlimited changes, extra pages, your own web address.
                      Cancel anytime.
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
                        placeholder="Make the phone number bigger, swap the main photo..."
                        className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm text-black outline-none placeholder:text-black/30 focus:border-black/30"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingEdit || !editPrompt.trim()}
                        className="h-11 rounded-full border border-black bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
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
                        ✓ Done!{" "}
                        {previewHref ? (
                          <Link
                            href={previewHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4"
                          >
                            Open your website to see the change
                          </Link>
                        ) : (
                          "Open your website to see the change."
                        )}
                      </p>
                    ) : editStatus === "failed" ? (
                      <p className="mt-3 text-xs font-medium text-black/55">
                        That change didn&apos;t work this time — please try
                        asking again.
                      </p>
                    ) : null}
                  </form>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <div
                className="mt-7 max-w-xl rounded-[2rem] border border-black/10 bg-white/90 p-5 text-left shadow-xl shadow-black/10 backdrop-blur"
                role="alert"
              >
                <p className="text-sm font-semibold text-black">
                  That didn&apos;t work this time
                </p>
                <p className="mt-1 text-sm leading-6 text-black/60">
                  {errorMessage}
                </p>
                {!previewHref ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={disabled || !url.trim()}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-kiwi-green px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            {previewHref ? (
              <div className="relative rounded-[2rem] border border-[#bfe982]/60 bg-white p-3 shadow-2xl shadow-[#8bbf4d]/20">
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-kiwi-green px-4 py-1.5 text-xs font-bold text-black">
                  Your new website ✨
                </div>
                <div className="overflow-hidden rounded-[1.35rem] border border-black/10 bg-white">
                  <div className="flex gap-1.5 border-b border-black/10 bg-white px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                  </div>
                  <iframe
                    // Reload the frame once an edit lands so the user sees it.
                    key={editStatus === "done" ? "after-edit" : "initial"}
                    src={previewHref}
                    title="Preview of your new website"
                    className="h-[420px] w-full sm:h-[480px]"
                  />
                </div>
              </div>
            ) : (
            <>
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
              <span>250+ websites already refreshed</span>
            </div>
            </>
            )}
          </div>
        </div>
        )}
      </div>
    </section>

    {!isRefreshing ? (
    <>
    <section
      id="how-it-works"
      className="relative z-10 scroll-mt-8 px-5 py-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-black/55">
          No tech skills needed. If you can copy and paste, you can refresh
          your website.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Paste your web address",
              body: "Pop in your current website's address — Wix, WordPress, anything. No signup needed to see the result.",
            },
            {
              step: "2",
              title: "We rebuild it for you",
              body: "In about 2 minutes we redesign your website with a fresh, modern look. Your words, photos, and phone number all stay.",
            },
            {
              step: "3",
              title: "You go live",
              body: "Happy with it? £10/month puts it online, with unlimited changes and your own web address. We handle the technical bits.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg shadow-black/5"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-kiwi-green text-sm font-bold text-black">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-bold text-black">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-black/55">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section
      id="examples"
      className="relative z-10 scroll-mt-8 bg-[#f7faef] px-5 py-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
          Old website in, fresh website out
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-black/55">
          Built for local businesses — plumbers, garages, salons, clinics,
          restaurants — with websites that haven&apos;t changed in years.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              name: "Property maintenance",
              before: "2010s template, tiny text, walls of paragraphs",
              after:
                "Bold hero with the phone number front and centre, trust badges, five-star reviews",
            },
            {
              name: "Car body shop",
              before: "Dated gallery pages and broken mobile layout",
              after:
                "Clean photo showcase, clear services, tap-to-call on mobile",
            },
            {
              name: "Osteopath clinic",
              before: "Cluttered menus and buried contact details",
              after:
                "Calm, professional design with booking info impossible to miss",
            },
          ].map((example) => (
            <div
              key={example.name}
              className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg shadow-black/5"
            >
              <h3 className="text-lg font-bold text-black">{example.name}</h3>
              <div className="mt-4 space-y-3 text-sm leading-6">
                <p className="text-black/45">
                  <span className="font-semibold text-black/60">Before:</span>{" "}
                  {example.before}
                </p>
                <p className="text-black/70">
                  <span className="font-semibold text-[#6aaa3a]">After:</span>{" "}
                  {example.after}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-black/55">
          The best example is your own website —{" "}
          <a
            href="#website-url"
            className="font-semibold text-black underline underline-offset-4"
          >
            try it free
          </a>
          .
        </p>
      </div>
    </section>

    <section
      id="pricing"
      className="relative z-10 scroll-mt-8 px-5 py-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto w-full max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
          One simple price
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-black/55">
          No credits. No tokens. No surprises. Try it free, pay only when you
          want your new website online.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-[2rem] border border-black/10 bg-white p-7 shadow-lg shadow-black/5">
            <h3 className="text-lg font-bold text-black">Free preview</h3>
            <p className="mt-1 text-3xl font-bold text-black">£0</p>
            <ul className="mt-5 space-y-2.5 text-sm leading-6 text-black/60">
              <li>See your refreshed website — no signup needed</li>
              <li>Keep it for 7 days with a free account</li>
              <li>3 free changes included</li>
            </ul>
            <a
              href="#website-url"
              className="mt-6 inline-flex rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:border-black/30"
            >
              Try it free
            </a>
          </div>
          <div className="rounded-[2rem] border-2 border-kiwi-green bg-white p-7 shadow-xl shadow-[#8bbf4d]/15">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-black">Kiwi Pro</h3>
              <span className="rounded-full bg-kiwi-green px-3 py-1 text-xs font-bold text-black">
                Most popular
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-black">
              £10
              <span className="text-base font-medium text-black/45">
                /month
              </span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm leading-6 text-black/60">
              <li>Your new website live on the internet — we host it</li>
              <li>Unlimited changes, just ask in plain English</li>
              <li>Your own web address (like www.yourbusiness.com)</li>
              <li>Extra pages built for you</li>
              <li>Cancel anytime — no contracts</li>
            </ul>
            <a
              href="#website-url"
              className="mt-6 inline-flex rounded-full bg-kiwi-green px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-kiwi-green-hover"
            >
              Start with a free preview
            </a>
          </div>
        </div>
      </div>
    </section>

    <footer className="relative z-10 border-t border-black/5 px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 text-center">
        <p className="font-montserrat text-sm font-bold text-black">
          Refresh Kiwi
        </p>
        <p className="text-xs text-black/45">Same website, fresher skin.</p>
      </div>
    </footer>
    </>
    ) : null}
    </>
  );
}
