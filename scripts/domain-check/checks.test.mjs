import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
  allowsLetsEncrypt,
  assessSnapshot,
  isCloudflare,
  normaliseName,
  parseArgs,
  providerGuess,
  recommended,
  sameValues,
} from './checks.mjs'
import {
  collectSnapshot,
  dohQuery,
  effectiveCaa,
  nodeQuery,
  normaliseDohAnswer,
  normaliseNodeAnswer,
  recordQuestions,
  SELECTORS,
  vercelConfig,
} from './dns.mjs'

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/answers.json', import.meta.url), 'utf8'),
)
const snapshot = (fixture) => ({
  domain: 'example.com.au',
  expected: { a: ['216.198.79.1'], cname: ['project.vercel-dns-017.com'] },
  authorities: [{ server: fixture.ns[0], records: structuredClone(fixture.records) }],
  publicResolvers: ['Cloudflare', 'Google'].map((server) => ({
    server,
    records: structuredClone(fixture.records),
  })),
  caaPolicies: [],
  ds: fixture.ds || [],
  vercel: [],
})

describe('recorded DNS scenarios', () => {
  it('recognises a likely Cloudflare proxy', () => {
    const data = fixtures.cloudflare
    expect(providerGuess(data.ns)).toBe('Cloudflare')
    expect(assessSnapshot(snapshot(data)).verdicts).toContainEqual(
      expect.objectContaining({ type: 'Proxy', verdict: 'Change', blocks: true }),
    )
  })
  it('preserves registrar-hosted Microsoft 365 email including CNAME DKIM', () => {
    const data = fixtures.m365
    expect(providerGuess(data.ns)).toBe('VentraIP / Synergy Wholesale')
    const report = assessSnapshot(snapshot(data))
    for (const record of data.records.filter(
      (r) => r.type === 'MX' || r.type === 'TXT' || r.name.includes('_domainkey'),
    )) {
      expect(report.verdicts).toContainEqual(
        expect.objectContaining({
          name: record.name,
          values: record.values,
          verdict: "Don't touch",
          blocks: false,
        }),
      )
    }
  })
  it('recognises Vercel nameservers without suggesting a move', () => {
    expect(providerGuess(fixtures.vercel.ns)).toBe('Vercel')
    expect(assessSnapshot(snapshot(fixtures.vercel)).blocked).toBe(false)
  })
  it('removes only stale web AAAA records', () => {
    expect(assessSnapshot(snapshot(fixtures.aaaa)).verdicts).toContainEqual(
      expect.objectContaining({
        type: 'AAAA',
        verdict: 'Remove',
        values: ['2001:db8::1'],
        blocks: true,
      }),
    )
  })
  it('flags restrictive CAA and preserves other issuers in the explanation', () => {
    expect(assessSnapshot(snapshot(fixtures.caa)).verdicts).toContainEqual(
      expect.objectContaining({
        type: 'CAA',
        verdict: 'Change',
        values: ['0 issue "letsencrypt.org"'],
        blocks: true,
      }),
    )
  })
  it('never suggests removing an existing DS for a web record change', () => {
    const report = assessSnapshot(snapshot(fixtures.ds))
    expect(report.blocked).toBe(false)
    expect(report.verdicts.find((r) => r.type === 'DS')).toMatchObject({
      verdict: "Don't touch",
      values: ['12345 13 2 AABBCCDD'],
      blocks: false,
    })
  })
  it('passes an already correct domain and compares both resolver samples', () => {
    const report = assessSnapshot(snapshot(fixtures.correct))
    expect(report.blocked).toBe(false)
    expect(report.verdicts.filter((v) => v.verdict === 'OK')).toHaveLength(6)
    expect(report.propagation.every((p) => p.explanation === 'Same answer at this resolver.')).toBe(
      true,
    )
  })
  it('reports stale public caches as not yet everywhere, without a percentage or a failure', () => {
    const data = snapshot(fixtures.correct)
    data.publicResolvers[0] = {
      server: 'Google',
      records: [{ name: data.domain, type: 'A', values: ['192.0.2.1'] }],
    }
    const report = assessSnapshot(data)
    expect(report.blocked).toBe(false)
    expect(report.propagation[0].explanation).toContain('Not yet everywhere')
    data.publicResolvers[0].records[0].error = 'timeout'
    expect(assessSnapshot(data).propagation[0].explanation).toContain('incomplete')
  })
  it('distinguishes add, change, and unknown expectations; accepts one recommended IPv4', () => {
    const data = snapshot(fixtures.correct)
    data.authorities[0].records[0].values = []
    expect(assessSnapshot(data).verdicts[0]).toMatchObject({ verdict: 'Add', blocks: true })
    data.authorities[0].records[0].values = ['192.0.2.1']
    expect(assessSnapshot(data).verdicts[0].verdict).toBe('Change')
    data.expected.a = []
    expect(assessSnapshot(data).blocked).toBe(false)
    data.expected.a = ['216.198.79.1', '216.198.79.2']
    data.authorities[0].records[0].values = ['216.198.79.1']
    expect(assessSnapshot(data).blocked).toBe(false)
  })
  it('removes conflicting apex CNAME and www A records, preserving DKIM aliases', () => {
    const data = snapshot(fixtures.m365)
    data.authorities[0].records.find((r) => r.name === data.domain && r.type === 'CNAME').values = [
      'old.example.net',
    ]
    data.authorities[0].records.find(
      (r) => r.name === `www.${data.domain}` && r.type === 'CNAME',
    ).values = []
    data.authorities[0].records.find(
      (r) => r.name === `www.${data.domain}` && r.type === 'A',
    ).values = ['192.0.2.1']
    const report = assessSnapshot(data)
    expect(report.verdicts.filter((v) => v.verdict === 'Remove').map((v) => v.type)).toEqual([
      'CNAME',
      'A',
    ])
    expect(report.verdicts.find((v) => v.name.startsWith('selector1.')).verdict).toBe("Don't touch")
  })
  it('does not call failed lookups absent and honours Vercel misconfiguration', () => {
    const data = snapshot(fixtures.correct)
    data.authorities[0].records[0] = { name: data.domain, type: 'A', values: [], error: 'timeout' }
    expect(assessSnapshot(data).verdicts[0]).toMatchObject({
      verdict: "Don't touch",
      blocks: false,
    })
    data.vercel = [{ name: data.domain, misconfigured: true, configuredBy: null }]
    expect(assessSnapshot(data).blocked).toBe(true)
    data.caaPolicies = [{ name: data.domain, source: 'com.au', values: ['0 issue ";"'] }]
    expect(assessSnapshot(data).verdicts.some((v) => v.explanation.includes('com.au'))).toBe(true)
  })
})

