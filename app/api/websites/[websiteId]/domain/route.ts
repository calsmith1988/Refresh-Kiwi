import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createDomainHelpToken } from "@/lib/domains/help-token";
import { detectDomainProvider } from "@/lib/domains/providers";
import { buildDomainDnsRecords, ensureWwwDomain } from "@/lib/domains/records";
import { buildAppUrl } from "@/lib/email/config";
import {
  addRenderCustomDomain,
  deleteRenderCustomDomain,
  isRenderDomainVerified,
  RenderApiError,
  refreshRenderCustomDomain,
} from "@/lib/render/domains";
import {
  connectOwnedWebsiteDomain,
  getOwnedWebsite,
  removeOwnedWebsiteDomain,
  setOwnedWebsiteOnline,
  toWebsiteResponse,
  updateOwnedWebsiteDomainStatus,
  userHasProPlan,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

async function requireProUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Sign in to connect a domain" },
        { status: 401 },
      ),
    };
  }

  if (!(await userHasProPlan(user.id))) {
    return {
      response: NextResponse.json(
        { error: "Upgrade to Pro to connect a custom domain." },
        { status: 402 },
      ),
    };
  }

  return { user };
}

async function domainResponseMetadata(websiteId: string, domain: string) {
  const provider = await detectDomainProvider(domain);
  const helpToken = createDomainHelpToken({ websiteId, domain });

  return {
    dns: buildDomainDnsRecords(),
    provider,
    helpUrl: buildAppUrl(`/domain-help/${encodeURIComponent(helpToken)}`),
  };
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireProUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { websiteId } = await context.params;
    const body = (await request.json()) as { domain?: string };

    if (!body.domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const domain = ensureWwwDomain(body.domain);

    const renderDomain = await addRenderCustomDomain(domain);
    let website = await connectOwnedWebsiteDomain({
      websiteId,
      userId: auth.user.id,
      domain,
      renderDomainId: renderDomain.id ?? null,
    });

    if (website.status !== "live") {
      website = await setOwnedWebsiteOnline({ websiteId, userId: auth.user.id });
      website = await connectOwnedWebsiteDomain({
        websiteId,
        userId: auth.user.id,
        domain,
        renderDomainId: renderDomain.id ?? null,
      });
    }

    return NextResponse.json({
      website: toWebsiteResponse(website),
      ...(await domainResponseMetadata(website.id, domain)),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect domain";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireProUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { websiteId } = await context.params;
    const website = await getOwnedWebsite({ websiteId, userId: auth.user.id });

    if (!website?.customDomain) {
      return NextResponse.json(
        { error: "No custom domain is connected yet" },
        { status: 400 },
      );
    }

    const renderDomain = await refreshRenderCustomDomain(website.customDomain);
    const connected = isRenderDomainVerified(renderDomain);
    const updated = await updateOwnedWebsiteDomainStatus({
      websiteId,
      userId: auth.user.id,
      status: connected ? "connected" : "pending",
      error: connected
        ? null
        : "We cannot see the DNS change yet. It can take a little while to update.",
      renderDomainId: renderDomain.id ?? null,
    });

    return NextResponse.json({
      website: toWebsiteResponse(updated),
      connected,
      ...(await domainResponseMetadata(updated.id, website.customDomain)),
    });
  } catch (error) {
    if (error instanceof RenderApiError && error.status === 404) {
      const { websiteId } = await context.params;
      const website = await updateOwnedWebsiteDomainStatus({
        websiteId,
        userId: auth.user.id,
        status: "failed",
        error:
          "Render could not find this domain yet. Click Connect domain again, then check the connection.",
      });

      return NextResponse.json(
        {
          error:
            "Render could not find this domain yet. Click Connect domain again, then check the connection.",
          website: toWebsiteResponse(website),
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to check domain";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireProUser();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { websiteId } = await context.params;
    const website = await getOwnedWebsite({ websiteId, userId: auth.user.id });

    if (website?.customDomain) {
      await deleteRenderCustomDomain(website.customDomain);
    }

    const updated = await removeOwnedWebsiteDomain({
      websiteId,
      userId: auth.user.id,
    });

    return NextResponse.json({ website: toWebsiteResponse(updated) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove domain";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
