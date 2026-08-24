"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import SiteLogo from "@/components/SiteLogo";
import { breakdownPdfBase64, downloadWebsiteCostBreakdownPdf } from "@/lib/marketing/breakdown-pdf";
import {
  ADD_ON_OPTIONS,
  ADD_ON_REFERENCE,
  calculateWebsiteCost,
  calculatorDisclaimer,
  calculatorFaqs,
  formatGbpAddOn,
  formatGbpRange,
  KIWI_PRO_MONTHLY_GBP,
  ONGOING_AGENCY_CARE_RANGE,
  ONGOING_DIY_RANGE,
  PAGE_BAND_OPTIONS,
  PAGE_BAND_REFERENCE,
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
        setSubmitMessage("Check your inbox — your PDF is on its way.");
        return;
      }

      downloadWebsiteCostBreakdownPdf({ inputs, result });
      setSubmitState("success");
      setSubmitMessage("Downloaded your PDF.");
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
          <h1 className="font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
            Website cost calculator
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-black/70 sm:text-base">
            Typical UK prices for a small-business site. Not a quote. Not a
            four-figure surprise after the third call.
          </p>
          <p className="mt-4 text-sm leading-7 text-black/60 sm:text-base">
            Tell us how many pages you need and what you want bolted on. This
            website cost calculator shows the band a UK agency would usually
            charge in 2026. Then it shows Refresh Kiwi: £{KIWI_PRO_MONTHLY_GBP} a
            month. Free to try. Start from a URL, a Google listing, or a short
            description of the business.
          </p>

          <section
            aria-label="Website cost calculator"
            className="mt-8 rounded-[1.75rem] border border-black/10 bg-[#faf8f1] p-5 sm:p-6"
          >
            <fieldset>
              <legend className="text-sm font-semibold text-black/75">
                Page band
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
                Extras
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

            <p className="mt-6 text-sm leading-6 text-black/60">
              Ongoing: DIY builders ~{formatGbpRange(ONGOING_DIY_RANGE)}/month,
              agency care ~{formatGbpRange(ONGOING_AGENCY_CARE_RANGE)}/month.
              Pick your options — typical range, not an invoice.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white p-5">
              <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
                Typical UK range for what you picked
              </h2>
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
              <p className="mt-4 text-sm leading-6 text-black/60">{calculatorDisclaimer}</p>

              <div className="mt-6 border-t border-black/10 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                  Build bands
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-black/60">
                  {PAGE_BAND_REFERENCE.map((band) => (
                    <li key={band.label}>
                      {band.label} pages: {formatGbpRange(band.range)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                  Add-ons
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-black/60">
                  {ADD_ON_REFERENCE.map((addOn) => (
                    <li key={addOn.label}>
                      {addOn.label}: {formatGbpAddOn(addOn.range)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                  Ongoing
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-black/60">
                  <li>DIY builders: ~{formatGbpRange(ONGOING_DIY_RANGE)}/month</li>
                  <li>
                    Agency care: ~{formatGbpRange(ONGOING_AGENCY_CARE_RANGE)}/month
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-[#c5e66a] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
                Refresh Kiwi
              </p>
              <p className="mt-2 font-fraunces text-3xl font-semibold tracking-tight">
                £{KIWI_PRO_MONTHLY_GBP}/month
              </p>
              <p className="mt-1 text-sm leading-6 text-black/70">
                US$11 / CA$15 / AU$17. Hosting + unlimited plain-English or voice
                edits. One plan.
              </p>
              <p className="mt-3 text-sm leading-6 text-black/70">
                If you refresh a URL, your existing website does not change. You
                look at a new version first. Take the old one down later if you
                want.
              </p>
              <p className="mt-3 text-sm leading-6 text-black/70">
                Not a CMS. Not a shop platform. Not a drag-and-drop builder.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-[1.75rem] border border-black/10 bg-[#faf8f1] p-5 sm:p-6">
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
              Want the numbers in a PDF you can keep?
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Drop your email. We send the breakdown for the range you just saw,
              plus what sits inside £{KIWI_PRO_MONTHLY_GBP} a month. No quote. No
              sales call.
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
                {submitState === "loading" ? "Sending…" : "Send my PDF"}
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

          <section className="mt-10 rounded-[1.75rem] bg-[#141811] p-6 text-white sm:p-8">
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight sm:text-3xl">
              See your site for £{KIWI_PRO_MONTHLY_GBP} a month
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
              Paste a URL, find the business on Google, or type what you do.
            </p>
            <Link
              href="/#hero"
              className="mt-5 inline-flex rounded-full bg-[#c5e66a] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#d4f07a]"
            >
              Try Refresh Kiwi free
            </Link>
            <p className="mt-4 text-sm leading-6 text-white/55">
              No signup to preview. If you already have a site, it stays as it is
              until you take it down.
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
        </article>
      </div>
    </main>
  );
}
