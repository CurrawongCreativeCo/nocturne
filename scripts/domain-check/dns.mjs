import { Resolver } from 'node:dns/promises'

import { normaliseName, providerGuess, recommended } from './checks.mjs'

export const PUBLIC_RESOLVERS = [
  { server: 'Cloudflare (1.1.1.1)', url: 'https://cloudflare-dns.com/dns-query' },
  { server: 'Google (8.8.8.8)', url: 'https://dns.google/resolve' },
]
const TYPES = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, DS: 43, CAA: 257 }
export const SELECTORS = ['google', 'selector1', 'selector2', 'k1', 'default', 's1', 's2']

export function recordQuestions(domain) {
  return [
    ...[domain, `www.${domain}`].flatMap((name) =>
      ['A', 'AAAA', 'CNAME', 'CAA'].map((type) => ({ name, type })),
    ),
    { name: domain, type: 'MX' },
    { name: domain, type: 'TXT' },
    { name: `_dmarc.${domain}`, type: 'TXT' },
    { name: `_vercel.${domain}`, type: 'TXT' },
    ...SELECTORS.flatMap((selector) =>
      ['TXT', 'CNAME'].map((type) => ({ name: `${selector}._domainkey.${domain}`, type })),
    ),
  ]
}

export function normaliseNodeAnswer(type, answers) {
  return answers
    .map((answer) => {
      if (type === 'TXT') return answer.join('')
      if (type === 'MX') return `${answer.priority} ${normaliseName(answer.exchange)}`
      if (type === 'CAA') {
        const tag = Object.keys(answer).find((key) => key !== 'critical')
        return `${answer.critical} ${tag} "${answer[tag]}"`
      }
      return normaliseName(typeof answer === 'string' ? answer : answer.address)
    })
    .sort()
}

