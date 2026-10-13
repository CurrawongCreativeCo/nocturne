import type { MetadataRoute } from 'next'

import { studioUrl } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { getSitemapCount } from '@/features/pages/api/get-page'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const count = await getSitemapCount()
  // One file keeps the familiar /sitemap.xml; more than one lists every file.
  const paths =
    count === 1 ? ['/sitemap.xml'] : Array.from({ length: count }, (_, i) => `/sitemap/${i}.xml`)
  return {
    rules: { userAgent: '*', allow: '/', disallow: [studioUrl, '/api/'] },
    sitemap: paths.map((path) => new URL(path, siteUrl).toString()),
  }
}
