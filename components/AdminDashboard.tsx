"use client";

import { useCallback, useEffect, useState } from "react";

type Tab = "overview" | "users" | "websites" | "domains" | "audit";

function previewHref(slug: string): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://refresh.kiwi"
  ).replace(/\/$/, "");

  return `${appUrl}/preview/${slug}/index.html`;
}

function publicWebsiteHref(website: { slug: string; status: string }): string {
  if (website.status === "live") {
    const sitesDomain = (
      process.env.NEXT_PUBLIC_SITES_DOMAIN?.trim() || "refreshkiwi.site"
    ).replace(/^\.+|\.+$/g, "");

    return `https://${website.slug}.${sitesDomain}/`;
  }

  return previewHref(website.slug);
}

type SeriesPoint = { day: string; value: number };

type Stats = {
  periodDays: number;
  users: { total: number; newInPeriod: number; pro: number };
  jobs: {
    byStatus: Record<string, number>;
    newInPeriod: number;
    anonymousTotal: number;
    anonymousInPeriod: number;
  };
  websites: { byStatus: Record<string, number>; claimed: number };
  edits: { total: number; newInPeriod: number; failed: number };
  queue: Record<string, number>;
  attribution: Array<{ source: string; value: number }>;
  series: {
    jobs: SeriesPoint[];
    signups: SeriesPoint[];
    edits: SeriesPoint[];
  };
  recentFailedJobs: Array<{
    id: string;
    slug: string;
    generationMode: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionStatus: string;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  stripeCustomerId: string | null;
  createdAt: string;
  websiteCount: number;
  editCount: number;
};

type AdminUserDetail = {
  user: AdminUserRow & {
    marketingEmailsEnabled: boolean;
    stripeSubscriptionId: string | null;
  };
  websites: Array<{
    id: string;
    slug: string;
    brandName: string | null;
    status: string;
    customDomain: string | null;
    customDomainStatus: string;
    freeEditsUsed: number;
    freeEditsLimit: number;
    expiresAt: string;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    slug: string;
    status: string;
    generationMode: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
  edits: Array<{
    id: string;
    slug: string;
    prompt: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

type AdminWebsiteRow = {
  id: string;
  slug: string;
  brandName: string | null;
  status: string;
  generationMode: string;
  ownerEmail: string | null;
  freeEditsUsed: number;
  freeEditsLimit: number;
  customDomain: string | null;
  customDomainStatus: string;
  expiresAt: string;
  createdAt: string;
};

type DomainsResponse = {
  domains: Array<{
    websiteId: string;
    slug: string;
    brandName: string | null;
    websiteStatus: string;
    ownerEmail: string | null;
    domain: string | null;
    domainStatus: string;
    domainError: string | null;
    verifiedAt: string | null;
    lastCheckedAt: string | null;
  }>;
  render: Array<{
    domain: string;
    verified: boolean;
    kind: "app" | "linked" | "orphaned";
  }> | null;
  renderError: string | null;
};

type AuditEntry = {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "websites", label: "Websites" },
  { id: "domains", label: "Domains" },
  { id: "audit", label: "Audit log" },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init?.headers }
      : init?.headers,
  });

  const text = await response.text();
  let payload: (T & { error?: string }) | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as T & { error?: string };
    } catch {
      throw new Error(
        `Invalid JSON from ${path} (${response.status}): ${text.slice(0, 200)}`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ?? `Request failed (${response.status})`,
    );
  }

  if (!payload) {
    throw new Error(`Empty response from ${path}`);
  }

  return payload;
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const th = "border-b border-black px-2 py-1.5 text-left font-semibold whitespace-nowrap";
const td = "border-b border-gray-300 px-2 py-1.5 align-top";
const btn =
  "border border-black px-2 py-0.5 text-xs hover:bg-black hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black";
const input = "border border-black px-2 py-1 text-sm w-full max-w-xs";

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="border border-black p-3">
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub ? <div className="text-xs text-gray-600">{sub}</div> : null}
    </div>
  );
}