export function normaliseDohAnswer(question, response) {
  if (![0, 3].includes(response.Status))
    return { ...question, values: [], error: `DNS status ${response.Status}` }
  const answers = (response.Answer || []).filter(
    (answer) =>
      answer.type === TYPES[question.type] && normaliseName(answer.name) === question.name,
  )
  const values = answers
    .map(({ data }) => {
      if (question.type === 'TXT') {
        // DNS JSON represents each TXT chunk as a quoted string. Join chunks without losing spaces inside.
        const chunks = data.match(/"(?:[^"\\]|\\.)*"/g)
        return chunks
          ? chunks.map((chunk) => chunk.slice(1, -1).replace(/\\(["\\])/g, '$1')).join('')
          : data
      }
      if (['NS', 'CNAME', 'MX'].includes(question.type)) return normaliseName(data)
      return data
    })
    .sort()
  return { ...question, values, ttls: answers.map((answer) => answer.TTL) }
}

export async function dohQuery(endpoint, question, fetcher = fetch) {
  try {
    const url = new URL(endpoint)
    url.searchParams.set('name', question.name)
    url.searchParams.set('type', question.type)
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'error',
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Resolver HTTP failure')
    return normaliseDohAnswer(question, await response.json())
  } catch {
    return { ...question, values: [], error: 'DoH lookup failed or timed out' }
  }
}

export async function nodeQuery(resolver, question) {
  try {
    return {
      ...question,
      values: normaliseNodeAnswer(
        question.type,
        await resolver.resolve(question.name, question.type),
      ),
    }
  } catch (error) {
    return {
      ...question,
      values: [],
      ...(['ENODATA', 'ENOTFOUND'].includes(error.code)
        ? {}
        : { error: 'Authoritative lookup failed or timed out' }),
    }
  }
}

// CAA is inherited from the nearest ancestor with a policy, after following CNAMEs.
export async function effectiveCaa(name, query) {
  const original = name
  const visited = new Set()
  while (name && !visited.has(name) && visited.size < 20) {
    visited.add(name)
    const alias = await query({ name, type: 'CNAME' })
    if (alias.error) return { name: original, source: name, values: [], error: alias.error }
    if (alias.values.length) {
      name = alias.values[0]
      continue
    }
    const caa = await query({ name, type: 'CAA' })
    if (caa.error || caa.values.length) return { ...caa, name: original, source: name }
    name = name.split('.').slice(1).join('.')
  }
  return {
    name: original,
    source: name || '(no inherited policy)',
    values: [],
    ...(name ? { error: 'CAA alias loop or lookup limit' } : {}),
  }
}

export async function vercelConfig(domain, env, fetcher = fetch) {
  const url = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config`)
  url.searchParams.set('projectIdOrName', env.VERCEL_PROJECT_ID)
  if (env.VERCEL_TEAM_ID) url.searchParams.set('teamId', env.VERCEL_TEAM_ID)
  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'error',
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok)
      return {
        name: domain,
        error: `Vercel configuration request failed (HTTP ${response.status}); check project/team scope or use explicit expected values.`,
      }
    const body = await response.json()
    // Allowlist fields: never expose request headers, env, or an untrusted API error body.
    return {
      name: domain,
      misconfigured: body.misconfigured,
      configuredBy: body.configuredBy,
      recommendedIPv4: body.recommendedIPv4,
      recommendedCNAME: body.recommendedCNAME,
    }
  } catch {
    return {
      name: domain,
      error: 'Vercel configuration request failed or timed out; use the domain card values.',
    }
  }
}

export async function collectSnapshot(
  options,
  env = process.env,
  { makeResolver = () => new Resolver({ timeout: 3000, tries: 1 }), fetcher = fetch } = {},
) {
  const system = makeResolver()
  const ns = await nodeQuery(system, { name: options.domain, type: 'NS' })
  const questions = recordQuestions(options.domain)
  const authorities = await Promise.all(
    ns.values.map(async (server) => {
      const ips = await nodeQuery(system, { name: server, type: 'A' })
      const ipv6 = ips.values.length
        ? { values: [] }
        : await nodeQuery(system, { name: server, type: 'AAAA' })
      const addresses = [...ips.values, ...ipv6.values]
      if (!addresses.length)
        return {
          server,
          addresses,
          records: questions.map((q) => ({
            ...q,
            values: [],
            error: 'Cannot resolve authoritative server address',
          })),
        }
      const resolver = makeResolver()
      resolver.setServers(addresses)
      return {
        server,
        addresses,
        records: await Promise.all(questions.map((q) => nodeQuery(resolver, q))),
      }
    }),
  )
  const publicResolvers = await Promise.all(
    PUBLIC_RESOLVERS.map(async ({ server, url }) => ({
      server,
      records: await Promise.all(questions.map((q) => dohQuery(url, q, fetcher))),
    })),
  )
  const ds = await Promise.all(
    PUBLIC_RESOLVERS.map(async ({ server, url }) => ({
      ...(await dohQuery(url, { name: options.domain, type: 'DS' }, fetcher)),
      resolver: server,
    })),
  )
  const caaPolicies = (
    await Promise.all(
      PUBLIC_RESOLVERS.map(({ server, url }) =>
        Promise.all(
          [options.domain, `www.${options.domain}`].map(async (name) => ({
            ...(await effectiveCaa(name, (q) => dohQuery(url, q, fetcher))),
            resolver: server,
          })),
        ),
      ),
    )
  ).flat()
  const vercel =
    env.VERCEL_TOKEN && env.VERCEL_PROJECT_ID
      ? await Promise.all(
          [options.domain, `www.${options.domain}`].map((name) => vercelConfig(name, env, fetcher)),
        )
      : []
  const expected = {
    a: options.a ? [options.a] : recommended(vercel[0], 'recommendedIPv4'),
    cname: options.cname ? [options.cname] : recommended(vercel[1], 'recommendedCNAME').slice(0, 1),
  }
  const errors = [
    ...(ns.error ? [ns.error] : []),
    ...(!authorities.length
      ? ['No authoritative nameservers found; supply an apex domain and retry.']
      : []),
    ...authorities.flatMap((s) =>
      s.records.filter((r) => r.error).map((r) => `${s.server}: ${r.name} ${r.type}: ${r.error}`),
    ),
    ...publicResolvers.flatMap((s) =>
      s.records.filter((r) => r.error).map((r) => `${s.server}: ${r.name} ${r.type}: ${r.error}`),
    ),
    ...[...ds, ...caaPolicies, ...vercel]
      .filter((r) => r.error)
      .map((r) => `${r.name}: ${r.error}`),
  ]
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    domain: options.domain,
    providerGuess: providerGuess(ns.values),
    ns,
    expected,
    authorities,
    publicResolvers,
    ds,
    caaPolicies,
    vercel,
    errors,
  }
}
