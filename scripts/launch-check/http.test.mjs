import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  SECURITY_HEADERS,
  checkHomePage,
  checkHttpRedirect,
  checkNotFound,
  checkSecurityHeaders,
  checkStudio,
  checkWwwApex,
  wwwCounterpart,
} from './http.mjs'

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const ok = (url, extra = {}) => ({ url, status: 200, headers: {}, ...extra })
const statuses = (results) => results.map((r) => r.status)

describe('SECURITY_HEADERS', () => {
  it('matches the headers next.config.ts sends', () => {
    const config = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8')
    for (const header of SECURITY_HEADERS) {
      const [line] = config
        .split('\n')
        .filter((l) => l.toLowerCase().includes(`key: '${header.name}'`))
      expect(line, header.name).toBeDefined()
      if (header.expect) expect(config).toContain(header.expect)
    }
    const declared = [...config.matchAll(/key: '([A-Za-z-]+)'/g)].map((m) => m[1].toLowerCase())
    expect(declared.sort()).toEqual(SECURITY_HEADERS.map((h) => h.name).sort())
  })
})

describe('checkHomePage', () => {
  const origin = 'https://example.com'
  it('passes a 200 over HTTPS and mentions redirects', () => {
    const final = ok('https://example.com/')
    const [result] = checkHomePage({
      chain: [{ url: 'https://example.com/', status: 200 }],
      final,
      origin,
    })
    expect(result.status).toBe('pass')
  })
  it('fails on an error, a non-200 and a plain-HTTP ending', () => {
    const chain = [{ url: 'x', status: 500 }]
    expect(
      checkHomePage({ chain, final: { url: origin, error: 'ENOTFOUND' }, origin })[0].status,
    ).toBe('fail')
    expect(
      checkHomePage({ chain, final: ok(`${origin}/`, { status: 500 }), origin })[0].detail,
    ).toContain('500')
    expect(checkHomePage({ chain, final: ok('http://example.com/'), origin })[0].detail).toContain(
      "isn't HTTPS",
    )
  })
})

describe('checkHttpRedirect', () => {
  const hop = (status) => [{ url: 'http://example.com/', status, location: 'https://example.com/' }]
  it('passes a permanent redirect to HTTPS', () => {
    expect(
      statuses(checkHttpRedirect({ httpChain: hop(308), httpFinal: ok('https://example.com/') })),
    ).toEqual(['pass'])
  })
  it('warns on a temporary redirect and fails when it stays on HTTP', () => {
    expect(
      statuses(checkHttpRedirect({ httpChain: hop(307), httpFinal: ok('https://example.com/') })),
    ).toEqual(['warn'])
    expect(
      statuses(
        checkHttpRedirect({
          httpChain: [{ url: 'http://example.com/', status: 200 }],
          httpFinal: ok('http://example.com/'),
        }),
      ),
    ).toEqual(['fail'])
  })
  it('warns when plain HTTP does not answer', () => {
    expect(
      statuses(
        checkHttpRedirect({
          httpChain: [{ url: 'x', status: 0 }],
          httpFinal: { error: 'refused' },
        }),
      ),
    ).toEqual(['warn'])
  })
})

describe('wwwCounterpart', () => {
  it('flips www and apex, and skips hosts where it does not apply', () => {
    expect(wwwCounterpart('example.com')).toBe('www.example.com')
    expect(wwwCounterpart('www.example.com')).toBe('example.com')
    expect(wwwCounterpart('bondiplumbing.com.au')).toBe('www.bondiplumbing.com.au')
    expect(wwwCounterpart('www.bondiplumbing.com.au')).toBe('bondiplumbing.com.au')
    expect(wwwCounterpart('app.example.com')).toBeNull()
    expect(wwwCounterpart('localhost')).toBeNull()
    expect(wwwCounterpart('127.0.0.1')).toBeNull()
    expect(wwwCounterpart('site.vercel.app')).toBeNull()
  })
})

describe('checkWwwApex', () => {
  const site = {
    chain: [{ url: 'https://example.com/', status: 200 }],
    final: ok('https://example.com/'),
  }
  it('passes when the other address redirects to the same origin', () => {
    const other = {
      chain: [
        { url: 'https://www.example.com/', status: 308 },
        { url: 'https://example.com/', status: 200 },
      ],
      final: ok('https://example.com/'),
    }
    expect(statuses(checkWwwApex({ siteHost: 'example.com', site, other }))).toEqual(['pass'])
  })
  it('fails when both answer separately or end on different origins', () => {
    const separate = {
      chain: [{ url: 'https://www.example.com/', status: 200 }],
      final: ok('https://www.example.com/'),
    }
    expect(statuses(checkWwwApex({ siteHost: 'example.com', site, other: separate }))).toEqual([
      'fail',
    ])
  })
  it('warns when the other address does not resolve and skips unrelated hosts', () => {
    expect(
      statuses(
        checkWwwApex({
          siteHost: 'example.com',
          site,
          other: { chain: [], final: { error: 'ENOTFOUND' } },
        }),
      ),
    ).toEqual(['warn'])
    expect(checkWwwApex({ siteHost: 'localhost', site, other: site })).toEqual([])
  })
})

describe('checkSecurityHeaders', () => {
  it('passes the headers next.config.ts sends', () => {
    expect(statuses(checkSecurityHeaders({ headers: fixture('headers-good.json') }))).toEqual([
      'pass',
    ])
  })
  it('fails on missing headers and names them', () => {
    const [result] = checkSecurityHeaders({ headers: fixture('headers-missing.json') })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('strict-transport-security')
    expect(result.detail).toContain('content-security-policy')
    expect(result.detail).not.toContain('x-content-type-options')
  })
  it('warns when a header is present with another value', () => {
    const [result] = checkSecurityHeaders({
      headers: { ...fixture('headers-good.json'), 'referrer-policy': 'no-referrer' },
    })
    expect(result.status).toBe('warn')
  })
})

describe('checkStudio and checkNotFound', () => {
  it('requires /studio to answer 200', () => {
    expect(statuses(checkStudio({ final: ok('https://example.com/studio') }))).toEqual(['pass'])
    expect(
      statuses(checkStudio({ final: ok('https://example.com/studio', { status: 404 }) })),
    ).toEqual(['fail'])
    expect(statuses(checkStudio({ final: { error: 'timeout' } }))).toEqual(['fail'])
  })
  it('requires a real 404 and flags soft 404s and redirects', () => {
    const path = '/nope'
    expect(statuses(checkNotFound({ response: { status: 404 }, path }))).toEqual(['pass'])
    expect(checkNotFound({ response: { status: 200 }, path })[0].status).toBe('fail')
    expect(checkNotFound({ response: { status: 301 }, path })[0].fix).toContain(
      'catch-all redirect',
    )
  })
})
