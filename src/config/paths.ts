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

/**
 * First path segment of the prerendered A/B variant routes. proxy.ts rewrites a page request to
 * "/ab/<code>/<path>" for visitors in an experiment, so a CMS page can't use it either.
 */
export const EXPERIMENT_SEGMENT = 'ab'
export const EXPERIMENT_PATH = `/${EXPERIMENT_SEGMENT}`

/**
 * Site search. `/search?q=` is the results page, `/api/search?q=` the JSON the quick search dialog
 * reads. A CMS page can't use the first segment (the page route would never be reached).
 */
export const SEARCH_SEGMENT = 'search'
export const SEARCH_PATH = `/${SEARCH_SEGMENT}`
export const SEARCH_API_PATH = '/api/search'

/**
 * Sign-in and sign-out pages (src/features/auth). A CMS page can't use these first segments, and
 * proxy.ts leaves them out of A/B tests. The Auth.js handlers live under /api/auth.
 */
export const SIGN_IN_SEGMENT = 'sign-in'
export const SIGN_OUT_SEGMENT = 'sign-out'
export const SIGN_IN_PATH = `/${SIGN_IN_SEGMENT}`
export const SIGN_OUT_PATH = `/${SIGN_OUT_SEGMENT}`

/** Sign-in link that returns the visitor to `returnTo` (a path on this site) afterwards. */
export function signInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?${new URLSearchParams({ callbackUrl: returnTo })}`
}
