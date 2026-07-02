import Link from "next/link";

export default function HelpCentrePage() {
  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-16 text-[#141811] sm:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-black/10 bg-white p-8 shadow-xl shadow-black/5 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
          Help centre
        </p>
        <h1 className="mt-3 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
          Refresh Kiwi help is coming soon.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-black/60">
          We&apos;re preparing guides, answers, and inspiration for building and
          improving your website. For now, email us and we&apos;ll help directly.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="mailto:info@refresh.kiwi"
            className="rounded-full bg-[#141811] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Email info@refresh.kiwi
          </a>
          <Link
            href="/dashboard"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
