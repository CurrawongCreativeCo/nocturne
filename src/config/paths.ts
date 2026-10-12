/**
 * URL <-> slug mapping, shared by the router, links, Presentation tool and sitemap.
 *
 * Convention: `page.slug.current` holds the full path without slashes at the ends
 * ("about", "services/web-design"). The page whose slug is HOME_SLUG renders at "/".
 */
export const HOME_SLUG = 'home'

/** "services/web" -> "/services/web"; "home" -> "/" */
export function slugToPath(slug: string | null | undefined): string {
  if (!slug || slug === HOME_SLUG) return '/'
  return `/${slug}`
}

/** Route params (`[[...slug]]`) -> stored slug. */
export function segmentsToSlug(segments: string[] | undefined): string {
  return segments?.length ? segments.join('/') : HOME_SLUG
}

/** Stored slug -> route params for generateStaticParams. */
export function slugToSegments(slug: string): string[] {
  return slug === HOME_SLUG ? [] : slug.split('/')
}
