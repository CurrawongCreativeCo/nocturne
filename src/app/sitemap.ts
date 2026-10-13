import { BLOG_PATH } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getPostCount, getPostSitemap } from '@/features/blog/api/get-posts'
import { getPageCount, getPageSitemap } from '@/features/pages/api/get-page'
import { sitemapChunkCount, sitemapChunkRange, splitSitemapRange } from '@/lib/sitemap-chunks'

/**
 * One file per 45,000 URLs (see lib/sitemap-chunks.ts), over the list "all pages, then all posts".
 * `/sitemap.xml` is rewritten to the first file (see next.config.ts). The blog index joins the
 * first file once there is a post.
 */
export async function generateSitemaps() {
  const [pages, posts] = await Promise.all([getPageCount(), getPostCount()])
  return Array.from({ length: sitemapChunkCount(pages + posts) }, (_, id) => ({ id }))
}

export default async function sitemap(props: { id: Promise<string> }) {
  const id = Number(await props.id)
  const [pageTotal, postTotal] = await Promise.all([getPageCount(), getPostCount()])
  const { pages, posts } = splitSitemapRange(sitemapChunkRange(id), pageTotal)

  const [pageEntries, postEntries] = await Promise.all([
    getPageSitemap(pages),
    getPostSitemap(posts),
  ])
  const blogIndex =
    id === 0 && postTotal > 0 ? [{ url: new URL(BLOG_PATH, siteUrl).toString() }] : []
  return [...pageEntries, ...blogIndex, ...postEntries]
}
