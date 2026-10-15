import { BLOG_PATH } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getPostCount, getPostSitemap } from '@/features/blog/api/get-posts'
import { getPageCount, getPageSitemap } from '@/features/pages/api/get-page'
import { getTeamCount, getTeamSitemap } from '@/features/team/api/team-member'
import { sitemapChunkCount, sitemapChunkRange, splitSitemapRanges } from '@/lib/sitemap-chunks'

/**
 * One file per 45,000 URLs (see lib/sitemap-chunks.ts), over the list "all pages, then all posts,
 * then all team profiles". `/sitemap.xml` is rewritten to the first file (see next.config.ts). The
 * blog index joins the first file once there is a post.
 */
export async function generateSitemaps() {
  const [pages, posts, team] = await Promise.all([getPageCount(), getPostCount(), getTeamCount()])
  return Array.from({ length: sitemapChunkCount(pages + posts + team) }, (_, id) => ({ id }))
}

export default async function sitemap(props: { id: Promise<string> }) {
  const id = Number(await props.id)
  const [pageTotal, postTotal, teamTotal] = await Promise.all([
    getPageCount(),
    getPostCount(),
    getTeamCount(),
  ])
  const [pages, posts, team] = splitSitemapRanges(sitemapChunkRange(id), [
    pageTotal,
    postTotal,
    teamTotal,
  ])

  const [pageEntries, postEntries, teamEntries] = await Promise.all([
    getPageSitemap(pages),
    getPostSitemap(posts),
    getTeamSitemap(team),
  ])
  const blogIndex =
    id === 0 && postTotal > 0 ? [{ url: new URL(BLOG_PATH, siteUrl).toString() }] : []
  return [...pageEntries, ...blogIndex, ...postEntries, ...teamEntries]
}
