import type { Run, RunResult } from "@cursor/sdk";

const DEFAULT_HOMEPAGE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_PAGES_TIMEOUT_MS = 8 * 60 * 1000;
const DEFAULT_EDIT_TIMEOUT_MS = 6 * 60 * 1000;

export async function waitForRun(
  run: Run,
  timeoutMs: number = DEFAULT_HOMEPAGE_TIMEOUT_MS,
): Promise<RunResult> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Cursor run timed out after ${Math.round(timeoutMs / 1000)}s (run ${run.id})`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([run.wait(), timeout]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const RUN_TIMEOUTS = {
  homepage: DEFAULT_HOMEPAGE_TIMEOUT_MS,
  pages: DEFAULT_PAGES_TIMEOUT_MS,
  edit: DEFAULT_EDIT_TIMEOUT_MS,
} as const;
