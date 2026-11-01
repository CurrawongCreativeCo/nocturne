import { AI_CRAWLERS } from '@/lib/ai-crawlers'

import { makeFinding, type Finding } from '../finding'
import { isAllowed, readDirectives } from '../robots'
import type { AuditContext, PageSnapshot, SiteAuditContext } from '../types'
import { normaliseUrl } from '../url'

/** A share of the main text under data-nosnippet at or above this is "the main content". */
export const NOSNIPPET_SHARE = 0.5

const hidden = (page: PageSnapshot) => page.noindex.meta || page.noindex.header

/**
 * AI-search readiness for one page (E2 §8.2): nothing technical stops a search or answer engine
 * reading the page and quoting it. Readiness is not visibility; it proves nothing prevents inclusion,
 * not that the page is cited. A noindex page is reported by `seo.noindex`, so is skipped here.
 *
 *  - `ai.snippet-blocked`: `nosnippet`, a `max-snippet` limit, or `data-nosnippet` over at least
 *    half the main text. Deliberate limits are legitimate, so it is a warning with a caveat.
 *  - `ai.main-text-missing`: the `<main>` of the server HTML is empty or absent, so a crawler that
 *    does not run JavaScript reads nothing.
 */
export function aiReadinessFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200 || hidden(page)) return []
  const at = context.now
  const url = page.url
  const findings: Finding[] = []

  const directives = readDirectives(page.robotsMeta, page.xRobotsTag)
  const share = page.main.words > 0 ? page.main.nosnippetWords / page.main.words : 0
  const reasons = [
    ...(directives.nosnippet ? ['nosnippet'] : []),
    ...(directives.maxSnippet !== null && directives.maxSnippet > 0
      ? [`max-snippet:${directives.maxSnippet}`]
      : []),
    ...(share >= NOSNIPPET_SHARE
      ? [`data-nosnippet on ${Math.round(share * 100)}% of the main text`]
      : []),
  ]
  if (reasons.length > 0) {
    findings.push(
      makeFinding({
        ruleId: 'ai.snippet-blocked',
        severity: 'warning',
        scope: { kind: 'page', url },
        observed: {
          directives: reasons,
          robotsMeta: page.robotsMeta || null,
          xRobotsTag: page.xRobotsTag || null,
          mainWords: page.main.words,
          nosnippetWords: page.main.nosnippetWords,
        },
        expected: 'no snippet limits on the main content',
        source: page.xRobotsTag && !page.robotsMeta ? 'headers' : 'html',
        at,
        caveats: [
          'A snippet limit is right for a page that should not be quoted; the audit cannot tell which it is.',
        ],
        why: 'Google says a page must be indexed and snippet-eligible to appear in AI Overviews and AI Mode, so a limit keeps its text out of answers.',
        fix: {
          summary:
            'Remove the nosnippet, max-snippet or data-nosnippet that covers the main content, unless the page should not be quoted.',
        },
      }),
    )
  }

  if (!page.main.found || page.main.words === 0) {
    findings.push(
      makeFinding({
        ruleId: 'ai.main-text-missing',
        severity: 'error',
        scope: { kind: 'page', url },
        observed: { mainFound: page.main.found, words: page.main.words },
        expected: 'the page’s text inside <main> in the HTML the server sends',
        source: 'html',
        at,
        why: 'Crawlers that do not run JavaScript, which includes many AI crawlers, see an empty page.',
        fix: {
          summary:
            'Render the content on the server (a server component), and keep it inside the <main> landmark.',
        },
      }),
    )
  }
  return findings
}

/**
 * The site-wide AI rules.
 *
 *  - `ai.crawler-policy`: robots.txt blocks exactly the AI crawlers the `allowAiCrawlers` switch in
 *    Site identity says it should (all of `AI_CRAWLERS` when it is off, none when it is on).
 *  - `ai.search-crawler-coupling`: until task 228 splits the switch, opting out of AI training also
 *    blocks PerplexityBot, which Perplexity uses to find pages for its search answers.
 *  - `ai.llms-txt-consistency`: every page llms.txt links to is in the sitemap. Google says it does
 *    not use llms.txt, so this is only a suggestion and only when the file exists (E2 §8.5).
 */
