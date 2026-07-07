export interface PromptParams {
  sourceUrl: string | null;
  slug: string;
  generationMode?: "refresh" | "fresh";
  creationPrompt?: string | null;
}

export interface EditPromptParams extends PromptParams {
  editPrompt: string;
}

export type PromptSeedAsset = {
  role: "logo" | "image";
  file: string;
  url: string;
  contentType: string;
  bytes: number;
};

export interface FreshHomepagePromptParams extends PromptParams {
  creationPrompt: string;
  seedAssets: PromptSeedAsset[];
}

export interface LegalPagesPromptParams extends PromptParams {
  legalDraft: string;
  existingLegalSummary: string;
}

export function buildHomepagePrompt({ sourceUrl, slug }: PromptParams): string {
  if (!sourceUrl) {
    throw new Error("Refresh homepage prompt requires a source URL");
  }

  return `Rebuild the homepage for Refresh Kiwi. The result must look like a premium designed website, not a text extraction.

SOURCE: ${sourceUrl}
OUTPUT: sites/${slug}/

## Speed-first scope (homepage only)

1. Visit the source URL once. Read the homepage only — do not crawl other pages yet.
2. Build a single static homepage using plain index.html, styles.css, and optional script.js. Avoid build tools unless absolutely necessary.
3. Use the source for facts, offer details, testimonials, phone numbers, service areas, and brand clues. Do not paste every paragraph.
4. Write sites/${slug}/site.json:
   - brandName, slug ("${slug}"), sourceUrl
   - pages: [{ "path": "/", "title": "Home", "gated": false }]
   - discoveredPages: [] unless obvious nav paths are already visible without extra browsing
5. Stop as soon as index.html, styles.css, and site.json are written under sites/${slug}/ and available as run artifacts. Do not wait to commit before finishing.

## Images — hotlink the source site's real images, do not download

- Reuse the source website's actual images by referencing their absolute URLs directly in <img> tags (or CSS backgrounds where it suits the design). Do not download or save image files — hotlinking is fast and the platform localises images later.
- Always put the business logo in the header if the source site has one. Look for header/nav logo images first; apple-touch-icon or favicon are fallbacks only if they are high enough quality.
- Use the strongest photos for the hero and supporting sections. Skip tiny icons, badges, stock-photo watermarks, and tracking pixels.
- If the homepage has a gallery, portfolio, case studies, or team photos, you may rebuild those sections with as many source images as the design deserves — do not artificially limit image count.
- Only use https image URLs; http-only images will be blocked in the preview.
- Never invent local image paths — only reference image URLs you actually saw on the source site.
- Fall back to CSS gradients, shapes, and illustration-like CSS treatments only if the source genuinely has no usable images.

## Videos — embed or hotlink, never download

- If the source site features videos, carry them into the refresh:
  - YouTube/Vimeo embeds: re-embed the same video with a responsive iframe (same video ID; prefer https://www.youtube-nocookie.com/embed/<id> for YouTube). Add loading="lazy".
  - Self-hosted video files (mp4/webm): reference the absolute https URL in a <video controls preload="metadata"> tag, with the original poster image URL if one exists.
- Never download or copy video files — they are huge. Reference them in place only.
- Give a featured video a proper home in the design (responsive 16:9 wrapper); never autoplay with sound.
- Only use videos that actually exist on the source site — never invent video URLs or embed IDs. Skip purely decorative background videos unless they clearly add value.

## Brand colours — same brand, modern execution

- Identify the brand colours from the original site before designing: the logo first, then header/nav background, buttons, and accent colours.
- If the site has clear branding, keep it. Build a refined, modern palette around those brand colours — the business should still feel like itself, just executed beautifully. Ensure WCAG AA contrast.
- If there is no clear branding, or the colours are genuinely poor, choose your own tasteful modern palette instead.
- Either way, make the wow factor come from layout, typography, spacing, and motion — not from swapping the brand's identity.

## Design bar

Create a proper landing page redesign:
- Above-the-fold hero with a clear headline, subheadline, primary CTA, secondary CTA, and visual composition.
- Strong responsive layout with spacing, contrast, hierarchy, and sections that feel intentionally designed.
- Convert long source copy into short marketing copy, cards, stats, badges, testimonial blocks, and CTAs.
- Include only the strongest content: services, trust proof, coverage/location, offer, testimonials, contact CTA.
- Add micro-interactions, hover states, or subtle scroll animations if useful, but keep it static and fast.
- Do not use emoji as UI icons; use inline SVG if icons are needed.

Avoid:
- A wall of text.
- A generic Tailwind/AI landing page look.
- Recreating the old site structure section-for-section.
- Broken image references — every image URL must come from the source site.
- Never use localhost, 127.0.0.1, or port-based preview origins in links, scripts, forms, canonical tags, Open Graph URLs, or base tags. Use root-relative paths such as /preview/${slug}/ and /preview/${slug}/page-path.

Do not build secondary pages in this phase. Do not spend time on a multi-page plan. The first preview is artifact-first, so the generated files are the deliverable even if no git commit is created.`;
}