describe('pure input and policy checks', () => {
  it('validates and normalises CLI arguments', () => {
    expect(
      parseArgs([
        'EXAMPLE.COM.AU.',
        '--expect-a=216.198.79.1',
        '--expect-cname',
        'Target.EXAMPLE.',
        '--json',
      ]),
    ).toEqual({ domain: 'example.com.au', a: '216.198.79.1', cname: 'target.example', json: true })
    expect(parseArgs(['--help']).help).toBe(true)
    for (const args of [
      [],
      ['https://example.com'],
      ['example.com/path'],
      ['example.com?x'],
      ['example.com#x'],
      ['a..com'],
      ['127.0.0.1'],
      ['example.com', '--expect-a', '::1'],
      ['example.com', '--expect-cname', '1.1.1.1'],
      ['example.com', '--token=secret'],
      ['example.com', '--expect-a'],
    ])
      expect(() => parseArgs(args)).toThrow()
    expect(normaliseName('EXAMPLE.COM.')).toBe('example.com')
  })
  it.each([
    [[], true],
    [['0 issue "letsencrypt.org"'], true],
    [['0 issue "digicert.com"'], false],
    [['0 issuewild ";"'], true],
    [['0 issue ";"'], false],
    [['128 unknown "x"'], false],
    [['0 issue "letsencrypt.org; accounturi=x"'], false],
    [['bad'], false],
    [['0 issue "digicert.com"', '0 issue "letsencrypt.org"'], true],
  ])('checks ordinary certificate CAA %j', (records, allowed) =>
    expect(allowsLetsEncrypt(records)).toBe(allowed),
  )
  it('checks Cloudflare CIDR boundaries and rejects unrelated addresses', () => {
    for (const ip of ['104.16.0.0', '104.23.255.255', '172.64.0.1', '103.21.244.1'])
      expect(isCloudflare(ip)).toBe(true)
    for (const ip of ['104.15.255.255', '216.198.79.1', '::1', 'invalid'])
      expect(isCloudflare(ip)).toBe(false)
  })
  it.each([
    ['ns1.domaincontrol.com', 'GoDaddy'],
    ['ns1.squarespacedns.com', 'Squarespace'],
    ['ns1.wixdns.net', 'Wix'],
    ['ns1.syrahost.com', 'Crazy Domains'],
    ['ns1.netregistry.net', 'Netregistry'],
  ])('guesses %s', (ns, provider) => expect(providerGuess([ns])).toContain(provider))
  it('labels unfamiliar providers as unknown and recommendations are ranked', () => {
    expect(providerGuess(['ns.example.net'])).toContain('Unknown')
    expect(
      recommended(
        {
          recommendedIPv4: [
            { rank: 2, value: ['192.0.2.1'] },
            { rank: 1, value: ['216.198.79.1'] },
          ],
        },
        'recommendedIPv4',
      ),
    ).toEqual(['216.198.79.1'])
    expect(
      recommended({ recommendedCNAME: [{ rank: 1, value: 'HOST.EXAMPLE.' }] }, 'recommendedCNAME'),
    ).toEqual(['host.example'])
    expect(recommended(undefined, 'recommendedIPv4')).toEqual([])
    expect(sameValues(['a', 'b', 'a'], ['b', 'a'])).toBe(true)
  })
})

