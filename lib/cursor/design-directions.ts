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
 * Deterministic pick by slug hash: retries of the same job get the same
 * direction, and a given preview's style is reproducible when debugging.
 */
export function pickDesignDirection(slug: string): DesignDirection {
  const digest = createHash("sha256").update(slug).digest();
  const index = digest.readUInt32BE(0) % DESIGN_DIRECTIONS.length;

  return DESIGN_DIRECTIONS[index];
}

export function buildDesignDirectionSection(direction: DesignDirection): string {
  return [
    `## Design direction — "${direction.name}"`,
    "",
    "Use this direction to shape layout, typography, motion, and decorative treatments. It never overrides the brand and colour rules elsewhere in this prompt, factual content, or accessibility/contrast requirements — express the direction through the brand's own palette.",
    "",
    direction.prompt,
    "",
    "If a specific point clashes badly with the business's content or imagery, adapt that point tastefully rather than abandoning the direction.",
  ].join("\n");
}
