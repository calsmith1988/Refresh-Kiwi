const RENDER_API_BASE = "https://api.render.com/v1";

type RenderCustomDomain = {
  id?: string;
  name?: string;
  domain?: string;
  verificationStatus?: string;
  verified?: boolean;
};

export class RenderApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RenderApiError";
  }
}

function getRenderApiKey(): string {
  const apiKey = process.env.RENDER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RENDER_API_KEY is not configured");
  }

  return apiKey;
}

export function getRenderServiceId(): string {
  const serviceId = process.env.RENDER_SERVICE_ID?.trim();

  if (!serviceId) {
    throw new Error("RENDER_SERVICE_ID is not configured");
  }

  return serviceId;
}

export function getRenderDnsTarget(): string {
  const target =
    process.env.RENDER_DNS_TARGET?.trim() ||
    process.env.RENDER_EXTERNAL_HOSTNAME?.trim() ||
    "refresh-kiwi.onrender.com";

  return target.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getRenderApexIp(): string {
  return process.env.RENDER_APEX_IP?.trim() || "216.24.57.1";
}

async function renderRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${RENDER_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getRenderApiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new RenderApiError(
      `Render API request failed (${response.status}): ${errorText || response.statusText}`,
      response.status,
    );
  }

  if (response.status === 202 || response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function addRenderCustomDomain(domain: string) {
  try {
    return await renderRequest<RenderCustomDomain>(
      `/services/${getRenderServiceId()}/custom-domains`,
      {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      },
    );
  } catch (error) {
    if (error instanceof RenderApiError && error.status === 409) {
      return { name: domain };
    }

    throw error;
  }
}

export async function refreshRenderCustomDomain(domain: string) {
  await renderRequest<void>(
    `/services/${getRenderServiceId()}/custom-domains/${encodeURIComponent(
      domain,
    )}/verify`,
    {
      method: "POST",
    },
  );

  return getRenderCustomDomain(domain);
}

export async function getRenderCustomDomain(domain: string) {
  return renderRequest<RenderCustomDomain>(
    `/services/${getRenderServiceId()}/custom-domains/${encodeURIComponent(
      domain,
    )}`,
  );
}

/**
 * Lists every custom domain attached to the Render service. Render's list
 * endpoints wrap each entity as { customDomain, cursor }; handle a plain
 * array too in case that changes.
 */
export async function listRenderCustomDomains(): Promise<RenderCustomDomain[]> {
  const domains: RenderCustomDomain[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    // Explicit annotation: without it TS reports a circular inference
    // (query -> cursor narrowing -> response -> query).
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const response = await renderRequest<
      Array<{ customDomain?: RenderCustomDomain; cursor?: string } | RenderCustomDomain>
    >(`/services/${getRenderServiceId()}/custom-domains?limit=100${query}`);

    if (!Array.isArray(response) || response.length === 0) {
      break;
    }

    for (const entry of response) {
      if ("customDomain" in entry && entry.customDomain) {
        domains.push(entry.customDomain);
      } else {
        domains.push(entry as RenderCustomDomain);
      }
    }

    const last = response[response.length - 1];
    cursor = last && "cursor" in last ? (last.cursor ?? null) : null;

    if (!cursor || response.length < 100) {
      break;
    }
  }

  return domains;
}

export async function deleteRenderCustomDomain(domain: string) {
  return renderRequest<void>(
    `/services/${getRenderServiceId()}/custom-domains/${encodeURIComponent(
      domain,
    )}`,
    {
      method: "DELETE",
    },
  );
}

export function isRenderDomainVerified(domain: RenderCustomDomain): boolean {
  const status = domain.verificationStatus?.toLowerCase();

  return domain.verified === true || status === "verified" || status === "active";
}

