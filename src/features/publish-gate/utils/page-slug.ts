import { reservedSegment } from '@/config/reserved-slug'

/** The page schema's slug pattern (src/features/pages/schemas/page.ts): nested paths, no slashes at the ends. */
const PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

/** Why `slug` cannot be a page address, or null when it can: the schema's rules, repeated on the server. */
export function pageSlugProblem(slug: string): string | null {
  if (!PAGE_SLUG.test(slug)) {
    return 'Use lowercase letters, numbers and hyphens, with "/" only between parts.'
  }
  const reserved = reservedSegment(slug)
  return reserved ? `"${reserved}" is used by the site itself; choose another address.` : null
}
