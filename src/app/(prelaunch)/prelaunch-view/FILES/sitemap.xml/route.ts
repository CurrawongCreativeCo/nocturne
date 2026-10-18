import { getLaunchState } from '@/config/launch'
import { siteUrl } from '@/config/site-url'
import { getIndexablePages } from '@/features/pages/api/get-page'
import { buildPrelaunchSitemap, publicIndexablePages } from '@/lib/prelaunch-files'

/**
 * `/sitemap.xml` before launch: the proxy rewrites it here (the normal sitemap lists every page). One
 * file with the public pages that are published and not hidden from search engines, at their real
 * paths (`/links`, never "/"). From the cached page index, so it costs no request. Empty but valid
 * when none qualifies. The `FILES` folder has capitals because no page slug can.
 */
export async function GET() {
  const pages = publicIndexablePages(await getIndexablePages(), getLaunchState().visibleSlugs)
  return new Response(buildPrelaunchSitemap(pages, siteUrl), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
