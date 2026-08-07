import sharp from "sharp";

let configured = false;

/**
 * Tune sharp for a long-running Node process (web or worker).
 *
 * Default libvips caching + multithreaded allocations on glibc often leave
 * RSS stepped up after one-off image work even when the JS heap is fine —
 * exactly the pattern we've seen on the 512MB Render web instance.
 */
export function configureSharpForLongRunningServer(): void {
  if (configured) {
    return;
  }

  configured = true;
  sharp.cache(false);
  sharp.concurrency(1);
}
