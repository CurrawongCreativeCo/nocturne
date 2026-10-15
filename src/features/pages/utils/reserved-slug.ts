import {
  BLOG_SEGMENT,
  EXPERIMENT_SEGMENT,
  GALLERY_SEGMENT,
  SEARCH_SEGMENT,
  SIGN_IN_SEGMENT,
  SIGN_OUT_SEGMENT,
  STUDIO_BRAND_PREVIEW_SEGMENT,
  TEAM_SEGMENT,
} from '@/config/paths'

/** First path segments taken by app routes: a page there could never be reached. */
const RESERVED_SEGMENTS = new Set([
  'studio',
  'api',
  '_next',
  BLOG_SEGMENT,
  EXPERIMENT_SEGMENT,
  GALLERY_SEGMENT,
  SEARCH_SEGMENT,
  SIGN_IN_SEGMENT,
  SIGN_OUT_SEGMENT,
  STUDIO_BRAND_PREVIEW_SEGMENT,
])

/**
 * The first segment of `slug` when a route already uses it, else null. `team` is reserved only
 * *above* the profile pages (`team/ann-lee`): the route `/team/[slug]` would answer first. A page
 * called plain `team` has no route in its way, and is where a Team section usually lives.
 */
export function reservedSegment(slug: string): string | null {
  const [first = '', ...rest] = slug.split('/')
  if (RESERVED_SEGMENTS.has(first)) return first
  return first === TEAM_SEGMENT && rest.length > 0 ? first : null
}
