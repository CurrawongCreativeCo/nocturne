import { describe, expect, it } from 'vitest'

import { AI_CRAWLERS } from '@/lib/ai-crawlers'

import { context, ORIGIN, snapshot, NOW } from '../page.fixtures'
import type { SiteAuditContext } from '../types'
import { aiReadinessFindings, siteAuditFindings } from './ai-readiness'

const ids = (found: { ruleId: string }[]) => found.map((f) => f.ruleId)

describe('ai.snippet-blocked', () => {
  it('passes a page with no snippet limits', () => {
    expect(aiReadinessFindings(snapshot(), context())).toEqual([])
  })

  it('reports nosnippet, a max-snippet limit and data-nosnippet over most of the text', () => {
    expect(
      ids(aiReadinessFindings(snapshot({ robotsMeta: 'index, nosnippet' }), context())),
    ).toEqual(['ai.snippet-blocked'])
    const limited = aiReadinessFindings(
      snapshot({ xRobotsTag: 'googlebot: max-snippet:40' }),
      context(),
    )
    expect(limited[0]?.evidence).toMatchObject({
      source: 'headers',
      observed: { directives: ['max-snippet:40'] },
    })
    const marked = aiReadinessFindings(
      snapshot({ main: { found: true, words: 100, nosnippetWords: 60 } }),
      context(),
    )
    expect(JSON.stringify(marked[0]?.evidence.observed)).toContain('60%')
  })

  it('lets a small data-nosnippet span (a price, a phone number) be', () => {
    expect(
      aiReadinessFindings(
        snapshot({ main: { found: true, words: 100, nosnippetWords: 10 } }),
        context(),
      ),
    ).toEqual([])
  })

  it('does not lift a limit that max-snippet:-1 removes, and leaves noindex pages to seo.noindex', () => {
    expect(aiReadinessFindings(snapshot({ robotsMeta: 'max-snippet:-1' }), context())).toEqual([])
    expect(
      aiReadinessFindings(
        snapshot({ robotsMeta: 'noindex, nosnippet', noindex: { meta: true, header: false } }),
        context(),
      ),
    ).toEqual([])
  })
})

describe('ai.main-text-missing', () => {
  it('reports an empty main and a page with no main', () => {
    const empty = aiReadinessFindings(
      snapshot({ main: { found: true, words: 0, nosnippetWords: 0 } }),
      context(),
    )
    expect(empty[0]).toMatchObject({ ruleId: 'ai.main-text-missing', severity: 'error' })
    const none = aiReadinessFindings(
      snapshot({ main: { found: false, words: 0, nosnippetWords: 0 } }),
      context(),
    )
    expect(none[0]?.evidence.observed).toEqual({ mainFound: false, words: 0 })
  })

  it('says nothing about a page that did not load', () => {
    expect(
      aiReadinessFindings(
        snapshot({ status: 404, main: { found: false, words: 0, nosnippetWords: 0 } }),
        context(),
      ),
    ).toEqual([])
  })
})

describe('site rules', () => {
  const blockingGroups = [
    { agents: ['*'], allow: ['/'], disallow: ['/studio'] },
    { agents: AI_CRAWLERS.map((a) => a.toLowerCase()), allow: [], disallow: ['/'] },
  ]
  const openGroups = [{ agents: ['*'], allow: ['/'], disallow: ['/studio'] }]
  const site = (overrides: Partial<SiteAuditContext> = {}): SiteAuditContext => ({
    now: NOW,
    origin: ORIGIN,
    robots: { groups: openGroups },
    sitemap: { urls: [`${ORIGIN}/`, `${ORIGIN}/about`], capped: false },
    llmsTxt: null,
    site: { allowAiCrawlers: true },
    ...overrides,
  })

  it('passes robots.txt that matches the setting, either way', () => {
    expect(siteAuditFindings(site())).toEqual([])
    const optedOut = siteAuditFindings(
      site({ robots: { groups: blockingGroups }, site: { allowAiCrawlers: false } }),
    )
    expect(ids(optedOut)).toEqual(['ai.search-crawler-coupling'])
  })

  it('treats an unset switch as allowed, like robots.ts', () => {
    expect(siteAuditFindings(site({ site: { allowAiCrawlers: null } }))).toEqual([])
  })

  it('reports robots.txt that blocks what the owner allowed, and allows what they opted out of', () => {
    const blocked = siteAuditFindings(site({ robots: { groups: blockingGroups } }))
    expect(blocked.find((f) => f.ruleId === 'ai.crawler-policy')).toMatchObject({
      severity: 'error',
      scope: { kind: 'site', documentId: 'siteIdentity', path: 'allowAiCrawlers' },
    })
    const allowed = siteAuditFindings(site({ site: { allowAiCrawlers: false } }))
    expect(ids(allowed)).toEqual(['ai.crawler-policy'])
    expect(allowed[0]?.evidence.observed).toMatchObject({ mismatched: AI_CRAWLERS })
  })

  it('does not compare with a setting it could not read', () => {
    expect(
      ids(siteAuditFindings(site({ site: null, robots: { groups: blockingGroups } }))),
    ).toEqual(['ai.search-crawler-coupling'])
  })

  it('says the single switch also blocks PerplexityBot, as a suggestion', () => {
    const [finding] = siteAuditFindings(
      site({ robots: { groups: blockingGroups }, site: { allowAiCrawlers: false } }),
    )
    expect(finding).toMatchObject({ severity: 'suggestion', basis: 'deterministic' })
    expect(finding?.why).toContain('PerplexityBot')
  })

  it('checks llms.txt against the sitemap only when the file exists and the sitemap is whole', () => {
    expect(siteAuditFindings(site({ llmsTxt: { urls: [`${ORIGIN}/about/`] } }))).toEqual([])
    const [finding] = siteAuditFindings(
      site({ llmsTxt: { urls: [`${ORIGIN}/about`, `${ORIGIN}/old`] } }),
    )
    expect(finding).toMatchObject({
      ruleId: 'ai.llms-txt-consistency',
      severity: 'suggestion',
      evidence: { observed: { notInSitemap: [`${ORIGIN}/old`], count: 1 } },
    })
    expect(
      siteAuditFindings(
        site({
          llmsTxt: { urls: [`${ORIGIN}/old`] },
          sitemap: { urls: [`${ORIGIN}/`], capped: true },
        }),
      ),
    ).toEqual([])
    expect(siteAuditFindings(site({ llmsTxt: null }))).toEqual([])
  })
})
