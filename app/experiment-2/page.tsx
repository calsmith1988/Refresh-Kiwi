import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Experiment 2 | Refresh Kiwi",
  description: "Experimental landing page hero section — variant 2.",
};

export default function ExperimentTwoPage() {
  return (
    <div className="exp2-root relative min-h-screen overflow-hidden bg-[#fdfcf7] text-[#13231a] antialiased">
      {/* ---- Scoped styles for this experiment only ---- */}
      <style>{`
        .exp2-root {
          --lime: #b6e84a;
          --lime-deep: #4f9a17;
          --teal: #0fb39a;
          --ink: #13231a;
        }
        @keyframes exp2-float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.08); }
        }
        @keyframes exp2-float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.12); }
        }
        @keyframes exp2-float-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 40px) scale(0.92); }
        }
        @keyframes exp2-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes exp2-pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(79, 154, 23, 0.18), 0 30px 60px -22px rgba(19, 35, 26, 0.30); }
          70% { box-shadow: 0 0 0 18px rgba(79, 154, 23, 0), 0 30px 60px -22px rgba(19, 35, 26, 0.30); }
          100% { box-shadow: 0 0 0 0 rgba(79, 154, 23, 0), 0 30px 60px -22px rgba(19, 35, 26, 0.30); }
        }
        @keyframes exp2-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .exp2-rise { animation: exp2-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .exp2-rise-1 { animation-delay: 0.05s; }
        .exp2-rise-2 { animation-delay: 0.15s; }
        .exp2-rise-3 { animation-delay: 0.28s; }
        .exp2-rise-4 { animation-delay: 0.42s; }
        .exp2-rise-5 { animation-delay: 0.55s; }
        .exp2-blob { will-change: transform; }
        .exp2-blob-a { animation: exp2-float-a 14s ease-in-out infinite; }
        .exp2-blob-b { animation: exp2-float-b 18s ease-in-out infinite; }
        .exp2-blob-c { animation: exp2-float-c 16s ease-in-out infinite; }
        .exp2-bar { animation: exp2-pulse-ring 3.6s ease-out infinite; }
        .exp2-cta {
          background-image: linear-gradient(110deg, var(--lime-deep) 0%, #3f861c 30%, var(--teal) 75%, var(--lime-deep) 100%);
          background-size: 200% auto;
        }
        .exp2-cta:hover { animation: exp2-shimmer 1.4s linear infinite; }
        .exp2-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
        }
        @media (prefers-reduced-motion: reduce) {
          .exp2-blob-a, .exp2-blob-b, .exp2-blob-c, .exp2-bar, .exp2-rise, .exp2-cta:hover { animation: none; }
        }
      `}</style>

      {/* ---- Atmospheric background ---- */}
      <div className="pointer-events-none absolute inset-0">
        <div className="exp2-blob exp2-blob-a absolute -left-32 -top-24 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#d7f88a,transparent_70%)] blur-[60px]" />
        <div className="exp2-blob exp2-blob-b absolute -right-24 top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_60%_40%,#8fe9d6,transparent_70%)] blur-[80px]" />
        <div className="exp2-blob exp2-blob-c absolute bottom-[-12%] left-1/3 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_50%_50%,#f3eaa6,transparent_70%)] blur-[70px]" />
      </div>
      <div className="exp2-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,transparent_30%,rgba(253,252,247,0.85)_100%)]" />

      {/* ---- Nav ---- */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--lime)] shadow-lg shadow-black/10">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 4l-7 7M4 20l7-7" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Refresh Kiwi</span>
        </div>
        <div className="hidden items-center gap-9 text-sm font-medium text-[var(--ink)]/60 md:flex">
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">How it works</Link>
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">Pricing</Link>
          <Link href="#" className="transition-colors hover:text-[var(--ink)]">Examples</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="#" className="hidden text-sm font-medium text-[var(--ink)]/70 transition-colors hover:text-[var(--ink)] sm:block">
            Log in
          </Link>
          <button className="rounded-full border border-[var(--ink)]/10 bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95">
            Get started
          </button>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-28 text-center lg:pt-24">
        {/* Eyebrow */}
        <div className="exp2-rise exp2-rise-1 inline-flex items-center gap-2 rounded-full border border-[var(--lime-deep)]/25 bg-white/60 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--lime-deep)] shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime-deep)]" />
          Affordable website redesign for small business
        </div>

        {/* Headline */}
        <h1 className="exp2-rise exp2-rise-2 mt-8 font-[Georgia,serif] text-[clamp(3rem,9vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.03em]">
          <span className="block text-[var(--ink)]">Same website.</span>
          <span className="relative inline-block">
            <span className="bg-[linear-gradient(105deg,#4f9a17,#0fb39a)] bg-clip-text text-transparent">
              Fresher skin.
            </span>
            <svg
              aria-hidden
              className="absolute -bottom-3 left-0 w-full"
              viewBox="0 0 300 16"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M3 11C58 4 110 3 160 6.5C210 10 258 9 297 4.5"
                stroke="var(--lime)"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        {/* Subhead */}
        <p className="exp2-rise exp2-rise-3 mt-10 max-w-xl text-lg leading-8 text-[var(--ink)]/60">
          Input your web address. In about 2 minutes, our website redesign service
          rebuilds your site with a fresh, modern design — your words, your photos,
          your business.
        </p>

        {/* ---- THE FOCAL POINT: input + button ---- */}
        <div className="exp2-rise exp2-rise-4 mt-12 w-full max-w-2xl">
          <div className="exp2-bar group relative flex flex-col gap-2 rounded-[26px] border border-[var(--ink)]/10 bg-white/85 p-2.5 backdrop-blur-xl transition-all focus-within:border-[var(--lime-deep)]/40 sm:flex-row sm:items-center sm:rounded-full">
            {/* glow accent */}
            <div className="pointer-events-none absolute -inset-px -z-10 rounded-[28px] bg-[linear-gradient(110deg,#b6e84a55,#0fb39a55)] opacity-0 blur-md transition-opacity duration-300 group-focus-within:opacity-100 sm:rounded-full" />

            <div className="flex flex-1 items-center gap-3 pl-5">
              <svg className="h-5 w-5 shrink-0 text-[var(--ink)]/35 transition-colors group-focus-within:text-[var(--lime-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
              </svg>
              <input
                type="text"
                placeholder="yourbusiness.co.uk"
                className="w-full bg-transparent py-3.5 text-lg font-medium text-[var(--ink)] placeholder-[var(--ink)]/35 outline-none"
              />
            </div>

            <button className="exp2-cta flex shrink-0 items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-[0_10px_24px_-8px_rgba(79,154,23,0.7)] transition-transform hover:scale-[1.02] active:scale-95">
              Refresh my website
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <p className="exp2-rise exp2-rise-5 mt-5 flex items-center justify-center gap-2 text-sm text-[var(--ink)]/45">
            <svg className="h-4 w-4 text-[var(--lime-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            No credit card required · Free preview in about 2 minutes
          </p>
        </div>
      </main>
    </div>
  );
}
