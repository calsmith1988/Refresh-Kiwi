import type { Run, RunResult } from "@cursor/sdk";

// 10 min ceiling: healthy runs finish in ~2-3 min, but slower agent runs were
// hitting the previous 5 min cap and turning into user-facing failures.
const DEFAULT_HOMEPAGE_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_PAGES_TIMEOUT_MS = 8 * 60 * 1000;
// Edits pay the same cloud VM + repo-clone setup cost as builds, so they get
// the same ceiling. The previous 6 min cap regularly failed edits whose agent
// was still working (and would then commit anyway after we reported failure).
const DEFAULT_EDIT_TIMEOUT_MS = 10 * 60 * 1000;

export class RunTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunTimeoutError";
  }
}

export async function waitForRun(
  run: Run,
  timeoutMs: number = DEFAULT_HOMEPAGE_TIMEOUT_MS,
): Promise<RunResult> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new RunTimeoutError(
          `Cursor run timed out after ${Math.round(timeoutMs / 1000)}s (run ${run.id})`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([run.wait(), timeout]);
  } catch (error) {
    // On timeout, stop the run instead of abandoning it: an abandoned run
    // keeps working and eventually commits to the sites repo, so a change the
    // user was told failed would silently appear on the next sync.
    if (error instanceof RunTimeoutError) {
      try {
        if (run.supports("cancel")) {
          await run.cancel();
          console.info(`[refresh-kiwi] cancelled timed-out run ${run.id}`);
        }
      } catch (cancelError) {
        console.error(
          `[refresh-kiwi] failed to cancel timed-out run ${run.id}: ${
            cancelError instanceof Error ? cancelError.message : cancelError
          }`,
        );
      }
    }

    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const RUN_TIMEOUTS = {
  homepage: DEFAULT_HOMEPAGE_TIMEOUT_MS,
  pages: DEFAULT_PAGES_TIMEOUT_MS,
  legalPages: DEFAULT_PAGES_TIMEOUT_MS,
  edit: DEFAULT_EDIT_TIMEOUT_MS,
} as const;
