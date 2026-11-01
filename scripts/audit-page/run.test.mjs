import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import { confirmBlockers } from './confirm.mjs'
import { fakeLake, fakeSite, redirect, routesFor, text } from './fake-site.mjs'
import { auditJson, formatFindings } from './format.mjs'
import { AuditRefusal } from './guard.mjs'
import { llmsTxtUrls, runPageAudit } from './run.mjs'
import { createReadClient } from './sanity.mjs'
import { RULES } from '../../src/lib/audit/finding.ts'
import {
  BRANCH,
  brokenPages,
  cleanPages,
  NOW,
  ORIGIN,
  pageHtml,
  ROBOTS_TXT,
  sitemapXml,
} from '../../src/lib/audit/fixtures.ts'

const here = dirname(fileURLToPath(import.meta.url))

/** The documents behind the fixture pages, as the Content Lake holds them. */
const documents = [
  { _id: 'page-home', _type: 'page', slug: { current: 'home' }, seo: {} },
  { _id: 'page-about', _type: 'page', slug: { current: 'about' }, seo: { metaDescription: 'x' } },
  { _id: 'page-contact', _type: 'page', slug: { current: 'contact' } },
  { _id: 'service-blocked-drains', _type: 'service', slug: { current: 'blocked-drains' } },
  { _id: 'place-bondi', _type: 'place', slug: { current: 'bondi-beach' } },
  ...brokenPages().map(({ page }, index) => ({
    _id: `page-broken-${index}`,
    _type: 'page',
    slug: { current: page.path.slice(1) },
    seo: {},
  })),
  { _id: 'siteIdentity', _type: 'siteIdentity', allowAiCrawlers: true },
  { _id: 'businessInfo', _type: 'businessInfo', businessType: 'LocalBusiness' },
  { _id: 'drafts.page-about', _type: 'page', slug: { current: 'about' }, title: 'Draft' },
]

function build({ pages, extra = {}, sitemap = pages.map((page) => page.path) }) {
  const site = fakeSite(ORIGIN, {
    ...routesFor(pages),
    '/robots.txt': text(ROBOTS_TXT),
    '/sitemap.xml': text(sitemapXml(sitemap), 'application/xml'),
    '/old-hot-water': redirect('/about'),
    ...extra,
  })
  const lake = fakeLake(documents)
  const sanity = createReadClient({
    projectId: 'e2etest1',
    dataset: 'production',
    token: 'fake-read-token',
    apiHost: 'http://lake.test',
    fetchImpl: lake.fetchImpl,
  })
  return { site, lake, sanity }
}

const ids = (findings) => [...new Set(findings.map((finding) => finding.ruleId))].sort()
const deterministicWarnings = (findings) =>
  findings.filter(
    (finding) =>
      finding.basis === 'deterministic' &&
      ['blocker', 'error', 'warning'].includes(finding.severity),
  )

describe('the clean fixture site', () => {
  it('has no deterministic finding at warning or above, on any page', async () => {
    const { site, sanity } = build({ pages: cleanPages() })
    const { report, pages } = await runPageAudit({
      target: `${ORIGIN}/`,
      sample: 10,
      net: site.net,
      sanity,
      now: NOW,
    })
    expect(pages).toHaveLength(5)
    expect(deterministicWarnings(report.findings)).toEqual([])
    expect(report.blocked).toBe(false)
  })

  it('also passes without the content side', async () => {
    const { site } = build({ pages: cleanPages() })
    const { report, notes } = await runPageAudit({
      target: `${ORIGIN}/about`,
      net: site.net,
      skippedContent: 'The content side was skipped: no token.',
      now: NOW,
    })
    expect(deterministicWarnings(report.findings)).toEqual([])
    expect(notes).toContain('The content side was skipped: no token.')
  })
})

