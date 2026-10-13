import { siteLanguage } from '@/config/env'
import { FEED_PATH } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getFeedItems } from '@/features/blog/api/get-posts'
import { buildFeed } from '@/features/blog/utils/feed'
import { getSettings } from '@/features/site/api/get-settings'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * RSS 2.0 feed of the newest posts (one blog page's worth). Prerendered at build and refreshed
 * with the same cached, tagged queries as the blog index and Site settings: publishing a post, an
 * author or a category (or editing the site name) updates it, and it costs no extra request.
 */
export async function GET() {
  const [items, settings] = await Promise.all([getFeedItems(), getSettings(PUBLISHED)])
  const title = settings?.title || 'Site'

  const xml = buildFeed({
    title,
    description: settings?.description || title,
    language: siteLanguage,
    siteUrl: new URL('/', siteUrl).toString(),
    feedUrl: new URL(FEED_PATH, siteUrl).toString(),
    items,
  })
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
