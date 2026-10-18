import { isPublicBeforeLaunch, type LaunchState } from '@/config/launch'
import { PRELAUNCH_NOT_FOUND_SEGMENT, PRELAUNCH_VIEW_PATH } from '@/config/paths'

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
