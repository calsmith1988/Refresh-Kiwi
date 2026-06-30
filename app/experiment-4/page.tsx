"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function ExperimentFourPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let frame = 0;
    const handle = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setPointer({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      });
    };

    el.addEventListener("pointermove", handle);
    return () => {
      el.removeEventListener("pointermove", handle);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Parallax offsets derived from the pointer (kept subtle).
  const kiwiShift = {
    x: (pointer.x - 0.5) * -36,
    y: (pointer.y - 0.5) * -36,
  };
  const tiltX = (pointer.y - 0.5) * -8;
  const tiltY = (pointer.x - 0.5) * 8;

  return (
    <div
      ref={rootRef}
      className="exp4-root relative flex min-h-screen flex-col overflow-hidden bg-[#fbfbf9] text-[#161616] antialiased"
      style={
        {
          "--mx": `${pointer.x * 100}%`,
          "--my": `${pointer.y * 100}%`,
        } as React.CSSProperties
      }
    >
      <style>{`
        .exp4-root {
          --kiwi: #8fce3f;
          --kiwi-deep: #4f9a17;
          --ink: #161616;
        }
        @keyframes exp4-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes exp4-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes exp4-line {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes exp4-sheen {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes exp4-orbit {
          from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        }
        @keyframes exp4-blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0.25; }
        }
        .exp4-spin { animation: exp4-spin 140s linear infinite; }
        .exp4-rise { animation: exp4-rise 0.9s cubic-bezier(0.22,1,0.36,1) both; }
        .exp4-d1 { animation-delay: 0.05s; }
        .exp4-d2 { animation-delay: 0.16s; }
        .exp4-d3 { animation-delay: 0.3s; }
        .exp4-d4 { animation-delay: 0.46s; }
        .exp4-d5 { animation-delay: 0.62s; }
        .exp4-d6 { animation-delay: 0.74s; }
        .exp4-line { transform-origin: left; animation: exp4-line 1s ease-out 0.4s both; }
        .exp4-sheen {
          background: linear-gradient(100deg, var(--kiwi-deep) 20%, #9bd84e 42%, var(--kiwi-deep) 64%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: exp4-sheen 5.5s linear infinite;
        }
        .exp4-orbit { animation: exp4-orbit 18s linear infinite; }
        .exp4-blink { animation: exp4-blink 1.6s ease-in-out infinite; }
        .exp4-cta { transition: transform .25s cubic-bezier(.22,1,.36,1), background-color .25s ease; }
        .exp4-cta:hover { transform: translateY(-2px); }
        .exp4-cta:hover .exp4-arrow { transform: translateX(3px) rotate(0deg); }
        .exp4-arrow { transition: transform .25s ease; }
        @media (prefers-reduced-motion: reduce) {
          .exp4-spin, .exp4-rise, .exp4-line, .exp4-sheen, .exp4-orbit, .exp4-blink { animation: none; }
          .exp4-line { transform: scaleX(1); }
          .exp4-sheen { color: var(--kiwi-deep); }
        }
      `}</style>

      {/* ---- Cursor-reactive kiwi spotlight ---- */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx) var(--my), rgba(143,206,63,0.16), transparent 70%)",
        }}
      />

      {/* ---- Oversized ghost kiwi mark (parallax + tilt) ---- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1200px]">
        <div
          className="absolute right-[2%] top-1/2 h-[min(118vh,1040px)] w-[min(118vh,1040px)] -translate-y-1/2 will-change-transform lg:right-[6%]"
          style={{
            transform: `translate3d(${kiwiShift.x}px, ${kiwiShift.y}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="exp4-spin relative h-full w-full opacity-[0.07]">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
        {/* tiny orbiting kiwi accent, riding the big mark's left edge */}
        <div className="absolute left-[52%] top-1/2 hidden -translate-y-1/2 lg:block" style={{ ["--r" as string]: "190px" }}>
          <div className="exp4-orbit opacity-70">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              aria-hidden
              width={28}
              height={28}
              className="rounded-full drop-shadow-sm"
            />
          </div>
        </div>
        {/* soft directional wash: keeps the left text crisp, lets the kiwi glow on the right */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#fbfbf9_18%,rgba(251,251,249,0.45)_46%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_50%,transparent_0%,rgba(251,251,249,0.35)_60%,#fbfbf9_88%)]" />
      </div>

      {/* ---- Nav ---- */}
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/refresh-kiwi-favicon-v2.png"
            alt="Refresh Kiwi"
            width={30}
            height={30}
            className="rounded-full"
          />
          <span className="text-[15px] font-semibold tracking-tight">Refresh Kiwi</span>
        </div>
        <div className="hidden items-center gap-10 text-[13px] font-medium text-[var(--ink)]/50 md:flex">
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">How it works</Link>
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">Pricing</Link>
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">Examples</Link>
        </div>
        <Link href="#" className="text-[13px] font-medium text-[var(--ink)]/60 transition-colors hover:text-[var(--ink)]">
          Log in →
        </Link>
      </nav>

      {/* ---- Hero ---- */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="exp4-rise exp4-d1 flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.28em] text-[var(--kiwi-deep)]">
            <span className="h-px w-8 bg-[var(--kiwi-deep)]/50" />
            Affordable website redesign for small business
          </div>

          {/* Headline */}
          <h1 className="exp4-rise exp4-d2 mt-7 font-[Georgia,serif] text-[clamp(3rem,8vw,6rem)] font-normal leading-[1.0] tracking-[-0.025em] text-[var(--ink)]">
            Same website.
            <br />
            <span className="exp4-sheen italic">Fresher</span> skin.
          </h1>

          {/* hairline */}
          <div className="exp4-line mt-9 h-px w-24 bg-[var(--ink)]/20" />

          {/* Subhead */}
          <p className="exp4-rise exp4-d3 mt-9 max-w-md text-[17px] leading-8 text-[var(--ink)]/55">
            Input your web address. In about 2 minutes, our website redesign service
            rebuilds your site with a fresh, modern design — your words, your photos,
            your business.
          </p>

          {/* ---- Minimal focal input ---- */}
          <div className="exp4-rise exp4-d4 mt-11 max-w-xl">
            <div className="group relative flex items-center gap-3 border-b-2 border-[var(--ink)]/15 pb-3 transition-colors focus-within:border-[var(--kiwi-deep)]">
              <span className="exp4-blink mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--kiwi-deep)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--kiwi-deep)]" />
              </span>
              <input
                type="text"
                placeholder="yourbusiness.co.uk"
                className="w-full bg-transparent text-[19px] font-medium text-[var(--ink)] placeholder-[var(--ink)]/30 outline-none"
              />
              <button className="exp4-cta flex shrink-0 items-center gap-2 rounded-full bg-[var(--ink)] py-3 pl-6 pr-5 text-[14px] font-semibold text-white hover:bg-[var(--kiwi-deep)] active:scale-95">
                Refresh my website
                <span className="exp4-arrow flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="exp4-rise exp4-d5 mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--ink)]/40">
              <span>No credit card required · Free preview in about 2 minutes</span>
            </div>
          </div>

          {/* ---- Subtle trust row ---- */}
          <div className="exp4-rise exp4-d6 mt-14 flex items-center gap-4 text-[13px] text-[var(--ink)]/45">
            <div className="flex -space-x-2.5">
              {["#cfe8a3", "#a9d96a", "#7fbf3a", "#5fa72a"].map((c) => (
                <span
                  key={c}
                  className="h-7 w-7 rounded-full border-2 border-[#fbfbf9]"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span>
              <span className="font-semibold text-[var(--ink)]/70">500+ small businesses</span>{" "}
              refreshed this year
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
