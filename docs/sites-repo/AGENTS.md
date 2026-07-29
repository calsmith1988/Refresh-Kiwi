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
- Commit directly on `main` and push to `origin main`. Never create a new branch and never open a pull request — the platform only reads files from `main`, so work left on any other branch or in a PR is invisible and the build counts as failed.

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
  1. The same burger button stays in place above the open panel (see the stacking-context rule below for when this is even possible), swapping its icon to an X via a class both states actually define; or
  2. The open panel contains its own clearly visible X close button inside it.
  After wiring it, trace the open-then-close path in the code: clicking the toggle (or panel X) with the menu open must remove the open class, restore the burger icon, and reset `aria-expanded`.
- **A big `z-index` on the burger button cannot lift it above a panel that lives outside the header.** A sticky/fixed header with its own `z-index` is a stacking context: z-index values on its children only compete against each other inside it, and against the rest of the page the whole header is capped at the header's own z-index. So if the panel is a direct child of `<body>` with a z-index higher than the *header's*, it covers the burger no matter what z-index the button has — and the menu becomes impossible to close. When the panel is a body-level sibling of the header, use one of exactly two patterns:
  1. Give the panel a z-index *lower* than the header's, and offset/pad the panel's top so its content clears the header — the whole header (with the toggle showing its X state) stays visible and tappable above the open panel; or
  2. Give the panel a z-index above the header, but put an X close button *inside the panel*, wired to the same close logic.
  Verify by comparing the header's z-index against the panel's — not the button's against the panel's.
- If the icon swap uses two separate elements (burger SVG and X SVG), verify the CSS shows exactly one of them in each state — a missing rule here is what makes the X "disappear".
- The menu must work without any hover-only interaction (touch devices) and must not be hidden behind the header or announcement bar when open.
- **Never nest a `position: fixed` menu panel inside an element that has `backdrop-filter`, `filter`, `transform`, `perspective`, or `will-change: transform`.** Any of those on an ancestor (typically a blurred sticky header) makes it the containing block for fixed descendants, so the panel positions against the ~70px header instead of the viewport and collapses to a zero-height sliver. Use one of exactly two patterns:
  1. The menu panel is a direct child of `<body>`, outside the header entirely; or
  2. The panel stays inside the header, but no ancestor of it (including the header) uses any of the properties above — if the header needs a glass/blur effect, drop it or use a semi-opaque solid background instead.
  After writing the CSS, grep your own stylesheet: if `backdrop-filter`, `filter`, or `transform` appears on the header or any ancestor of the menu panel while the panel is `position: fixed`, you have this bug.
- Check the header at a ~375px viewport: logo, burger, and any CTA must fit on one line without wrapping or overflow. Then check the open-menu state at the same width: the close control must be visible without scrolling, and the open panel must reach the bottom of the viewport (a panel that shows only a thin strip below the header is the containing-block bug above).
- Generic link rules on the menu panel (e.g. `.mobile-nav a { display: block; padding: ...; border-bottom: ... }`) must not restyle CTA buttons inside the panel. Scope them to the nav list (`.mobile-nav ul a` or `.mobile-nav nav a`) or exclude buttons (`a:not(.btn)`) so `.btn` elements keep their padding, alignment, and borders.

## Custom grid column classes

If you write utility column classes (`.col-6`, `.col-md-7`, etc.) on a `display: grid` container:

- **Every column class used in the markup must have an explicit full-width base rule outside any media query** (e.g. `grid-column: span 12` or `1 / -1`), with breakpoint overrides layered on top. A class defined only inside a `min-width` media query leaves the element auto-placed into a single 1/12-width track on phones — its text collapses to one word per line and visually overlaps the neighbouring column.
- After writing the CSS, check each column class that appears in your HTML against the stylesheet: if it has no rule outside a media query, it has this bug.

## Final self-check before finishing

Before you finish, re-open every HTML file you wrote or changed and verify:

1. The top-of-page stack (announcement bar, header, mobile menu) follows the rules above at both desktop and mobile widths.
2. Every element hook referenced by JavaScript (IDs, classes, `data-` attributes) exists in the shipped markup, and every script referenced by HTML exists in the site folder.
3. Stylesheet and script references resolve from the page's own path (root-relative preview paths on nested pages, never bare relative paths like `href="styles.css"` on subpages).
4. No `localhost`, `127.0.0.1`, or port-based origins anywhere.
5. Every grid column class used in the markup has a full-width base rule outside media queries (see the grid column rules above) — this is what stops sections collapsing to one-word-per-line overlapping columns on phones.
6. Below-the-fold images have `loading="lazy"` (leave the hero and other above-the-fold images eager).
7. The page starts with a skip link (`<a class="skip-link" href="#main">Skip to content</a>` or equivalent) that is visually hidden until focused, and the target id exists.
8. Any `og:image` is a full absolute `https://` URL — never a root-relative path.

This check should take under a minute. Do not skip it, and do not add build tooling to perform it — read the files directly.
