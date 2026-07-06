/**
 * Internal header carrying the verified custom-domain host, set by middleware
 * during the rewrite to /custom-domain. Middleware strips any client-supplied
 * copy on every request, so route handlers can trust the value.
 */
export const CUSTOM_DOMAIN_HOST_HEADER = "x-rk-custom-host";