describe('the broken fixture pages', () => {
  const broken = brokenPages()

  it('each produce exactly the one rule they were built to break', async () => {
    const { site, sanity } = build({ pages: [...cleanPages(), ...broken.map(({ page }) => page)] })
    for (const { ruleId, page } of broken) {
      const { report } = await runPageAudit({
        target: `${ORIGIN}${page.path}`,
        net: site.net,
        sanity,
        now: NOW,
      })
      expect(ids(report.findings), page.path).toEqual([ruleId])
    }
  })

  it('together produce exactly those five ruleIds and nothing else', async () => {
    const { site, sanity } = build({ pages: [...cleanPages(), ...broken.map(({ page }) => page)] })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/`,
      sample: 25,
      net: site.net,
      sanity,
      now: NOW,
    })
    expect(ids(report.findings)).toEqual(broken.map(({ ruleId }) => ruleId).sort())
    // A canonical that redirects is a blocker, so the run would exit non-zero.
    expect(report.blocked).toBe(true)
    expect(report.findings[0]?.severity).toBe('blocker')
  })

  it('give every finding what the contract promises', async () => {
    const { site, sanity } = build({ pages: [...cleanPages(), ...broken.map(({ page }) => page)] })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/`,
      sample: 25,
      net: site.net,
      sanity,
      now: NOW,
    })
    for (const finding of report.findings) {
      expect(finding.evidence.observed, finding.ruleId).toBeDefined()
      expect(finding.evidence.source, finding.ruleId).toBeTruthy()
      expect(finding.evidence.at, finding.ruleId).toBe(NOW)
      expect(finding.why, finding.ruleId).toMatch(/\S/)
      expect(finding.fix.summary, finding.ruleId).toMatch(/\S/)
      expect(finding.verify, finding.ruleId).toContain('npm run audit:page')
      expect(RULES[finding.ruleId], finding.ruleId).toBeDefined()
    }
  })

  it('attaches the document, field and Studio intent where the fix is a field', async () => {
    const { site, sanity } = build({ pages: [...cleanPages(), ...broken.map(({ page }) => page)] })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/broken/duplicate-title`,
      net: site.net,
      sanity,
      now: NOW,
    })
    const [finding] = report.findings
    expect(finding?.scope).toMatchObject({
      kind: 'page',
      url: `${ORIGIN}/broken/duplicate-title`,
      documentId: 'page-broken-0',
      path: 'seo.metaTitle',
    })
    expect(finding?.fix.studioIntent).toBe('edit;id=page-broken-0;type=page;path=seo.metaTitle')
  })

  it('reports the branch phone mismatch with the property and value', async () => {
    const { site } = build({ pages: [...cleanPages(), ...broken.map(({ page }) => page)] })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/broken/branch-phone`,
      net: site.net,
      now: NOW,
    })
    const [finding] = report.findings
    expect(JSON.stringify(finding?.evidence.observed)).toContain('+61299990000')
    expect(BRANCH.phone).toBeTruthy()
  })
})

describe('a preview or local server', () => {
  const PREVIEW = 'http://localhost:3100'

  it('is judged against the production origin it declares, so a clean site stays clean', async () => {
    const { site, sanity } = build({ pages: cleanPages() })
    const { report } = await runPageAudit({
      target: `${PREVIEW}/services/blocked-drains`,
      sample: 10,
      expectOrigin: ORIGIN,
      net: site.net,
      sanity,
      now: NOW,
    })
    expect(deterministicWarnings(report.findings)).toEqual([])
    // Everything was requested from the preview host, never the production one.
    expect(site.requests.every(({ url }) => url.startsWith(PREVIEW))).toBe(true)
  })

  it('without the expected origin, reports the canonical as elsewhere', async () => {
    const { site } = build({ pages: cleanPages() })
    const { report } = await runPageAudit({
      target: `${PREVIEW}/about`,
      net: site.net,
      now: NOW,
    })
    expect(ids(report.findings)).toContain('seo.canonical-elsewhere')
  })

  it('still finds a canonical that redirects, asking the preview host', async () => {
    const { site } = build({ pages: [...cleanPages(), ...brokenPages().map((b) => b.page)] })
    const { report } = await runPageAudit({
      target: `${PREVIEW}/broken/canonical-to-redirect`,
      expectOrigin: ORIGIN,
      net: site.net,
      now: NOW,
    })
    expect(ids(report.findings)).toEqual(['seo.canonical-status'])
    expect(site.requests).toContainEqual({ method: 'GET', url: `${PREVIEW}/old-hot-water` })
  })
})

describe('llms.txt', () => {
  it('lists the addresses a Markdown file links to', () => {
    expect(
      llmsTxtUrls('# Site\n\n- [Home](https://x.test/): hi\n- [About us](https://x.test/about)\n'),
    ).toEqual(['https://x.test/', 'https://x.test/about'])
  })

  it('is checked against the sitemap when the site has one', async () => {
    const { site } = build({
      pages: cleanPages(),
      extra: {
        '/llms.txt': text(`# Site\n\n- [Gone](${ORIGIN}/gone)\n- [About](${ORIGIN}/about)\n`),
      },
    })
    const { report } = await runPageAudit({ target: `${ORIGIN}/about`, net: site.net, now: NOW })
    const finding = report.findings.find(({ ruleId }) => ruleId === 'ai.llms-txt-consistency')
    expect(finding?.evidence.observed).toEqual({ notInSitemap: [`${ORIGIN}/gone`], count: 1 })
  })
})

