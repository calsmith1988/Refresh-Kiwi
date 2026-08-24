"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import SiteLogo from "@/components/SiteLogo";
import { breakdownPdfBase64, downloadWebsiteCostBreakdownPdf } from "@/lib/marketing/breakdown-pdf";
import {
  ADD_ON_OPTIONS,
  calculateWebsiteCost,
  calculatorDisclaimer,
  calculatorFaqs,
  formatGbpRange,
  KIWI_PRO_MONTHLY_GBP,
  PAGE_BAND_OPTIONS,
  type CalculatorAddOnKey,
  type CalculatorInputs,
  type PageBand,
} from "@/lib/marketing/website-cost-calculator";

const defaultInputs: CalculatorInputs = {
  pages: "1-5",
  ecommerce: false,
  booking: false,
  copywriting: false,
  photos: false,
};

export default function WebsiteCostCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const result = useMemo(() => calculateWebsiteCost(inputs), [inputs]);

  function setPages(pages: PageBand) {
    setInputs((current) => ({ ...current, pages }));
  }

  function toggleAddOn(key: CalculatorAddOnKey) {
    setInputs((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleBreakdownSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");
    setSubmitMessage("");

    const pdfBase64 = breakdownPdfBase64({ inputs, result });

    try {
      const response = await fetch("/api/website-cost-calculator/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          inputs,
          pdfBase64,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        emailSent?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Something went wrong.");
      }

      if (payload.emailSent) {
        setSubmitState("success");
        setSubmitMessage("Check your inbox — your PDF breakdown is on its way.");
        return;
      }

      downloadWebsiteCostBreakdownPdf({ inputs, result });
      setSubmitState("success");
      setSubmitMessage("Downloaded your PDF. We saved your email for a follow-up.");
    } catch (error) {
      downloadWebsiteCostBreakdownPdf({ inputs, result });
      setSubmitState("error");
      setSubmitMessage(
        error instanceof Error
          ? `${error.message} Your PDF downloaded anyway.`
          : "Could not send email. Your PDF downloaded anyway.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-12 text-[#141811] sm:px-8 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <SiteLogo wordmark="always" />

        <article className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            UK website cost calculator
          </p>
          <h1 className="mt-3 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
            Website cost calculator
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/60 sm:text-base">
            Wondering how much a website costs in the UK? Drag the sliders below —
            well, tap the buttons — and see typical 2026 agency and freelancer ranges.
            Then compare Kiwi Pro at £{KIWI_PRO_MONTHLY_GBP}/month. No meetings, no
            four-figure surprise.
          </p>

          <section
            aria-label="Website cost calculator"
            className="mt-8 rounded-[1.75rem] border border-black/10 bg-[#faf8f1] p-5 sm:p-6"
          >
            <fieldset>
              <legend className="text-sm font-semibold text-black/75">
                How many pages?
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {PAGE_BAND_OPTIONS.map((option) => {
                  const active = inputs.pages === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPages(option.value)}
                      aria-pressed={active}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black/70 hover:border-black/25 hover:text-black"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-black/75">
                Extras agencies often charge for
              </legend>
              <div className="mt-3 space-y-2">
                {ADD_ON_OPTIONS.map((option) => {
                  const active = inputs[option.key];

                  return (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                        active
                          ? "border-[#c5e66a] bg-[#eef8c8]"
                          : "border-black/10 bg-white hover:border-black/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleAddOn(option.key)}
                        className="mt-1 h-4 w-4 accent-black"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-black/55">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                Typical UK build range
              </p>
              <p className="mt-2 font-fraunces text-4xl font-semibold tracking-tight">
                {formatGbpRange(result.total)}
              </p>
              <ul className="mt-4 space-y-1 text-sm leading-6 text-black/60">
                {result.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span className="shrink-0 font-medium text-black/75">
                      {formatGbpRange(line.range)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-black/50">{calculatorDisclaimer}</p>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-[#c5e66a] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
                Refresh Kiwi
              </p>
              <p className="mt-2 font-fraunces text-3xl font-semibold tracking-tight">
                £{KIWI_PRO_MONTHLY_GBP}/month
              </p>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Hosting, unlimited plain-English or voice edits, extra pages, custom
                domain. Start from your URL, Google listing, or describe the business
                — type or talk. About two minutes to a preview. Not a drag-and-drop
                builder, not a CMS, not ecommerce-first.
              </p>
              <Link
                href="/#hero"
                className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#141811]"
              >
                Try Refresh Kiwi free
              </Link>
            </div>
          </section>

          <section className="mt-8 rounded-[1.75rem] border border-black/10 bg-[#faf8f1] p-5 sm:p-6">
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
              Email me the PDF breakdown
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Optional. Your on-page result stays visible either way. We will send a
              PDF with your inputs, the typical UK range, and how Refresh Kiwi compares.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleBreakdownSubmit}>
              <label className="block">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@yourbusiness.co.uk"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-black/35 focus:border-black/30"
                />
              </label>
              <button
                type="submit"
                disabled={submitState === "loading"}
                className="rounded-full bg-[#141811] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState === "loading" ? "Sending…" : "Send PDF breakdown"}
              </button>
              {submitMessage ? (
                <p
                  className={`text-sm leading-6 ${
                    submitState === "error" ? "text-[#B4451F]" : "text-black/65"
                  }`}
                  role="status"
                >
                  {submitMessage}
                </p>
              ) : null}
            </form>
          </section>

          <section className="mt-10">
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
              How much does a website cost in the UK?
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/60 sm:text-base">
              Most small businesses still get quoted a lump sum — design, build,
              hosting setup, maybe copy and photos on top. In 2026, a straightforward
              brochure site often lands somewhere between a few thousand pounds and,
              with ecommerce or booking bolted on, quite a bit more. That is the
              website cost UK owners bump into when they ask agencies for a quote.
            </p>
            <p className="mt-4 text-sm leading-7 text-black/60 sm:text-base">
              Refresh Kiwi sits elsewhere on the map. Paste a URL, pick your Google
              listing, or describe the business — typed or spoken. About two minutes
              later you have a preview. Refreshing a URL does not change your live
              site. Kiwi Pro is £{KIWI_PRO_MONTHLY_GBP}/month when you want hosting and
              unlimited edits in plain English.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
              Questions people actually ask
            </h2>
            <div className="mt-5 divide-y divide-black/5">
              {calculatorFaqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 text-sm text-black/50 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-black/60">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="mt-10 border-t border-black/10 pt-8">
            <Link
              href="/#hero"
              className="text-sm font-semibold text-black/60 underline-offset-2 transition hover:text-black hover:underline"
            >
              Try Refresh Kiwi free
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
