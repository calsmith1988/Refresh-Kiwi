export interface PromptParams {
  sourceUrl: string;
  slug: string;
}

export function buildHomepagePrompt({ sourceUrl, slug }: PromptParams): string {
  return `Rebuild the homepage for Refresh Kiwi. Work fast — target ~2 minutes.

SOURCE: ${sourceUrl}
OUTPUT: sites/${slug}/

## Speed-first scope (homepage only)

1. Visit the source URL once. Read the homepage only — do not crawl other pages yet.
2. Build a single static homepage (index.html + CSS/JS, or dist/ if you prefer a quick build).
3. Reuse key copy and logo/hero images from the source. Save images to sites/${slug}/assets/.
4. Write sites/${slug}/site.json:
   - brandName, slug ("${slug}"), sourceUrl
   - pages: [{ "path": "/", "title": "Home", "gated": false }]
   - discoveredPages: nav links you can see on the homepage only (max 8, paths only — do not visit them)
5. Commit to the repo when done.

## Design

Be creative and distinctive for this business — not a generic AI template. But keep scope small: one polished homepage, not a full site.

Do not build secondary pages in this phase.`;
}

export function buildAdditionalPagesPrompt({ sourceUrl, slug }: PromptParams): string {
  return `Continue Refresh Kiwi rebuild for sites/${slug}/. Work in the background.

SOURCE: ${sourceUrl}

Read sites/${slug}/site.json and match the homepage design language.

Build each path in discoveredPages that is not already in pages. Keep each page purposeful — not copy-paste layouts.

Update site.json: homepage gated false, all other pages gated true. Add simple nav; gated routes can show a brief lock placeholder.

Commit when finished.`;
}
