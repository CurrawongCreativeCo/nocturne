import { NextResponse, type NextRequest } from 'next/server'

import { searchPages } from '@/features/search/api/search-pages'
import { parseQuery } from '@/features/search/utils/query'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * JSON for the quick search dialog: `{ results: [{ title, path, snippet }] }` for `?q=`. The
 * handler reads the request, so it runs per request; the Sanity read behind it is cached per
 * query text for a few minutes (`shortLivedSanityFetch`), and the `Cache-Control` header lets a
 * CDN absorb repeats too. Published content only: draft previews use the /search page.
 */
export async function GET(request: NextRequest) {
  const parsed = parseQuery(request.nextUrl.searchParams.getAll('q'))
  if (!parsed.ok) return NextResponse.json({ results: [], reason: parsed.reason }, { status: 400 })

  try {
    const results = await searchPages(parsed, PUBLISHED)
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    console.error('Search failed', error)
    return NextResponse.json({ results: [], reason: 'error' }, { status: 502 })
  }
}
