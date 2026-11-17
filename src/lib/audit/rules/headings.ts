import { fieldScope, h1FieldTarget } from '../content'
import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'

/**
 * One h1, and heading levels that do not skip (E2 §4; axe checks order in the browser, but
 * `launch:check` only counts h1s). Going from an h2 to an h4 is reported; starting a page on an h2
 * or going back up is not, since a header or footer may legitimately open with a lower level.
 */
export function headingFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const at = context.now
  const url = page.url
  const findings: Finding[] = []

  if (page.h1Count !== 1) {
    const field = h1FieldTarget(context.content)
    findings.push(
      makeFinding({
        ruleId: 'seo.h1-count',
        severity: 'error',
        scope: fieldScope(url, field),
        observed: {
          h1Count: page.h1Count,
          h1: page.headings.filter(({ level }) => level === 1).map(({ text }) => text),
        },
        expected: 1,
        source: 'html',
        at,
        why:
          page.h1Count === 0
            ? 'The page has no main heading, so screen reader users and search engines cannot tell what it is about.'
            : 'Several main headings make it unclear which one names the page.',
        fix: {
          summary:
            'Use one hero or heading section as the page title; later sections render as h2.',
          ...(field && { studioIntent: field.studioIntent }),
        },
      }),
    )
  }

  const skips: string[] = []
  page.headings.forEach((heading, index) => {
    const before = page.headings[index - 1]
    if (before && heading.level > before.level + 1) {
      skips.push(`h${before.level} → h${heading.level} “${heading.text}”`)
    }
  })
  if (skips.length > 0) {
    findings.push(
      makeFinding({
        ruleId: 'seo.heading-order',
        severity: 'warning',
        scope: { kind: 'page', url },
        observed: { skips },
        expected: 'each heading one level below the one before it, or higher',
        source: 'html',
        at,
        why: 'Screen reader users move around a page by its headings, and a skipped level suggests content is missing.',
        fix: {
          summary:
            'Change the heading level in the section’s settings so it follows the heading before it.',
        },
      }),
    )
  }
  return findings
}
