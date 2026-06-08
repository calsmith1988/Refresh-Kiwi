import path from "node:path";

const PREVIEWS_DIR = path.join(process.cwd(), "previews");

export function previewDirectory(slug: string): string {
  return path.join(PREVIEWS_DIR, slug);
}

export function previewPublicPath(slug: string): string {
  return `/preview/${slug}/index.html`;
}