function SeriesTable({ title, points }: { title: string; points: SeriesPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <div className="border border-black p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {points.length === 0 ? (
        <div className="text-xs text-gray-600">No data in this period.</div>
      ) : (
        <div className="space-y-0.5">
          {points.map((point) => (
            <div key={point.day} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 tabular-nums">{point.day.slice(5)}</span>
              <span className="w-8 shrink-0 text-right tabular-nums">{point.value}</span>
              <div className="h-2 flex-1 bg-gray-100">
                <div
                  className="h-2 bg-black"
                  style={{ width: `${(point.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statsDays, setStatsDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [userRows, setUserRows] = useState<AdminUserRow[] | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);

  const [websiteSearch, setWebsiteSearch] = useState("");
  const [websiteRows, setWebsiteRows] = useState<AdminWebsiteRow[] | null>(null);

  const [domains, setDomains] = useState<DomainsResponse | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await work();
    } catch (workError) {
      setError(workError instanceof Error ? workError.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadStats = useCallback(
    (days: number) =>
      run(async () => {
        setStats(await api<Stats>(`/api/admin/stats?days=${days}`));
      }),
    [run],
  );

  const loadUsers = useCallback(
    (search: string) =>
      run(async () => {
        const payload = await api<{ users: AdminUserRow[] }>(
          `/api/admin/users?search=${encodeURIComponent(search)}`,
        );
        setUserRows(payload.users);
      }),
    [run],
  );

  const loadWebsites = useCallback(
    (search: string) =>
      run(async () => {
        const payload = await api<{ websites: AdminWebsiteRow[] }>(
          `/api/admin/websites?search=${encodeURIComponent(search)}`,
        );
        setWebsiteRows(payload.websites);
      }),
    [run],
  );

  const loadDomains = useCallback(
    () =>
      run(async () => {
        setDomains(await api<DomainsResponse>("/api/admin/domains"));
      }),
    [run],
  );

  const loadAudit = useCallback(
    () =>
      run(async () => {
        const payload = await api<{ entries: AuditEntry[] }>("/api/admin/audit-log");
        setAuditEntries(payload.entries);
      }),
    [run],
  );

  useEffect(() => {
    if (tab === "overview" && !stats) void loadStats(statsDays);
    if (tab === "users" && !userRows) void loadUsers("");
    if (tab === "websites" && !websiteRows) void loadWebsites("");
    if (tab === "domains" && !domains) void loadDomains();
    if (tab === "audit" && !auditEntries) void loadAudit();
  }, [
    tab,
    stats,
    userRows,
    websiteRows,
    domains,
    auditEntries,
    statsDays,
    loadStats,
    loadUsers,
    loadWebsites,
    loadDomains,
    loadAudit,
  ]);

  const openUser = (userId: string) =>
    run(async () => {
      setUserDetail(await api<AdminUserDetail>(`/api/admin/users/${userId}`));
    });

  const cancelSubscription = (user: AdminUserRow) => {
    if (
      !window.confirm(
        `Cancel ${user.email}'s subscription at the end of the billing period?`,
      )
    ) {
      return;
    }

    void run(async () => {
      const payload = await api<{ message: string }>(
        `/api/admin/users/${user.id}/cancel-subscription`,
        { method: "POST" },
      );
      setNotice(payload.message);
      await openUser(user.id);
    });
  };

  const resendVerification = (user: AdminUserRow) =>
    run(async () => {
      await api(`/api/admin/users/${user.id}/resend-verification`, {
        method: "POST",
      });
      setNotice(`Verification email resent to ${user.email}.`);
    });

  const websiteAction = (
    website: AdminWebsiteRow | AdminUserDetail["websites"][number],
    action: "rename" | "extend-expiry" | "reset-edits",
  ) => {
    let body: Record<string, unknown> = { action };

    if (action === "rename") {
      const name = window.prompt("New website name:", website.brandName ?? "");

      if (!name) {
        return;
      }

      body = { action, name };
    }

    if (action === "extend-expiry") {
      const days = window.prompt("Extend preview by how many days?", "7");

      if (!days) {
        return;
      }

      body = { action, days: Number(days) };
    }

    if (
      action === "reset-edits" &&
      !window.confirm(`Reset free edits for "${website.slug}"?`)
    ) {
      return;
    }

    void run(async () => {
      await api(`/api/admin/websites/${website.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNotice(`Done: ${action} on ${website.slug}.`);
      setWebsiteRows(null);

      if (tab === "websites") {
        await loadWebsites(websiteSearch);
      }
    });
  };

  const applyEdit = (website: AdminWebsiteRow | AdminUserDetail["websites"][number]) => {
    const prompt = window.prompt(
      `Describe the edit to apply to "${website.slug}" (runs a paid agent, does not use the customer's quota):`,
    );

    if (!prompt?.trim()) {
      return;
    }

    void run(async () => {
      await api(`/api/admin/websites/${website.id}/edits`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setNotice(`Edit queued for ${website.slug}.`);
    });
  };

  const removeOrphanedDomain = (domain: string) => {
    const typed = window.prompt(
      `This removes "${domain}" from the Render service. Type the domain to confirm:`,
    );

    if (typed?.trim().toLowerCase() !== domain.toLowerCase()) {
      return;
    }

    void run(async () => {
      await api("/api/admin/domains", {
        method: "DELETE",
        body: JSON.stringify({ domain }),
      });
      setNotice(`Removed ${domain} from Render.`);
      await loadDomains();
    });
  };

  return (
    <div className="min-h-screen bg-white p-4 text-black sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold">Refresh Kiwi Admin</h1>
          <span className="text-xs text-gray-600">Signed in as {adminEmail}</span>
        </header>

        <nav className="mb-4 flex flex-wrap gap-1 border-b border-black">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-sm ${
                tab === item.id
                  ? "border border-b-0 border-black font-semibold"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error ? (
          <div className="mb-3 border border-black bg-gray-100 px-3 py-2 text-sm">
            Error: {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-3 border border-black px-3 py-2 text-sm">{notice}</div>
        ) : null}
        {busy ? <div className="mb-3 text-xs text-gray-600">Working…</div> : null}

        {tab === "overview" ? (
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span>Period:</span>
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`${btn} ${statsDays === days ? "bg-black text-white" : ""}`}
                  onClick={() => {
                    setStatsDays(days);
                    void loadStats(days);
                  }}
                >
                  {days}d
                </button>
              ))}
            </div>

            {stats ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard
                    label="Users"
                    value={stats.users.total}
                    sub={`+${stats.users.newInPeriod} in period`}
                  />
                  <StatCard label="Pro users" value={stats.users.pro} />
                  <StatCard
                    label="Builds"
                    value={Object.values(stats.jobs.byStatus).reduce((a, b) => a + b, 0)}
                    sub={`+${stats.jobs.newInPeriod} in period`}
                  />
                  <StatCard
                    label="Anonymous builds"
                    value={stats.jobs.anonymousTotal}
                    sub={`+${stats.jobs.anonymousInPeriod} in period`}
                  />
                  <StatCard
                    label="Claimed websites"
                    value={stats.websites.claimed}
                  />
                  <StatCard
                    label="Edits"
                    value={stats.edits.total}
                    sub={`+${stats.edits.newInPeriod} in period, ${stats.edits.failed} failed`}
                  />
                </div>

                <div className="mb-4 grid gap-2 md:grid-cols-3">
                  <SeriesTable title="Builds per day" points={stats.series.jobs} />
                  <SeriesTable title="Signups per day" points={stats.series.signups} />
                  <SeriesTable title="Edits per day" points={stats.series.edits} />
                </div>

                <div className="mb-4 grid gap-2 md:grid-cols-3">
                  <div className="border border-black p-3">
                    <div className="mb-2 text-sm font-semibold">Builds by status</div>
                    {Object.entries(stats.jobs.byStatus).map(([status, value]) => (
                      <div key={status} className="flex justify-between text-xs">
                        <span>{status}</span>
                        <span className="tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border border-black p-3">
                    <div className="mb-2 text-sm font-semibold">Websites by status</div>
                    {Object.entries(stats.websites.byStatus).map(([status, value]) => (
                      <div key={status} className="flex justify-between text-xs">
                        <span>{status}</span>
                        <span className="tabular-nums">{value}</span>
                      </div>
                    ))}
                    <div className="mt-2 text-sm font-semibold">Worker queue</div>
                    {Object.entries(stats.queue).map(([status, value]) => (
                      <div key={status} className="flex justify-between text-xs">
                        <span>{status}</span>
                        <span className="tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border border-black p-3">
                    <div className="mb-2 text-sm font-semibold">
                      Attribution (utm_source, period)
                    </div>
                    {stats.attribution.length === 0 ? (
                      <div className="text-xs text-gray-600">
                        No tagged traffic yet. Tag campaign links with utm_source.
                      </div>
                    ) : (
                      stats.attribution.map((row) => (
                        <div key={row.source} className="flex justify-between text-xs">
                          <span>{row.source}</span>
                          <span className="tabular-nums">{row.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-black p-3">
                  <div className="mb-2 text-sm font-semibold">Recent failed builds</div>
                  {stats.recentFailedJobs.length === 0 ? (
                    <div className="text-xs text-gray-600">None. Nice.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className={th}>Slug</th>
                            <th className={th}>Mode</th>
                            <th className={th}>Error</th>
                            <th className={th}>When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentFailedJobs.map((job) => (
                            <tr key={job.id}>
                              <td className={td}>{job.slug}</td>
                              <td className={td}>{job.generationMode}</td>
                              <td className={`${td} max-w-md`}>{job.errorMessage ?? "—"}</td>
                              <td className={`${td} whitespace-nowrap`}>
                                {formatDate(job.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600">Loading…</div>
            )}
          </section>
        ) : null}

        {tab === "users" ? (
          <section>
            <form
              className="mb-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void loadUsers(userSearch);
              }}
            >
              <input
                className={input}
                placeholder="Search by email…"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <button type="submit" className={btn}>
                Search
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={th}>Email</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Sub status</th>
                    <th className={th}>Verified</th>
                    <th className={th}>Sites</th>
                    <th className={th}>Edits</th>
                    <th className={th}>Joined</th>
                    <th className={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(userRows ?? []).map((user) => (
                    <tr key={user.id}>
                      <td className={td}>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void openUser(user.id)}
                        >
                          {user.email}
                        </button>
                      </td>
                      <td className={td}>{user.plan}</td>
                      <td className={td}>{user.subscriptionStatus}</td>
                      <td className={td}>{user.emailVerifiedAt ? "yes" : "no"}</td>
                      <td className={td}>{user.websiteCount}</td>
                      <td className={td}>{user.editCount}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        {formatDate(user.createdAt)}
                      </td>
                      <td className={`${td} space-x-1 whitespace-nowrap`}>
                        {!user.emailVerifiedAt ? (
                          <button
                            type="button"
                            className={btn}
                            onClick={() => void resendVerification(user)}
                          >
                            Resend verify
                          </button>
                        ) : null}
                        {user.plan === "pro" ? (
                          <button
                            type="button"
                            className={btn}
                            onClick={() => cancelSubscription(user)}
                          >
                            Cancel sub
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {userDetail ? (
              <div className="mt-4 border border-black p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {userDetail.user.email}
                    {userDetail.user.name ? ` — ${userDetail.user.name}` : ""}
                  </div>
                  <button type="button" className={btn} onClick={() => setUserDetail(null)}>
                    Close
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                  <div>Plan: {userDetail.user.plan}</div>
                  <div>Sub: {userDetail.user.subscriptionStatus}</div>
                  <div>2FA: {userDetail.user.twoFactorEnabled ? "on" : "off"}</div>
                  <div>Marketing: {userDetail.user.marketingEmailsEnabled ? "on" : "off"}</div>
                  <div className="col-span-2">
                    Stripe: {userDetail.user.stripeCustomerId ?? "—"}
                  </div>
                  <div className="col-span-2">
                    Subscription: {userDetail.user.stripeSubscriptionId ?? "—"}
                  </div>
                </div>

                <div className="mb-1 text-xs font-semibold uppercase">Websites</div>
                <div className="mb-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className={th}>Slug</th>
                        <th className={th}>Name</th>
                        <th className={th}>Status</th>
                        <th className={th}>Domain</th>
                        <th className={th}>Edits</th>
                        <th className={th}>Expires</th>
                        <th className={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetail.websites.map((website) => (
                        <tr key={website.id}>
                          <td className={td}>
                            <a
                              className="underline"
                              href={publicWebsiteHref(website)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {website.slug}
                            </a>
                          </td>
                          <td className={td}>{website.brandName ?? "—"}</td>
                          <td className={td}>{website.status}</td>
                          <td className={td}>
                            {website.customDomain
                              ? `${website.customDomain} (${website.customDomainStatus})`
                              : "—"}
                          </td>
                          <td className={td}>
                            {website.freeEditsUsed}/{website.freeEditsLimit}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {formatDate(website.expiresAt)}
                          </td>
                          <td className={`${td} space-x-1 whitespace-nowrap`}>
                            <button type="button" className={btn} onClick={() => websiteAction(website, "rename")}>
                              Rename
                            </button>
                            <button type="button" className={btn} onClick={() => websiteAction(website, "extend-expiry")}>
                              Extend
                            </button>
                            <button type="button" className={btn} onClick={() => websiteAction(website, "reset-edits")}>
                              Reset edits
                            </button>
                            <button type="button" className={btn} onClick={() => applyEdit(website)}>
                              Apply edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-1 text-xs font-semibold uppercase">Recent edits</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className={th}>Site</th>
                        <th className={th}>Prompt</th>
                        <th className={th}>Status</th>
                        <th className={th}>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetail.edits.map((edit) => (
                        <tr key={edit.id}>
                          <td className={td}>{edit.slug}</td>
                          <td className={`${td} max-w-md`}>{edit.prompt}</td>
                          <td className={td}>
                            {edit.status}
                            {edit.errorMessage ? ` — ${edit.errorMessage}` : ""}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {formatDate(edit.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "websites" ? (
          <section>
            <form
              className="mb-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void loadWebsites(websiteSearch);
              }}
            >
              <input
                className={input}
                placeholder="Search slug, name, owner email, domain…"
                value={websiteSearch}
                onChange={(event) => setWebsiteSearch(event.target.value)}
              />
              <button type="submit" className={btn}>
                Search
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={th}>Slug</th>
                    <th className={th}>Name</th>
                    <th className={th}>Owner</th>
                    <th className={th}>Status</th>
                    <th className={th}>Domain</th>
                    <th className={th}>Edits</th>
                    <th className={th}>Expires</th>
                    <th className={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(websiteRows ?? []).map((website) => (
                    <tr key={website.id}>
                      <td className={td}>
                        <a
                          className="underline"
                          href={publicWebsiteHref(website)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {website.slug}
                        </a>
                      </td>
                      <td className={td}>{website.brandName ?? "—"}</td>
                      <td className={td}>{website.ownerEmail ?? "(unclaimed)"}</td>
                      <td className={td}>{website.status}</td>
                      <td className={td}>
                        {website.customDomain
                          ? `${website.customDomain} (${website.customDomainStatus})`
                          : "—"}
                      </td>
                      <td className={td}>
                        {website.freeEditsUsed}/{website.freeEditsLimit}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {formatDate(website.expiresAt)}
                      </td>
                      <td className={`${td} space-x-1 whitespace-nowrap`}>
                        <button type="button" className={btn} onClick={() => websiteAction(website, "rename")}>
                          Rename
                        </button>
                        <button type="button" className={btn} onClick={() => websiteAction(website, "extend-expiry")}>
                          Extend
                        </button>
                        <button type="button" className={btn} onClick={() => websiteAction(website, "reset-edits")}>
                          Reset edits
                        </button>
                        <button type="button" className={btn} onClick={() => applyEdit(website)}>
                          Apply edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === "domains" ? (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" className={btn} onClick={() => void loadDomains()}>
                Refresh
              </button>
              <span className="text-xs text-gray-600">
                Cross-references website domains against the Render service.
              </span>
            </div>

            <div className="mb-4">
              <div className="mb-1 text-sm font-semibold">Connected website domains (database)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className={th}>Domain</th>
                      <th className={th}>Website</th>
                      <th className={th}>Owner</th>
                      <th className={th}>Status</th>
                      <th className={th}>Verified</th>
                      <th className={th}>Last checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(domains?.domains ?? []).map((row) => (
                      <tr key={row.websiteId}>
                        <td className={td}>{row.domain}</td>
                        <td className={td}>
                          {row.slug} ({row.websiteStatus})
                        </td>
                        <td className={td}>{row.ownerEmail ?? "—"}</td>
                        <td className={td}>
                          {row.domainStatus}
                          {row.domainError ? ` — ${row.domainError}` : ""}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(row.verifiedAt)}</td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(row.lastCheckedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {domains && domains.domains.length === 0 ? (
                <div className="mt-1 text-xs text-gray-600">No websites have custom domains.</div>
              ) : null}
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold">Domains on the Render service</div>
              {domains?.renderError ? (
                <div className="border border-black bg-gray-100 px-3 py-2 text-xs">
                  Could not list Render domains: {domains.renderError}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className={th}>Domain</th>
                        <th className={th}>Verified</th>
                        <th className={th}>State</th>
                        <th className={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(domains?.render ?? []).map((row) => (
                        <tr key={row.domain}>
                          <td className={td}>{row.domain}</td>
                          <td className={td}>{row.verified ? "yes" : "no"}</td>
                          <td className={td}>
                            {row.kind === "app"
                              ? "app domain"
                              : row.kind === "linked"
                                ? "linked to a website"
                                : "ORPHANED"}
                          </td>
                          <td className={td}>
                            {row.kind === "orphaned" ? (
                              <button
                                type="button"
                                className={btn}
                                onClick={() => removeOrphanedDomain(row.domain)}
                              >
                                Remove from Render
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === "audit" ? (
          <section>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>Admin</th>
                    <th className={th}>Action</th>
                    <th className={th}>Target</th>
                    <th className={th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditEntries ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(entry.createdAt)}</td>
                      <td className={td}>{entry.adminEmail}</td>
                      <td className={td}>{entry.action}</td>
                      <td className={td}>
                        {entry.targetType}
                        {entry.targetId ? `: ${entry.targetId}` : ""}
                      </td>
                      <td className={`${td} max-w-md break-all`}>
                        {entry.details ? JSON.stringify(entry.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditEntries && auditEntries.length === 0 ? (
              <div className="mt-1 text-xs text-gray-600">No admin actions recorded yet.</div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
