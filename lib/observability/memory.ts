function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function logMemoryUsage(
  phase: string,
  context: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const usage = process.memoryUsage();
  const contextText = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.info(
    [
      "[refresh-kiwi] memory",
      `phase=${phase}`,
      contextText,
      `rss=${formatMb(usage.rss)}`,
      `heapUsed=${formatMb(usage.heapUsed)}`,
      `heapTotal=${formatMb(usage.heapTotal)}`,
      `external=${formatMb(usage.external)}`,
      `arrayBuffers=${formatMb(usage.arrayBuffers)}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

const startedHeartbeats = new Set<string>();

/**
 * Periodically log RSS/heap so Render logs show when memory steps up
 * (after deploys, image work, traffic spikes) without waiting for an OOM.
 */
export function startMemoryHeartbeat(service: string): void {
  if (startedHeartbeats.has(service)) {
    return;
  }

  startedHeartbeats.add(service);

  const intervalMs = Number(process.env.MEMORY_HEARTBEAT_MS ?? 180_000);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  const tick = () => {
    logMemoryUsage("heartbeat", {
      service,
      uptimeSec: Math.floor(process.uptime()),
    });
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  // Don't keep the process alive solely for heartbeats (esp. worker shutdown).
  timer.unref?.();
}
