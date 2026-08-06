import { createHash } from "node:crypto";

/**
 * Named design directions injected into homepage generation prompts so
 * different builds get visibly different (but equally polished) layouts,
 * typography, and motion. Recipes are deliberately palette-agnostic: brand
 * colour rules in the prompt always win, so refresh builds keep the
 * business's identity.
 */
export interface DesignDirection {
  name: string;
  prompt: string;
}

export const DESIGN_DIRECTIONS: readonly DesignDirection[] = [
  {
    name: "split-stage",
    prompt: [
      "- Layout: split hero — headline, subheadline, and CTAs on one side; a large image or visual composition on the other. Alternate section alignment (left/right) down the page.",
      "- Typography: expressive high-contrast serif for display headlines, clean humanist sans for body. Generous headline sizes.",
      "- Motion: staggered fade-up on scroll for section content; gentle hover lift with soft shadow on cards and buttons.",
      "- Treatments: soft layered gradients behind key sections, large rounded corners, roomy vertical rhythm.",
    ].join("\n"),
  },
  {
    name: "editorial-centered",
    prompt: [
      "- Layout: centered editorial column — a confident centered hero, then narrow readable sections that occasionally break out to full-width imagery or stat bands.",
      "- Typography: refined serif throughout with italic accents for emphasis; smaller, well-tracked uppercase labels above headings.",
      "- Motion: calm — subtle fade-in only, no parallax. Let typography carry the design.",
      "- Treatments: hairline rules between sections, generous whitespace, muted background tints for alternating sections.",
    ].join("\n"),
  },
  {
    name: "bold-grid",
    prompt: [
      "- Layout: modular bento-style grid — services, proof points, and stats arranged as varied-size tiles in a tight grid; hero is a full-width statement above it.",
      "- Typography: bold geometric sans everywhere; oversized numerals for stats.",
      "- Motion: tiles scale slightly and sharpen shadow on hover; counters animate once on scroll into view.",
      "- Treatments: strong card borders or elevated tiles on a subtly contrasting page background; consistent tight corner radius.",
    ].join("\n"),
  },
  {
    name: "full-bleed-cinema",
    prompt: [
      "- Layout: full-bleed image hero with a dark scrim and large overlaid headline; subsequent sections alternate full-width imagery bands with contained text sections.",
      "- Typography: condensed or display sans for headlines at very large sizes; quiet body type.",
      "- Motion: slow, subtle background zoom on the hero image; content fades up as it enters the viewport.",
      "- Treatments: high-contrast overlays, cinematic spacing, thin accent lines to anchor CTAs.",
    ].join("\n"),
  },
  {
    name: "asymmetric-drift",
    prompt: [
      "- Layout: asymmetric composition — offset columns, overlapping image and text blocks, and deliberate negative space; avoid perfectly mirrored sections.",
      "- Typography: pair a characterful display face for headlines with a neutral grotesque for body.",
      "- Motion: elements drift in from alternating sides on scroll; slight parallax on decorative shapes only.",
      "- Treatments: floating accent shapes or blurred colour blobs behind content, offset drop shadows, mixed corner radii.",
    ].join("\n"),
  },
  {
    name: "crisp-swiss",
    prompt: [
      "- Layout: strict 12-column Swiss grid — clean aligned sections, clear column rhythm, flush-left text, structured service/pricing tables.",
      "- Typography: a single neutral grotesque sans at a disciplined type scale; weight and size carry all hierarchy.",
      "- Motion: nearly none — instant hover state changes only. Precision is the aesthetic.",
      "- Treatments: flat surfaces, 1px rules, square or minimal corner radius, functional whitespace, no gradients.",
    ].join("\n"),
  },
  {
    name: "soft-organic",
    prompt: [
      "- Layout: flowing sections separated by curved SVG dividers or organic wave shapes; hero pairs friendly copy with a rounded image mask.",
      "- Typography: rounded or soft-terminal sans for headings, warm readable sans for body.",
      "- Motion: gentle floating animation on decorative shapes; smooth eased fade-and-rise for section entrances.",
      "- Treatments: pill-shaped buttons, blob or arch image masks, soft diffuse shadows, tonal background washes between sections.",
    ].join("\n"),
  },
  {
    name: "brutalist-edge",
    prompt: [
      "- Layout: confident blocky sections with visible structure — thick borders, stacked full-width bands, and an unapologetically large hero statement.",
      "- Typography: heavy grotesque or mono-influenced display for headlines, sometimes uppercase; plain readable body.",
      "- Motion: snappy — quick hover state flips (background/foreground swap) and a marquee strip for services or trust logos if content suits.",
      "- Treatments: solid 2-3px borders, hard offset shadows, flat colour blocks, square corners. Keep it disciplined so it reads premium, not chaotic.",
    ].join("\n"),
  },
  {
    name: "glass-layers",
    prompt: [
      "- Layout: layered depth — a soft gradient backdrop with frosted-glass content panels; hero card floats over the background, sections stack as translucent surfaces.",
      "- Typography: modern geometric sans with a wide-tracked small-caps label style for section eyebrows.",
      "- Motion: cards tilt or lift subtly on hover; background gradient shifts very slowly; content fades up on scroll.",
      "- Treatments: backdrop-filter blur panels (with solid-colour fallback), thin translucent borders, glowing accent highlights used sparingly.",
    ].join("\n"),
  },
  {
    name: "classic-craft",
    prompt: [
      "- Layout: traditional and trustworthy — contained hero with image beside copy, then clearly-titled sections in a steady rhythm: services, about, testimonials, contact CTA.",
      "- Typography: sturdy slab or transitional serif for headings, dependable sans body; comfortable reading sizes.",
      "- Motion: minimal and reassuring — soft fades only, classic underline-grow on nav links.",
      "- Treatments: subtle paper-like background texture or tint, framed images with thin borders, badge-style trust markers, moderate corner radius.",
    ].join("\n"),
  },
];

