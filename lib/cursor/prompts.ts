export interface PromptParams {
  sourceUrl: string;
  slug: string;
}

export function buildHomepagePrompt({ sourceUrl, slug }: PromptParams): string {
  return `Rebuild the homepage for Refresh Kiwi. Work fast — target ~2 minutes, but the result must look like a premium designed website, not a text extraction.

SOURCE: ${sourceUrl}
OUTPUT: sites/${slug}/

## Speed-first scope (homepage only)

1. Visit the source URL once. Read the homepage only — do not crawl other pages yet.
2. Build a single static homepage using plain index.html, styles.css, and optional script.js. Avoid build tools unless absolutely necessary.
3. Use the source for facts, offer details, testimonials, phone numbers, service areas, and brand clues. Do not paste every paragraph.
4. Save usable source images to sites/${slug}/assets/ only when they clearly improve the design. Prefer CSS gradients, shapes, cards, icons, and layout if images are weak or slow.
5. Write sites/${slug}/site.json:
   - brandName, slug ("${slug}"), sourceUrl
   - pages: [{ "path": "/", "title": "Home", "gated": false }]
   - discoveredPages: [] unless obvious nav paths are already visible without extra browsing
6. Stop as soon as index.html, styles.css, and site.json are written under sites/${slug}/ and available as run artifacts. Do not wait to commit before finishing.

## Design bar

Create a proper landing page redesign:
- Above-the-fold hero with a clear headline, subheadline, primary CTA, secondary CTA, and visual composition.
- Strong responsive layout with spacing, contrast, hierarchy, and sections that feel intentionally designed.
- Convert long source copy into short marketing copy, cards, stats, badges, testimonial blocks, and CTAs.
- Include only the strongest content: services, trust proof, coverage/location, offer, testimonials, contact CTA.
- Add micro-interactions or tasteful visual details if useful, but keep it static and fast.

Avoid:
- A wall of text.
- A generic Tailwind/AI landing page look.
- Recreating the old site structure section-for-section.
- Broken relative asset paths. Reference local assets as ./assets/file.ext from index.html.

Do not build secondary pages in this phase. Do not spend time on a multi-page plan. The first preview is artifact-first, so the generated files are the deliverable even if no git commit is created.`;
}

export function buildAdditionalPagesPrompt({ sourceUrl, slug }: PromptParams): string {
  return `Continue Refresh Kiwi rebuild for sites/${slug}/. Work in the background.

SOURCE: ${sourceUrl}

Read sites/${slug}/site.json and match the homepage design language.

Build each path in discoveredPages that is not already in pages. Keep each page purposeful — not copy-paste layouts.

Update site.json: homepage gated false, all other pages gated true. Add simple nav; gated routes can show a brief lock placeholder.

Commit when finished.`;
}
