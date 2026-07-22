/**
 * Detects edit prompts that are clearly asking to create a new website page.
 * Kept intentionally narrow so "add a section", "add a review", "add a form",
 * or "add more content to the about page" still go through as normal edits.
 */

export const NEW_PAGE_EDIT_MESSAGE =
  "New pages are added from Add pages, not Edit. Use Edit to change what's already on your site.";

const PAGE_CREATION_PATTERNS: RegExp[] = [
  // "add pages", "add new pages", "create more pages"
  /\b(add|create|make|build|generate)\s+(?:more\s+)?(?:new\s+)?pages?\b/i,
  // "add a page", "add an about page", "create a new services page"
  // Requires a/an/another/some/extra so "add more content to the about page"
  // does not match (that wording uses "the", not these determiners, before
  // the long run-up to "page").
  /\b(add|create|make|build|generate)\s+(?:(?:a|an|another|some|extra)\s+)(?:new\s+)?(?:[\w-]+\s+){0,3}pages?\b/i,
];

/** Dashboard may prefix edits with `On the "Title" page (/path), ...`. */
function stripEditTargetPrefix(prompt: string): string {
  return prompt.replace(/^On the ".+?" page \([^)]+\),\s*/i, "");
}

export function isNewPageEditRequest(prompt: string): boolean {
  const normalized = stripEditTargetPrefix(prompt).trim().replace(/\s+/g, " ");
  if (!normalized) {
    return false;
  }

  return PAGE_CREATION_PATTERNS.some((pattern) => pattern.test(normalized));
}