describe('DNS parsing and read-only network adapters (no live DNS)', () => {
  it('queries all common DKIM selectors for TXT and CNAME', () => {
    const questions = recordQuestions('example.com.au')
    for (const selector of SELECTORS)
      for (const type of ['TXT', 'CNAME'])
        expect(questions).toContainEqual({ name: `${selector}._domainkey.example.com.au`, type })
  })
  it('normalises Node TXT chunks, MX, CAA and addresses', () => {
    expect(normaliseNodeAnswer('TXT', [['v=spf1 ', '-all']])).toEqual(['v=spf1 -all'])
    expect(normaliseNodeAnswer('MX', [{ priority: 0, exchange: 'Mail.EXAMPLE.' }])).toEqual([
      '0 mail.example',
    ])
    expect(normaliseNodeAnswer('CAA', [{ critical: 0, issue: 'letsencrypt.org' }])).toEqual([
      '0 issue "letsencrypt.org"',
    ])
    expect(normaliseNodeAnswer('A', [{ address: '216.198.79.1', ttl: 300 }])).toEqual([
      '216.198.79.1',
    ])
  })
  it('filters DoH answers by owner, preserving exact TXT values and TTLs', () => {
    expect(normaliseDohAnswer({ name: 'example.com.au', type: 'A' }, fixtures.doh)).toMatchObject({
      values: ['216.198.79.1'],
      ttls: [300],
    })
    expect(
      normaliseDohAnswer(
        { name: 'example.com.au', type: 'TXT' },
        {
          Status: 0,
          Answer: [{ name: 'example.com.au.', type: 16, TTL: 300, data: '"v=spf1 " "-all"' }],
        },
      ).values,
    ).toEqual(['v=spf1 -all'])
    expect(normaliseDohAnswer({ name: 'x', type: 'DS' }, { Status: 2 }).error).toBeDefined()
    expect(normaliseDohAnswer({ name: 'x', type: 'A' }, { Status: 3 }).values).toEqual([])
  })
  it('follows CAA inheritance and CNAMEs, and handles failures and loops', async () => {
    const query = async ({ name, type }) => ({
      name,
      type,
      values:
        name === 'www.example.com.au' && type === 'CNAME'
          ? ['target.example.net']
          : name === 'example.net' && type === 'CAA'
            ? ['0 issue "digicert.com"']
            : [],
    })
    expect(await effectiveCaa('www.example.com.au', query)).toMatchObject({
      source: 'example.net',
      values: ['0 issue "digicert.com"'],
    })
    expect(await effectiveCaa('example.com.au', async (q) => ({ ...q, values: [] }))).toMatchObject(
      { values: [] },
    )
    expect((await effectiveCaa('x', async (q) => ({ ...q, values: ['x'] }))).error).toContain(
      'loop',
    )
    expect(
      (await effectiveCaa('x', async (q) => ({ ...q, values: [], error: 'timeout' }))).error,
    ).toBe('timeout')
  })
  it('distinguishes missing DNS data from transport errors', async () => {
    for (const code of ['ENODATA', 'ENOTFOUND', 'ETIMEOUT', 'ESERVFAIL']) {
      const resolver = {
        resolve: vi.fn().mockRejectedValue(Object.assign(new Error('private detail'), { code })),
      }
      const result = await nodeQuery(resolver, { name: 'example.com.au', type: 'A' })
      expect(Boolean(result.error)).toBe(!['ENODATA', 'ENOTFOUND'].includes(code))
      expect(JSON.stringify(result)).not.toContain('private detail')
    }
  })
  it('uses only GET, prevents redirects, and never leaks a Vercel token or error body', async () => {
    const env = {
      VERCEL_TOKEN: 'test-secret',
      VERCEL_PROJECT_ID: 'prj_test',
      VERCEL_TEAM_ID: 'team_test',
    }
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ...fixtures.config, token: 'test-secret' })))
    const config = await vercelConfig('example.com.au', env, fetcher)
    expect(JSON.stringify(config)).not.toContain('test-secret')
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: { Authorization: 'Bearer test-secret' },
    })
    expect(fetcher.mock.calls[0][0].searchParams.get('projectIdOrName')).toBe('prj_test')
    expect(fetcher.mock.calls[0][0].searchParams.get('teamId')).toBe('team_test')
    const fail = vi.fn().mockResolvedValue(new Response('test-secret', { status: 403 }))
    expect(JSON.stringify(await vercelConfig('example.com.au', env, fail))).not.toContain(
      'test-secret',
    )
    const throws = vi.fn().mockRejectedValue(new Error('test-secret'))
    expect(JSON.stringify(await vercelConfig('example.com.au', env, throws))).not.toContain(
      'test-secret',
    )
    const dnsFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixtures.doh)))
    expect(
      (
        await dohQuery(
          'https://dns.google/resolve',
          { name: 'example.com.au', type: 'A' },
          dnsFetch,
        )
      ).values,
    ).toEqual(['216.198.79.1'])
    expect(dnsFetch.mock.calls[0][1].method).toBe('GET')
    expect(
      (await dohQuery('https://dns.google/resolve', { name: 'x', type: 'DS' }, throws)).error,
    ).toBeDefined()
  })
})

