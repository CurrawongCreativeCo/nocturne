import { slugToPath } from '@/config/paths'

/**
 * The machine-readable files a pre-launch site serves instead of the normal ones (README, "Pre-launch
 * and launch"): a sitemap, robots.txt and llms.txt that name only the public pages. Pure builders, so
 * every case is unit tested; the handlers under `src/app/(prelaunch)/prelaunch-view/FILES` feed them
 * from the cached page index.
 */

export interface IndexedPage {
  slug: string
  title?: string | null
  description?: string | null
  _updatedAt?: string | null
  noIndex?: boolean | null
}

/**
 * The pages a pre-launch file may list: published (it is in the page index), not marked "Hide from
 * search engines", and on the profile's `visibleSlugs`, in that list's order. A homepage slug with no
 * published page, or a noindex one (the Coming soon template), is simply left out.
 */
export function publicIndexablePages(
  index: readonly IndexedPage[],
  visibleSlugs: readonly string[],
): IndexedPage[] {
  return visibleSlugs.flatMap((slug) => {
    const page = index.find((candidate) => candidate.slug === slug)
    return page && !page.noIndex ? [page] : []
  })
}

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[char] ?? char
  })

/** A page's absolute address at its real path: `/links`, never "/" (the temporary page is not the home page). */
export const publicPageUrl = (slug: string, siteUrl: string) =>
  new URL(slugToPath(slug), siteUrl).toString()

/** An empty list is a valid, empty `<urlset>`. */
export function buildPrelaunchSitemap(pages: readonly IndexedPage[], siteUrl: string): string {
  const entries = pages.map(({ slug, _updatedAt }) => {
    const modified = _updatedAt && !Number.isNaN(Date.parse(_updatedAt)) ? _updatedAt : null
    return [
      '  <url>',
      `    <loc>${escapeXml(publicPageUrl(slug, siteUrl))}</loc>`,
      ...(modified
        ? [`    <lastmod>${escapeXml(new Date(modified).toISOString())}</lastmod>`]
        : []),
      '  </url>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

/**
 * Today's rules (Studio and the API disallowed, and the AI crawlers when Site settings turn them
 * off), pointing at the one pre-launch sitemap.
 */
export function buildPrelaunchRobots({
  studioPath,
  sitemapUrl,
  blockedAiCrawlers,
}: {
  studioPath: string
  sitemapUrl: string
  /** User agents to refuse entirely; empty when AI crawlers are allowed. */
  blockedAiCrawlers: readonly string[]
}): string {
  const groups = [
    ['User-Agent: *', 'Allow: /', `Disallow: ${studioPath}`, 'Disallow: /api/'],
    ...(blockedAiCrawlers.length > 0
      ? [[...blockedAiCrawlers.map((agent) => `User-Agent: ${agent}`), 'Disallow: /']]
      : []),
    [`Sitemap: ${sitemapUrl}`],
  ]
  return `${groups.map((group) => group.join('\n')).join('\n\n')}\n`
}
