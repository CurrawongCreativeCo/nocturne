import { slugToPath } from '@/config/paths'
import { shortLivedSanityFetch, TAGS, type FetchMode } from '@/lib/sanity/live'

import { SEARCH_QUERY } from './queries'
import type { SearchResult } from '../types/search-result'
import { toMatchPattern, type ParsedQuery } from '../utils/query'
import { makeSnippet } from '../utils/snippet'

/**
 * Pages matching an already validated query (`parseQuery`). The page and the quick search route
 * both call this with the same argument shape, so one query text is one cache entry for both
 * (short-lived, see `shortLivedSanityFetch`). Only `page` documents are read, so only that tag.
 */
export async function searchPages(
  parsed: Extract<ParsedQuery, { ok: true }>,
  mode: FetchMode,
): Promise<SearchResult[]> {
  const pattern = toMatchPattern(parsed.q)
  if (!pattern) return []

  const { data } = await shortLivedSanityFetch({
    query: SEARCH_QUERY,
    params: { q: pattern },
    ...mode,
    tags: [TAGS.page],
  })
  return data.map((page) => ({
    title: page.title,
    path: slugToPath(page.slug),
    // A title-only match has no body text to excerpt; the meta description stands in.
    snippet: makeSnippet(page.text.trim() ? page.text : page.description, parsed.q),
  }))
}
