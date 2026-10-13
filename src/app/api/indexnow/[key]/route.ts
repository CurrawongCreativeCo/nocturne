import { NextResponse } from 'next/server'

/**
 * Serves the IndexNow key file. next.config.ts rewrites /<key>.txt here; the file exists only
 * when INDEXNOW_KEY is set and matches the requested key, so any other .txt path is a 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const configured = process.env.INDEXNOW_KEY
  if (!configured || key !== configured) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(configured, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
