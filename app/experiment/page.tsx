import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Experiment | Refresh Kiwi",
  description: "Experimental landing page hero section.",
};

export default function ExperimentPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white selection:bg-lime-500 selection:text-zinc-950">
      {/* Abstract Background Elements */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-lime-500/20 blur-[120px]" />
        <div className="absolute right-[-5%] bottom-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute top-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-lime-300/10 blur-[100px]" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Navigation (Mock) */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500 text-zinc-950">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-lg">Refresh Kiwi</span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          <Link href="#" className="hover:text-white transition-colors">How it works</Link>
          <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-white transition-colors">Examples</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log in
          </Link>
          <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105 active:scale-95">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-6 pt-20 pb-32 text-center lg:px-12 lg:pt-32">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-lime-500/30 bg-lime-500/10 px-4 py-1.5 text-sm font-medium text-lime-400 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-500"></span>
          </span>
          Affordable website redesign for small business
        </div>

        {/* Headline */}
        <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
          Same website. <br />
          <span className="bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
            Fresher skin.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Input your web address. In about 2 minutes, our AI website redesign service rebuilds your site with a fresh, modern design — your words, your photos, your business.
        </p>

        {/* Input Form Area */}
        <div className="mt-12 w-full max-w-xl">
          <div className="group relative flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-lime-500/50 focus-within:bg-zinc-900/80 focus-within:ring-4 focus-within:ring-lime-500/10">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-5 w-5 text-zinc-500 group-focus-within:text-lime-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="yourbusiness.co.uk"
              className="w-full bg-transparent py-4 pl-12 pr-4 text-lg text-white placeholder-zinc-500 outline-none"
            />
            <button className="flex shrink-0 items-center gap-2 rounded-xl bg-lime-500 px-6 py-4 font-semibold text-zinc-950 transition-all hover:bg-lime-400 active:scale-95">
              Refresh my website
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            No credit card required. Free preview in 2 minutes.
          </p>
        </div>

        {/* Social Proof / Trust */}
        <div className="mt-20 flex flex-col items-center gap-6 border-t border-zinc-800/50 pt-10 sm:flex-row sm:gap-12">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-zinc-950 bg-zinc-800" />
              ))}
            </div>
            <div className="flex flex-col text-left ml-2">
              <div className="flex items-center gap-1 text-lime-400">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium text-zinc-400">Loved by 500+ businesses</span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-zinc-800 hidden sm:block"></div>

          <div className="flex items-center gap-8 text-zinc-500 grayscale filter">
            {/* Mock logos */}
            <div className="text-xl font-bold font-serif tracking-tighter">Forbes</div>
            <div className="text-xl font-bold tracking-widest uppercase">WIRED</div>
            <div className="text-xl font-bold italic">TechCrunch</div>
          </div>
        </div>
      </main>
    </div>
  );
}
