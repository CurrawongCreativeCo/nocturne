import { fieldScope, metaFieldTarget } from '../content'
import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'
import { pathOf } from '../url'

const fold = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

function peersWith(
  value: string,
  page: PageSnapshot,
  context: AuditContext,
  read: (peer: AuditContext['peers'][number]) => string,
) {
  const wanted = fold(value)
  return context.peers
    .filter((peer) => peer.url !== page.url && fold(read(peer)) === wanted)
    .map((peer) => pathOf(peer.url))
}

/**
 * Title and description: present, and not used by another page in the sample (E2 §4 and rule F-5,
 * the exact-match half). The comparison covers the home page and the sampled sitemap pages only, and
 * says so in `caveats`, so "unique" is never claimed about pages the audit did not read.
 */
export function metadataFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const at = context.now
  const url = page.url
  const compared = [
    `Compared with ${context.peers.length} other page${context.peers.length === 1 ? '' : 's'} (the home page and any sampled sitemap pages). Run with --sample=N to compare with more.`,
  ]
  const findings: Finding[] = []

  const titleField = metaFieldTarget(context.content, 'title')
  if (!page.title.trim()) {
    findings.push(
      makeFinding({
        ruleId: 'seo.title-missing',
        severity: 'error',
        scope: fieldScope(url, titleField),
        observed: { title: page.title },
        expected: 'a title',
        source: 'html',
        at,
        why: 'The page title is the headline of the search result and the browser tab; without one, search engines make one up.',
        fix: {
          summary: 'Give the page a title in Studio (page → SEO).',
          ...(titleField && { studioIntent: titleField.studioIntent }),
        },
      }),
    )
  } else {
    const alsoOn = peersWith(page.title, page, context, (peer) => peer.title)
    if (alsoOn.length > 0) {
      findings.push(
        makeFinding({
          ruleId: 'seo.title-duplicate',
          severity: 'error',
          scope: fieldScope(url, titleField),
          observed: { title: page.title, alsoOn },
          expected: 'a title no other page uses',
          source: 'html',
          at,
          caveats: compared,
          why: 'Two pages with the same title look like one to a searcher, and search engines pick one of them to show.',
          fix: {
            summary: 'Give each page its own SEO title in Studio (page → SEO).',
            ...(titleField && { studioIntent: titleField.studioIntent }),
          },
        }),
      )
    }
  }

  const descriptionField = metaFieldTarget(context.content, 'description')
  if (!page.description.trim()) {
    findings.push(
      makeFinding({
        ruleId: 'seo.description-missing',
        severity: 'warning',
        scope: fieldScope(url, descriptionField),
        observed: { description: page.description },
        expected: 'a meta description',
        source: 'html',
        at,
        why: 'Without a description, search engines choose their own snippet from the page, which is rarely the best one.',
        fix: {
          summary: 'Add a meta description in Studio (page → SEO).',
          ...(descriptionField && { studioIntent: descriptionField.studioIntent }),
        },
      }),
    )
  } else {
    const alsoOn = peersWith(page.description, page, context, (peer) => peer.description)
    if (alsoOn.length > 0) {
      findings.push(
        makeFinding({
          ruleId: 'seo.description-duplicate',
          severity: 'warning',
          scope: fieldScope(url, descriptionField),
          observed: { description: page.description, alsoOn },
          expected: 'a description no other page uses',
          source: 'html',
          at,
          caveats: compared,
          why: 'The same description on two pages gives a searcher no reason to choose one over the other.',
          fix: {
            summary: 'Write a different meta description for each page in Studio (page → SEO).',
            ...(descriptionField && { studioIntent: descriptionField.studioIntent }),
          },
        }),
      )
    }
  }
  return findings
}
