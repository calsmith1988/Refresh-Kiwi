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
