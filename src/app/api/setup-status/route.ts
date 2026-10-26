import { connection, NextResponse, type NextRequest } from 'next/server'

import { getClientIp } from '@/features/forms/utils/client-ip'
import { createRateLimiter } from '@/features/forms/utils/rate-limit'
import { isAgency } from '@/lib/sanity/roles'
import { verifyStudioUser } from '@/lib/sanity/verify-studio-user'

import { getSetupStatus } from '../../setup-status'

/** Per address, before anyone is identified, so a flood of bad tokens cannot reach Sanity. Per server instance (see the limiter). */
const addressLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 })

/** `Vary` because the answer depends on who asks; never stored by the browser or a shared cache. */
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' }

const refuse = (status: number, body: { status: string }, extra: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...privateHeaders, ...extra } })

/**
 * The agency's view of which features are set up (README, "Features & setup"): readiness with
 * reasons, the profile switches, the template version, the commit and the build time. It names
 * missing settings, so it answers only after Sanity has confirmed, on this request, who the caller
 * is and that they hold the Administrator or Developer role. The Studio sends the signed-in person's
 * own token as `Authorization: Bearer …`. 401: no token, or Sanity refused it. 403: a real user
 * who isn't agency staff. 503: Sanity could not be asked, which is never read as a yes.
 */
export async function GET(request: NextRequest) {
  // Per request: without this the handler is prerendered at build and its answer frozen.
  await connection()

  const address = addressLimiter.take(getClientIp(request.headers))
  if (!address.allowed) {
    return refuse(
      429,
      { status: 'busy' },
      { 'Retry-After': String(Math.ceil(address.retryAfterMs / 1000)) },
    )
  }

  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) return refuse(401, { status: 'unauthenticated' })

  const identity = await verifyStudioUser(token)
  if (identity.kind === 'rejected') return refuse(401, { status: 'unauthenticated' })
  if (identity.kind === 'unavailable') return refuse(503, { status: 'unavailable' })
  if (!isAgency(identity.user)) return refuse(403, { status: 'forbidden' })

  return NextResponse.json(getSetupStatus(), { headers: privateHeaders })
}