/**
 * Hero recipes are an independent axis from the overall direction: the hero
 * is most of a site's perceived uniqueness, so crossing these hero patterns
 * with the directions above multiplies the distinct looks without extra
 * build time. Keep this pool large (14+): with too few patterns, a user
 * making several builds in a row is very likely to see the same hero twice.
 * For the hero section itself the recipe wins over the direction; the
 * direction governs the rest of the page.
 */
export interface HeroRecipe {
  name: string;
  prompt: string;
}

export const HERO_RECIPES: readonly HeroRecipe[] = [
  {
    name: "split-offset",
    prompt: [
      "- Two-column hero, but deliberately off-centre (roughly 60/40): copy on one side, imagery on the other, with the image bleeding to the viewport edge or overlapping the section below.",
      "- Break perfect symmetry — let one element (badge, image corner, decorative shape) cross the column boundary.",
    ].join("\n"),
  },
  {
    name: "full-bleed-immersive",
    prompt: [
      "- Full-viewport-width hero image with a tasteful scrim; headline overlaid at a very large size, CTAs immediately below it.",
      "- Anchor a slim trust strip (rating, years in business, service area) to the bottom edge of the hero.",
      "- Only choose imagery strong enough to carry this; if nothing qualifies, use a full-bleed colour/gradient composition instead.",
    ].join("\n"),
  },
  {
    name: "centered-statement",
    prompt: [
      "- No hero image at all: a massive centered headline (clamp up to ~5-6rem on desktop), one short supporting line, CTAs beneath.",
      "- Let typography and a subtle background motif (texture, faint pattern, soft gradient) carry the impact; the first photography appears in the following section.",
    ].join("\n"),
  },
  {
    name: "floating-card",
    prompt: [
      "- Full-width hero background (photo or strong colour wash) with the hero copy inside a floating card or panel offset to one side.",
      "- Let the card overlap the boundary into the next section so the layers read as intentional depth.",
    ].join("\n"),
  },
  {
    name: "mosaic",
    prompt: [
      "- Headline and CTAs beside a collage of 2-4 real images arranged as varied-size tiles with mixed masks or radii — not a uniform grid.",
      "- Only use images that actually exist for this business; with fewer than 2 good images, fall back to one strong image plus a decorative tile.",
    ].join("\n"),
  },
  {
    name: "editorial-cover",
    prompt: [
      "- Magazine-cover feel: small eyebrow line, then a huge headline set across the full content width, then a byline-style meta row (location · phone · hours or similar real facts).",
      "- One wide cinematic image sits directly below this cover block, like a feature-article opener.",
    ].join("\n"),
  },
  {
    name: "diagonal-energy",
    prompt: [
      "- Compose the hero on a diagonal: an angled or curved divider between the hero and the next section, with imagery or shapes cut along that line.",
      "- Give the content directional momentum (copy anchored one side, visual weight flowing toward the divider). Keep the angle consistent as a motif further down the page.",
    ].join("\n"),
  },
  {
    name: "proof-ledge",
    prompt: [
      "- Hero copy and CTA up top, with a 'ledge' tucked into the hero's bottom edge: a row of 2-4 compact proof tiles (review score, key services, guarantee, service area) that overlaps into the next section.",
      "- The ledge should feel like part of the hero composition, not a separate stats band.",
    ].join("\n"),
  },
  {
    name: "framed-portal",
    prompt: [
      "- One strong image inside a dramatic mask — an arch, oval, circle, or heavily rounded portal shape — with the copy composed beside it; echo the mask shape once as a thin decorative outline or ring elsewhere in the hero.",
      "- Exactly one image, one mask. If no photo is strong enough for the portal, fill it with a bold brand-colour composition or an oversized icon/monogram instead.",
    ].join("\n"),
  },
  {
    name: "split-horizon",
    prompt: [
      "- Split the hero horizontally: a solid band (brand colour or deep neutral) carrying the headline and CTAs on top, with a full-width image band below — and one element (the headline's last line, a CTA cluster, or a small card) deliberately straddling the seam between the two.",
      "- The seam is the design: keep it a crisp straight line, and let the straddling element be the only thing that crosses it.",
    ].join("\n"),
  },
  {
    name: "vertical-rail",
    prompt: [
      "- Pin a tall, narrow image rail to one viewport edge (roughly 25-35% of the width, full hero height); the headline, supporting line, and CTAs occupy the remaining width with confident whitespace.",
      "- Add one quiet detail along the rail's inner edge: a rotated micro-label, a thin brand-colour rule, or a small caption. On mobile the rail becomes a wide banner above or below the copy — never a squeezed sliver.",
    ].join("\n"),
  },
  {
    name: "type-interlock",
    prompt: [
      "- Typography-led hero where an oversized display headline and a single image physically interlock: the image tucks into an indent in the text block, or slightly overlaps/underlaps one headline line.",
      "- Keep every word fully legible — overlap decorative edges of the image, never the text itself. With no usable photo, interlock the headline with a bold brand-colour shape instead.",
    ].join("\n"),
  },
  {
    name: "ticker-tape",
    prompt: [
      "- A big, confident statement headline with CTAs, and a horizontally scrolling marquee strip along the hero's bottom edge — repeating real items only (services, areas served, credentials) separated by a small motif or dot.",
      "- The marquee must pause under prefers-reduced-motion (show it as a static strip) and loop seamlessly with duplicated content in plain CSS/JS — no libraries.",
    ].join("\n"),
  },
  {
    name: "poster-frame",
    prompt: [
      "- Compose the entire hero inside a thin border frame inset from the viewport edges (like a poster margin) — headline, supporting line, CTAs, and imagery all live within the frame, art-directed like a print cover.",
      "- Let exactly one element (an image corner, a badge, or one word of the headline) break out of the frame to keep it lively; the frame colour comes from the brand palette.",
    ].join("\n"),
  },
];

