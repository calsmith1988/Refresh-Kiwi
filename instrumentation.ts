/**
 * Runs once when the Next.js Node server starts (not on the Edge runtime).
 * Used for process-wide setup that must not depend on a request.
 *
 * Keep imports here free of native modules (sharp, playwright): webpack
 * bundles this file without honouring serverExternalPackages, and sharp's
 * ESM build breaks the production build. Sharp is configured on first use
 * in lib/assets/optimize.ts instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startMemoryHeartbeat } = await import(
    "@/lib/observability/memory"
  );

  startMemoryHeartbeat("web");
}
