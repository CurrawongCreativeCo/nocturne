import { slugToSegments } from '@/config/paths'
import { cachedSanityFetch, PUBLISHED, type FetchMode } from '@/lib/sanity/live'

import { PAGE_QUERY, PAGE_SLUGS_QUERY } from './queries'

/** Same cached fetch in both modes; `mode` (perspective, stega) is part of the cache key. */
export async function getPage({ slug, ...mode }: { slug: string } & FetchMode) {
  const { data } = await cachedSanityFetch({ query: PAGE_QUERY, params: { slug }, ...mode })
  return data
}

/** Route params for `generateStaticParams`. */
export async function getPageStaticParams() {
  const { data: slugs } = await cachedSanityFetch({ query: PAGE_SLUGS_QUERY, ...PUBLISHED, stega: false })
  const params = slugs.map((slug) => ({ slug: slugToSegments(slug) }))
  // Cache Components fails the build on an empty list; "/" always exists as a route.
  return params.some((p) => p.slug.length === 0) ? params : [{ slug: [] }, ...params]
}
