import { describe, expect, it, vi } from 'vitest'

import { makeNet } from '../launch-check.mjs'
import { AuditRefusal, createGuardedNet, LIMITS, permittedOrigins } from './guard.mjs'

const ORIGIN = 'https://example.com.au'
const ok = (url, extra = {}) => ({
  url,
  status: 200,
  headers: {},
  contentType: 'text/html',
  text: 'ok',
  ...extra,
})
const redirectTo = (url, location, status = 301) => ({ ...ok(url), status, headers: { location } })

/** A guarded net over a fake `request` that records every call it is allowed to make. */
function guarded(handler = (url) => ok(url), options = {}) {
  const request = vi.fn(async (url, opts) => handler(url, opts))
  const net = createGuardedNet({ request, allowed: permittedOrigins(ORIGIN), ...options })
  return { net, request }
}

describe('permittedOrigins', () => {
  it('is the origin that was named', () => {
    expect(permittedOrigins('https://example.com.au/about?x=1')).toEqual([ORIGIN])
    expect(permittedOrigins('http://localhost:3100/')).toEqual(['http://localhost:3100'])
  })

  it('adds the https version of an http address on the default port only', () => {
    expect(permittedOrigins('http://example.com.au/')).toEqual(['http://example.com.au', ORIGIN])
    expect(permittedOrigins('http://example.com.au:8080/')).toEqual(['http://example.com.au:8080'])
  })

  it.each([
    'ftp://example.com/',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,hi',
    'gopher://example.com/',
    'not a url',
    '',
  ])('refuses %j', (target) => {
    expect(() => permittedOrigins(target)).toThrow(AuditRefusal)
  })

  it('refuses credentials in the address, which the audit would send', () => {
    expect(() => permittedOrigins('https://user:secret@example.com.au/')).toThrow(/username/)
    expect(() => permittedOrigins('https://user@example.com.au/')).toThrow(AuditRefusal)
  })
})

