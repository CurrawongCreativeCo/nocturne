import 'server-only'

import { cacheLife } from 'next/cache'
import { cookies, draftMode } from 'next/headers'
import { variantsApiVersion } from 'next-sanity'
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
 * Content variants (A/B tests, Presentation previews) are only served by the experimental
 * API version, so fetches that name a variant go through a client pinned to it. Everything else
 * keeps the dated `apiVersion`. Only `sanityFetch` is used from this instance.
 */
const { sanityFetch: variantFetch } = defineLive({
  client: client.withConfig({ apiVersion: variantsApiVersion }),
  serverToken: token,
  strict: true,
})

/**
 * The app's single `'use cache'` boundary for Sanity data. `sanityFetch` tags the
 * entry with Content Lake sync tags, and <SanityLive /> expires those tags on change.
 * Always fetch through this; never add your own `'use cache'` around `sanityFetch`.
 * `variant` is part of the cache key, so each variant is its own entry.
 */
export const cachedSanityFetch: StrictDefinedFetchType = async (options) => {
  'use cache'
  return options.variant ? variantFetch(options) : sanityFetch(options)
}

/**
 * A second boundary for results that content tags can't keep fresh, because a document that
 * *starts* matching (a new page, a reworded paragraph) isn't in the cached result and so never
 * expires it. Site search is the user: entries are keyed by the query text, so they also expire
 * after minutes instead of living "forever" (arbitrary queries would otherwise pile up). The tags
 * still expire an entry earlier when a page in its results changes.
 */
export const shortLivedSanityFetch: StrictDefinedFetchType = async (options) => {
  'use cache'
  cacheLife({ stale: 30, revalidate: 60, expire: 300 })
  return sanityFetch(options)
}

/**
 * Webhook mode: when set, the public site doesn't open live connections and cache
 * entries are expired by `/api/revalidate` instead (see README, "Webhook mode").
 * <SanityLive /> still runs in draft mode so previews stay live.
 */
export const revalidateSecret = process.env.SANITY_REVALIDATE_SECRET || undefined

/**
 * Cache tags for webhook mode, named after the document types the webhook reports.
 * Each fetch lists every type its result depends on (including resolved references).
 * Live mode ignores them and uses Sanity's own per-document sync tags.
 */
export const TAGS = {
  page: 'page',
  siteIdentity: 'siteIdentity',
  siteNavigation: 'siteNavigation',
  announcement: 'announcement',
  cookieBanner: 'cookieBanner',
  designSettings: 'designSettings',
  businessInfo: 'businessInfo',
  redirect: 'redirect',
  sharedSection: 'sharedSection',
  post: 'post',
  author: 'author',
  category: 'category',
  form: 'form',
  stripePrice: 'stripePrice',
  experiment: 'experiment',
  teamMember: 'teamMember',
  frame: 'frame',
  panel: 'panel',
  // new-document:tag
} as const

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
  return { perspective, variant, stega: true }
}