/**
 * Curated Google Fonts pairings, assigned per build so the model stops
 * defaulting to the same two or three typefaces on every site. The exact
 * stylesheet link ships in the prompt so the agent never substitutes.
 */
export interface FontPairing {
  name: string;
  display: string;
  body: string;
  hint: string;
  stylesheetHref: string;
}

function googleFontsHref(families: string[]): string {
  return `https://fonts.googleapis.com/css2?${families
    .map((family) => `family=${family}`)
    .join("&")}&display=swap`;
}

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    name: "Libre Caslon Text + Manrope",
    display: "Libre Caslon Text",
    body: "Manrope",
    hint: "Literary old-style serif headlines over a modern quiet sans — warm and established.",
    stylesheetHref: googleFontsHref([
      "Libre+Caslon+Text:wght@400;700",
      "Manrope:wght@400;500;700",
    ]),
  },
  {
    name: "Space Grotesk + Work Sans",
    display: "Space Grotesk",
    body: "Work Sans",
    hint: "Techy, characterful grotesque display with a plain-spoken body — contemporary without being cold.",
    stylesheetHref: googleFontsHref([
      "Space+Grotesk:wght@400;500;700",
      "Work+Sans:wght@400;500;600",
    ]),
  },
  {
    name: "DM Serif Display + DM Sans",
    display: "DM Serif Display",
    body: "DM Sans",
    hint: "High-contrast didone-style headlines with a geometric body from the same superfamily — polished and cohesive.",
    stylesheetHref: googleFontsHref([
      "DM+Serif+Display",
      "DM+Sans:wght@400;500;700",
    ]),
  },
  {
    name: "Archivo (solo)",
    display: "Archivo",
    body: "Archivo",
    hint: "One family, extreme weight contrast: black 900 headlines against regular body. Disciplined and punchy.",
    stylesheetHref: googleFontsHref(["Archivo:wght@400;500;700;900"]),
  },
  {
    name: "Bricolage Grotesque + Figtree",
    display: "Bricolage Grotesque",
    body: "Figtree",
    hint: "Quirky, confident display grotesque with a friendly rounded body — personality-forward.",
    stylesheetHref: googleFontsHref([
      "Bricolage+Grotesque:wght@400;600;800",
      "Figtree:wght@400;500;600",
    ]),
  },
  {
    name: "Cormorant Garamond + Mulish",
    display: "Cormorant Garamond",
    body: "Mulish",
    hint: "Elegant, light-stroke serif headlines over an unobtrusive sans — refined, spa/boutique energy.",
    stylesheetHref: googleFontsHref([
      "Cormorant+Garamond:wght@500;600;700",
      "Mulish:wght@400;600",
    ]),
  },
  {
    name: "Syne + Albert Sans",
    display: "Syne",
    body: "Albert Sans",
    hint: "Wide, arty display face with a clean geometric body — distinctive and design-studio flavoured.",
    stylesheetHref: googleFontsHref([
      "Syne:wght@500;700;800",
      "Albert+Sans:wght@400;500",
    ]),
  },
  {
    name: "Zilla Slab + Karla",
    display: "Zilla Slab",
    body: "Karla",
    hint: "Sturdy slab-serif headings with a slightly quirky grotesque body — dependable, workshop-crafted feel.",
    stylesheetHref: googleFontsHref([
      "Zilla+Slab:wght@500;600;700",
      "Karla:wght@400;500;700",
    ]),
  },
  {
    name: "Outfit (solo)",
    display: "Outfit",
    body: "Outfit",
    hint: "Single geometric sans across the whole site; hierarchy from size and weight alone. Crisp and modern.",
    stylesheetHref: googleFontsHref(["Outfit:wght@400;500;700;900"]),
  },
  {
    name: "Instrument Serif + Instrument Sans",
    display: "Instrument Serif",
    body: "Instrument Sans",
    hint: "Sharp contemporary serif (use its italic for accents) with a matching neutral sans — current and editorial.",
    stylesheetHref: googleFontsHref([
      "Instrument+Serif:ital@0;1",
      "Instrument+Sans:wght@400;500;600",
    ]),
  },
  {
    name: "Unbounded + Nunito Sans",
    display: "Unbounded",
    body: "Nunito Sans",
    hint: "Rounded expanded display face for big statements, soft readable body — bold but approachable. Use the display sparingly at large sizes.",
    stylesheetHref: googleFontsHref([
      "Unbounded:wght@400;600;800",
      "Nunito+Sans:wght@400;600",
    ]),
  },
  {
    name: "Prata + Lato",
    display: "Prata",
    body: "Lato",
    hint: "Classic high-contrast serif headlines over a dependable humanist sans — timeless and trustworthy.",
    stylesheetHref: googleFontsHref(["Prata", "Lato:wght@400;700"]),
  },
  {
    name: "Newsreader + Rubik",
    display: "Newsreader",
    body: "Rubik",
    hint: "News-serif headlines with a slightly rounded sans body — informative with warmth.",
    stylesheetHref: googleFontsHref([
      "Newsreader:wght@400;600",
      "Rubik:wght@400;500",
    ]),
  },
  {
    name: "Sora + Inter Tight",
    display: "Sora",
    body: "Inter Tight",
    hint: "Precise technical display sans with a compact neutral body — engineered, premium-product feel.",
    stylesheetHref: googleFontsHref([
      "Sora:wght@400;600;700",
      "Inter+Tight:wght@400;500",
    ]),
  },
];