describe('the permitted origin', () => {
  it.each([
    'https://evil.example/',
    'http://example.com.au/',
    'https://example.com.au.evil.example/',
    'https://www.example.com.au/',
    'https://example.com.au:8443/',
    'https://user@example.com.au/',
    'http://localhost:9999/',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://0x7f.1/',
    'http://[::1]/',
    'http://10.0.0.5/admin',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/',
    'file:///etc/passwd',
    'ftp://example.com.au/',
    'javascript:alert(1)',
    'not a url',
  ])('is never requested: %s', async (url) => {
    const { net, request } = guarded()
    const response = await net.request(url)
    expect(response).toMatchObject({ status: 0, refused: true })
    expect(response.error).toMatch(/^Refused/)
    expect(request).not.toHaveBeenCalled()
    expect(net.stats().refused).toHaveLength(1)
  })

  it('requests its own origin', async () => {
    const { net, request } = guarded()
    expect((await net.request(`${ORIGIN}/about`)).status).toBe(200)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('can be narrowed to the origin a first page ended on, and no further', async () => {
    const { net, request } = guarded(undefined, { allowed: ['http://example.com.au', ORIGIN] })
    expect((await net.request('http://example.com.au/')).status).toBe(200)
    net.pin(ORIGIN)
    expect((await net.request('http://example.com.au/')).refused).toBe(true)
    expect((await net.request(`${ORIGIN}/`)).status).toBe(200)
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('redirects', () => {
  it('are not followed off the origin: the hop that would leave is returned, not requested', async () => {
    const { net, request } = guarded((url) =>
      url === `${ORIGIN}/a` ? redirectTo(url, 'https://evil.example/landing') : ok(url),
    )
    const result = await net.followRedirects(`${ORIGIN}/a`)
    expect(request).toHaveBeenCalledTimes(1)
    expect(result.leftOrigin).toBe('https://evil.example/landing')
    expect(result.final).toMatchObject({ status: 301, url: `${ORIGIN}/a` })
    expect(result.chain).toHaveLength(1)
  })

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:9999/__fixture/mutations',
    'https://example.com.au.evil.example/',
    '//evil.example/x',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:pw@example.com.au/x',
  ])('to %s are not followed', async (location) => {
    const { net, request } = guarded((url) =>
      url === `${ORIGIN}/a` ? redirectTo(url, location) : ok(url),
    )
    const result = await net.followRedirects(`${ORIGIN}/a`)
    expect(request).toHaveBeenCalledTimes(1)
    expect(result.leftOrigin).toBeDefined()
  })

  it('are followed within the origin, a few hops', async () => {
    const { net, request } = guarded((url) =>
      url.endsWith('/a')
        ? redirectTo(url, '/b')
        : url.endsWith('/b')
          ? redirectTo(url, `${ORIGIN}/c`)
          : ok(url),
    )
    const result = await net.followRedirects(`${ORIGIN}/a`)
    expect(result.final).toMatchObject({ status: 200, url: `${ORIGIN}/c` })
    expect(result.chain.map((hop) => hop.url)).toEqual([
      `${ORIGIN}/a`,
      `${ORIGIN}/b`,
      `${ORIGIN}/c`,
    ])
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('stop after the maximum hops, so a loop ends', async () => {
    const { net, request } = guarded((url) => redirectTo(url, `${ORIGIN}/again`))
    const result = await net.followRedirects(`${ORIGIN}/a`)
    expect(request).toHaveBeenCalledTimes(LIMITS.maxRedirects + 1)
    expect(result.final.status).toBe(301)
  })

  it('are never left to fetch when a request asks to follow: the guard follows by hand', async () => {
    const { net, request } = guarded((url) =>
      url === `${ORIGIN}/robots.txt` ? redirectTo(url, 'https://evil.example/robots.txt') : ok(url),
    )
    const response = await net.request(`${ORIGIN}/robots.txt`, { follow: true })
    expect(response.status).toBe(301)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][1].follow).toBe(false)
  })

  it('upgrade from http to https on the same host', async () => {
    const request = vi.fn(async (url) =>
      url.startsWith('http://') ? redirectTo(url, 'https://example.com.au/') : ok(url),
    )
    const net = createGuardedNet({ request, allowed: permittedOrigins('http://example.com.au/') })
    const result = await net.followRedirects('http://example.com.au/')
    expect(result.final).toMatchObject({ status: 200, url: 'https://example.com.au/' })
    expect(result.leftOrigin).toBeUndefined()
  })
})

describe('what is sent', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('never a %s', async (method) => {
    const { net, request } = guarded()
    expect((await net.request(`${ORIGIN}/`, { method })).refused).toBe(true)
    expect(request).not.toHaveBeenCalled()
  })

  it('allows GET and HEAD, in any case', async () => {
    const { net, request } = guarded()
    await net.request(`${ORIGIN}/`, { method: 'head' })
    await net.request(`${ORIGIN}/`, { method: 'GET' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('drops authorization and cookie headers and any body', async () => {
    const { net, request } = guarded()
    await net.request(`${ORIGIN}/`, {
      headers: { Authorization: 'Bearer secret', cookie: 'a=b', 'x-other': '1' },
      body: 'payload',
    })
    const options = request.mock.calls[0][1]
    expect(options.headers).toEqual({ 'x-other': '1' })
    expect(options.body).toBeUndefined()
  })

  it('does not send the protection-bypass secret anywhere but the permitted host', async () => {
    const seen = []
    const fetchImpl = async (url, init) => {
      seen.push({ url: String(url), bypass: init.headers['x-vercel-protection-bypass'] })
      return new Response('ok', { status: 200, headers: { 'content-type': 'text/html' } })
    }
    const real = makeNet(ORIGIN, 'bypass-secret')
    const net = createGuardedNet({
      request: (url, options) => real.request(url, { ...options, fetchImpl }),
      allowed: [ORIGIN],
    })
    await net.request(`${ORIGIN}/`)
    await net.request('https://evil.example/')
    expect(seen).toEqual([{ url: `${ORIGIN}/`, bypass: 'bypass-secret' }])
  })
})

describe('limits', () => {
  it('stop requests after the maximum number', async () => {
    const { net, request } = guarded(undefined, { limits: { ...LIMITS, maxRequests: 3 } })
    const answers = []
    for (let i = 0; i < 5; i += 1) answers.push(await net.request(`${ORIGIN}/${i}`))
    expect(answers.map((answer) => Boolean(answer.refused))).toEqual([
      false,
      false,
      false,
      true,
      true,
    ])
    expect(request).toHaveBeenCalledTimes(3)
    expect(net.stats().sent).toBe(3)
  })

  it('stop at the deadline for the whole audit', async () => {
    let time = 0
    const { net, request } = guarded(undefined, {
      limits: { ...LIMITS, deadlineMs: 1000 },
      now: () => time,
    })
    expect((await net.request(`${ORIGIN}/a`)).refused).toBeUndefined()
    time = 1000
    expect((await net.request(`${ORIGIN}/b`)).error).toMatch(/ran out of time/)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('cap every request’s timeout, whatever the caller asks, and by what is left of the deadline', async () => {
    let time = 0
    const { net, request } = guarded(undefined, {
      limits: { ...LIMITS, deadlineMs: 10_000, requestTimeoutMs: 15_000 },
      now: () => time,
    })
    await net.request(`${ORIGIN}/a`, { timeout: 999_999 })
    time = 8_000
    await net.request(`${ORIGIN}/b`)
    expect(request.mock.calls[0][1].timeout).toBe(10_000)
    expect(request.mock.calls[1][1].timeout).toBe(2_000)
  })

  it('have values that keep an audit small', () => {
    expect(LIMITS.maxRequests).toBeLessThanOrEqual(1000)
    expect(LIMITS.maxRedirects).toBeLessThanOrEqual(10)
    expect(LIMITS.deadlineMs).toBeLessThanOrEqual(300_000)
    expect(LIMITS.requestTimeoutMs).toBeLessThanOrEqual(30_000)
  })
})
