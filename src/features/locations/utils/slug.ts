/** One path segment: lowercase letters, numbers and single hyphens. A location lives at /locations/<slug>. */
export const LOCATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "Western Sydney" -> "western-sydney". Unlike a page slug, "/" is not allowed. */
export function slugifyLocation(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
