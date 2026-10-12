import { cachedSanityFetch, type FetchMode } from '@/lib/sanity/live'

import { SETTINGS_QUERY } from './queries'

export async function getSettings(mode: FetchMode) {
  const { data } = await cachedSanityFetch({ query: SETTINGS_QUERY, ...mode })
  return data
}
