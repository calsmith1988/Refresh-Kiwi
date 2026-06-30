import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Experiment 3 | Refresh Kiwi",
  description: "Experimental landing page hero section — variant 3.",
};

export default function ExperimentThreePage() {
  return (
    <div className="exp3-root relative min-h-screen overflow-hidden bg-[#0c0c0c] text-white antialiased">
      <style>{`
        .exp3-root {
          --volt: #c8ff00;
          --volt-deep: #a6e000;
          --ink: #0c0c0c;
          --paper: #f4f1e8;
        }
        @keyframes exp3-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes exp3-grid-pan {
          0% { background-position: 0 0; }
          100% { background-position: 64px 64px; }
        }
        @keyframes exp3-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes exp3-pop {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes exp3-wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .exp3-pop { animation: exp3-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .exp3-d1 { animation-delay: 0.05s; }
        .exp3-d2 { animation-delay: 0.18s; }
        .exp3-d3 { animation-delay: 0.34s; }
        .exp3-d4 { animation-delay: 0.5s; }
        .exp3-marquee { animation: exp3-marquee 22s linear infinite; }
        .exp3-grid { animation: exp3-grid-pan 6s linear infinite; }
        .exp3-blink { animation: exp3-blink 1.1s step-end infinite; }
        .exp3-wiggle { animation: exp3-wiggle 4s ease-in-out infinite; }
        .exp3-shadow { box-shadow: 8px 8px 0 0 var(--ink); }
        .exp3-shadow-volt { box-shadow: 8px 8px 0 0 var(--volt); }
        .exp3-shadow-white { box-shadow: 6px 6px 0 0 #fff; }
        .exp3-outline { -webkit-text-stroke: 2px var(--volt); color: transparent; }
        @media (prefers-reduced-motion: reduce) {
          .exp3-marquee, .exp3-grid, .exp3-blink, .exp3-pop, .exp3-wiggle { animation: none; }
        }
      `}</style>

      {/* moving grid backdrop */}
      <div
        className="exp3-grid pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff22 1px, transparent 1px), linear-gradient(to bottom, #ffffff22 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* volt glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--volt)] opacity-[0.16] blur-[120px]" />

      {/* ---- top marquee ticker ---- */}
      <div className="relative z-20 overflow-hidden border-b border-white/15 bg-[var(--volt)] py-2 text-ink">
        <div className="exp3-marquee flex w-max gap-10 whitespace-nowrap text-sm font-extrabold uppercase tracking-widest text-[var(--ink)]">
          {Array.from({ length: 2 }).map((_, group) => (
            <div key={group} className="flex gap-10">
              {[
                "2 minute redesigns",
                "no code",
                "your words · your photos",
                "small business approved",
                "free preview",
                "same site · fresher skin",
              ].map((item) => (
                <span key={`${group}-${item}`} className="flex items-center gap-10">
                  {item}
                  <span className="text-base">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Nav ---- */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--volt)] text-[var(--ink)] exp3-shadow-white">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 4l-7 7M4 20l7-7" />
            </svg>
          </span>
          <span className="text-lg font-black uppercase tracking-tight">Refresh Kiwi</span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-bold uppercase tracking-wide text-white/60 md:flex">
          <Link href="#" className="transition-colors hover:text-[var(--volt)]">How it works</Link>
          <Link href="#" className="transition-colors hover:text-[var(--volt)]">Pricing</Link>
          <Link href="#" className="transition-colors hover:text-[var(--volt)]">Examples</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="#" className="hidden text-sm font-bold uppercase tracking-wide text-white/70 transition-colors hover:text-white sm:block">
            Log in
          </Link>
          <button className="rounded-md border-2 border-white bg-transparent px-4 py-2 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-white hover:text-[var(--ink)]">
            Get started
          </button>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-28 lg:px-10 lg:pt-20">
        {/* Eyebrow tag */}
        <div className="exp3-pop exp3-d1 exp3-wiggle inline-flex -rotate-1 items-center gap-2 rounded-sm border-2 border-[var(--volt)] bg-[var(--ink)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[var(--volt)]">
          ◢ Affordable website redesign for small business
        </div>

        {/* Headline */}
        <h1 className="exp3-pop exp3-d2 mt-8 font-black uppercase leading-[0.82] tracking-[-0.02em]">
          <span className="block text-[clamp(3.2rem,13vw,10rem)] text-white">Same</span>
          <span className="block text-[clamp(3.2rem,13vw,10rem)] exp3-outline">website.</span>
          <span className="mt-2 block text-[clamp(3.2rem,13vw,10rem)] text-[var(--volt)]">
            Fresher
            <span className="ml-4 inline-block bg-[var(--volt)] px-3 text-[var(--ink)] exp3-shadow-white -rotate-1">
              skin.
            </span>
          </span>
        </h1>

        <div className="mt-12 grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Subhead */}
          <p className="exp3-pop exp3-d3 max-w-xl border-l-4 border-[var(--volt)] pl-5 text-lg font-medium leading-8 text-white/70">
            Input your web address. In about 2 minutes, our website redesign service
            rebuilds your site with a fresh, modern design — your words, your photos,
            your business.
          </p>

          {/* stat sticker */}
          <div className="exp3-pop exp3-d3 hidden justify-self-end lg:block">
            <div className="rotate-2 rounded-md border-2 border-white bg-[var(--ink)] px-5 py-4 exp3-shadow-volt">
              <div className="text-4xl font-black text-[var(--volt)]">~2:00</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/60">
                avg. redesign time
              </div>
            </div>
          </div>
        </div>

        {/* ---- FOCAL POINT: terminal-style input ---- */}
        <div className="exp3-pop exp3-d4 mt-12 max-w-3xl">
          <div className="rounded-xl border-[3px] border-[var(--volt)] bg-[#111] p-1.5 exp3-shadow-volt">
            {/* fake window bar */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-white/25" />
                <span className="h-3 w-3 rounded-full bg-white/25" />
                <span className="h-3 w-3 rounded-full bg-[var(--volt)]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                drop your url
              </span>
            </div>
            {/* input row */}
            <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-lg bg-[#0a0a0a] px-4 py-4 font-mono text-lg">
                <span className="font-black text-[var(--volt)]">›</span>
                <input
                  type="text"
                  placeholder="yourbusiness.co.uk"
                  className="w-full bg-transparent text-white placeholder-white/30 outline-none"
                />
                <span className="exp3-blink h-5 w-2.5 bg-[var(--volt)]" aria-hidden />
              </div>
              <button className="group flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--volt)] px-7 py-4 text-base font-black uppercase tracking-wide text-[var(--ink)] transition-all hover:bg-white active:translate-y-0.5">
                Refresh my website
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/45">
            <span className="text-[var(--volt)]">[✓]</span>
            No credit card required — free preview in about 2 minutes
          </p>
        </div>
      </main>
    </div>
  );
}
