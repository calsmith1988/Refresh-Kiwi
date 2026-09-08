const HTTPS_TIMEOUT_MS = 5_000;

/**
 * True when HTTPS for this hostname reaches Refresh Kiwi — TLS handshake
 * succeeded and the request hit our custom-domain middleware.
 *
 * That is stricter than "any certificate": Shopify (or another host) can
 * still present a valid cert if DNS has not fully moved. It is also why we
 * accept our own pending-domain 404 — that still proves the domain opens.
 */
export async function isDomainHttpsReady(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(HTTPS_TIMEOUT_MS),
      headers: {
        Accept: "text/html",
        "User-Agent": "RefreshKiwi-DomainCheck/1.0",
      },
    });

    const rewrite = response.headers.get("x-middleware-rewrite") ?? "";
    return rewrite.includes("custom-domain");
  } catch {
    return false;
  }
}
