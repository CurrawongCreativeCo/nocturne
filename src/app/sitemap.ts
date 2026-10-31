import { BLOG_PATH } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getPostCount, getPostSitemap } from '@/features/blog/api/get-posts'
import { getEventCount, getEventSitemap } from '@/features/events/api/event'
import { getPageCount, getPageSitemap } from '@/features/pages/api/get-page'
import { getServiceCount, getServiceSitemap } from '@/features/services/api/service'
import { getTeamCount, getTeamSitemap } from '@/features/team/api/team-member'
import { sitemapChunkCount, sitemapChunkRange, splitSitemapRanges } from '@/lib/sitemap-chunks'

/**
 * One file per 45,000 URLs (see lib/sitemap-chunks.ts), over the list "all pages, then all posts,
 * then all team profiles, then all events, then all services". `/sitemap.xml` is rewritten to the first file (see next.config.ts). The
 * blog index joins the first file once there is a post.
 */
export async function generateSitemaps() {
  const [pages, posts, team, events, services] = await Promise.all([
    getPageCount(),
    getPostCount(),
    getTeamCount(),
    getEventCount(),
    getServiceCount(),
  ])
  return Array.from(
    { length: sitemapChunkCount(pages + posts + team + events + services) },
    (_, id) => ({
      id,
    }),
  )
}

export default async function sitemap(props: { id: Promise<string> }) {
  const id = Number(await props.id)
  const [pageTotal, postTotal, teamTotal, eventTotal, serviceTotal] = await Promise.all([
    getPageCount(),
    getPostCount(),
    getTeamCount(),
    getEventCount(),
    getServiceCount(),
  ])
  const [pages, posts, team, events, services] = splitSitemapRanges(sitemapChunkRange(id), [
    pageTotal,
    postTotal,
    teamTotal,
    eventTotal,
    serviceTotal,
  ])

  const [pageEntries, postEntries, teamEntries, eventEntries, serviceEntries] = await Promise.all([
    getPageSitemap(pages),
    getPostSitemap(posts),
    getTeamSitemap(team),
    getEventSitemap(events),
    getServiceSitemap(services),
  ])
  const blogIndex =
    id === 0 && postTotal > 0 ? [{ url: new URL(BLOG_PATH, siteUrl).toString() }] : []
  return [
    ...pageEntries,
    ...blogIndex,
    ...postEntries,
    ...teamEntries,
    ...eventEntries,
    ...serviceEntries,
  ]
}
