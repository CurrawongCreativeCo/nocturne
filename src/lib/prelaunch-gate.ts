import { isPublicBeforeLaunch, type LaunchState } from '@/config/launch'
import {
  FEED_PATH,
  PRELAUNCH_NOT_FOUND_SEGMENT,
  PRELAUNCH_VIEW_PATH,
  SEARCH_API_PATH,
} from '@/config/paths'

/**
 * The pre-launch gate's decisions (README, "Pre-launch and launch"), as pure functions so every case
 * is unit tested; `proxy.ts` turns them into responses.
 *
 *  - `pass`: let the request through unchanged (live, or a valid preview pass).
 *  - `rewrite-view`: serve the page at `prelaunchViewPath()` (the bare layout) under the same URL.
 *  - `not-found`: answer 404.
 *  - `redirect-home`: 307 to "/" (`unknownPaths: 'homepage'`, HTML page paths only).
 *
 * Nothing here is cached or reads the clock: the launch state decides what the proxy serves, never
 * what a page renders.
 */
export type PrelaunchDecision = 'pass' | 'rewrite-view' | 'not-found' | 'redirect-home'

export function decidePrelaunch({
  pathname,
  hasValidPreviewPass,
  state,
}: {
  pathname: string
  /** A verified preview pass (task 118). Never infer it from a cookie's name: anyone can set one. */
  hasValidPreviewPass: boolean
  state: Pick<LaunchState, 'status' | 'visibleSlugs' | 'unknownPaths'>
}): PrelaunchDecision {
  if (state.status === 'live') return 'pass'
  if (hasValidPreviewPass) return 'pass'
  // The bare view is reached by rewrite only; nobody may open it by its own address.
  if (isViewPath(pathname)) return 'not-found'
  if (isPublicBeforeLaunch(pathname, state)) return 'rewrite-view'
  return state.unknownPaths === 'homepage' && isHtmlPagePath(pathname)
    ? 'redirect-home'
    : 'not-found'
}

const isViewPath = (pathname: string) =>
  pathname === PRELAUNCH_VIEW_PATH || pathname.startsWith(`${PRELAUNCH_VIEW_PATH}/`)

/**
 * Whether a path asks for a web page rather than a file (`/events/open-day.ics`, `/feed.xml`, an
 * image): only pages are worth sending to the temporary page. A legacy ".html" path counts as a page.
 */
export function isHtmlPagePath(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? ''
  return !last.includes('.') || last.toLowerCase().endsWith('.html')
}

/** Where a `rewrite-view` decision serves from: "/" is the homepage's slug, a public page its own. */
export function prelaunchViewPath(pathname: string, homepage: string): string {
  const slug = pathname === '/' ? homepage : pathname.slice(1).replace(/\/$/, '')
  return `${PRELAUNCH_VIEW_PATH}/${slug}`
}

/** Where a `not-found` decision is rewritten, so the bare layout's not-found page answers 404. */
export const PRELAUNCH_NOT_FOUND_PATH = `${PRELAUNCH_VIEW_PATH}/${PRELAUNCH_NOT_FOUND_SEGMENT}`

/** Sent with every gated response: nothing the gate serves is indexed or cached by a shared cache. */
export const PRELAUNCH_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
} as const

/**
 * The machine-readable files the gate also answers (README, "Pre-launch and launch", the table of
 * files). The proxy matcher lists these paths as constants (`proxy.ts`, which Next.js requires); the
 * test beside this file checks every one is covered.
 */
export const PRELAUNCH_FILES_PATH = `${PRELAUNCH_VIEW_PATH}/FILES`

/** Capitals can't be in a page slug, so no page can ever be reached at the pre-launch files' folder. */
export const PRELAUNCH_FILE_HANDLERS = {
  sitemap: `${PRELAUNCH_FILES_PATH}/sitemap.xml`,
  robots: `${PRELAUNCH_FILES_PATH}/robots.txt`,
  llms: `${PRELAUNCH_FILES_PATH}/llms.txt`,
} as const

const OG_PREFIX = '/api/og'
const EVENTS_API_PREFIX = '/api/events'
const SITEMAP_CHUNK = /^\/sitemap\/(\d+)\.xml$/

/** Whether the proxy must treat this path as a machine-readable file, not a page (see `decidePrelaunchFile`). */
export function isMachineFilePath(pathname: string): boolean {
  return (
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap' ||
    pathname.startsWith('/sitemap/') ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname === FEED_PATH ||
    pathname === SEARCH_API_PATH ||
    pathname.startsWith(`${SEARCH_API_PATH}/`) ||
    pathname === OG_PREFIX ||
    pathname.startsWith(`${OG_PREFIX}/`) ||
    pathname === EVENTS_API_PREFIX ||
    pathname.startsWith(`${EVENTS_API_PREFIX}/`)
  )
}

export type PrelaunchFileDecision =
  { action: 'rewrite'; to: string } | { action: 'not-found' } | { action: 'pass' }

/**
 * What a pre-launch site does with a machine-readable path, or null when it is not one (a page,
 * for `decidePrelaunch`). A valid preview pass is checked by the caller first: holders get the
 * normal files.
 *
 *  - `/sitemap.xml` and `/sitemap/0.xml`, `/robots.txt`, `/llms.txt`: rewritten to the pre-launch
 *    handlers (always one sitemap file, so `/sitemap/1.xml` and up answer 404).
 *  - `/feed.xml`, `/api/search`, `/api/events/*`: 404 (their content is unfinished).
 *  - `/api/og/<slug>`: the normal share image, only for a visible slug; any other 404.
 */
export function decidePrelaunchFile(
  pathname: string,
  state: Pick<LaunchState, 'visibleSlugs'>,
): PrelaunchFileDecision | null {
  if (!isMachineFilePath(pathname)) return null
  if (pathname === '/sitemap.xml') return { action: 'rewrite', to: PRELAUNCH_FILE_HANDLERS.sitemap }
  const chunk = SITEMAP_CHUNK.exec(pathname)
  if (chunk) {
    return chunk[1] === '0'
      ? { action: 'rewrite', to: PRELAUNCH_FILE_HANDLERS.sitemap }
      : { action: 'not-found' }
  }
  if (pathname === '/robots.txt') return { action: 'rewrite', to: PRELAUNCH_FILE_HANDLERS.robots }
  if (pathname === '/llms.txt') return { action: 'rewrite', to: PRELAUNCH_FILE_HANDLERS.llms }
  if (pathname.startsWith(`${OG_PREFIX}/`)) {
    const slug = pathname.slice(OG_PREFIX.length + 1).replace(/\/$/, '')
    return state.visibleSlugs.includes(slug) ? { action: 'pass' } : { action: 'not-found' }
  }
  // The feed, search, the events API, "/api/og" itself (the home page's image) and anything else.
  return { action: 'not-found' }
}
