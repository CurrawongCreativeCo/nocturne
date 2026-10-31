import { EVENTS_SEGMENT } from './event-paths'
import {
  BLOG_SEGMENT,
  EXPERIMENT_SEGMENT,
  GALLERY_SEGMENT,
  PRELAUNCH_VIEW_SEGMENT,
  SEARCH_SEGMENT,
  SERVICES_SEGMENT,
  SIGN_IN_SEGMENT,
  SIGN_OUT_SEGMENT,
  STUDIO_BRAND_PREVIEW_SEGMENT,
  TEAM_SEGMENT,
} from './paths'

/**
 * First path segments taken by app routes: a page there could never be reached. In `src/config`, not
 * the pages feature, because the site profile validates its launch slugs against it.
 */
const RESERVED_SEGMENTS = new Set([
  'studio',
  'api',
  '_next',
  BLOG_SEGMENT,
  EXPERIMENT_SEGMENT,
  GALLERY_SEGMENT,
  PRELAUNCH_VIEW_SEGMENT,
  SEARCH_SEGMENT,
  SIGN_IN_SEGMENT,
  SIGN_OUT_SEGMENT,
  STUDIO_BRAND_PREVIEW_SEGMENT,
])

/**
 * The first segment of `slug` when a route already uses it, else null. `team` and `events` are
 * reserved only *above* their detail pages (`team/ann-lee`): the route `/team/[slug]` would answer
 * first. A page called plain `team` or `events` has no route in its way, and is where a Team or
 * Events section usually lives. `services` is reserved the same way, but only while the `services`
 * flag is on (callers pass it: this module can't read the profile, which imports it): a site without
 * the flag has no route in the way, and a page at `services/web-design` is fine.
 */
export function reservedSegment(
  slug: string,
  { services = false }: { services?: boolean } = {},
): string | null {
  const [first = '', ...rest] = slug.split('/')
  if (RESERVED_SEGMENTS.has(first)) return first
  if (rest.length === 0) return null
  if (first === TEAM_SEGMENT || first === EVENTS_SEGMENT) return first
  // `/services/[slug]` answers exactly two segments; `services/web/design` still reaches the page route.
  return first === SERVICES_SEGMENT && services && rest.length === 1 ? first : null
}