function formatSeedAssets(seedAssets: PromptSeedAsset[]): string {
  if (seedAssets.length === 0) {
    return "No logo or image assets were provided. Use tasteful CSS shapes, gradients, layout, and typography instead of inventing image paths.";
  }

  return seedAssets
    .map(
      (asset) =>
        `- ${asset.role}: ${asset.url} (${asset.contentType}, ${asset.bytes} bytes)`,
    )
    .join("\n");
}

export function buildFreshHomepagePrompt({
  slug,
  creationPrompt,
  seedAssets,
}: FreshHomepagePromptParams): string {
  return `Create a brand-new homepage for Refresh Kiwi from a user brief. Work fast — target ~2 minutes, but the result must look like a premium designed website, not a generic AI template.

OUTPUT: sites/${slug}/

## User brief

${creationPrompt}

## Provided starter assets

${formatSeedAssets(seedAssets)}

## Speed-first scope (homepage only)

1. Do not crawl the web. The user brief and provided starter assets are the source of truth.
2. Build a single static homepage using plain index.html, styles.css, and optional script.js. Avoid build tools unless absolutely necessary.
3. Infer a clear brand name, audience, offer, services, proof points, tone, and calls to action from the brief. If details are missing, make conservative, useful assumptions and keep copy easy to edit later.
4. Write sites/${slug}/site.json:
   - brandName, slug ("${slug}"), sourceUrl null
   - pages: [{ "path": "/", "title": "Home", "gated": false }]
   - discoveredPages: []
5. Commit the finished homepage files to the repo before finishing. Do not finish until index.html, styles.css, and site.json are written under sites/${slug}/ and available from the run artifacts or the repository.

## Images and logo

- Use the provided logo in the header if a logo asset is listed above.
- Use provided image assets as real site imagery where they fit: hero, services, gallery, team, product, or proof sections. If the brief says these are selected photos from a business listing, treat them as preferred real business photos and use several of them prominently instead of abstract/generated-looking imagery.
- If multiple generated image assets are listed, use them as separate focused images in different sections. Do not visually combine them into one collage or describe them as one image.
- Reference provided assets exactly by the public URLs listed above. Do not invent local image paths.
- If no suitable image exists for a section, use refined CSS composition instead of stock-photo placeholders.
- Do not download any images or embed third-party images unless the user explicitly included a URL in the brief.

## Design bar

Create a proper small-business landing page:
- Above-the-fold hero with a clear headline, subheadline, primary CTA, secondary CTA, and visual composition.
- Strong responsive layout with spacing, contrast, hierarchy, and sections that feel intentionally designed.
- Turn the brief into short marketing copy, cards, stats, testimonials/placeholders only when credible, service blocks, FAQs, and CTAs.
- If contact details, locations, hours, prices, or social proof are present in the brief, include them. Do not invent phone numbers, addresses, awards, or testimonials.
- Add micro-interactions, hover states, or subtle scroll animations if useful, but keep it static and fast.
- Do not use emoji as UI icons; use inline SVG if icons are needed.

Avoid:
- A wall of text.
- A generic Tailwind/AI landing page look.
- Fake factual claims.
- Broken image references.
- Never use localhost, 127.0.0.1, or port-based preview origins in links, scripts, forms, canonical tags, Open Graph URLs, or base tags. Use root-relative paths such as /preview/${slug}/ and /preview/${slug}/page-path.

Do not build secondary pages in this phase. The homepage files are the deliverable, so make sure they are present before finishing.`;
}

