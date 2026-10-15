/** One path segment: lowercase letters, numbers and single hyphens. A profile lives at /team/<slug>. */
export const MEMBER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "Ann Lee-Smith" -> "ann-lee-smith". Unlike a page slug, "/" is not allowed. */
export function slugifyMember(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
