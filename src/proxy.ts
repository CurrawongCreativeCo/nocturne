import { get } from '@vercel/edge-config'
import { NextResponse, type NextRequest } from 'next/server'

import { EDGE_REDIRECTS_KEY, lookupRedirect, type EdgeRedirect } from '@/lib/redirects'

/**
 * Studio-managed redirects, answered before any page renders. The map is written to Edge Config
 * when a redirect is published (see /api/revalidate). Without EDGE_CONFIG this does nothing and
 * PageView's `getRedirect` fallback handles redirects instead.
 */
export async function proxy(request: NextRequest) {
  if (!process.env.EDGE_CONFIG) return NextResponse.next()

  let map: Record<string, EdgeRedirect> | undefined
  try {
    map = await get<Record<string, EdgeRedirect>>(EDGE_REDIRECTS_KEY)
  } catch (error) {
    // Fail open: the page route's own redirect lookup still runs.
    console.error('Edge Config read failed', error)
  }

  const match = lookupRedirect(map, request.nextUrl.pathname)
  if (!match) return NextResponse.next()
  return NextResponse.redirect(new URL(match.to, request.url), match.status)
}

/** Skips Studio, API routes, Next.js internals and static assets. Legacy ".html" URLs still match. */
export const config = {
  matcher: [
    '/((?!(?:studio|api|_next)(?:/|$)|apple-icon$|.*\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|map|txt|xml|json|webmanifest|woff2?)$).*)',
  ],
}
