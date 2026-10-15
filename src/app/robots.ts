import type { MetadataRoute } from 'next'

import { studioUrl } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { getPostCount } from '@/features/blog/api/get-posts'
import { getPageCount } from '@/features/pages/api/get-page'
import { getSettings } from '@/features/site/api/get-settings'
import { getTeamCount } from '@/features/team/api/team-member'
import { AI_CRAWLERS } from '@/lib/ai-crawlers'
import { PUBLISHED } from '@/lib/sanity/live'
import { sitemapChunkCount } from '@/lib/sitemap-chunks'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [pages, posts, team, settings] = await Promise.all([
    getPageCount(),
    getPostCount(),
    getTeamCount(),
    getSettings(PUBLISHED),
  ])
  const count = sitemapChunkCount(pages + posts + team)
  // One file keeps the familiar /sitemap.xml; more than one lists every file.
  const paths =
    count === 1 ? ['/sitemap.xml'] : Array.from({ length: count }, (_, i) => `/sitemap/${i}.xml`)
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [studioUrl, '/api/'] },
      // A crawler follows the most specific group, so these never affect search engines.
      ...(settings?.allowAiCrawlers === false ? [{ userAgent: AI_CRAWLERS, disallow: '/' }] : []),
    ],
    sitemap: paths.map((path) => new URL(path, siteUrl).toString()),
  }
}
