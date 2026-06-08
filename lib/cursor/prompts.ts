export interface PromptParams {
  sourceUrl: string;
  slug: string;
}

export function buildHomepagePrompt({ sourceUrl, slug }: PromptParams): string {
  return `Rebuild a small-business website for Refresh Kiwi.

SOURCE WEBSITE: ${sourceUrl}
OUTPUT DIRECTORY: sites/${slug}/

## Phase: homepage only (prioritize speed)

Visit the source URL. Understand the business — name, tone, services, audience, and visual identity from the existing site.

Build ONLY the homepage in this phase. Discover other same-domain pages but do not build them yet.

## Creative direction

Design something fresh, distinctive, and award-worthy for this specific business.
- Do NOT follow a fixed template or repeat the same layout patterns across projects.
- Avoid generic "AI landing page" clichés unless they genuinely suit this brand.
- Let the business personality drive typography, color, spacing, imagery, and motion.
- Reuse real copy and images from the source where they add value. Save images to sites/${slug}/assets/.

## Technical requirements

1. Start from template/ if helpful, but you may restructure or replace it entirely.
2. Produce a static site (HTML/CSS/JS, or a static build output in dist/).
3. Create sites/${slug}/site.json with:
   - brandName, slug ("${slug}"), sourceUrl
   - pages: [{ "path": "/", "title": "Home", "gated": false }]
   - discoveredPages: same-domain pages you found (max 15), not built yet
4. Commit all files when the homepage is complete.

Do not build secondary pages in this phase. Focus on one excellent homepage the owner can preview quickly.`;
}

export function buildAdditionalPagesPrompt({ sourceUrl, slug }: PromptParams): string {
  return `Continue the Refresh Kiwi rebuild for sites/${slug}/.

SOURCE WEBSITE: ${sourceUrl}

## Phase: remaining pages (background)

Read sites/${slug}/site.json and the homepage you already built.

Build each page listed in discoveredPages that is not yet in pages.

## Creative direction

- Keep visual identity consistent with the homepage, but design each page for its purpose.
- About, Services, and Contact should not feel like copy-paste templates of each other.
- Maintain high craft: hierarchy, spacing, typography, and purposeful details.

## Technical requirements

1. Add static page files under sites/${slug}/.
2. Update site.json pages array — homepage gated: false, all other pages gated: true.
3. Add site navigation. Gated pages may show a simple lock/upgrade placeholder when visited directly.
4. Commit all work when finished.`;
}
