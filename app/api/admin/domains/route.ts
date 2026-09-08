import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminWebsite, listAdminDomains } from "@/lib/admin/service";
import { isDomainHttpsReady } from "@/lib/domains/https";
import { assessCustomDomain } from "@/lib/domains/verify";
import {
  deleteRenderCustomDomain,
  isRenderDomainVerified,
  listRenderCustomDomains,
} from "@/lib/render/domains";
import {
  normalizeCustomDomain,
  toWebsiteResponse,
  updateOwnedWebsiteDomainStatus,
} from "@/lib/websites/service";

export const runtime = "nodejs";

// Domains that legitimately live on the Render service but belong to the app
// itself, not to a customer website.
const APP_DOMAINS = new Set(["refresh.kiwi", "www.refresh.kiwi"]);

export async function GET() {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const dbDomains = await listAdminDomains();
  const dbDomainNames = new Set(
    dbDomains
      .map((row) => row.domain?.toLowerCase())
      .filter((domain): domain is string => Boolean(domain)),
  );

  const domains = await Promise.all(
    dbDomains.map(async (row) => ({
      ...row,
      httpsReady: row.domain ? await isDomainHttpsReady(row.domain) : false,
    })),
  );

  let renderDomains: Array<{
    domain: string;
    verified: boolean;
    kind: "app" | "linked" | "orphaned";
  }> | null = null;
  let renderError: string | null = null;

  try {
    const listed = await listRenderCustomDomains();

    renderDomains = listed
      .map((entry) => {
        const domain = (entry.name ?? entry.domain ?? "").toLowerCase();

        return {
          domain,
          verified: isRenderDomainVerified(entry),
          kind: APP_DOMAINS.has(domain)
            ? ("app" as const)
            : isLinkedCustomerDomain(domain, dbDomainNames)
              ? ("linked" as const)
              : ("orphaned" as const),
        };
      })
      .filter((entry) => entry.domain.length > 0);
  } catch (error) {
    renderError =
      error instanceof Error ? error.message : "Failed to list Render domains";
  }

  return NextResponse.json({
    domains,
    render: renderDomains,
    renderError,
  });
}

function isLinkedCustomerDomain(domain: string, dbDomainNames: Set<string>) {
  if (dbDomainNames.has(domain)) {
    return true;
  }

  // We store www; the apex A record is part of the same connection.
  if (dbDomainNames.has(`www.${domain}`)) {
    return true;
  }

  return domain.startsWith("www.") && dbDomainNames.has(domain.slice(4));
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  let body: { websiteId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const websiteId = body.websiteId?.trim();

  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  const website = await getAdminWebsite(websiteId);

  if (!website?.customDomain || !website.userId) {
    return NextResponse.json(
      { error: "That website has no custom domain to check." },
      { status: 400 },
    );
  }

  try {
    const assessment = await assessCustomDomain(website.customDomain);
    const updated = await updateOwnedWebsiteDomainStatus({
      websiteId: website.id,
      userId: website.userId,
      status: assessment.status,
      error: assessment.error,
      renderDomainId: assessment.renderDomain.id ?? null,
    });

    await recordAdminAction({
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      action: "recheck_custom_domain",
      targetType: "website",
      targetId: website.id,
      details: {
        domain: website.customDomain,
        status: assessment.status,
      },
    });

    return NextResponse.json({
      website: toWebsiteResponse(updated),
      connected: assessment.status === "connected",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check domain";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Removes an orphaned domain from the Render service. */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  let body: { domain?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let domain: string;

  try {
    domain = normalizeCustomDomain(body.domain ?? "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid domain";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (APP_DOMAINS.has(domain)) {
    return NextResponse.json(
      { error: "That's the app's own domain — refusing to remove it." },
      { status: 400 },
    );
  }

  // Safety: never detach a domain that a live customer website still uses.
  const dbDomains = await listAdminDomains();
  const linked = dbDomains.find((row) => {
    const stored = row.domain?.toLowerCase();

    return (
      stored === domain ||
      stored === `www.${domain}` ||
      domain === `www.${stored}`
    );
  });

  if (linked) {
    return NextResponse.json(
      {
        error: `That domain is still connected to website "${linked.slug}". Remove it from the website first.`,
      },
      { status: 409 },
    );
  }

  try {
    await deleteRenderCustomDomain(domain);

    await recordAdminAction({
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      action: "remove_orphaned_render_domain",
      targetType: "domain",
      targetId: domain,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove domain";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
