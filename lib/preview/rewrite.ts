const LOCAL_PREVIEW_ORIGIN_PATTERN =
  /(?:https?:)?\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;
const ESCAPED_LOCAL_PREVIEW_ORIGIN_PATTERN =
  /(?:https?:)?\\\/\\\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;

export const REWRITABLE_PREVIEW_CONTENT_TYPES = [
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
];

export function canRewritePreviewContent(contentType: string): boolean {
  return REWRITABLE_PREVIEW_CONTENT_TYPES.some((rewritableType) =>
    contentType.startsWith(rewritableType),
  );
}

export function rewriteLocalPreviewOriginsText(value: string): string {
  return value
    .replace(LOCAL_PREVIEW_ORIGIN_PATTERN, "")
    .replace(ESCAPED_LOCAL_PREVIEW_ORIGIN_PATTERN, "");
}
