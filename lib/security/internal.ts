/**
 * Guard for internal-only endpoints (debug and health checks). These leak
 * operational details (file paths, repo inventories, API key names) and can
 * burn resources, so they must never be publicly reachable in production.
 *
 * Uses INTERNAL_API_SECRET when set, falling back to CRON_SECRET so existing
 * deployments are protected without new configuration. When neither secret is
 * configured, access is only allowed outside production.
 */
export function isInternalRequestAuthorized(request: Request): boolean {
  const secret =
    process.env.INTERNAL_API_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
