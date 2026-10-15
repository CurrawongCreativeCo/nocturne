import { NextResponse } from 'next/server'

import { siteProfile } from '@/config/profile'
import { fetchNotices } from '@/lib/ops/fetch-notices'

/**
 * Notices for the Studio's Start here screen, relayed from the Ops dashboard (OPS_NOTICES_URL).
 * The dashboard's key stays on the server. Answers 204 when notices are not set up, so the
 * Studio skips the panel silently. Notices are written for the client and treated as public.
 */
export async function GET() {
  const notices = await fetchNotices(siteProfile.client.slug)
  if (notices === null) return new NextResponse(null, { status: 204 })
  return NextResponse.json({ notices }, { headers: { 'cache-control': 'private, max-age=60' } })
}
