import { notFound } from "next/navigation";

import SiteLogo from "@/components/SiteLogo";
import { getDb, schema } from "@/lib/db";
import { verifyDomainHelpToken } from "@/lib/domains/help-token";
import { detectDomainProvider } from "@/lib/domains/providers";
import { buildDomainDnsRecords } from "@/lib/domains/records";
import { eq } from "drizzle-orm";

const { websites } = schema;

// Tokenized helper links are for sharing with a specific person, not search
// engines, and the connection status must always be fresh.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connect your domain — Refresh Kiwi",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function DomainHelpPage({ params }: PageProps) {
  const { token } = await params;
  const payload = verifyDomainHelpToken(decodeURIComponent(token));

  if (!payload) {
    notFound();
  }

  const [website] = await getDb()
    .select({
      id: websites.id,
      brandName: websites.brandName,
      customDomain: websites.customDomain,
      customDomainStatus: websites.customDomainStatus,
    })
    .from(websites)
    .where(eq(websites.id, payload.websiteId))
    .limit(1);

  if (!website || website.customDomain !== payload.domain) {
    notFound();
  }

  const provider = await detectDomainProvider(website.customDomain);
  const records = buildDomainDnsRecords();
  const isConnected = website.customDomainStatus === "connected";

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-8 text-[#141811]">
      <div className="mx-auto w-full max-w-3xl">
        <SiteLogo wordmark="always" />

        <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
            Domain instructions
          </p>
          <h1 className="mt-2 font-fraunces text-3xl font-semibold tracking-tight">
            Connect {website.customDomain}
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/60">
            {website.brandName ? `${website.brandName} uses ` : "This website uses "}
            Refresh Kiwi. Add the two DNS records below where the domain is managed.
            The website owner does not need to share their Refresh Kiwi password.
          </p>

          <div
            className={`mt-5 rounded-2xl border p-4 text-sm ${
              isConnected
                ? "border-kiwi-green bg-[#f2f8df] text-black"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {isConnected
              ? "Connected: Refresh Kiwi can see the DNS records."
              : "Pending: add the records below, then Refresh Kiwi will keep checking automatically."}
          </div>

          <div className="mt-6 rounded-2xl bg-[#fbfaf6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-black">
                  Looks like the domain is with {provider.name}
                </p>
                <ol className="mt-2 space-y-1 text-sm leading-6 text-black/60">
                  {provider.steps.map((step, index) => (
                    <li key={step}>
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
              {provider.loginUrl ? (
                <a
                  href={provider.loginUrl}
                  target="_blank"
                  className="rounded-full bg-[#141811] px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-black"
                >
                  Open {provider.name}
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 text-sm">
            {records.map((record) => (
              <div
                key={`${record.type}-${record.name}`}
                className="grid gap-3 border-b border-black/5 p-4 last:border-b-0 sm:grid-cols-[0.7fr_0.7fr_1.6fr]"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
                    Type
                  </p>
                  <p className="mt-1 font-bold">{record.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
                    Name
                  </p>
                  <p className="mt-1 font-bold">{record.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
                    Points to
                  </p>
                  <p className="mt-1 break-all font-bold">{record.value}</p>
                  <p className="mt-1 text-xs leading-5 text-black/50">
                    {record.purpose}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-black/45">
            DNS updates often work within minutes, but some providers can take up to
            a day. Refresh Kiwi will email the website owner when the domain is
            connected.
          </p>
        </section>
      </div>
    </main>
  );
}