export function buildAdditionalPagesPrompt({
  sourceUrl,
  slug,
  generationMode,
  creationPrompt,
}: PromptParams): string {
  if (generationMode === "fresh" || !sourceUrl) {
    return `Generate additional pages for an existing Refresh Kiwi static website that was created from a user brief.

SITE: sites/${slug}/

## Original user brief

${creationPrompt ?? "No original brief was stored. Infer cautiously from the existing homepage."}

## Goal

The homepage already exists. Your job is to expand it into a small multi-page website in the same design language, using the original brief and existing homepage as the source of truth.

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Build up to 6 useful pages such as About, Services, Products, Gallery, FAQs, Contact, Pricing, or location/service pages. Create only pages that fit the brief and homepage.
4. Use existing uploaded/local assets from assets/ where they fit. Do not invent image paths or download third-party images.
5. Match the homepage design system: same brand colours and palette, spacing, typography, visual style, header/nav/footer, and responsive behavior.
6. Update the homepage navigation to link to the generated pages.
7. Update site.json with:
   - pages: include "/" plus each generated page with path, title, and gated false
   - discoveredPages: []
8. Commit the finished multi-page site to the repo.

## Quality bar

- These should be real pages, not lock placeholders.
- Keep factual claims grounded in the brief and existing homepage. Do not invent addresses, phone numbers, awards, testimonials, or compliance claims.
- Every generated page must load shared CSS and assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css, /preview/${slug}/script.js, /preview/${slug}/assets/file.png, and /preview/${slug}/page-path for navigation links.
- Never use localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags.
- Avoid rebuilding the homepage from scratch unless a small nav/footer update is needed.

Stop when the generated pages and updated site.json are complete.`;
  }

  return `Generate additional pages for an existing Refresh Kiwi static website.

SOURCE: ${sourceUrl}
SITE: sites/${slug}/

## Goal

The homepage already exists. Your job is to crawl the source website for important internal pages, rebuild those pages in the same design language, and update navigation so the refreshed site becomes a structural replica of the original site.

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Crawl the source site's main navigation and obvious internal links. Prioritize useful pages like About, Services, Products, Case Studies, Contact, Pricing, FAQs, and location/service pages. Do not generate legal/policy pages in this flow unless the user explicitly asked for legal pages.
4. Build up to 6 additional pages. If the source site has fewer meaningful pages, build only those. Do not invent filler pages.
5. Images: hotlink the source site's real images by their absolute https URLs, exactly like the homepage does. Do not download image files. Never invent image paths — only use URLs you actually saw on the source site. Galleries and image-heavy pages may use as many source images as the design deserves.
6. Videos: same rule as the homepage — re-embed YouTube/Vimeo videos with responsive lazy-loaded iframes (youtube-nocookie for YouTube), and reference self-hosted video files by absolute https URL in <video controls preload="metadata"> tags. Never download video files or invent video URLs.
7. Match the homepage design system: same brand colours and palette, spacing, typography, visual style, header/nav/footer, and responsive behavior. Read styles.css first and reuse its tokens rather than introducing new colours.
8. Update the homepage navigation to link to the generated pages.
9. Update site.json with:
   - pages: include "/" plus each generated page with path, title, and gated false
   - discoveredPages: include any meaningful internal pages you found but did not generate
10. Commit the finished multi-page site to the repo.

## Quality bar

- These should be real refreshed pages, not lock placeholders.
- Convert old copy into polished, concise marketing sections.
- Preserve factual details, services, contact details, proof points, and useful imagery.
- Avoid broken links and broken asset paths.
- Every generated page must load the shared CSS and any local assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css, /preview/${slug}/script.js, /preview/${slug}/assets/file.png, and /preview/${slug}/page-path for navigation links. Hotlinked source images are absolute https URLs and need no path handling.
- Do not use href="styles.css" or src="assets/..." on additional pages, because nested preview paths will resolve those relative to the page path and break styling.
- Never use localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags.
- Avoid rebuilding the homepage from scratch unless a small nav/footer update is needed.

Stop when the generated pages and updated site.json are complete.`;
}

