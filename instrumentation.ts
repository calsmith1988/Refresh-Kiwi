/**
 * Runs once when the Next.js Node server starts (not on the Edge runtime).
 * Used for process-wide setup that must not depend on a request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { configureSharpForLongRunningServer } = await import(
    "@/lib/assets/sharp-config"
  );
  const { startMemoryHeartbeat } = await import(
    "@/lib/observability/memory"
  );

  configureSharpForLongRunningServer();
  startMemoryHeartbeat("web");
}
