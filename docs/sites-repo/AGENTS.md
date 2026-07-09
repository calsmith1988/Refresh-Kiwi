<!--
This file is NOT used in this repository.

It is the master copy of the AGENTS.md for the ROOT of the external
generated-sites repo (CURSOR_SITES_REPO_URL, e.g. refresh-kiwi-sites),
replacing the existing AGENTS.md there. It merges the previous guidelines
with UI QA rules, and fixes two rules that contradicted the prompts the app
sends (image downloading and gated pages).
-->

# Refresh Kiwi — Agent Guidelines

You are rebuilding small-business websites for non-technical owners. The task prompt is the source of truth for scope and content; if it conflicts with this file, follow the prompt.

## Creative freedom

- Treat `template/` as a loose scaffold only. You may delete, replace, or restructure it entirely.
- Avoid generic "AI website" patterns. Each site should feel bespoke to the business.
- Let brand personality drive typography, color, layout, imagery, and motion.
- The prompt may include a named design direction — follow it. Otherwise, vary approaches between projects and do not reuse the same hero/layout formula every time.

## Technical constraints

- Output must be **static** plain HTML/CSS/JS.
- Write all customer files under `sites/{slug}/`.
- Always create or update `sites/{slug}/site.json`.
- Images and videos: follow the prompt's rules exactly. By default that means hotlinking the source site's images/videos by absolute https URL — do **not** download media files unless the prompt explicitly says to. The platform localizes images afterwards.
- Commit your work to the repository when a phase is complete (some phases are artifact-first — the prompt will say).

## site.json shape

```json
{
  "brandName": "Business Name",
  "slug": "business-name",
  "sourceUrl": "https://example.com",
  "pages": [
    { "path": "/", "title": "Home", "gated": false }
  ],
  "discoveredPages": [
    { "path": "/about", "title": "About" }
  ]
}
```

- `pages` — built routes, each with `path`, `title`, and `gated: false`.
- `discoveredPages` — same-domain URLs found during crawl (max 15), listed before they are built.

## Announcement bar / ribbon above the header

If the design includes a thin announcement or promo bar above the main header:

- Decide the scroll behaviour explicitly and implement one of exactly two patterns:
  1. The bar scrolls away and only the header is sticky/fixed at `top: 0`.
  2. The bar and header live inside one shared fixed/sticky wrapper that moves as a unit.
- Never fix the header to a hardcoded offset (e.g. `top: 36px`) below a static bar — it overlaps content or leaves a gap once the page scrolls.
- If anything is fixed, give the page content top padding/margin equal to the total height of the fixed stack, and re-check that value at mobile widths where the bar may wrap to two lines.
- Set explicit `z-index` values so the bar, header, and any open mobile menu layer correctly (menu above header, header above page content).

## Header and burger menu

- Wire the burger toggle with plain vanilla JavaScript in the site's own files (inline or `script.js`). No frameworks, no external libraries, no CDN scripts.
- If the toggle lives in `script.js`, confirm every page that shows the header actually loads that script, and that the selectors in the script match the markup you shipped.
- The button must toggle `aria-expanded`, the menu must close when a nav link is clicked, and the page must never get stuck with the menu open or the body scroll-locked.
- **The close control must stay visible and tappable while the menu is open.** This is the most common shipped bug. Use one of exactly two patterns:
  1. The same burger button stays in place above the open panel (give it a higher `z-index` than the panel, and never let the panel or a full-screen overlay cover it), swapping its icon to an X via a class both states actually define; or
  2. The open panel contains its own clearly visible X close button inside it.
  After wiring it, trace the open-then-close path in the code: clicking the toggle (or panel X) with the menu open must remove the open class, restore the burger icon, and reset `aria-expanded`.
- If the icon swap uses two separate elements (burger SVG and X SVG), verify the CSS shows exactly one of them in each state — a missing rule here is what makes the X "disappear".
- The menu must work without any hover-only interaction (touch devices) and must not be hidden behind the header or announcement bar when open.
- Check the header at a ~375px viewport: logo, burger, and any CTA must fit on one line without wrapping or overflow. Then check the open-menu state at the same width: the close control must be visible without scrolling.

## Final self-check before finishing

Before you finish, re-open every HTML file you wrote or changed and verify:

1. The top-of-page stack (announcement bar, header, mobile menu) follows the rules above at both desktop and mobile widths.
2. Every element hook referenced by JavaScript (IDs, classes, `data-` attributes) exists in the shipped markup, and every script referenced by HTML exists in the site folder.
3. Stylesheet and script references resolve from the page's own path (root-relative preview paths on nested pages, never bare relative paths like `href="styles.css"` on subpages).
4. No `localhost`, `127.0.0.1`, or port-based origins anywhere.

This check should take under a minute. Do not skip it, and do not add build tooling to perform it — read the files directly.
