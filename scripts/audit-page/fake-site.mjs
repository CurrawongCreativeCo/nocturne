/**
 * A fake site and Content Lake for the audit's tests. The site is served through launch-check's real
 * `request` and `followRedirects` with a fake `fetch`, so redirects, HEAD and header handling are the
 * production code; the lake answers GROQ with groq-js, as tests/e2e/fake-sanity.mjs does, and records
 * every request so a test can prove none of them writes.
 */
import { evaluate, parse } from 'groq-js'

import { followRedirects, request } from '../launch-check/net.mjs'

const html = (body, headers = {}) => ({
  status: 200,
  body,
  headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
})

/**
 * `routes` maps a path (or "METHOD path") to `{ status, body, headers }`. Anything not listed is a 404.
 * A HEAD is answered from the GET route without a body. Returns `{ net, requests }`.
 */
export function fakeSite(origin, routes) {
  const requests = []
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    requests.push({ method, url: url.href })
    const route = routes[`${method} ${url.pathname}`] ??
      routes[url.pathname + url.search] ??
      routes[url.pathname] ?? {
        status: 404,
        body: 'Not found',
        headers: { 'content-type': 'text/plain' },
      }
    const withBody = method === 'HEAD' ? null : route.body
    return new Response(withBody, { status: route.status ?? 200, headers: route.headers })
  }
  const net = {
    request: (url, options) => request(url, { ...options, fetchImpl }),
    followRedirects: (url, options) => followRedirects(url, { ...options, fetchImpl }),
  }
  return { net, requests, fetchImpl, origin }
}

/** Route entries for pages from `src/lib/audit/fixtures.ts`. */
export const routesFor = (pages) =>
  Object.fromEntries(pages.map(({ path, html: body }) => [path, html(body)]))

export const text = (body, type = 'text/plain') => ({
  status: 200,
  body,
  headers: { 'content-type': type },
})

export const redirect = (location, status = 301) => ({
  status,
  body: '',
  headers: { location, 'content-type': 'text/plain' },
})

/**
 * A fetch standing in for the Content Lake: answers `GET …/data/query/<dataset>` from `documents`
 * with groq-js and records every request in `requests`. Anything else is a 404, and the test then
 * asserts that no recorded request was anything but a query.
 */
export function fakeLake(documents) {
  const requests = []
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input)
    requests.push({
      method: init.method ?? 'GET',
      path: url.pathname,
      authorization: init.headers?.authorization ?? null,
      perspective: url.searchParams.get('perspective'),
    })
    if (!/^\/v[\w-]+\/data\/query\/\w+$/.test(url.pathname) || (init.method ?? 'GET') !== 'GET') {
      return new Response('{}', { status: 404 })
    }
    if (!/^Bearer \S+$/.test(init.headers?.authorization ?? '')) {
      return new Response('{}', { status: 401 })
    }
    const params = {}
    for (const [name, value] of url.searchParams) {
      if (name.startsWith('$')) params[name.slice(1)] = JSON.parse(value)
    }
    const result = await (
      await evaluate(parse(url.searchParams.get('query') ?? '', { params }), {
        dataset: documents,
        params,
      })
    ).get()
    return new Response(JSON.stringify({ result, ms: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return { fetchImpl, requests }
}
