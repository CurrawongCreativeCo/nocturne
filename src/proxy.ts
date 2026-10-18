import { get } from '@vercel/edge-config'
import { NextResponse, type NextRequest } from 'next/server'

import { EVENTS_PATH } from '@/config/event-paths'
import { getLaunchState } from '@/config/launch'
import {
  BLOG_PATH,
  EXPERIMENT_PATH,
  GALLERY_PATH,
  SEARCH_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
  STUDIO_BRAND_PREVIEW_PATH,
  TEAM_PATH,
} from '@/config/paths'
import {
  chooseOption,
  EXPERIMENT_COOKIE,
  EXPERIMENT_COOKIE_MAX_AGE,
  formatCookie,
  isCrawler,
  readCookie,
} from '@/features/experiments/utils/assign'
import { encodeOption } from '@/features/experiments/utils/experiment-flag'
import { loadActiveExperiment } from '@/features/experiments/utils/experiment-source'
import {
  decidePrelaunch,
  PRELAUNCH_HEADERS,
  PRELAUNCH_NOT_FOUND_PATH,
  prelaunchViewPath,
} from '@/lib/prelaunch-gate'
import { EDGE_REDIRECTS_KEY, lookupRedirect, type EdgeRedirect } from '@/lib/redirects'
import {
  currentStyleguideEnv,
  isStyleguidePath,
  STYLEGUIDE_TOKEN_COOKIE,
  STYLEGUIDE_TOKEN_PARAM,
  styleguideAccess,
  tokenMatches,
} from '@/lib/styleguide-access'

/**
 * Runs before every page request, for four jobs:
 *  -1. The pre-launch gate (see `prelaunch`): while the site profile says pre-launch, only the
 *     temporary page and the listed public pages are served, and everything else answers 404. Live,
 *     it does nothing. It runs first, so the other jobs only ever see a request the gate let through.
 *  0. The style guide's preview token (see `styleguide`): on a preview deployment it answers 404
 *     unless the request carries the token.
 *  1. Studio-managed redirects, answered before any page renders. The map is written to Edge
 *     Config when a redirect is published (see /api/revalidate). Without EDGE_CONFIG this does
 *     nothing and PageView's `getRedirect` fallback handles redirects instead.
 *  2. A/B tests: while an experiment runs, each visitor gets a sticky option (control or a content
 *     variant) and the request is rewritten to the page's prerendered copy for that option.
 */
export async function proxy(request: NextRequest) {
  return (
    prelaunch(request) ??
    styleguide(request) ??
    (await redirect(request)) ??
    (await experiment(request)) ??
    NextResponse.next()
  )
}

/**
 * The launch state, read once per server start: the profile is code and the override is an environment
 * variable, so neither changes while the server runs (and a bad override warns once, not per request).
 */
const launchState = getLaunchState()

/**
 * Whether the request carries a verified pre-launch preview pass (task 118). Until that exists, never.
 * It must be a signed value we issued: the presence of `__prerender_bypass` proves nothing, because
 * anyone can set a cookie with that name.
 */
function hasValidPreviewPass(_request: NextRequest) {
  return false
}

/**
 * The pre-launch gate (README, "Pre-launch and launch"). Live: returns null and nothing changes.
 * Before launch, `decidePrelaunch` picks one of four answers, and every gated response is marked
 * `noindex` and `private, no-store`, so no cache between us and the visitor keeps a gated answer:
 *  - "/" and the listed public pages are rewritten to the bare view, `/prelaunch-view/<slug>`
 *    (no header, footer or menu), under the visitor's own address;
 *  - anything else is rewritten to that view's not-found page, which answers a real 404 (a redirect
 *    to the temporary page instead, for page paths, with `unknownPaths: 'homepage'`);
 *  - a valid preview pass goes through untouched.
 * The style guide keeps its own token rule, so it is left to `styleguide`. A/B tests are skipped by
 * returning before they run. The gate stays correct under Cache Components because pages never read
 * the launch state: the same cached page is served either way, and only this decides which.
 */
function prelaunch(request: NextRequest) {
  if (launchState.status === 'live') return null
  const { pathname } = request.nextUrl
  if (pathname === GALLERY_PATH || pathname.startsWith(`${GALLERY_PATH}/`)) return null

  const decision = decidePrelaunch({
    pathname,
    hasValidPreviewPass: hasValidPreviewPass(request),
    state: launchState,
  })
  const rewriteTo = (path: string, { keepQuery }: { keepQuery: boolean }) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    // A page keeps its query string (campaign tags, a form's return value); a 404 has no use for one.
    if (!keepQuery) url.search = ''
    return NextResponse.rewrite(url, { headers: PRELAUNCH_HEADERS })
  }

  switch (decision) {
    case 'pass':
      return NextResponse.next({ headers: PRELAUNCH_HEADERS })
    case 'rewrite-view':
      return rewriteTo(prelaunchViewPath(pathname, launchState.homepage), { keepQuery: true })
    case 'redirect-home':
      return NextResponse.redirect(new URL('/', request.url), {
        status: 307,
        headers: PRELAUNCH_HEADERS,
      })
    case 'not-found':
      return rewriteTo(PRELAUNCH_NOT_FOUND_PATH, { keepQuery: false })
  }
}

