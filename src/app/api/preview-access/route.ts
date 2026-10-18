import { NextResponse, type NextRequest } from 'next/server'

import { getClientIp } from '@/features/forms/utils/client-ip'
import { createRateLimiter } from '@/features/forms/utils/rate-limit'
import {
  createPreviewPass,
  previewCookieHeader,
  previewSecret,
  warnNoPreviewSecret,
} from '@/lib/preview-pass'
import { tokenMatches } from '@/lib/styleguide-access'

/** Ten tries per address per ten minutes, per server instance: guessing a long token is hopeless anyway. */
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 })

/** Every refusal is this one answer: no status, header or body says why, or that the route exists. */
const notFound = () =>
  new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })

/**
 * The client preview link (README, "Pre-launch and launch"): `/api/preview-access?token=…`. A token
 * equal to PRELAUNCH_PREVIEW_TOKEN (compared in constant time) sets the signed preview pass and goes
 * to "/". It is a convenience for showing a client the site on the real domain, not a staging
 * environment, and anyone with the link has the same access. Unset token, unset PREVIEW_ACCESS_SECRET,
 * a wrong or missing token, and too many tries all answer 404. Revoke it by changing the token and
 * redeploying. The token is never logged or echoed.
 */
export function GET(request: NextRequest) {
  const expected = process.env.PRELAUNCH_PREVIEW_TOKEN
  if (!expected) return notFound()
  if (!limiter.take(getClientIp(request.headers)).allowed) return notFound()
  if (!tokenMatches(expected, request.nextUrl.searchParams.get('token'))) return notFound()

  const pass = previewSecret() ? createPreviewPass(Date.now()) : null
  if (!pass) {
    warnNoPreviewSecret()
    return notFound()
  }
  const response = NextResponse.redirect(new URL('/', request.url))
  response.headers.append(
    'Set-Cookie',
    previewCookieHeader(pass, { secure: request.nextUrl.protocol === 'https:' }),
  )
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