/**
 * How the brand palette is deployed. Refresh builds keep the business's
 * colours either way — these recipes vary the application so not every site
 * is a white page with brand-coloured buttons.
 */
export interface ColorRecipe {
  name: string;
  prompt: string;
}

export const COLOR_RECIPES: readonly ColorRecipe[] = [
  {
    name: "light-airy",
    prompt: [
      "- Light neutral canvas (off-white or near-white, not pure #fff everywhere); brand colour carries CTAs, links, icons, and one accent-tinted section.",
      "- Keep it fresh with generous whitespace; the brand colour should feel like punctuation, not wallpaper.",
    ].join("\n"),
  },
  {
    name: "tonal-wash",
    prompt: [
      "- Derive the whole background system from the brand hue: very light tints for page sections, slightly deeper tints for cards and bands, reserving white for elevated surfaces.",
      "- The page should feel dyed in the brand colour without ever hurting text contrast.",
    ].join("\n"),
  },
  {
    name: "dark-canvas",
    prompt: [
      "- Dark canvas: near-black or a very dark shade mixed from the brand colour; light high-contrast text; the brand colour becomes the glow — CTAs, icon accents, highlighted words, thin rules.",
      "- Keep photography vivid against the dark ground and verify WCAG AA contrast everywhere. If the brand palette is genuinely too pastel or pale to read on dark, or the business logo is dark artwork that would be illegible in a dark header, fall back to light-airy instead of forcing it.",
    ].join("\n"),
  },
  {
    name: "brand-blocked",
    prompt: [
      "- Confident colour blocking: alternate neutral sections with full-bleed bands in the solid brand colour, with white or near-white text and inverted buttons on those bands.",
      "- Use the brand colour big and unapologetically at least twice down the page (hero or CTA band plus one more section).",
    ].join("\n"),
  },
];

