import { studioUrl } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { getSettings } from '@/features/site/api/get-settings'
import { AI_CRAWLERS } from '@/lib/ai-crawlers'
import { buildPrelaunchRobots } from '@/lib/prelaunch-files'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * `/robots.txt` before launch: today's rules (Studio and /api disallowed, the AI crawler setting from
 * Site settings) pointing at the one pre-launch `/sitemap.xml`. The proxy rewrites it here.
 */
export async function GET() {
  const settings = await getSettings(PUBLISHED)
  const text = buildPrelaunchRobots({
    studioPath: studioUrl,
    sitemapUrl: new URL('/sitemap.xml', siteUrl).toString(),
    blockedAiCrawlers: settings?.allowAiCrawlers === false ? AI_CRAWLERS : [],
  })
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
