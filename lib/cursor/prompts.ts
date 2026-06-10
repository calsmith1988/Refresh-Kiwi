export interface PromptParams {
  sourceUrl: string;
  slug: string;
}

export interface EditPromptParams extends PromptParams {
  editPrompt: string;
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
  return `Generate additional pages for an existing Refresh Kiwi static website.

SOURCE: ${sourceUrl}
SITE: sites/${slug}/

## Goal

The homepage already exists. Your job is to crawl the source website for important internal pages, rebuild those pages in the same design language, and update navigation so the refreshed site becomes a structural replica of the original site.

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Crawl the source site's main navigation and obvious internal links. Prioritize useful pages like About, Services, Products, Case Studies, Contact, Pricing, FAQs, and location/service pages.
4. Build up to 6 additional pages. If the source site has fewer meaningful pages, build only those. Do not invent filler pages.
5. Pull useful source images into sites/${slug}/assets/ when they improve the result. Keep all asset references relative and local.
6. Match the homepage design system, spacing, typography, visual style, header/nav/footer, and responsive behavior.
7. Update the homepage navigation to link to the generated pages.
8. Update site.json with:
   - pages: include "/" plus each generated page with path, title, and gated false
   - discoveredPages: include any meaningful internal pages you found but did not generate
9. Commit the finished multi-page site to the repo.

## Quality bar

- These should be real refreshed pages, not lock placeholders.
- Convert old copy into polished, concise marketing sections.
- Preserve factual details, services, contact details, proof points, and useful imagery.
- Avoid broken links and broken asset paths.
- Every generated page must load the shared CSS and assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css, /preview/${slug}/script.js, /preview/${slug}/assets/file.png, and /preview/${slug}/page-path for navigation links.
- Do not use href="styles.css" or src="assets/..." on additional pages, because nested preview paths will resolve those relative to the page path and break styling.
- Avoid rebuilding the homepage from scratch unless a small nav/footer update is needed.

Stop when the generated pages and updated site.json are complete.`;
}

export function buildEditPrompt({
  sourceUrl,
  slug,
  editPrompt,
}: EditPromptParams): string {
  return `Apply this user-requested edit to the existing Refresh Kiwi static website.

SOURCE: ${sourceUrl}
SITE: sites/${slug}/
USER REQUEST: ${editPrompt}

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Apply the requested change while preserving the current design language, layout quality, responsive behavior, and asset paths.
4. Do not rebuild the whole site from scratch unless the request explicitly requires a major redesign.
5. Keep paths relative and local. Existing local assets should stay referenced as ./assets/file.ext from HTML.
6. Update site.json only if the edit changes metadata, page titles, or page structure.
7. Commit the finished edit to the repo.

## Quality bar

- Make the smallest high-quality change that satisfies the request.
- Avoid breaking existing sections, forms, navigation, or mobile layout.
- If the request is ambiguous, make the most reasonable interpretation and keep the result polished.`;
}