export interface DesignRecipe {
  direction: DesignDirection;
  hero: HeroRecipe;
  fonts: FontPairing;
  colors: ColorRecipe;
}

/**
 * Deterministic pick by slug hash: retries of the same job get the same
 * direction, and a given preview's style is reproducible when debugging.
 */
export function pickDesignDirection(slug: string): DesignDirection {
  const digest = createHash("sha256").update(slug).digest();
  const index = digest.readUInt32BE(0) % DESIGN_DIRECTIONS.length;

  return DESIGN_DIRECTIONS[index];
}

/**
 * Independent deterministic picks per axis (separate bytes of the same slug
 * hash), so two sites sharing a direction still differ in hero, type, and
 * colour treatment. Byte 0 keeps driving the direction, so slugs built
 * before the extra axes existed keep the direction they already had.
 */
export function pickDesignRecipe(slug: string): DesignRecipe {
  const digest = createHash("sha256").update(slug).digest();

  return {
    direction: DESIGN_DIRECTIONS[digest.readUInt32BE(0) % DESIGN_DIRECTIONS.length],
    hero: HERO_RECIPES[digest.readUInt32BE(4) % HERO_RECIPES.length],
    fonts: FONT_PAIRINGS[digest.readUInt32BE(8) % FONT_PAIRINGS.length],
    colors: COLOR_RECIPES[digest.readUInt32BE(12) % COLOR_RECIPES.length],
  };
}

export function buildDesignRecipeSection(slug: string): string {
  const recipe = pickDesignRecipe(slug);

  return [
    `## Design recipe — direction "${recipe.direction.name}", hero "${recipe.hero.name}", type "${recipe.fonts.name}", colour "${recipe.colors.name}"`,
    "",
    "This recipe is assigned to this build so different businesses get visibly different sites. Follow it. It never overrides the brand and colour rules elsewhere in this prompt, factual content, or accessibility/contrast requirements. If a specific point clashes badly with the business's content or imagery, adapt that point tastefully rather than abandoning the recipe.",
    "",
    `### Overall direction — "${recipe.direction.name}"`,
    "",
    recipe.direction.prompt,
    "",
    `### Hero recipe — "${recipe.hero.name}"`,
    "",
    "For the hero section itself this recipe wins over the direction; the direction governs the rest of the page.",
    "",
    recipe.hero.prompt,
    "",
    `### Typography — ${recipe.fonts.name}`,
    "",
    `- Load exactly this pairing (no substitutes) by putting this in <head>:`,
    '  <link rel="preconnect" href="https://fonts.googleapis.com">',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `  <link href="${recipe.fonts.stylesheetHref}" rel="stylesheet">`,
    `- Display/headings: "${recipe.fonts.display}". Body/UI: "${recipe.fonts.body}". ${recipe.fonts.hint}`,
    "- The direction's typography notes describe deployment (sizes, weights, casing, tracking) — the font families always come from this pairing. Provide sensible serif/sans-serif fallback stacks.",
    "",
    `### Colour application — "${recipe.colors.name}"`,
    "",
    "Apply the brand palette (per the colour rules elsewhere in this prompt) using this treatment:",
    "",
    recipe.colors.prompt,
    "",
    "### Signature moment",
    "",
    "- Include exactly one bespoke, memorable detail unique to this business: a custom SVG section divider shaped for the trade, one oversized outlined word, an unusual image mask, a repeating background motif drawn from what they do — one detail, done well, not several.",
  ].join("\n");
}
