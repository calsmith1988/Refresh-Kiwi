import {
  buildDesignDirectionSection,
  pickDesignDirection,
} from "@/lib/cursor/design-directions";

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

export interface CustomPagePromptParams extends PromptParams {
  title: string;
  brief: string;
}

/**
 * Cloud agents default to branch-and-PR etiquette. Everything downstream
 * (preview sync, serving, edits, image localization) only ever reads main, so
 * work left on any other branch silently fails the whole build. Every prompt
 * must carry these rules.
 */
const GIT_RULES = [
  "## Git — commit directly to main",
  "",
  "- Do all work on the branch that is already checked out (main). Commit there and push with git push origin main.",
  "- Never create a new branch, never run git checkout -b, and never open a pull request (do not use any PR tool).",
  "- The platform only reads files from main. Work left on another branch or in a PR is invisible and makes the whole build count as failed.",
].join("\n");

function buildFormRules(slug: string): string {
  return [
    "## Contact forms",
    "",
    "- Do not add contact forms by default. Only add a contact form when the user explicitly asks for one.",
    "- When a contact form is requested, use Refresh Kiwi's form relay pattern below. Do not build custom backends, third-party form services, mailto form actions, or fake success alerts.",
    "- The form posts root-relative JSON to /api/site-contact so it works on both previews and custom domains. Keep the hidden slug value exactly as shown.",
    "",
    "```html",
    '<form data-refresh-kiwi-contact>',
    `  <input type="hidden" name="slug" value="${slug}" />`,
    '  <p style="position:absolute;left:-9999px" aria-hidden="true">',
    '    <label>Website <input name="website" tabindex="-1" autocomplete="off" /></label>',
    "  </p>",
    '  <label>Name <input name="name" autocomplete="name" required /></label>',
    '  <label>Email <input name="email" type="email" autocomplete="email" required /></label>',
    '  <label>Message <textarea name="message" rows="5" required></textarea></label>',
    '  <button type="submit">Send message</button>',
    '  <p data-refresh-kiwi-contact-status role="status" aria-live="polite"></p>',
    "</form>",
    "<script>",
    "document.querySelectorAll('[data-refresh-kiwi-contact]').forEach(function (form) {",
    "  form.addEventListener('submit', async function (event) {",
    "    event.preventDefault();",
    "    var status = form.querySelector('[data-refresh-kiwi-contact-status]');",
    "    var button = form.querySelector('button[type=\"submit\"]');",
    "    var data = Object.fromEntries(new FormData(form).entries());",
    "    if (status) status.textContent = 'Sending...';",
    "    if (button) button.disabled = true;",
    "    try {",
    "      var response = await fetch('/api/site-contact', {",
    "        method: 'POST',",
    "        headers: { 'Content-Type': 'application/json' },",
    "        body: JSON.stringify(data)",
    "      });",
    "      var result = await response.json();",
    "      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not send message.');",
    "      form.reset();",
    "      if (status) status.textContent = 'Thanks - your message has been sent.';",
    "    } catch (error) {",
    "      if (status) status.textContent = error.message || 'Could not send message. Please try again.';",
    "    } finally {",
    "      if (button) button.disabled = false;",
    "    }",
    "  });",
    "});",
    "</script>",
    "```",
  ].join("\n");
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
5. When index.html, styles.css, and site.json are written under sites/${slug}/, commit them directly on main and push to origin main (no new branch, no pull request), then finish. The commit is required — the platform falls back to reading the repo when run artifacts are unavailable, so finishing without a commit can make the whole build count as failed.

${GIT_RULES}

## If the source website cannot be read — fail, do not improvise

- Try the source URL once; if the fetch fails, retry once with curl. If it still fails — DNS error, timeout, connection refused, a hosting "suspended" or error page, a parked/for-sale page, or an empty page with no real business content — stop.
- When the source cannot be read, do NOT look for alternative or similar domains, do NOT use archive services like the Wayback Machine, do NOT search the web for the business, and do NOT build a placeholder or generic site.
- Instead, finish immediately WITHOUT committing anything, and say in your final message that the source website was unreachable. Finishing without a commit is how the platform knows this build failed — committing a guessed or invented site would show a customer a website that is not theirs.

## Images — hotlink the source site's real images, do not download

- Reuse the source website's actual images by referencing their absolute URLs directly in <img> tags (or CSS backgrounds where it suits the design). Do not download or save image files — hotlinking is fast and the platform localises images later.
- Always put the business logo in the header if the source site has one. Look for header/nav logo images first; apple-touch-icon or favicon are fallbacks only if they are high enough quality.
- Use the strongest photos for the hero and supporting sections. Skip tiny icons, badges, stock-photo watermarks, and tracking pixels.
- If the homepage has a gallery, portfolio, case studies, or team photos, you may rebuild those sections with as many source images as the design deserves — do not artificially limit image count.
- Only use https image URLs; http-only images will be blocked in the preview.
- Never invent local image paths — only reference image URLs you actually saw on the source site.
- Fall back to CSS gradients, shapes, and illustration-like CSS treatments only if the source genuinely has no usable images.

## Favicon

- Every generated page must include a favicon in <head>. Prefer, in order:
  1. The source site's favicon / apple-touch-icon (hotlink the absolute https URL you actually found — PNG or SVG preferred over .ico).
  2. The header logo image URL, if it is square-ish and readable at small sizes.
  3. A tiny local SVG at assets/favicon.svg with the brand initials on a solid brand-coloured disc (create this file yourself if needed).
- Example: <link rel="icon" href="…" type="image/png"> (or type="image/svg+xml" for an SVG).

## SEO basics

- <title>: specific and human, "Brand — what they do in Town" style, under 60 characters. Not "Home".
- <meta name="description">: one compelling sentence about the real offer, under 160 characters.
- Open Graph tags: og:title, og:description, og:type "website", and og:image set to the strongest real image URL you used on the page.
- One <script type="application/ld+json"> LocalBusiness block in <head> using only facts you actually saw on the source site: name, telephone, address, openingHours, areaServed, image. Omit any field you don't have — never invent facts. Skip the "url" field; the platform handles canonical URLs.
- Exactly one <h1> per page. Meaningful alt text on content images; alt="" on decorative ones.
- Do not write canonical tags, robots.txt, or sitemap.xml — the platform generates those.

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

${buildDesignDirectionSection(pickDesignDirection(slug))}

## Design bar

Create a proper landing page redesign:
- Above-the-fold hero with a clear headline, subheadline, primary CTA, secondary CTA, and visual composition.
- Strong responsive layout with spacing, contrast, hierarchy, and sections that feel intentionally designed.
- Convert long source copy into short marketing copy, cards, stats, badges, testimonial blocks, and CTAs.
- Include only the strongest content: services, trust proof, coverage/location, offer, testimonials, contact CTA.
- Add micro-interactions, hover states, or subtle scroll animations if useful, but keep it static and fast.
- Do not use emoji as UI icons; use inline SVG if icons are needed.

${buildFormRules(slug)}

Avoid:
- A wall of text.
- A generic Tailwind/AI landing page look.
- Recreating the old site structure section-for-section.
- Broken image references — every image URL must come from the source site.
- Never use localhost, 127.0.0.1, or port-based preview origins in links, scripts, forms, canonical tags, Open Graph URLs, or base tags. Use root-relative paths such as /preview/${slug}/ and /preview/${slug}/page-path.

Do not build secondary pages in this phase. Do not spend time on a multi-page plan. Finish as soon as the homepage files are written and committed.`;
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
5. Commit the finished homepage files directly on main and push to origin main (no new branch, no pull request) before finishing. Do not finish until index.html, styles.css, and site.json are written under sites/${slug}/ and available from the run artifacts or the repository.

${GIT_RULES}

## Images and logo

- Use the provided logo in the header if a logo asset is listed above.
- Use provided image assets as real site imagery where they fit: hero, services, gallery, team, product, or proof sections. If the brief says these are selected photos from a business listing, treat them as preferred real business photos and use several of them prominently instead of abstract/generated-looking imagery.
- If multiple generated image assets are listed, use them as separate focused images in different sections. Do not visually combine them into one collage or describe them as one image.
- Reference provided assets exactly by the public URLs listed above. Do not invent local image paths.
- If no suitable image exists for a section, use refined CSS composition instead of stock-photo placeholders.
- Do not download any images or embed third-party images unless the user explicitly included a URL in the brief.

## Favicon

- Every generated page must include a favicon in <head>. Prefer, in order:
  1. The provided logo asset URL, if a logo is listed above.
  2. A tiny local SVG at assets/favicon.svg with the business initials (1–2 letters from the brand name) on a solid brand-coloured disc — create this file yourself. Keep it simple: circle + bold initials, no gradients required.
- Example: <link rel="icon" href="/preview/${slug}/assets/favicon.svg" type="image/svg+xml">
  When using the provided logo instead: <link rel="icon" href="THE_LOGO_URL" type="image/png"> (match the real content type).

## SEO basics

- <title>: specific and human, "Brand — what they do in Town" style, under 60 characters. Not "Home".
- <meta name="description">: one compelling sentence about the real offer, under 160 characters.
- Open Graph tags: og:title, og:description, og:type "website", and og:image set to the strongest image URL you used on the page.
- If the brief includes real business facts (name, phone, address, opening hours, service area), add one <script type="application/ld+json"> LocalBusiness block in <head> with only those facts. Omit any field the brief doesn't provide — never invent facts. Skip the "url" field; the platform handles canonical URLs.
- Exactly one <h1> per page. Meaningful alt text on content images; alt="" on decorative ones.
- Do not write canonical tags, robots.txt, or sitemap.xml — the platform generates those.

${buildDesignDirectionSection(pickDesignDirection(slug))}

## Design bar

Create a proper small-business landing page:
- Above-the-fold hero with a clear headline, subheadline, primary CTA, secondary CTA, and visual composition.
- Strong responsive layout with spacing, contrast, hierarchy, and sections that feel intentionally designed.
- Turn the brief into short marketing copy, cards, stats, testimonials/placeholders only when credible, service blocks, FAQs, and CTAs.
- If contact details, locations, hours, prices, or social proof are present in the brief, include them. Do not invent phone numbers, addresses, awards, or testimonials.
- Add micro-interactions, hover states, or subtle scroll animations if useful, but keep it static and fast.
- Do not use emoji as UI icons; use inline SVG if icons are needed.

${buildFormRules(slug)}

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
6. Copy the homepage favicon <link rel="icon"> (and apple-touch-icon if present) into every new page's <head>. Do not invent a different favicon.
7. Update the homepage navigation to link to the generated pages.
8. Update site.json with:
   - pages: include "/" plus each generated page with path, title, and gated false
   - discoveredPages: []
9. Commit the finished multi-page site directly on main and push to origin main (no new branch, no pull request).

${GIT_RULES}

${buildFormRules(slug)}

## Quality bar

- These should be real pages, not lock placeholders.
- Every new page needs its own specific <title> (under 60 characters, not just the page name) and <meta name="description"> (under 160 characters), plus og:title/og:description. Do not write canonical tags, robots.txt, or sitemap.xml — the platform generates those.
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
8. Copy the homepage favicon <link rel="icon"> (and apple-touch-icon if present) into every new page's <head>. Do not invent a different favicon.
9. Update the homepage navigation to link to the generated pages.
10. Update site.json with:
   - pages: include "/" plus each generated page with path, title, and gated false
   - discoveredPages: include any meaningful internal pages you found but did not generate
11. Commit the finished multi-page site directly on main and push to origin main (no new branch, no pull request).

${GIT_RULES}

${buildFormRules(slug)}

## Quality bar

- These should be real refreshed pages, not lock placeholders.
- Every new page needs its own specific <title> (under 60 characters, not just the page name) and <meta name="description"> (under 160 characters), plus og:title/og:description. Do not write canonical tags, robots.txt, or sitemap.xml — the platform generates those.
- Convert old copy into polished, concise marketing sections.
- Preserve factual details, services, contact details, proof points, and useful imagery.
- Avoid broken links and broken asset paths.
- Every generated page must load the shared CSS and any local assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css, /preview/${slug}/script.js, /preview/${slug}/assets/file.png, and /preview/${slug}/page-path for navigation links. Hotlinked source images are absolute https URLs and need no path handling.
- Do not use href="styles.css" or src="assets/..." on additional pages, because nested preview paths will resolve those relative to the page path and break styling.
- Never use localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags.
- Avoid rebuilding the homepage from scratch unless a small nav/footer update is needed.

Stop when the generated pages and updated site.json are complete.`;
}

