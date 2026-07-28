import { isBlockedHostname, resolvesToPrivateIp } from "@/lib/security/ssrf";

/**
 * Pre-flight reachability check for refresh source URLs, run before any job,
 * repo, or paid agent is created. Without it, typo'd domains (NXDOMAIN) and
 * suspended sites (5xx) sail through URL-shape validation and burn a full
 * agent run that either fails or — worse — improvises a site from guesses.
 */

const PROBE_TIMEOUT_MS = 8_000;

// A realistic browser UA: plenty of small-business hosts serve bot UAs a 403
// or an empty page, and a false "unreachable" here blocks a legitimate build.
const PROBE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const UNREACHABLE_MESSAGE =
  "We couldn't reach that address. Check the spelling — it should look like yourbusiness.co.uk — and try again.";

const SERVER_ERROR_MESSAGE =
  "That website isn't responding right now, so there's nothing for us to read and refresh. Check the address is right, or try again later.";

export type ReachabilityResult = { ok: true } | { ok: false; message: string };

export async function checkSourceUrlReachable(
  sourceUrl: string,
): Promise<ReachabilityResult> {
  const parsed = new URL(sourceUrl);

  // Covers literal private IPs/internal names, and (via DNS lookup) hostnames
  // that don't resolve at all — the classic typo'd-domain case.
  if (
    isBlockedHostname(parsed.hostname) ||
    (await resolvesToPrivateIp(parsed.hostname))
  ) {
    return { ok: false, message: UNREACHABLE_MESSAGE };
  }

  try {
    // GET rather than HEAD — small-business hosts frequently mishandle HEAD.
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: {
        "User-Agent": PROBE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });

    await response.body?.cancel();

    // 5xx = the host answered but the site is down/suspended (suspended
    // hosting typically serves 503) — nothing for the agent to read.
    // 4xx stays allowed: bot-blocking sites often 403 here but load fine
    // in the agent's browser.
    if (response.status >= 500) {
      return { ok: false, message: SERVER_ERROR_MESSAGE };
    }

    return { ok: true };
  } catch {
    // Connection refused, TLS failure, or timeout.
    return { ok: false, message: UNREACHABLE_MESSAGE };
  }
}
