/** One path segment: lowercase letters, numbers and single hyphens. A service lives at /services/<slug>. */
export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "Emergency plumbing" -> "emergency-plumbing". Unlike a page slug, "/" is not allowed. */
export function slugifyService(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
