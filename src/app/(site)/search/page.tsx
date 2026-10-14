import type { Metadata } from 'next'

import { SearchView } from '@/features/search/components/search-view'
import { getDraftFetchMode } from '@/lib/sanity/live'

/** Static on purpose: the query isn't known at build time, and a results page isn't worth indexing. */
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
}

/**
 * This route opts out of the static shell on purpose: the query string is read at the top of the
 * page, with no <Suspense> around the results, so the server sends the results inline in the
 * document. Streamed content sits in a hidden element that a script reveals, so a results page
 * built that way shows nothing to a visitor without JavaScript, and the form (a plain GET form)
 * would not work for them. Only /search is dynamic; the layout still comes from the cache, and
 * the Sanity read is cached per query text (`shortLivedSanityFetch`). Draft mode reads its
 * options here too.
 */
export const instant = false

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const { q } = await searchParams
  return (
    <div className="mx-auto max-w-4xl px-gutter py-section-compact">
      <h1 className="text-h1 font-semibold text-balance">Search</h1>
      <SearchView rawQuery={q} {...await getDraftFetchMode()} />
    </div>
  )
}
