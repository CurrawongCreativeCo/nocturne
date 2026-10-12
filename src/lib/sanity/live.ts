import 'server-only'

import { cookies, draftMode } from 'next/headers'
import {
  defineLive,
  resolvePerspectiveFromCookies,
  resolveVariantFromCookies,
  type LivePerspective,
  type StrictDefinedFetchType,
} from 'next-sanity/live'

import { client } from './client'
import { token } from './token'

/**
 * `strict: true` makes every call site pass `perspective` and `stega` explicitly.
 * That's required under Cache Components: `draftMode()`/`cookies()` are request-time
 * APIs and must be read *outside* a `'use cache'` boundary, then passed in as arguments
 * (which become part of the cache key).
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  // Only sent to the browser when <SanityLive includeDrafts /> is rendered, i.e. in draft mode.
  browserToken: token,
  strict: true,
})

/**
 * The app's single `'use cache'` boundary for Sanity data. `sanityFetch` tags the
 * entry with Content Lake sync tags, and <SanityLive /> expires those tags on change.
 * Always fetch through this; never add your own `'use cache'` around `sanityFetch`.
 */
export const cachedSanityFetch: StrictDefinedFetchType = async (options) => {
  'use cache'
  return sanityFetch(options)
}

export interface FetchMode {
  perspective: LivePerspective
  variant?: string
  /** `boolean` (not literal `false`) on purpose: data is typed stega-branded in both modes. */
  stega: boolean
}

export const PUBLISHED: FetchMode = { perspective: 'published', stega: false }

/** Resolves draft/preview options from the request. Call outside `'use cache'`, inside <Suspense>. */
export async function getDraftFetchMode(): Promise<FetchMode> {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return PUBLISHED

  const jar = await cookies()
  const perspective = await resolvePerspectiveFromCookies({ cookies: jar })
  const variant = await resolveVariantFromCookies({ cookies: jar })
  return { perspective: perspective ?? 'drafts', variant, stega: true }
}
