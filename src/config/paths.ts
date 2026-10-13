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

/** "a/b/c" -> ["a", "a/b", "a/b/c"]: the slug of each page on the way down. "home" -> []. */
export function slugTrail(slug: string): string[] {
  return slugToSegments(slug).map((_, i, segments) => segments.slice(0, i + 1).join('/'))
}

/** First path segment of the blog routes. A CMS page can't use it: the blog routes would shadow it. */
export const BLOG_SEGMENT = 'blog'
export const BLOG_PATH = `/${BLOG_SEGMENT}`
/** RSS 2.0 feed of the latest posts. */
export const FEED_PATH = '/feed.xml'

/** Post slug -> "/blog/<slug>". */
export function postPath(slug: string): string {
  return `${BLOG_PATH}/${slug}`
}

/** Category slug -> "/blog/category/<slug>". */
export function categoryPath(slug: string): string {
  return `${BLOG_PATH}/category/${slug}`
}
