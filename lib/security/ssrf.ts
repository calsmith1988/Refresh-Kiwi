import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guards for server-side fetches of user-influenced URLs (e.g. images
 * hotlinked from source websites). Blocks loopback, RFC1918, link-local,
 * carrier-grade NAT, cloud metadata (169.254.169.254) and other reserved
 * ranges, both for literal IPs and for hostnames after DNS resolution.
 */

function isPrivateIpv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 0 || // "this network"
    a === 10 || // RFC1918
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 0) || // IETF protocol assignments + TEST-NET-1
    (a === 192 && b === 168) || // RFC1918
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved + broadcast
  );
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    return isPrivateIpv4(ip);
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();

    // IPv4-mapped (::ffff:a.b.c.d) — check the embedded IPv4 address.
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      return isPrivateIpv4(mapped[1]);
    }

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") || // unique local fc00::/7
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") || // link-local fe80::/10
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("64:ff9b") // NAT64 — may map to private IPv4
    );
  }

  return true;
}

/** Synchronous checks that don't need DNS: literal IPs and internal names. */
export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".lan")
  ) {
    return true;
  }

  if (isIP(normalized)) {
    return isPrivateIp(normalized);
  }

  return false;
}

/**
 * Resolves the hostname and reports whether any address is private/reserved.
 * Unresolvable hostnames are treated as blocked (fetch would fail anyway).
 */
export async function resolvesToPrivateIp(hostname: string): Promise<boolean> {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (isIP(normalized)) {
    return isPrivateIp(normalized);
  }

  try {
    const addresses = await lookup(normalized, { all: true, verbatim: true });

    return (
      addresses.length === 0 ||
      addresses.some((address) => isPrivateIp(address.address))
    );
  } catch {
    return true;
  }
}
