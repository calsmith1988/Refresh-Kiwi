/**
 * User-facing copy for failed edit requests. Technical detail (Cursor run ids,
 * timeouts, SDK errors) belongs in server logs only — customers don't know
 * what Cursor is.
 */

export const EDIT_TIMEOUT_USER_MESSAGE =
  "That change took longer than expected and didn't finish. Please try again — short, specific requests work best.";

export const EDIT_FAILED_USER_MESSAGE =
  "That change didn't work — please try again.";

export const EDIT_CANCELLED_USER_MESSAGE = "Edit cancelled.";

/**
 * Legacy rows (and any missed code path) may hold raw technical errors.
 * Hide anything that looks technical instead of showing it to the user.
 */
const TECHNICAL_ERROR_PATTERN =
  /cursor|run[-_ ]?[0-9a-f]{8}|timed out after|failed to start|econn|fetch failed|status code|unknown edit error/i;

export function toUserFacingEditError(message: string | null): string | null {
  if (!message) {
    return null;
  }

  return TECHNICAL_ERROR_PATTERN.test(message) ? null : message;
}
