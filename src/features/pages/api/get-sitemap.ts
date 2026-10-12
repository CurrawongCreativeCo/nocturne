import type { MetadataRoute } from 'next'

import { siteUrl } from '@/config/env'
import { slugToPath } from '@/config/paths'
import { cachedSanityFetch, PUBLISHED } from '@/lib/sanity/live'

import { SITEMAP_QUERY } from './queries'

export async function getSitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await cachedSanityFetch({ query: SITEMAP_QUERY, ...PUBLISHED, stega: false })
  return data.map(({ slug, _updatedAt }) => ({
    url: new URL(slugToPath(slug), siteUrl).toString(),
    lastModified: new Date(_updatedAt),
  }))
}