/**
 * The style guide (`/section-gallery`) on a Vercel preview deployment: `?preview=<token>` must match
 * STYLEGUIDE_PREVIEW_TOKEN, and is then kept in a cookie so the page's links need no token. Without
 * it the request is rewritten to a missing page, so the answer is a real 404 and the guide's
 * existence is not given away. Development, the end-to-end build and production are decided by the
 * page itself (`styleguideAccess`); there this only adds the noindex header.
 */
function styleguide(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  if (!isStyleguidePath(pathname, GALLERY_PATH)) return null

  const env = currentStyleguideEnv()
  // Never indexed, whatever the page's own metadata says and whether or not it is shown.
  const noindex = { 'X-Robots-Tag': 'noindex, nofollow' }
  if (styleguideAccess(env) !== 'token') return NextResponse.next({ headers: noindex })

  const valid = (given: string | null | undefined) =>
    tokenMatches(env.previewToken, given) ? given : null
  const fromUrl = valid(searchParams.get(STYLEGUIDE_TOKEN_PARAM))
  const allowed = fromUrl !== null || valid(request.cookies.get(STYLEGUIDE_TOKEN_COOKIE)?.value)

  const response = allowed
    ? NextResponse.next({ headers: noindex })
    : NextResponse.rewrite(new URL(`${GALLERY_PATH}/not-found`, request.url), { headers: noindex })
  response.headers.set('Cache-Control', 'private, no-store')
  if (fromUrl) {
    response.cookies.set(STYLEGUIDE_TOKEN_COOKIE, fromUrl, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: GALLERY_PATH,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return response
}

async function redirect(request: NextRequest) {
  if (!process.env.EDGE_CONFIG) return null

  let map: Record<string, EdgeRedirect> | undefined
  try {
    map = await get<Record<string, EdgeRedirect>>(EDGE_REDIRECTS_KEY)
  } catch (error) {
    // Fail open: the page route's own redirect lookup still runs.
    console.error('Edge Config read failed', error)
  }

  const match = lookupRedirect(map, request.nextUrl.pathname)
  return match ? NextResponse.redirect(new URL(match.to, request.url), match.status) : null
}

/**
 * Only CMS pages have variants; the blog, search, gallery, brand preview, sign-in, variant, team
 * profile and event routes themselves are left alone. A page called exactly `/team` or `/events` is
 * still a CMS page.
 */
function isPagePath(pathname: string) {
  if (pathname.startsWith(`${TEAM_PATH}/`) || pathname.startsWith(`${EVENTS_PATH}/`)) return false
  return ![
    BLOG_PATH,
    EXPERIMENT_PATH,
    GALLERY_PATH,
    SEARCH_PATH,
    SIGN_IN_PATH,
    SIGN_OUT_PATH,
    STUDIO_BRAND_PREVIEW_PATH,
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Rewrites a page request to `/ab/<code>/<path>`, where the code is a signed token holding the
 * visitor's option (see experiment-flag.ts). Each option is prerendered once, so published pages
 * stay static. Returns null, leaving the request untouched, whenever no test applies: nothing is
 * running, FLAGS_SECRET is missing, the visitor is a crawler, or an editor is in draft mode.
 */
async function experiment(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isPagePath(pathname)) return null
  // Draft mode (Presentation, previews) picks its content with Studio's own variant cookie.
  if (request.cookies.has('__prerender_bypass')) return null
  if (isCrawler(request.headers.get('user-agent'))) return null

  const running = await loadActiveExperiment(request.nextUrl.origin)
  if (!running) return null

  const saved = readCookie(running, request.cookies.get(EXPERIMENT_COOKIE)?.value)
  const option = saved ?? chooseOption(running, Math.random())

  let code: string
  try {
    code = await encodeOption(running, option)
  } catch (error) {
    // Most likely FLAGS_SECRET is not set. Serve the published page instead of failing.
    console.error('Experiment code failed', error)
    return null
  }

  const url = request.nextUrl.clone()
  url.pathname = `${EXPERIMENT_PATH}/${code}${pathname === '/' ? '' : pathname}`
  const response = NextResponse.rewrite(url)
  // Shared caches must not hand one visitor's option to another.
  response.headers.set('Vary', 'Cookie')
  if (saved === null) {
    response.cookies.set(EXPERIMENT_COOKIE, formatCookie(running, option), {
      maxAge: EXPERIMENT_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return response
}

/** Skips Studio, API routes, Next.js internals and static assets. Legacy ".html" URLs still match. */
export const config = {
  matcher: [
    '/((?!(?:studio|api|_next)(?:/|$)|.*\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|map|txt|xml|json|webmanifest|woff2?)$).*)',
  ],
}
