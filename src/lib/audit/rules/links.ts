import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'
import { normaliseUrl, pathOf, resolveUrl } from '../url'

/** Paths that are the site's machinery, not pages: Studio, the API, the build's assets, calendar files. */
const NOT_PAGES = /^\/(studio|api|_next)(\/|$)|\.(ics|xml|txt|pdf|zip)$/i

/**
 * The same-site pages this page links to, as absolute URLs without fragments, in document order and
 * without duplicates or the page itself. `mailto:`, `tel:`, in-page `#anchors`, other sites, and the
 * machinery paths are left out. The audit script requests each of these; `internalBrokenFindings`
 * judges the answers.
 */
export function internalLinks(
  hrefs: readonly string[],
  pageUrl: string,
  publicUrl: string = pageUrl,
): string[] {
  const own = normaliseUrl(pageUrl)
  const origin = new URL(pageUrl).origin
  const publicOrigin = new URL(publicUrl).origin
  const seen = new Set<string>([own])
  const targets: string[] = []
  for (const href of hrefs) {
    if (/^(mailto|tel|sms|javascript|data|blob):/i.test(href) || href.startsWith('#')) continue
    let resolved = resolveUrl(href, pageUrl)
    // A preview or local server is audited under its own host, but its links name the production one.
    if (resolved?.origin === publicOrigin && publicOrigin !== origin) {
      resolved = new URL(`${resolved.pathname}${resolved.search}`, origin)
    }
    if (resolved?.origin !== origin || NOT_PAGES.test(resolved.pathname)) continue
    resolved.hash = ''
    const key = normaliseUrl(resolved.href)
    if (seen.has(key)) continue
    seen.add(key)
    targets.push(resolved.href)
  }
  return targets
}

/** Gone, or the server failed: a visitor following the link gets nothing. 401 and 403 are gated pages, not broken ones. */
const isBroken = (status: number) =>
  status === 0 || status === 404 || status === 410 || status >= 500

/**
 * `links.internal-broken` (E2 §4): internal links on the rendered page that do not resolve. Only the
 * links the audit actually requested are judged (`context.links`).
 */
export function internalBrokenFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const checked = internalLinks(page.links, page.url, page.publicUrl).filter(
    (url) => context.links[url],
  )
  const broken = checked.flatMap((url) => {
    const answer = context.links[url]
    return answer && isBroken(answer.status)
      ? [{ link: pathOf(url), status: answer.status, ...(answer.error && { error: answer.error }) }]
      : []
  })
  if (broken.length === 0) return []
  return [
    makeFinding({
      ruleId: 'links.internal-broken',
      severity: 'error',
      scope: { kind: 'page', url: page.url },
      observed: broken,
      expected: 'every internal link answers 2xx or redirects to a page that does',
      source: 'html',
      at: context.now,
      caveats: [
        `${checked.length} internal link${checked.length === 1 ? '' : 's'} requested with HEAD.`,
      ],
      why: 'Visitors and crawlers following these links reach an error page.',
      fix: {
        summary:
          'Publish the page the link points to, or change the link. Content health lists the links to unpublished pages by document.',
      },
    }),
  ]
}
