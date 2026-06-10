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

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
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
  return renderRequest<RenderCustomDomain>(
    `/services/${getRenderServiceId()}/custom-domains/${encodeURIComponent(
      domain,
    )}/refresh`,
    {
      method: "POST",
    },
  );
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

