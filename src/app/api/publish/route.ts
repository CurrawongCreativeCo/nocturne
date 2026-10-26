import { connection, NextResponse, type NextRequest } from 'next/server'

import { isFeatureEnabled } from '@/config/profile'
import { getClientIp } from '@/features/forms/utils/client-ip'
import { createRateLimiter } from '@/features/forms/utils/rate-limit'
import { createGateDeps } from '@/features/publish-gate/api/create-gate-deps'
import { runPublishGate } from '@/features/publish-gate/api/run-publish-gate'
import { getWriteClient } from '@/lib/sanity/write-client'

/** Per signed-in editor: ten publishes a minute is far above real use. Per server instance (see the limiter). */
const requesterLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 })
/** Per address, before anyone is identified, so a flood of bad tokens cannot reach Sanity. */
const addressLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 })

const noStore = { 'Cache-Control': 'private, no-store' }

/**
 * The publish gate (README, "Publish gate"): publishes a Contributor's draft only when every change
 * is one a client may make and every person who edited it still may. Behind `features.publishGate`
 * in `site.profile.ts`: off, the route answers 404 as if it did not exist. The caller sends their
 * own Sanity token as `Authorization: Bearer …` and `{ documentId, operation? }` as JSON; the gate
 * uses the Editor token (`SANITY_WRITE_TOKEN`) to read and to publish. Responses: 200 published,
 * 202 sent to review, 401/403 refused, 409 changed meanwhile, 422 fix first, 429 slow down.
 */
export async function POST(request: NextRequest) {
  // Per request: without this the handler is prerendered at build and the flag and token are frozen.
  await connection()
  if (!isFeatureEnabled('publishGate') || !process.env.SANITY_WRITE_TOKEN) {
    return new NextResponse(null, { status: 404, headers: noStore })
  }

  const address = addressLimiter.take(getClientIp(request.headers))
  if (!address.allowed) {
    return NextResponse.json(
      { status: 'error', message: 'Too many publish attempts. Wait a moment and try again.' },
      {
        status: 429,
        headers: { ...noStore, 'Retry-After': String(Math.ceil(address.retryAfterMs / 1000)) },
      },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    documentId?: unknown
    operation?: unknown
  } | null
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null

  const deps = createGateDeps({
    client: getWriteClient(),
    rateLimit: (key) => requesterLimiter.take(key),
  })
  const { status, body: result } = await runPublishGate(deps, {
    documentId: body?.documentId,
    operation: body?.operation,
    token: token || null,
  })
  const headers: Record<string, string> = { ...noStore }
  if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds)
  return NextResponse.json(result, { status, headers })
}
