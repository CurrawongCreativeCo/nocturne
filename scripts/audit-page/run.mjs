/**
 * The audit's fetching: reads a page and what surrounds it (robots.txt, the sitemap, the home page,
 * sampled pages, the page's internal links, its canonical and llms.txt), reads the page's published
 * document when a client is given, and hands it all to the pure rules in src/lib/audit/. The only
 * network code is the `net` and `sanity` it is given, so the tests run it against a fake site. Every
 * request to the site goes through the guard (guard.mjs): GET and HEAD only, and only to the origin
 * that was asked for. The content client cannot write (sanity.mjs).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { AuditRefusal, createGuardedNet, LIMITS, permittedOrigins } from './guard.mjs'
import { buildSnapshot, peerOf } from './snapshot.mjs'
import { discoverPages, onOrigin } from '../launch-check/discover.mjs'
import { mapLimit } from '../launch-check/pool.mjs'
import { parseRobots } from '../launch-check/seo.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})
const lib = (path) => jiti.import(join(root, 'src/lib/audit', path))
const { auditPage, auditSite, buildReport } = await lib('page-audit.ts')
const { internalLinks } = await lib('rules/links.ts')
const { normaliseUrl, resolveUrl } = await lib('url.ts')
const { PAGE_CONTENT_QUERY, SITE_CONTENT_QUERY, contentParams, documentCandidates, pickDocument } =
  await lib('content.ts')

const noop = () => undefined
const CONCURRENCY = 6
/** Internal links requested in one audit, across every audited page. */
export const MAX_LINKS = 150

const sameUrl = (a, b) => normaliseUrl(a) === normaliseUrl(b)

/** The URLs a Markdown llms.txt links to. */
export function llmsTxtUrls(text) {
  return [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1])
}

async function probeLink(request, url) {
  let response = await request(url, { method: 'HEAD' })
  // Some servers refuse HEAD but serve the same page to GET.
  if (response.status === 405 || response.status === 501) response = await request(url)
  // A request the guard did not send says nothing about the link.
  if (response.refused) return null
  const location = response.headers?.location
  return {
    status: response.status,
    ...(location && { redirectedTo: new URL(location, url).href }),
    ...(response.error && { error: response.error }),
  }
}

/**
 * Audits `target` (an absolute page URL), and with `sample` > 0 also the home page and that many
 * sitemap pages. `expectOrigin` is the production origin when a preview or local server is audited:
 * the pages' canonicals and JSON-LD name it, so they are judged against it, not against the host
 * asked; it is **not** a permitted origin, and nothing is ever requested from it. `net` is the raw
 * network (`{ request }`), which the guard wraps. `sanity` is a read client (`query`) or null.
 * Throws `AuditRefusal` when the page asked for redirects to another origin. Returns
 * `{ report, notes, pages, network }`; `report.findings` is ordered by the rule of E2 §6.
 */
