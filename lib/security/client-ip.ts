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
 * the rightmost entry — the address that connected to Render. When the app
 * domain is proxied through Cloudflare that address is a rotating Cloudflare
 * edge server, not the visitor, which silently breaks every per-IP quota and
 * rate limit. So when the connecting address is verifiably Cloudflare, we use
 * the CF-Connecting-IP header Cloudflare sets instead. Direct-to-Render
 * traffic can fake that header but can't connect from a Cloudflare address,
 * so it falls through to the normal right-to-left derivation.
 */
// Published Cloudflare edge ranges (cloudflare.com/ips). These change rarely;
// a stale list fails safe — an unlisted edge IP just falls back to per-edge-IP
// limiting instead of per-visitor limiting.
const CLOUDFLARE_CIDRS = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;
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
        // The connection came from a Cloudflare edge, so the visitor's real
        // address is in CF-Connecting-IP (set by Cloudflare, and unspoofable
        // because a forger can't also connect from a Cloudflare address).
        if (isCloudflareIp(candidate)) {
          const cfClient = normalizeIp(
            request.headers.get("cf-connecting-ip"),
          );

          if (cfClient) {
            return cfClient;
          }
        }

        return candidate;
      }
    }
  }

  return normalizeIp(request.headers.get("x-real-ip"));
}

function ipToBigInt(ip: string): bigint | null {
  const version = isIP(ip);

  if (version === 4) {
    const parts = ip.split(".").map(Number);
    return (
      (BigInt(parts[0]) << 24n) |
      (BigInt(parts[1]) << 16n) |
      (BigInt(parts[2]) << 8n) |
      BigInt(parts[3])
    );
  }

  if (version === 6) {
    // Expand `::` shorthand into the full 8 groups, then fold into 128 bits.
    const [head, tail = ""] = ip.split("::");
    const headGroups = head ? head.split(":") : [];
    const tailGroups = tail ? tail.split(":") : [];
    const missing = 8 - headGroups.length - tailGroups.length;

    if (missing < 0 || (missing > 0 && !ip.includes("::"))) {
      return null;
    }

    const groups = [
      ...headGroups,
      ...Array<string>(missing).fill("0"),
      ...tailGroups,
    ];

    let value = 0n;
    for (const group of groups) {
      value = (value << 16n) | BigInt(parseInt(group || "0", 16));
    }
    return value;
  }

  return null;
}

type ParsedCidr = { base: bigint; maskBits: number; version: 4 | 6 };

const parsedCloudflareCidrs: ParsedCidr[] = CLOUDFLARE_CIDRS.flatMap((cidr) => {
  const [network, prefix] = cidr.split("/");
  const base = ipToBigInt(network);
  const version = isIP(network) as 4 | 6;
  const maskBits = Number(prefix);

  return base === null ? [] : [{ base, maskBits, version }];
});

function isCloudflareIp(ip: string): boolean {
  const version = isIP(ip);
  const value = ipToBigInt(ip);

  if (!version || value === null) {
    return false;
  }

  const totalBits = version === 4 ? 32 : 128;

  return parsedCloudflareCidrs.some((cidr) => {
    if (cidr.version !== version) {
      return false;
    }

    const shift = BigInt(totalBits - cidr.maskBits);
    return value >> shift === cidr.base >> shift;
  });
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
