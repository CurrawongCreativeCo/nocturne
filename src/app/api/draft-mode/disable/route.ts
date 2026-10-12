import { draftMode } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/** Leaves preview and returns to `?redirect=` (same-site paths only, so it can't send users elsewhere). */
export async function GET(request: NextRequest) {
  ;(await draftMode()).disable()
  const target = request.nextUrl.searchParams.get('redirect') ?? '/'
  const path = target.startsWith('/') && !target.startsWith('//') ? target : '/'
  return NextResponse.redirect(new URL(path, request.url))
}
