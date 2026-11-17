import { metaFieldTarget, fieldScope } from '../content'
import { makeFinding, type Finding } from '../finding'
import { isAllowed } from '../robots'
import type { AuditContext, PageSnapshot } from '../types'
import { normaliseUrl, pathOf, resolveUrl } from '../url'

/**
 * Can a search engine index this page? (E2 §4, "Indexable: status, noindex, robots, canonical to
 * self".) Reports, in this order and stopping at the first that makes the rest meaningless:
 *
 *  - the page does not answer 200 (`seo.status`, nothing else is worth saying);
 *  - noindex in the robots meta tag or the `X-Robots-Tag` header (`seo.noindex`). A page the
 *    editor hid on purpose (its "Hide from search engines" switch is on) is a suggestion, not a
 *    blocker;
 *  - robots.txt disallowing the path for Googlebot (`seo.robots-blocked`);
 *  - the canonical link: missing, pointing at a different page, or pointing at an address that
 *    redirects or fails (`seo.canonical-*`). A self-canonical needs no further request, since the
 *    page itself just answered 200.
 */
export function indexabilityFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  const at = context.now
  const url = page.url
  const findings: Finding[] = []

  if (page.error || page.status !== 200) {
    return [
      makeFinding({
        ruleId: 'seo.status',
        severity: 'blocker',
        scope: { kind: 'page', url },
        observed: {
          status: page.status,
          ...(page.error && { error: page.error }),
          redirects: page.redirects,
        },
        expected: 200,
        source: 'headers',
        at,
        why: 'A page that does not answer 200 is not indexed, and visitors following a link to it reach an error.',
        fix: {
          summary:
            'Publish the page in Studio, or find out why the server fails (the deployment logs).',
        },
      }),
    ]
  }

  const noindexSource = page.noindex.header ? 'headers' : 'html'
  if (page.noindex.meta || page.noindex.header) {
    const hiddenOnPurpose = context.content?.seo?.noIndex === true
    const field = metaFieldTarget(context.content, 'noIndex')
    findings.push(
      makeFinding({
        ruleId: 'seo.noindex',
        severity: hiddenOnPurpose ? 'suggestion' : 'blocker',
        scope: fieldScope(url, field),
        observed: {
          robotsMeta: page.robotsMeta || null,
          xRobotsTag: page.xRobotsTag || null,
        },
        expected: 'no noindex',
        source: noindexSource,
        at,
        caveats: hiddenOnPurpose
          ? ['"Hide from search engines" is on for this page in Studio, so this looks deliberate.']
          : [
              context.content
                ? 'The page’s "Hide from search engines" switch is off, so something else sets noindex (a header, or code).'
                : 'The audit could not read the page’s document, so it cannot tell whether this is deliberate.',
            ],
        why: 'Search engines and AI search that follow them leave a noindex page out of their results.',
        fix: {
          summary: hiddenOnPurpose
            ? 'Nothing to do if the page should stay hidden; otherwise clear "Hide from search engines".'
            : 'Clear "Hide from search engines" on the page in Studio, and check no X-Robots-Tag header is set.',
          ...(field && { studioIntent: field.studioIntent }),
        },
      }),
    )
  }

  const path = pathOf(url)
  if (context.robots && !isAllowed(context.robots.groups, 'googlebot', path)) {
    findings.push(
      makeFinding({
        ruleId: 'seo.robots-blocked',
        severity: 'blocker',
        scope: { kind: 'page', url },
        observed: { path, allowedForGooglebot: false },
        expected: 'allowed',
        source: 'headers',
        at,
        why: 'robots.txt tells search crawlers not to fetch this page, so it cannot be read or indexed.',
        fix: {
          summary:
            'Remove the rule that covers this path from robots.txt (src/app/robots.ts allows everything except Studio and /api/).',
        },
      }),
    )
  }

  findings.push(...canonicalFindings(page, context))
  return findings
}

function canonicalFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  const at = context.now
  const url = page.url
  const canonical = page.canonical.trim() ? resolveUrl(page.canonical.trim(), page.publicUrl) : null

  if (!canonical) {
    return [
      makeFinding({
        ruleId: 'seo.canonical-missing',
        severity: 'warning',
        scope: { kind: 'page', url },
        observed: { canonical: page.canonical || null },
        expected: 'a link rel="canonical" naming this page',
        source: 'html',
        at,
        why: 'Without a canonical link, search engines choose between this page’s address variants themselves.',
        fix: {
          summary: 'Pages declare their canonical URL in generateMetadata; check this route does.',
        },
      }),
    ]
  }

  if (normaliseUrl(canonical.href) === normaliseUrl(page.publicUrl)) return []

  const sameSite = canonical.origin === new URL(page.publicUrl).origin
  const answer = context.canonical
  if (sameSite && answer && (answer.status !== 200 || answer.error)) {
    return [
      makeFinding({
        ruleId: 'seo.canonical-status',
        severity: 'blocker',
        scope: { kind: 'page', url },
        observed: {
          canonical: canonical.href,
          status: answer.status,
          ...(answer.redirectedTo && { redirectedTo: answer.redirectedTo }),
          ...(answer.error && { error: answer.error }),
        },
        expected: 'a canonical that answers 200 directly',
        source: 'headers',
        at,
        why: 'Search engines are told this page’s preferred address is one that redirects or fails, so they may drop both.',
        fix: {
          summary: answer.redirectedTo
            ? `Point the canonical at ${answer.redirectedTo}, the address it redirects to, or at this page.`
            : 'Point the canonical at this page, or at a page that exists.',
        },
      }),
    ]
  }

  return [
    makeFinding({
      ruleId: 'seo.canonical-elsewhere',
      severity: 'warning',
      scope: { kind: 'page', url },
      observed: { canonical: canonical.href, page: url },
      expected: 'the page’s own address',
      source: 'html',
      at,
      caveats: [
        'A canonical that names another page is right for a deliberate duplicate; the audit cannot tell.',
        ...(sameSite ? [] : ['The canonical is on another domain, so it was not fetched.']),
      ],
      why: 'Search engines are asked to index the other address instead of this page, so this page is left out of the results.',
      fix: {
        summary:
          'Make the canonical this page’s own address unless this page is a deliberate copy.',
      },
    }),
  ]
}