export function buildCustomPagePrompt({
  sourceUrl,
  slug,
  generationMode,
  creationPrompt,
  title,
  brief,
}: CustomPagePromptParams): string {
  const sourceContext =
    generationMode === "fresh" || !sourceUrl
      ? `ORIGINAL USER BRIEF: ${creationPrompt ?? "Not available. Infer cautiously from the existing site files."}`
      : `SOURCE: ${sourceUrl}`;

  const imageRules =
    generationMode === "fresh" || !sourceUrl
      ? "Use existing uploaded/local assets from assets/ where they fit. Do not crawl the web, download third-party images, or invent image paths."
      : "You may use real images from the source site by hotlinking their absolute https URLs, exactly like the homepage does. Do not download images and never invent image paths.";

  return `Create one brand-new custom page for an existing Refresh Kiwi static website.

${sourceContext}
SITE: sites/${slug}/
REQUESTED PAGE: ${title}

## User brief for this page

${brief}

## Goal

The homepage already exists. Your job is to add exactly one polished page that matches the current site and satisfies the user's page brief.

## Scope

1. Work only inside sites/${slug}/.
2. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
3. Build exactly ONE page for "${title}". Choose a sensible root-relative path derived from the title, such as /careers for "Careers". If a page already exists at that path, update that page instead of creating a duplicate.
4. Ground copy in the user's page brief, the original/source context, and the existing site. Do not invent addresses, phone numbers, awards, testimonials, prices, policies, or compliance claims.
5. ${imageRules}
6. Match the homepage design system: same brand colours and palette, spacing, typography, visual style, header/nav/footer, and responsive behavior.
7. Copy the homepage favicon <link rel="icon"> (and apple-touch-icon if present) into the new page's <head>.
8. Update the homepage navigation or footer to link to the new page in a natural place.
9. Update site.json with:
   - pages: include "/" plus all existing pages and the new page with path, title, and gated false
   - discoveredPages: preserve existing discoveredPages when present
10. Commit the finished custom page directly on main and push to origin main (no new branch, no pull request).

${GIT_RULES}

${buildFormRules(slug)}

## Quality bar

- The new page should feel like part of the same website, not a pasted template.
- Give the page its own specific <title> (under 60 characters) and <meta name="description"> (under 160 characters), plus og:title/og:description. Do not write canonical tags, robots.txt, or sitemap.xml — the platform generates those.
- Make the page useful and specific to the user's brief, but stay conservative when facts are missing.
- Every generated page must load shared CSS and assets correctly from preview subpaths. Prefer root-relative preview paths like /preview/${slug}/styles.css, /preview/${slug}/script.js, /preview/${slug}/assets/file.png, and /preview/${slug}/page-path for navigation links.
- Do not use href="styles.css" or src="assets/..." on nested pages, because those relative paths can break in previews.
- Never use localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags.
- Avoid rebuilding the homepage from scratch unless a small nav/footer update is needed.

Stop when the custom page and updated site.json are complete.`;
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
7. Copy the homepage favicon <link rel="icon"> (and apple-touch-icon if present) into every legal page's <head>.
8. Update the homepage footer/navigation to link to the legal pages in a subtle footer/legal-links area.
9. Update site.json with:
   - pages: include "/" plus all existing pages and each legal page with path, title, and gated false
   - discoveredPages: include any meaningful pages discovered but not generated
10. Commit the finished legal pages directly on main and push to origin main (no new branch, no pull request).

${GIT_RULES}

${buildFormRules(slug)}

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

1. Your workspace may be behind the repository, or checked out on a leftover branch — run git checkout main and pull the latest before reading or changing anything.
2. Work only inside sites/${slug}/.
3. Read the existing files first, especially index.html, styles.css, script.js if present, and site.json.
4. Apply the requested change while preserving the current design language, brand colours, layout quality, responsive behavior, asset paths, and favicon <link> tags in <head>.
5. Do not rebuild the whole site from scratch unless the request explicitly requires a major redesign.
6. Do not create new website pages, routes, or HTML files. Edits may only change existing pages (copy, layout, colours, sections, images, nav labels, etc.). Adding a new page is handled by a separate product flow — if the user asks for a new page, do not invent one; leave files unchanged for that part of the request.
7. Images may be referenced two ways — preserve whichever is in use:
   - Hotlinked absolute https URLs pointing at the original business website. Keep them as-is.
   - Local files under assets/ (referenced as ./assets/file.ext or /preview/${slug}/assets/file.ext). Keep those paths intact.
   If the edit asks for new imagery, use existing local assets first, then only use URLs explicitly provided by the user or present in the original source context. Never invent image paths.
8. Videos may appear as YouTube/Vimeo iframes or hotlinked <video> tags pointing at the original site — preserve them as-is. If the edit asks for a new video, only use an embed or URL that exists on the source site or that the user provided; never download video files or invent video URLs.
9. Update site.json only if the edit changes metadata or titles on existing pages. Never add new entries to site.json pages.
10. Commit the finished edit directly on main and push to origin main (no new branch, no pull request), then verify only the files you changed — a full-site review is not needed for a small edit.

${GIT_RULES}

${buildFormRules(slug)}

## Quality bar

- Make the smallest high-quality change that satisfies the request.
- Avoid breaking existing sections, forms, navigation, or mobile layout.
- Never introduce localhost, 127.0.0.1, or port-based preview origins anywhere in links, scripts, forms, canonical tags, Open Graph URLs, or base tags. Use root-relative paths such as /preview/${slug}/ and /preview/${slug}/page-path.
- If the request is ambiguous, make the most reasonable interpretation and keep the result polished.`;
}
