import type { SanityClient } from 'sanity'

import { historyIds, parseLastChanges, type LastChange } from '../utils/transactions'

/**
 * Who last changed each document, from Sanity's history API (one request for all of them). The
 * newest 100 transactions are enough for the handful of rows shown; a document older than that
 * simply has no name. Any failure returns an empty map: the time alone is still useful.
 */
export async function fetchLastChanges(
  client: SanityClient,
  publishedIds: readonly string[],
  signal: AbortSignal,
): Promise<Map<string, LastChange>> {
  if (publishedIds.length === 0) return new Map()
  const { dataset } = client.config()
  try {
    const body: unknown = await client.request({
      url: `/data/history/${dataset}/transactions/${historyIds(publishedIds).join(',')}`,
      query: { excludeContent: 'true', reverse: 'true', limit: '100' },
      signal,
    })
    return parseLastChanges(body)
  } catch {
    return new Map()
  }
}
