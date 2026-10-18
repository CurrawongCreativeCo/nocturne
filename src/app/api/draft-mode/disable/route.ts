import { draftMode } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import { safePath } from '@/features/auth/utils/safe-path'
import { previewCookieHeader } from '@/lib/preview-pass'

/**
 * Leaves preview and returns to `?redirect=`. Only a path on this site is followed: `safePath` also
 * refuses "/\evil.example" and "/<tab>/evil.example", which a browser reads as another site (audit
 * finding S-1). Also clears the pre-launch preview pass, so leaving preview closes the site again.
 */
export async function GET(request: NextRequest) {
  ;(await draftMode()).disable()
  const path = safePath(request.nextUrl.searchParams.get('redirect'))
  const response = NextResponse.redirect(new URL(path, request.url))
  response.headers.append(
    'Set-Cookie',
    previewCookieHeader(null, { secure: request.nextUrl.protocol === 'https:' }),
  )
  return response
}
