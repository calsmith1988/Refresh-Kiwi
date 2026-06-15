interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export function assertRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): void {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (entry.count >= options.limit) {
    throw new Error("Too many attempts. Please wait a moment and try again.");
  }

  entry.count += 1;
}

export function rateLimitKey(request: Request, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

  return `${scope}:${ip}`;
}