describe('snapshot collection with offline DNS and API adapters', () => {
  const adapters = (ns = ['ns1.vercel-dns.com', 'ns2.vercel-dns.com']) => {
    const resolvers = []
    const makeResolver = () => {
      const resolver = {
        setServers: vi.fn(),
        resolve: vi.fn(async (name, type) => {
          if (type === 'NS') return ns
          if (ns.includes(name) && type === 'A') return ['192.0.2.53']
          if (name === 'example.com.au' && type === 'A') return ['216.198.79.1']
          if (name === 'www.example.com.au' && type === 'CNAME')
            return ['project.vercel-dns-017.com']
          throw Object.assign(new Error('No data'), { code: 'ENODATA' })
        }),
      }
      resolvers.push(resolver)
      return resolver
    }
    const fetcher = vi.fn(async (url, init) => {
      expect(init.method).toBe('GET')
      if (url.hostname === 'api.vercel.com') return new Response(JSON.stringify(fixtures.config))
      return new Response(JSON.stringify({ Status: 0, Answer: [] }))
    })
    return { makeResolver, fetcher, resolvers }
  }
  it('queries every authoritative server and both public resolvers, with separate apex/www API reads', async () => {
    const net = adapters()
    const report = await collectSnapshot(
      { domain: 'example.com.au' },
      { VERCEL_TOKEN: 'test-secret', VERCEL_PROJECT_ID: 'prj_test' },
      net,
    )
    expect(report.authorities).toHaveLength(2)
    expect(report.publicResolvers).toHaveLength(2)
    expect(report.ds).toHaveLength(2)
    expect(report.caaPolicies).toHaveLength(4)
    expect(report.expected).toEqual({ a: ['216.198.79.1'], cname: ['project.vercel-dns-017.com'] })
    expect(report.errors).toEqual([])
    expect(assessSnapshot(report).blocked).toBe(false)
    expect(net.resolvers.slice(1).every((r) => r.setServers.mock.calls.length === 1)).toBe(true)
    expect(
      net.fetcher.mock.calls
        .filter(([url]) => url.hostname === 'api.vercel.com')
        .map(([url]) => url.pathname),
    ).toEqual(['/v6/domains/example.com.au/config', '/v6/domains/www.example.com.au/config'])
    expect(JSON.stringify(report)).not.toContain('test-secret')
  })
  it('explicit domain-card values override API recommendations', async () => {
    const report = await collectSnapshot(
      { domain: 'example.com.au', a: '192.0.2.1', cname: 'other.example.net' },
      { VERCEL_TOKEN: 'test-secret', VERCEL_PROJECT_ID: 'prj_test' },
      adapters(),
    )
    expect(report.expected).toEqual({ a: ['192.0.2.1'], cname: ['other.example.net'] })
    expect(assessSnapshot(report).blocked).toBe(true)
  })
  it('reports missing authority as incomplete and never calls Vercel without both environment variables', async () => {
    const net = adapters([])
    const report = await collectSnapshot(
      { domain: 'example.com.au' },
      { VERCEL_TOKEN: 'test-secret' },
      net,
    )
    expect(report.authorities).toEqual([])
    expect(report.errors[0]).toContain('No authoritative')
    expect(report.vercel).toEqual([])
    expect(report.expected).toEqual({ a: [], cname: [] })
    expect(net.fetcher.mock.calls.some(([url]) => url.hostname === 'api.vercel.com')).toBe(false)
  })
})
