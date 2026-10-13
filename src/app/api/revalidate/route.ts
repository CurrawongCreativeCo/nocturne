import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

import { getRedirects } from '@/features/pages/api/get-page'
import { canSyncRedirects, writeRedirectMap } from '@/lib/edge-config-sync'
import { buildRedirectMap } from '@/lib/redirects'
import { revalidateSecret, TAGS } from '@/lib/sanity/live'

const KNOWN_TAGS = new Set<string>(Object.values(TAGS))

/**
 * Sanity webhook target for webhook mode (SANITY_REVALIDATE_SECRET set). Expires every
 * cached result tagged with the published document's type. Stale-while-revalidate:
 * the next visitor gets the old page once while the new one renders.
 *
 * A published or deleted "redirect" also rewrites the Edge Config map that proxy.ts serves
 * (when EDGE_CONFIG_ID and VERCEL_API_TOKEN are set). It's expired immediately so the rebuild
 * reads the new list; a failed write returns 502 so Sanity retries the webhook.
 */
export async function POST(request: NextRequest) {
  if (!revalidateSecret) return new NextResponse('Webhook mode is off', { status: 404 })

  // Verifies the signature, then waits for the Content Lake/CDN to catch up before we expire anything.
  const { isValidSignature, body } = await parseBody<{ _type?: string }>(request, revalidateSecret)
  if (!isValidSignature) return new NextResponse('Invalid signature', { status: 401 })

  const type = body?._type
  if (!type || !KNOWN_TAGS.has(type)) {
    return NextResponse.json({
      revalidated: false,
      reason: `No cached queries depend on "${type}"`,
    })
  }

  if (type === TAGS.redirect && canSyncRedirects) {
    revalidateTag(type, { expire: 0 })
    try {
      const map = buildRedirectMap(await getRedirects())
      await writeRedirectMap(map)
      return NextResponse.json({
        revalidated: true,
        tag: type,
        edgeConfig: Object.keys(map).length,
      })
    } catch (error) {
      console.error('Edge Config redirect sync failed', error)
      return NextResponse.json(
        { revalidated: true, tag: type, edgeConfig: 'failed' },
        { status: 502 },
      )
    }
  }

  revalidateTag(type, 'max')
  return NextResponse.json({ revalidated: true, tag: type })
}
