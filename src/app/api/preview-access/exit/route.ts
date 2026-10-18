import { NextResponse, type NextRequest } from 'next/server'

import { previewCookieHeader } from '@/lib/preview-pass'

/** Ends a client preview: clears the pass and goes to "/", which is the temporary page again. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  response.headers.append(
    'Set-Cookie',
    previewCookieHeader(null, { secure: request.nextUrl.protocol === 'https:' }),
  )
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