export function siteAuditFindings(context: SiteAuditContext): Finding[] {
  const at = context.now
  const scope = { kind: 'site', url: context.origin } as const
  const findings: Finding[] = []

  if (context.robots) {
    const groups = context.robots.groups
    const blocked = AI_CRAWLERS.filter((agent) => !isAllowed(groups, agent, '/'))
    const choice = context.site?.allowAiCrawlers
    if (choice !== undefined) {
      const wantBlocked = choice === false
      const wrong = wantBlocked
        ? AI_CRAWLERS.filter((agent) => !blocked.includes(agent))
        : [...blocked]
      if (wrong.length > 0) {
        findings.push(
          makeFinding({
            ruleId: 'ai.crawler-policy',
            severity: 'error',
            scope: { ...scope, documentId: 'siteIdentity', path: 'allowAiCrawlers' },
            observed: { allowAiCrawlers: choice ?? true, blocked, mismatched: wrong },
            expected: wantBlocked
              ? `all of ${AI_CRAWLERS.join(', ')} blocked`
              : 'none of the AI crawlers blocked',
            source: 'headers',
            at,
            why: wantBlocked
              ? 'The site owner opted out of AI crawlers, but robots.txt still lets some of them in.'
              : 'The site owner allows AI crawlers, but robots.txt blocks some of them, so the site is invisible to them.',
            fix: {
              summary:
                'robots.txt is generated from the "Let AI crawlers" switch in Site identity (src/app/robots.ts); check the switch is published, and that the deployment is not serving an older robots.txt.',
              studioIntent: 'edit;id=siteIdentity;type=siteIdentity;path=allowAiCrawlers',
            },
          }),
        )
      }
    }
    if (blocked.includes('PerplexityBot')) {
      findings.push(
        makeFinding({
          ruleId: 'ai.search-crawler-coupling',
          severity: 'suggestion',
          scope: { ...scope, documentId: 'siteIdentity', path: 'allowAiCrawlers' },
          observed: { blocked },
          expected: 'training crawlers blocked without blocking AI search crawlers',
          source: 'headers',
          at,
          caveats: [
            'Task 228 replaces the single switch with one for training and one for AI search.',
          ],
          why: 'The one AI-crawler switch also blocks PerplexityBot, so opting out of training removes the site from Perplexity’s search answers.',
          fix: {
            summary:
              'Leave the switch as it is if that is intended; until the two switches exist, turning it back on is the only way to allow Perplexity search.',
            studioIntent: 'edit;id=siteIdentity;type=siteIdentity;path=allowAiCrawlers',
          },
        }),
      )
    }
  }

  if (context.llmsTxt && context.sitemap && !context.sitemap.capped) {
    const inSitemap = new Set(context.sitemap.urls.map(normaliseUrl))
    const missing = context.llmsTxt.urls.filter((url) => !inSitemap.has(normaliseUrl(url)))
    if (missing.length > 0) {
      findings.push(
        makeFinding({
          ruleId: 'ai.llms-txt-consistency',
          severity: 'suggestion',
          scope,
          observed: { notInSitemap: missing.slice(0, 10), count: missing.length },
          expected: 'every llms.txt link is a sitemap URL',
          source: 'html',
          at,
          caveats: [
            'Google says Google Search does not use llms.txt; this only checks the two files agree.',
          ],
          why: 'llms.txt points at pages the sitemap does not list, so the two files disagree about which pages exist.',
          fix: {
            summary:
              'Both files are generated from the published pages; republish the pages or wait for the cache to refresh.',
          },
        }),
      )
    }
  }
  return findings
}
