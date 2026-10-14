import Link from 'next/link'

import type { FetchMode } from '@/lib/sanity/live'

import { SearchForm } from './search-form'
import { searchPages } from '../api/search-pages'
import { MIN_QUERY_LENGTH, parseQuery } from '../utils/query'

/** The query returns at most this many pages (`[0...20]` in SEARCH_QUERY). */
const RESULT_LIMIT = 20

/**
 * The form, the announced result count and the result list for a raw `?q=` value. Reads the
 * request's query string upstream, so render it inside <Suspense>; the Sanity read itself is cached
 * per query text.
 */
export async function SearchView({
  rawQuery,
  ...mode
}: { rawQuery: string | string[] | undefined } & FetchMode) {
  const parsed = parseQuery(rawQuery)
  const results = parsed.ok ? await searchPages(parsed, mode) : []

  let status = ''
  if (!parsed.ok) {
    if (parsed.reason === 'short') status = `Enter at least ${MIN_QUERY_LENGTH} characters.`
  } else if (results.length === 0) {
    status = `No pages found for “${parsed.q}”.`
  } else if (results.length === RESULT_LIMIT) {
    status = `Showing the first ${RESULT_LIMIT} results for “${parsed.q}”.`
  } else {
    status = `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${parsed.q}”.`
  }

  return (
    <>
      <SearchForm defaultValue={parsed.ok ? parsed.q : ''} />
      {/* Always rendered, so the live region exists before its text changes. */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-6 min-h-6 text-ink-muted"
      >
        {status}
      </p>
      {results.length > 0 && (
        <ul className="mt-6 space-y-8">
          {results.map((result) => (
            <li key={result.path}>
              <h2 className="text-h4 font-semibold">
                <Link href={result.path} className="underline-offset-4 hover:underline">
                  {result.title}
                </Link>
              </h2>
              <p className="mt-1 text-small text-ink-muted">{result.path}</p>
              {result.snippet && (
                <p className="mt-2 max-w-prose text-ink-muted">{result.snippet}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