describe('read only', () => {
  it('sends no Sanity mutation: every request is a GET query with a token', async () => {
    const { site, lake, sanity } = build({
      pages: [...cleanPages(), ...brokenPages().map((b) => b.page)],
    })
    await runPageAudit({ target: `${ORIGIN}/`, sample: 25, net: site.net, sanity, now: NOW })
    expect(lake.requests.length).toBeGreaterThan(0)
    for (const request of lake.requests) {
      expect(request.method).toBe('GET')
      expect(request.path).toMatch(/\/data\/query\//)
      expect(request.path).not.toMatch(/mutate|actions|assets|import|export/)
      expect(request.perspective).toBe('published')
      expect(request.authorization).toBe('Bearer fake-read-token')
    }
  })

  it('asks the site for nothing but GET and HEAD', async () => {
    const { site, sanity } = build({ pages: cleanPages() })
    await runPageAudit({ target: `${ORIGIN}/`, sample: 10, net: site.net, sanity, now: NOW })
    expect(new Set(site.requests.map(({ method }) => method))).toEqual(new Set(['GET', 'HEAD']))
  })

  it('never reads a draft', async () => {
    const { site, sanity } = build({ pages: cleanPages() })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/about`,
      net: site.net,
      sanity,
      now: NOW,
    })
    expect(JSON.stringify(report)).not.toContain('drafts.')
  })

  it('has no way to write in the audit scripts', () => {
    const files = [
      join(here, '..', 'audit-page.mjs'),
      ...readdirSync(here)
        .filter(
          (name) =>
            name.endsWith('.mjs') && !name.endsWith('.test.mjs') && name !== 'fake-site.mjs',
        )
        .map((name) => join(here, name)),
    ]
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      // Comments may explain what the file refuses to do; the code may not do it.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code, file).not.toMatch(/['"`](POST|PUT|PATCH|DELETE)['"`]/)
      expect(code, file).not.toMatch(
        /data\/mutate|data\/actions|@sanity\/client|next-sanity|createClient/,
      )
    }
  })
})

describe('what a run says', () => {
  it('stops at a page that cannot be fetched, with one blocker', async () => {
    const failing = {
      request: async (url) => ({
        url,
        status: 0,
        headers: {},
        contentType: '',
        text: '',
        error: 'getaddrinfo ENOTFOUND',
      }),
    }
    const { report } = await runPageAudit({ target: `${ORIGIN}/x`, net: failing, now: NOW })
    expect(report.findings.map(({ ruleId }) => ruleId)).toEqual(['seo.status'])
    expect(report.blocked).toBe(true)
  })

  it('reports a 404 page as a blocker', async () => {
    const { site } = build({ pages: cleanPages() })
    const { report } = await runPageAudit({ target: `${ORIGIN}/nope`, net: site.net, now: NOW })
    expect(ids(report.findings)).toEqual(['seo.status'])
  })

  it('formats findings by severity and writes the audit.json shape', async () => {
    const { site, sanity } = build({
      pages: [...cleanPages(), ...brokenPages().map((b) => b.page)],
    })
    const result = await runPageAudit({
      target: `${ORIGIN}/`,
      sample: 25,
      net: site.net,
      sanity,
      now: NOW,
    })
    const output = formatFindings(result.report, {
      rules: RULES,
      pages: result.pages,
      notes: result.notes,
    })
    expect(output).toMatch(/^Page audit for /)
    expect(output.indexOf('Blockers (1)')).toBeLessThan(output.indexOf('Errors ('))
    expect(output).toContain('[seo.canonical-status, deterministic]')
    expect(output).toContain('A blocker stops search engines')
    const json = auditJson(result.report, {
      pages: result.pages,
      notes: result.notes,
      sample: 25,
      rules: RULES,
    })
    expect(json).toMatchObject({ schema: 1, sample: 25, blocked: true, summary: { blocker: 1 } })
    expect(json.rules['seo.canonical-status']).toEqual({
      title: RULES['seo.canonical-status'].title,
      anchor: 'rule-seo-canonical-status',
    })
    expect(JSON.stringify(json)).not.toContain('fake-read-token')
  })
})

