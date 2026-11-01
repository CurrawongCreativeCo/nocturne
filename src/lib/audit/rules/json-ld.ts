import {
  findDraftIds,
  findIdProblems,
  findMissingWebPage,
  findUnresolvedReferences,
  findWebPageProblems,
  parseJsonLd,
  siteGraphIds,
  type JsonLdNode,
} from '@/lib/json-ld-visibility'
import { checkParity } from '@/lib/structured-data/parity'

import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'

/** The page's own nodes (a page's scripts, flattened). */
export const pageNodes = (page: Pick<PageSnapshot, 'jsonLd'>): JsonLdNode[] =>
  parseJsonLd(page.jsonLd).nodes

/** `sd.json-ld-invalid`: a script that is not JSON is ignored by every search engine. */
export function jsonLdParseFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const { errors } = parseJsonLd(page.jsonLd)
  if (errors.length === 0) return []
  return [
    makeFinding({
      ruleId: 'sd.json-ld-invalid',
      severity: 'error',
      scope: { kind: 'page', url: page.url },
      observed: { errors, scripts: page.jsonLd.length },
      expected: 'every application/ld+json script parses as JSON',
      source: 'json-ld',
      at: context.now,
      why: 'A script that is not valid JSON is skipped whole, so the page loses everything it says about itself.',
      fix: {
        summary:
          'Structured data is built by src/lib/structured-data/; find the emitter that wrote this script (look for a hand-written JSON-LD).',
      },
    }),
  ]
}

/**
 * `sd.visible-parity` (E2 §3.5): what the JSON-LD says about visible facts, descriptive text and
 * reach is checked against what the page shows, by property class, by the same helper the
 * end-to-end spec uses. The page's text is read from the server HTML, with closed accordions
 * included (their text is in the markup) and the title and description added.
 */
export function visibleParityFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const nodes = pageNodes(page)
  if (nodes.length === 0) return []
  const siteText = [page.visibleText, ...context.peers.map((peer) => peer.visibleText)].join('\n')
  const problems = checkParity(nodes, {
    text: page.visibleText,
    siteText,
    origin: context.origin,
    siteDetails: !page.minimal,
    ...(context.site?.businessType && { businessType: context.site.businessType }),
  })
  // A site-wide fact (the WebSite's description, an area served) only has to be shown somewhere on the
  // site. With no other page read, "somewhere" is just this page, so claiming it is missing would be a
  // guess: leave those out and say so. `--sample` reads more pages.
  const siteWide = (problem: (typeof problems)[number]) =>
    problem.property === 'WebSite.description' || problem.reason.includes('anywhere on the site')
  const found =
    context.peers.length === 0 ? problems.filter((problem) => !siteWide(problem)) : problems
  const skipped = problems.length - found.length
  if (found.length === 0) return []
  return [
    makeFinding({
      ruleId: 'sd.visible-parity',
      severity: 'error',
      scope: { kind: 'page', url: page.url },
      observed: found,
      expected: 'every fact in the structured data is shown on the page',
      source: 'json-ld',
      at: context.now,
      caveats: [
        'Facts that need only appear somewhere on the site were looked for on this page and the compared pages only.',
        ...(skipped > 0
          ? [`${skipped} site-wide fact(s) were not judged: no other page was read (use --sample).`]
          : []),
        ...(page.minimal
          ? [
              'This is a Minimal page, so its header and footer (and the details in them) are hidden.',
            ]
          : []),
      ],
      why: 'Search engines ask structured data to describe what visitors can see, and may ignore a page whose data disagrees with its text.',
      fix: {
        summary:
          'Make the visible text and the structured data agree. Both come from the same Studio fields (Business info, the page), so correct the field rather than the text.',
      },
    }),
  ]
}

/**
 * `sd.graph-integrity` (E2 §3.5, point 3): one definition per `@id` on the page, no contradictions
 * with the compared pages, every reference resolving to a node on the page or one every page
 * carries, every WebPage part of the website and published by the organisation, a WebPage for the
 * page itself, and no draft or release-version ids.
 */
export function graphIntegrityFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const nodes = pageNodes(page)
  if (nodes.length === 0 && page.jsonLd.length > 0) return []
  const peerNodes = context.peers.map((peer) => ({ url: peer.url, nodes: pageNodes(peer) }))
  const siteGraph = siteGraphIds([nodes, ...peerNodes.map((peer) => peer.nodes)])
  // A noIndex page makes no claim to be a public page, so it carries no WebPage node.
  const hidden = page.noindex.meta || page.noindex.header
  const prefix = `${page.url}: `
  const problems = [
    // This page goes last: findIdProblems reports a clash against the earlier pages on the later one.
    ...findIdProblems({
      ...Object.fromEntries(peerNodes.map((peer) => [peer.url, peer.nodes])),
      [page.url]: nodes,
    })
      .filter((problem) => problem.startsWith(prefix))
      .map((problem) => problem.slice(prefix.length)),
    ...findUnresolvedReferences(nodes, siteGraph),
    ...findWebPageProblems(nodes, context.origin),
    ...(hidden ? [] : findMissingWebPage(nodes, page.publicUrl)),
    ...findDraftIds(nodes),
  ]
  if (problems.length === 0) return []
  return [
    makeFinding({
      ruleId: 'sd.graph-integrity',
      severity: 'error',
      scope: { kind: 'page', url: page.url },
      observed: problems,
      expected: 'unique, resolving ids and a WebPage that belongs to the website',
      source: 'json-ld',
      at: context.now,
      caveats: [
        `Site-wide nodes were found by comparing with ${context.peers.length} other page${context.peers.length === 1 ? '' : 's'}.`,
      ],
      why: 'Search engines merge facts by @id, so a duplicated, contradictory or dangling id splits one thing into several or leaves a reference pointing at nothing.',
      fix: {
        summary:
          'Ids come from src/lib/structured-data/ids.ts and pages render their WebPage with WebPageJsonLd; find the emitter that builds this node by hand.',
      },
    }),
  ]
}
