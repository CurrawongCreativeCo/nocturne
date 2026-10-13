import { get } from '@vercel/edge-config'
import { NextResponse, type NextRequest } from 'next/server'

import { BLOG_PATH, EXPERIMENT_PATH, SEARCH_PATH } from '@/config/paths'
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
import { EDGE_REDIRECTS_KEY, lookupRedirect, type EdgeRedirect } from '@/lib/redirects'

/**
 * Runs before every page request, for two jobs:
 *  1. Studio-managed redirects, answered before any page renders. The map is written to Edge
 *     Config when a redirect is published (see /api/revalidate). Without EDGE_CONFIG this does
 *     nothing and PageView's `getRedirect` fallback handles redirects instead.
 *  2. A/B tests: while an experiment runs, each visitor gets a sticky option (control or a content
 *     variant) and the request is rewritten to the page's prerendered copy for that option.
 */
export async function proxy(request: NextRequest) {
  return (await redirect(request)) ?? (await experiment(request)) ?? NextResponse.next()
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

/** Only CMS pages have variants; the blog, search and variant routes themselves are left alone. */
function isPagePath(pathname: string) {
  return ![BLOG_PATH, EXPERIMENT_PATH, SEARCH_PATH].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
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
    '/((?!(?:studio|api|_next)(?:/|$)|apple-icon$|.*\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|map|txt|xml|json|webmanifest|woff2?)$).*)',
  ],
}
