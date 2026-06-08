const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const base = hostname.split(".")[0] ?? "site";
    return normalizeSlug(base) || "site";
  } catch {
    return "site";
  }
}

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export async function resolveUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = normalizeSlug(baseSlug) || "site";
  if (!(await exists(normalized))) {
    return normalized;
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${normalized}-${index}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${normalized}-${Date.now()}`;
}
