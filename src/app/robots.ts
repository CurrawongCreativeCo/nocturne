import type { MetadataRoute } from 'next'

import { studioUrl } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { getPostCount } from '@/features/blog/api/get-posts'
import { getPageCount } from '@/features/pages/api/get-page'
import { sitemapChunkCount } from '@/lib/sitemap-chunks'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [pages, posts] = await Promise.all([getPageCount(), getPostCount()])
  const count = sitemapChunkCount(pages + posts)
  // One file keeps the familiar /sitemap.xml; more than one lists every file.
  const paths =
    count === 1 ? ['/sitemap.xml'] : Array.from({ length: count }, (_, i) => `/sitemap/${i}.xml`)
  return {
    rules: { userAgent: '*', allow: '/', disallow: [studioUrl, '/api/'] },
    sitemap: paths.map((path) => new URL(path, siteUrl).toString()),
  }
}
