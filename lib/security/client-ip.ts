import { isIP } from "node:net";

/**
 * Derives the real client IP from the X-Forwarded-For chain.
 *
 * X-Forwarded-For is `client, proxy1, proxy2, ...` where each proxy APPENDS
 * the address it received the connection from. A client can freely prepend
 * fake entries on the left, so the only trustworthy values are the rightmost
 * ones added by our own infrastructure. We therefore count in from the right
 * by the number of trusted proxies in front of the app.
 *
 * On Render there is a single trusted proxy hop, so the default of 1 selects
 * the rightmost entry (the genuine client). Override with TRUSTED_PROXY_COUNT
 * if the deployment adds more proxies (e.g. Cloudflare in front of Render).
 */
function trustedProxyCount(): number {
  const parsed = Number.parseInt(
    process.env.TRUSTED_PROXY_COUNT?.trim() ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (hops.length > 0) {
      // Skip our own trusted proxies, counting from the right.
      const index = Math.max(0, hops.length - trustedProxyCount());
      const candidate = normalizeIp(hops[index]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return normalizeIp(request.headers.get("x-real-ip"));
}

function normalizeIp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  // Strip an optional :port and IPv6 brackets, then validate.
  let candidate = value.trim();

  if (candidate.startsWith("[")) {
    const end = candidate.indexOf("]");
    candidate = end === -1 ? candidate.slice(1) : candidate.slice(1, end);
  } else if (candidate.includes(".") && candidate.includes(":")) {
    // IPv4:port
    candidate = candidate.split(":")[0] ?? candidate;
  }

  // IPv4-mapped IPv6 → bare IPv4.
  const mapped = candidate.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) {
    candidate = mapped[1];
  }

  return isIP(candidate) ? candidate : null;
}