export function buildLegalPagesPrompt({
  sourceUrl,
  slug,
  legalDraft,
  existingLegalSummary,
}: LegalPagesPromptParams): string {
  return `Generate starter legal pages for an existing Refresh Kiwi static website.

SOURCE: ${sourceUrl ?? "No source website; use the existing generated site and starter legal draft only."}
SITE: sites/${slug}/

## Source legal page check already completed

${existingLegalSummary}

Do not crawl the source website in this step. The app has already performed a quick legal-page discovery pass and the relevant text is included in the starter draft below when available.

## Starter legal draft

${legalDraft}

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Build legal pages that match the existing site's header, footer, typography, colours, spacing, and responsive behavior.
4. Create pages only for the legal content available or discovered, normally Privacy Policy, Cookie Policy, and Terms.
5. Include a short disclaimer on each generated legal page: "Starter template only - review before publishing."
6. Do not create or wire a cookie consent banner in this phase.
7. Update the homepage footer/navigation to link to the legal pages in a subtle footer/legal-links area.
8. Update site.json with:
   - pages: include "/" plus all existing pages and each legal page with path, title, and gated false
   - discoveredPages: include any meaningful pages discovered but not generated
9. Commit the finished legal pages to the repo.

## Quality bar

- These pages should feel part of the refreshed website, not pasted legal boilerplate.
- Keep the copy clear, structured, and readable with headings and short sections.
- Do not claim legal compliance or that the pages are lawyer-approved.
- Every generated page must load shared CSS and assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css and /preview/${slug}/page-path.
- Never use localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags.
- Avoid rebuilding the homepage from scratch unless a small footer/navigation update is needed.
- Prioritise finishing over exploration. Use the drafted legal copy as the content source.

Stop when the legal pages and updated site.json are complete.`;
}

export function buildEditPrompt({
  sourceUrl,
  slug,
  editPrompt,
  generationMode,
  creationPrompt,
}: EditPromptParams): string {
  const sourceContext =
    generationMode === "fresh" || !sourceUrl
      ? `ORIGINAL USER BRIEF: ${creationPrompt ?? "Not available. Infer from the existing site files."}`
      : `SOURCE: ${sourceUrl}`;

  return `Apply this user-requested edit to the existing Refresh Kiwi static website.

${sourceContext}
SITE: sites/${slug}/
USER REQUEST: ${editPrompt}

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Apply the requested change while preserving the current design language, brand colours, layout quality, responsive behavior, and asset paths.
4. Do not rebuild the whole site from scratch unless the request explicitly requires a major redesign.
5. Images may be referenced two ways — preserve whichever is in use:
   - Hotlinked absolute https URLs pointing at the original business website. Keep them as-is.
   - Local files under assets/ (referenced as ./assets/file.ext or /preview/${slug}/assets/file.ext). Keep those paths intact.
   If the edit asks for new imagery, use existing local assets first, then only use URLs explicitly provided by the user or present in the original source context. Never invent image paths.
6. Videos may appear as YouTube/Vimeo iframes or hotlinked <video> tags pointing at the original site — preserve them as-is. If the edit asks for a new video, only use an embed or URL that exists on the source site or that the user provided; never download video files or invent video URLs.
7. Update site.json only if the edit changes metadata, page titles, or page structure.
8. Commit the finished edit to the repo.

## Quality bar

- Make the smallest high-quality change that satisfies the request.
- Avoid breaking existing sections, forms, navigation, or mobile layout.
- Never introduce localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags. Use root-relative paths such as /preview/${slug}/ and /preview/${slug}/page-path.
- If the request is ambiguous, make the most reasonable interpretation and keep the result polished.`;
}
