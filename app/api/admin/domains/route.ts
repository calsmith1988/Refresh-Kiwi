import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { listAdminDomains } from "@/lib/admin/service";
import {
  deleteRenderCustomDomain,
  isRenderDomainVerified,
  listRenderCustomDomains,
} from "@/lib/render/domains";
import { normalizeCustomDomain } from "@/lib/websites/service";

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
    dbDomains.map((row) => row.domain?.toLowerCase()).filter(Boolean),
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
            : dbDomainNames.has(domain)
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
    domains: dbDomains,
    render: renderDomains,
    renderError,
  });
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
  const linked = dbDomains.find(
    (row) => row.domain?.toLowerCase() === domain,
  );

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