export async function runPageAudit({
  target,
  sample = 0,
  expectOrigin,
  net,
  sanity = null,
  skippedContent = '',
  now = new Date().toISOString(),
  limits = LIMITS,
  clock = Date.now,
  log = noop,
}) {
  const guard = createGuardedNet({
    request: net.request,
    allowed: permittedOrigins(target),
    limits,
    now: clock,
  })
  const { request, followRedirects } = guard
  const notes = []

  log('Fetching the page…')
  const fetchedTarget = await followRedirects(target)
  if (fetchedTarget.leftOrigin) {
    throw new AuditRefusal(
      `${target} redirects to ${fetchedTarget.leftOrigin}, which is outside the permitted origin ${new URL(target).origin}. Audit the address it redirects to.`,
    )
  }
  const targetSnapshot = buildSnapshot({
    requestedUrl: target,
    chain: fetchedTarget.chain,
    final: fetchedTarget.final,
    publicOrigin: expectOrigin,
  })
  // Requests go to the host that answered; the JSON-LD ids and canonicals are the production origin's.
  const fetchOrigin = new URL(fetchedTarget.final.url).origin
  guard.pin(fetchOrigin)
  const origin = expectOrigin ?? fetchOrigin
  const context = { now, origin, peers: [], robots: null, links: {}, content: null, site: null }

  // The page could not be read at all: nothing else can be said, and the one finding is a blocker.
  if (fetchedTarget.final.error) {
    const findings = auditPage(targetSnapshot, context)
    return {
      report: buildReport(target, now, findings),
      notes: ['The page could not be fetched, so nothing else was checked.'],
      pages: [targetSnapshot.url],
      network: networkOf(guard),
    }
  }

  log('Reading robots.txt and the sitemap…')
  const robots = await request(`${fetchOrigin}/robots.txt`, { follow: true })
  const robotsGroups = robots.status === 200 ? parseRobots(robots.text).groups : null
  const sitemap = await discoverPages({ origin: fetchOrigin, robotsText: robots.text, request })
  if (sitemap.problems.length > 0 && sitemap.urls.length === 0) {
    notes.push('The sitemap could not be read, so no sitemap pages were compared.')
  }

  const home = `${fetchOrigin}/`
  const sampled = sitemap.urls
    .map((url) => onOrigin(url, fetchOrigin))
    .filter((url) => !sameUrl(url, target) && !sameUrl(url, home))
    .filter((url, index, all) => all.findIndex((other) => sameUrl(other, url)) === index)
    .slice(0, sample)
  const others = [...(sameUrl(home, target) ? [] : [home]), ...sampled]

  log(`Fetching ${others.length} other page${others.length === 1 ? '' : 's'} to compare with…`)
  const fetchedAll = await mapLimit(others, CONCURRENCY, async (url) => {
    const fetched = await followRedirects(url)
    // A page the guard would not request (over the limits) is left out, not reported as failing.
    if (fetched.final.refused) return null
    return buildSnapshot({
      requestedUrl: url,
      chain: fetched.chain,
      final: fetched.final,
      publicOrigin: expectOrigin,
    })
  })
  const fetchedOthers = fetchedAll.filter((snapshot) => snapshot !== null)
  if (fetchedOthers.length < others.length) {
    notes.push(
      `${others.length - fetchedOthers.length} page(s) were left out: the audit's limits were reached.`,
    )
  }
  const snapshots = [targetSnapshot, ...fetchedOthers]
  // Without --sample only the page asked about is judged; the home page is only there to compare with.
  const audited = sample > 0 ? snapshots : [targetSnapshot]

  log('Reading the content…')
  let site = null
  const contentByUrl = new Map()
  if (sanity) {
    try {
      const siteContent = await sanity.query(SITE_CONTENT_QUERY)
      site = siteContent ?? null
      for (const snapshot of audited) {
        if (snapshot.status !== 200) continue
        const candidates = documentCandidates(new URL(snapshot.url).pathname)
        const documents = await sanity.query(PAGE_CONTENT_QUERY, contentParams(candidates))
        contentByUrl.set(snapshot.url, pickDocument(candidates, documents ?? []))
      }
    } catch (error) {
      notes.push(
        `The content side stopped: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  } else if (skippedContent) notes.push(skippedContent)

  log('Checking canonical links…')
  const canonicalByUrl = new Map()
  for (const snapshot of audited) {
    const href = snapshot.canonical.trim()
      ? resolveUrl(snapshot.canonical.trim(), snapshot.publicUrl)
      : null
    if (!href || href.origin !== new URL(snapshot.publicUrl).origin) continue
    if (sameUrl(href.href, snapshot.publicUrl)) continue
    const actual = new URL(`${href.pathname}${href.search}`, fetchOrigin).href
    const response = await request(actual)
    if (response.refused) continue
    const location = response.headers?.location
    canonicalByUrl.set(snapshot.url, {
      status: response.status,
      ...(location && { redirectedTo: new URL(location, actual).href }),
      ...(response.error && { error: response.error }),
    })
  }

  log('Checking internal links…')
  const wanted = [
    ...new Set(
      audited.flatMap((snapshot) =>
        snapshot.status === 200
          ? internalLinks(snapshot.links, snapshot.url, snapshot.publicUrl)
          : [],
      ),
    ),
  ]
  const toCheck = wanted.slice(0, MAX_LINKS)
  if (wanted.length > toCheck.length) {
    notes.push(
      `Only the first ${toCheck.length} of ${wanted.length} internal links were requested.`,
    )
  }
  const answers = await mapLimit(toCheck, CONCURRENCY, (url) => probeLink(request, url))
  const links = Object.fromEntries(
    toCheck.flatMap((url, index) => (answers[index] ? [[url, answers[index]]] : [])),
  )
  const unchecked = answers.filter((answer) => answer === null).length
  if (unchecked > 0)
    notes.push(`${unchecked} link(s) were not requested: the audit's limits were reached.`)

  log('Checking llms.txt…')
  const llms = await request(`${fetchOrigin}/llms.txt`, { follow: true })
  const llmsTxt = llms.status === 200 && llms.text ? { urls: llmsTxtUrls(llms.text) } : null

  const findings = [
    ...audited.flatMap((snapshot) =>
      auditPage(snapshot, {
        now,
        origin,
        peers: snapshots.filter((other) => other !== snapshot).map(peerOf),
        robots: robotsGroups ? { groups: robotsGroups } : null,
        ...(canonicalByUrl.has(snapshot.url) && { canonical: canonicalByUrl.get(snapshot.url) }),
        links,
        content: contentByUrl.get(snapshot.url) ?? null,
        site,
      }),
    ),
    ...auditSite({
      now,
      origin,
      robots: robotsGroups ? { groups: robotsGroups } : null,
      sitemap: sitemap.urls.length > 0 ? { urls: sitemap.urls, capped: sitemap.capped } : null,
      llmsTxt,
      site,
    }),
  ]
  const network = networkOf(guard)
  if (network.refused.length > 0) {
    const shown = network.refused.slice(0, 3).map(({ url }) => url)
    notes.push(
      `${network.refused.length} request(s) were not sent because they were outside ${network.permitted.join(' or ')} or over the limits (${shown.join(', ')}${network.refused.length > 3 ? ', …' : ''}).`,
    )
  }
  return {
    report: buildReport(target, now, findings),
    notes,
    pages: audited.map((snapshot) => snapshot.url),
    network,
  }
}

/** What the audit was allowed to touch and did: for `audit.json`, so the boundary is on the record. */
function networkOf(guard) {
  const { sent, permitted, refused } = guard.stats()
  return { permitted, requests: sent, refused }
}