describe('what the audit will and will not fetch', () => {
  const HOSTILE = [
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:9999/__fixture/mutations',
    'http://10.0.0.5/admin',
    'https://evil.example/pixel',
  ]
  const hostilePage = (extra = '') =>
    pageHtml({
      path: '/hostile',
      title: 'Hostile | Bondi Plumbing',
      description: 'A page that links everywhere.',
      canonical: 'https://evil.example/hostile',
      links: ['/about', ...HOSTILE],
      extra: HOSTILE.map((url) => `<a href="${url}">x</a>`).join('') + extra,
    })

  const hosts = (site) => [...new Set(site.requests.map(({ url }) => new URL(url).host))]

  it('requests only the origin it was pointed at, whatever the page links to', async () => {
    const { site } = build({ pages: [...cleanPages(), hostilePage()] })
    const { report, network } = await runPageAudit({
      target: `${ORIGIN}/hostile`,
      net: site.net,
      now: NOW,
    })
    expect(hosts(site)).toEqual([new URL(ORIGIN).host])
    expect(network.permitted).toEqual([ORIGIN])
    // A canonical on another domain is reported, not fetched.
    expect(ids(report.findings)).toContain('seo.canonical-elsewhere')
  })

  it('does not treat a link it never requested as broken', async () => {
    const { site } = build({ pages: [...cleanPages(), hostilePage()] })
    const { report } = await runPageAudit({ target: `${ORIGIN}/hostile`, net: site.net, now: NOW })
    expect(ids(report.findings)).not.toContain('links.internal-broken')
  })

  it('refuses a sitemap index whose entries are on another host', async () => {
    const { site } = build({
      pages: cleanPages(),
      extra: {
        '/sitemap.xml': text(
          '<sitemapindex><sitemap><loc>https://evil.example/sitemap-1.xml</loc></sitemap><sitemap><loc>http://169.254.169.254/s.xml</loc></sitemap></sitemapindex>',
          'application/xml',
        ),
      },
    })
    const { notes, network } = await runPageAudit({
      target: `${ORIGIN}/about`,
      net: site.net,
      now: NOW,
    })
    expect(hosts(site)).toEqual([new URL(ORIGIN).host])
    expect(network.refused.map(({ url }) => url)).toEqual([
      'https://evil.example/sitemap-1.xml',
      'http://169.254.169.254/s.xml',
    ])
    expect(notes.join(' ')).toContain('were not sent')
  })

  it('refuses a robots.txt that redirects to another host, without following it', async () => {
    const { site } = build({
      pages: cleanPages(),
      extra: { '/robots.txt': redirect('https://evil.example/robots.txt') },
    })
    await runPageAudit({ target: `${ORIGIN}/about`, net: site.net, now: NOW })
    expect(hosts(site)).toEqual([new URL(ORIGIN).host])
  })

  it('refuses to audit a page that redirects off the origin, and says where it goes', async () => {
    const { site } = build({
      pages: cleanPages(),
      extra: { '/moved': redirect('https://www.example.net/moved') },
    })
    await expect(
      runPageAudit({ target: `${ORIGIN}/moved`, net: site.net, now: NOW }),
    ).rejects.toThrow(AuditRefusal)
    await expect(
      runPageAudit({ target: `${ORIGIN}/moved`, net: site.net, now: NOW }),
    ).rejects.toThrow(/https:\/\/www\.example\.net\/moved.*outside the permitted origin/)
    expect(hosts(site)).toEqual([new URL(ORIGIN).host])
  })

  it('reports a sampled page that redirects off the origin as not answering 200, unfollowed', async () => {
    const { site } = build({
      pages: cleanPages(),
      sitemap: ['/', '/about', '/gone'],
      extra: { '/gone': redirect('https://evil.example/gone') },
    })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/`,
      sample: 5,
      net: site.net,
      now: NOW,
    })
    const finding = report.findings.find(({ ruleId }) => ruleId === 'seo.status')
    expect(finding?.scope.url).toBe(`${ORIGIN}/gone`)
    expect(hosts(site)).toEqual([new URL(ORIGIN).host])
  })

  it('refuses the production origin as a destination: --expect-origin only changes comparison', async () => {
    const PREVIEW = 'http://localhost:3100'
    const { site } = build({ pages: cleanPages() })
    await runPageAudit({
      target: `${PREVIEW}/about`,
      sample: 5,
      expectOrigin: ORIGIN,
      net: site.net,
      now: NOW,
    })
    expect(hosts(site)).toEqual(['localhost:3100'])
    // A redirect to the expected origin is a redirect off the permitted one.
    const moved = build({
      pages: cleanPages(),
      extra: { '/moved': redirect(`${ORIGIN}/about`) },
    })
    await expect(
      runPageAudit({
        target: `${PREVIEW}/moved`,
        expectOrigin: ORIGIN,
        net: moved.site.net,
        now: NOW,
      }),
    ).rejects.toThrow(AuditRefusal)
    expect(hosts(moved.site)).toEqual(['localhost:3100'])
  })

  it('never sends credentials to the site, and sends the Sanity token only to Sanity', async () => {
    const { site, lake, sanity } = build({ pages: cleanPages() })
    const headersSeen = []
    const spying = {
      request: (url, options) => {
        headersSeen.push(options?.headers ?? {})
        return site.net.request(url, options)
      },
    }
    await runPageAudit({ target: `${ORIGIN}/about`, sample: 5, net: spying, sanity, now: NOW })
    expect(headersSeen.length).toBeGreaterThan(5)
    for (const headers of headersSeen) {
      expect(Object.keys(headers).map((name) => name.toLowerCase())).not.toContain('authorization')
    }
    expect(JSON.stringify(site.requests)).not.toContain('fake-read-token')
    expect(
      lake.requests.every(({ authorization }) => authorization === 'Bearer fake-read-token'),
    ).toBe(true)
  })

  it('stays inside its limits on a site that is all links', async () => {
    const many = Array.from({ length: 400 }, (_, i) => `/p/${i}`)
    const { site } = build({
      pages: [pageHtml({ path: '/', title: 'Home', description: 'x', links: many })],
    })
    const { network, notes } = await runPageAudit({
      target: `${ORIGIN}/`,
      net: site.net,
      now: NOW,
      limits: { maxRequests: 40, maxRedirects: 5, deadlineMs: 60_000, requestTimeoutMs: 15_000 },
    })
    expect(network.requests).toBeLessThanOrEqual(40)
    expect(site.requests.length).toBeLessThanOrEqual(40)
    expect(notes.join(' ')).toMatch(/limits were reached|Only the first/)
  })

  it('leaves a link it was not allowed to request out of the findings', async () => {
    const many = Array.from({ length: 30 }, (_, i) => `/p/${i}`)
    const { site } = build({
      pages: [pageHtml({ path: '/', title: 'Home', description: 'x', links: many })],
    })
    const { report } = await runPageAudit({
      target: `${ORIGIN}/`,
      net: site.net,
      now: NOW,
      limits: { maxRequests: 12, maxRedirects: 5, deadlineMs: 60_000, requestTimeoutMs: 15_000 },
    })
    // Every /p/N is a 404 here; only those actually requested may be reported.
    const broken = report.findings.find(({ ruleId }) => ruleId === 'links.internal-broken')
    expect(broken?.evidence.observed.length).toBeLessThan(30)
  })
})

describe('confirming blockers', () => {
  const report = (...blockers) => ({
    findings: blockers.map(([ruleId, url, severity = 'blocker']) => ({
      ruleId,
      severity,
      scope: { url },
    })),
  })

  it('confirms a blocker the second look finds again, and only that one', async () => {
    const first = report(['seo.noindex', 'https://x/a'], ['seo.robots-blocked', 'https://x/b'])
    const rerun = async (url) =>
      url === 'https://x/a' ? report(['seo.noindex', url]) : report(['seo.status', url, 'warning'])
    expect(await confirmBlockers({ report: first, rerun, delayMs: 0 })).toEqual([
      { ruleId: 'seo.noindex', url: 'https://x/a', confirmed: true },
      { ruleId: 'seo.robots-blocked', url: 'https://x/b', confirmed: false },
    ])
  })

  it('does not confirm a blocker when the second audit fails or the cap is passed', async () => {
    const urls = Array.from({ length: 7 }, (_, i) => `https://x/${i}`)
    const first = report(...urls.map((url) => ['seo.noindex', url]))
    const rerun = vi.fn(async (url) => {
      if (url === 'https://x/0') throw new Error('network down')
      return report(['seo.noindex', url])
    })
    const result = await confirmBlockers({ report: first, rerun, delayMs: 0, max: 5 })
    expect(rerun).toHaveBeenCalledTimes(5)
    expect(result.map(({ confirmed }) => confirmed)).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
      false,
    ])
  })

  it('pauses before the second look, and does nothing when there is no blocker', async () => {
    const sleep = vi.fn()
    const rerun = vi.fn()
    await confirmBlockers({
      report: report(['seo.canonical-missing', 'https://x/', 'warning']),
      rerun,
      sleep,
    })
    expect(sleep).not.toHaveBeenCalled()
    expect(rerun).not.toHaveBeenCalled()
    await confirmBlockers({
      report: report(['seo.noindex', 'https://x/']),
      rerun: async (url) => report(['seo.noindex', url]),
      delayMs: 50,
      sleep,
    })
    expect(sleep).toHaveBeenCalledWith(50)
  })
})
