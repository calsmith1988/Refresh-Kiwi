import { rewriteRootPathsForPreview } from "../lib/preview/rewrite";

const slug = "helencochraneart";

const cases: Array<{ name: string; input: string; contentType: string; expect: string }> = [
  {
    name: "stylesheet root path",
    input: '<link rel="stylesheet" href="/styles.css">',
    contentType: "text/html; charset=utf-8",
    expect: '<link rel="stylesheet" href="/preview/helencochraneart/styles.css">',
  },
  {
    name: "script root path",
    input: '<script src="/script.js"></script>',
    contentType: "text/html; charset=utf-8",
    expect: '<script src="/preview/helencochraneart/script.js"></script>',
  },
  {
    name: "already-correct preview path untouched",
    input: '<link rel="stylesheet" href="/preview/helencochraneart/styles.css">',
    contentType: "text/html",
    expect: '<link rel="stylesheet" href="/preview/helencochraneart/styles.css">',
  },
  {
    name: "contact form action untouched",
    input: '<form action="/api/site-contact" data-refresh-kiwi-contact>',
    contentType: "text/html",
    expect: '<form action="/api/site-contact" data-refresh-kiwi-contact>',
  },
  {
    name: "absolute https URL untouched",
    input: '<img src="https://example.com/photo.jpg" alt="">',
    contentType: "text/html",
    expect: '<img src="https://example.com/photo.jpg" alt="">',
  },
  {
    name: "protocol-relative URL untouched",
    input: '<img src="//cdn.example.com/photo.jpg">',
    contentType: "text/html",
    expect: '<img src="//cdn.example.com/photo.jpg">',
  },
  {
    name: "anchor link untouched",
    input: '<a href="#contact">Contact</a>',
    contentType: "text/html",
    expect: '<a href="#contact">Contact</a>',
  },
  {
    name: "internal page link rewritten",
    input: '<a href="/about">About</a>',
    contentType: "text/html",
    expect: '<a href="/preview/helencochraneart/about">About</a>',
  },
  {
    name: "srcset with mixed URLs",
    input: '<img srcset="/assets/a.webp 1x, https://x.com/b.webp 2x">',
    contentType: "text/html",
    expect: '<img srcset="/preview/helencochraneart/assets/a.webp 1x, https://x.com/b.webp 2x">',
  },
  {
    name: "css url() rewritten",
    input: 'body { background: url(/assets/hero.webp); }',
    contentType: "text/css; charset=utf-8",
    expect: 'body { background: url(/preview/helencochraneart/assets/hero.webp); }',
  },
  {
    name: "css quoted url() rewritten",
    input: '.h { background-image: url("/assets/hero.webp"); }',
    contentType: "text/css",
    expect: '.h { background-image: url("/preview/helencochraneart/assets/hero.webp"); }',
  },
  {
    name: "css @import rewritten",
    input: '@import "/base.css";',
    contentType: "text/css",
    expect: '@import "/preview/helencochraneart/base.css";',
  },
  {
    name: "css absolute url untouched",
    input: '.g { background: url(https://fonts.gstatic.com/x.woff2); }',
    contentType: "text/css",
    expect: '.g { background: url(https://fonts.gstatic.com/x.woff2); }',
  },
  {
    name: "inline style url in html rewritten",
    input: '<div style="background: url(\'/assets/bg.webp\')"></div>',
    contentType: "text/html",
    expect: '<div style="background: url(\'/preview/helencochraneart/assets/bg.webp\')"></div>',
  },
  {
    name: "javascript untouched",
    input: 'fetch("/api/site-contact", { method: "POST" });',
    contentType: "text/javascript",
    expect: 'fetch("/api/site-contact", { method: "POST" });',
  },
  {
    name: "json untouched",
    input: '{"pages":[{"path":"/","title":"Home"}]}',
    contentType: "application/json",
    expect: '{"pages":[{"path":"/","title":"Home"}]}',
  },
];

let failed = 0;

for (const testCase of cases) {
  const actual = rewriteRootPathsForPreview(
    testCase.input,
    slug,
    testCase.contentType,
  );

  if (actual === testCase.expect) {
    console.log(`PASS ${testCase.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(`  expected: ${testCase.expect}`);
    console.error(`  actual:   ${actual}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} cases passed`);
