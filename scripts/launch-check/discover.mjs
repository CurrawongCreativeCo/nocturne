/** Finds the pages to check: every sitemap URL (capped), re-based onto the site's own origin. */
import { MAX_SITEMAP_URLS, loadSitemapUrls, parseRobots } from './seo.mjs'

/** Sitemap files named in robots.txt, or the conventional /sitemap.xml. */
export function sitemapLocations(robotsText, origin) {
  const listed = parseRobots(robotsText ?? '').sitemaps
  return listed.length > 0 ? listed : [`${origin}/sitemap.xml`]
}

/** Keeps the path and query of a URL but puts it on `origin`, so a wrong host in a sitemap can't redirect the crawl. */
export function onOrigin(url, origin) {
  const parsed = new URL(url)
  return new URL(`${parsed.pathname}${parsed.search}`, origin).toString()
}

export async function discoverPages({ origin, robotsText, request, cap = MAX_SITEMAP_URLS }) {
  const sitemapUrls = sitemapLocations(robotsText, origin).map((url) => onOrigin(url, origin))
  const get = async (url) => {
    const response = await request(url, { follow: true })
    return { status: response.status, text: response.text, error: response.error }
  }
  const loaded = await loadSitemapUrls({ sitemapUrls, get, cap })
  return loaded
}
