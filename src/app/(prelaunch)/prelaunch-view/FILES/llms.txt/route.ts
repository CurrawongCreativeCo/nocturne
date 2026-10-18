import { getLaunchState } from '@/config/launch'
import { siteUrl } from '@/config/site-url'
import { getIndexablePages } from '@/features/pages/api/get-page'
import { getSettings } from '@/features/site/api/get-settings'
import { buildLlmsTxt } from '@/lib/llms-txt'
import { publicIndexablePages, publicPageUrl } from '@/lib/prelaunch-files'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * `/llms.txt` before launch: the site name, description and the public pages only, no posts. A 404
 * when Site settings turn AI crawlers off, as the normal file does. The proxy rewrites it here.
 */
export async function GET() {
  const [settings, index] = await Promise.all([getSettings(PUBLISHED), getIndexablePages()])
  if (settings?.allowAiCrawlers === false) return new Response('Not found', { status: 404 })

  const pages = publicIndexablePages(index, getLaunchState().visibleSlugs).map(
    ({ slug, title, description }) => ({
      title: title || slug,
      description,
      url: publicPageUrl(slug, siteUrl),
    }),
  )
  const text = buildLlmsTxt({
    title: settings?.title || 'Site',
    description: settings?.description,
    pages,
  })
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
