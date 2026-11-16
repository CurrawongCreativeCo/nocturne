import { spawn } from 'node:child_process'
import http from 'node:http'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

/**
 * The client diagnostics must see the requests the site really makes. They are made by next-sanity's `sanityFetch`
 * (Next's `next-js` export), whose nested @sanity/client 7.27 and get-it 8.8 resolve, under Next's `react-server`
 * condition, to builds that call the global `fetch`: Node's undici, not `node:http`. An earlier logger watched only
 * `node:http`'s channels and recorded none of them (a capture saw 2,142 requests at the lake and no client request).
 *
 * These run the INSTALLED next-sanity client in a child process, resolved as Next resolves it (`--conditions=
 * react-server`) and, for the other route to `fetch`, with the options that select it (`next`), against a local
 * server; they cover GET and POST, successes and controlled connection failures, and hold the logger to recording
 * each request, its socket where undici's channels expose one, its response headers, its completion and its error,
 * while changing nothing the client returns or throws.
 */

const root = join(fileURLToPath(import.meta.url), '..', '..')
const preload = join(root, 'tests', 'e2e', 'diagnostics', 'http-client-diagnostics.mjs')
const PREFIX = '[e2e-diag] '

const children = new Set()
afterAll(async () => {
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve()
          child.once('exit', resolve)
          child.kill('SIGKILL')
        }),
    ),
  )
})

const diagLines = (text) =>
  text
    .split('\n')
    .filter((line) => line.startsWith(PREFIX))
    .map((line) => JSON.parse(line.slice(PREFIX.length)))

/** A local stand-in for the lake: answers a query, or resets the connection the way a dying peer does. */
async function serve(mode = 'ok') {
  const seen = []
  const server = http.createServer((req, res) => {
    let bytes = 0
    req.on('data', (chunk) => (bytes += chunk.length))
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, bytes })
      if (mode === 'reset') return req.socket.resetAndDestroy()
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ ms: 1, query: 'q', result: 'ok' }))
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, seen, port: server.address().port }
}

/** The installed next-sanity client, asked for a short query (a GET) and a long one (a POST). */
const CLIENT = `
  const { createClient } = await import('next-sanity')
  const [port, which, route] = process.argv.slice(1)
  const client = createClient({
    projectId: 'abcd1234', dataset: 'production', apiVersion: '2025-01-01', useCdn: false,
    apiHost: 'http://127.0.0.1:' + port, useProjectHostname: false, token: 't', maxRetries: 1, perspective: 'published',
  })
  // 'options' is the route that selects fetch through the call's own options, rather than the build's resolution.
  const options = route === 'options' ? { next: { revalidate: 1, tags: ['t'] } } : {}
  const short = '*[_type == "x"]{_id}'
  const long = '*[_type == "x" && title match "' + 'a'.repeat(12000) + '"]{_id}'
  const out = []
  for (const method of which.split(',')) {
    try {
      out.push(method + ' ok ' + JSON.stringify(await client.fetch(method === 'GET' ? short : long, {}, options)))
    } catch (error) {
      out.push(method + ' failed ' + (error.cause?.code ?? error.code ?? error.name) + ' ' + String(error.message).slice(0, 40))
    }
  }
  console.log(JSON.stringify(out))
  process.exit(0)
`

function run(script, args, { conditions = [], withPreload = true, env = {} } = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        ...conditions.map((condition) => `--conditions=${condition}`),
        ...(withPreload ? ['--import', pathToFileURL(preload).href] : []),
        '--input-type=module',
        '-e',
        script,
        ...args,
      ],
      { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    children.add(child)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.once('exit', (code) => resolve({ code, stdout, stderr }))
  })
}
const watch = (port, extra = {}) => ({
  E2E_HTTP_DIAGNOSTICS: '1',
  E2E_DIAGNOSTICS_PORTS: String(port),
  ...extra,
})
const only = (lines, event) => lines.filter((l) => l.event === event)

describe('the client logger on the requests the site really makes', () => {
  it('records a GET and a POST through next-sanity resolved as Next resolves it, with their sockets, headers and completion', async () => {
    const { server, seen, port } = await serve('ok')
    const plain = await run(CLIENT, [String(port), 'GET,POST', 'build'], {
      conditions: ['react-server'],
      withPreload: false,
    })
    const watched = await run(CLIENT, [String(port), 'GET,POST', 'build'], {
      conditions: ['react-server'],
      env: watch(port),
    })
    server.close()
    // The client's own answers are the same with the logger on.
    expect(JSON.parse(watched.stdout)).toEqual(['GET ok "ok"', 'POST ok "ok"'])
    expect(watched.stdout).toBe(plain.stdout)
    // And the requests really were a GET, then a POST with a body (twice: once per run).
    expect(seen.map((s) => s.method)).toEqual(['GET', 'POST', 'GET', 'POST'])
    expect(seen[1].bytes).toBeGreaterThan(12000)

    const lines = diagLines(watched.stderr)
    // The transport the logger must watch is undici's: node:http's channels see none of it.
    expect(only(lines, 'request-created')).toEqual([])
    const requests = only(lines, 'fetch-request')
    expect(requests.map((l) => l.method)).toEqual(['GET', 'POST'])
    expect(requests.map((l) => l.reqSeq)).toEqual([1, 2])
    expect(requests[0].origin).toBe(`http://127.0.0.1:${port}`)
    const sockets = only(lines, 'fetch-socket')
    expect(sockets).toHaveLength(2)
    for (const socket of sockets) {
      expect(socket.remotePort).toBe(port)
      expect(socket.localPort).toBeTypeOf('number')
      expect(socket.requestsOnSocket).toBeGreaterThanOrEqual(1)
    }
    expect(only(lines, 'fetch-headers').map((l) => l.status)).toEqual([200, 200])
    expect(only(lines, 'fetch-complete')).toHaveLength(2)
    expect(only(lines, 'fetch-error')).toEqual([])
  }, 30_000)

  it('records them too where the call’s own options select fetch, in the default build', async () => {
    const { server, port } = await serve('ok')
    const plain = await run(CLIENT, [String(port), 'GET,POST', 'options'], { withPreload: false })
    const watched = await run(CLIENT, [String(port), 'GET,POST', 'options'], { env: watch(port) })
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual(['GET ok "ok"', 'POST ok "ok"'])
    expect(watched.stdout).toBe(plain.stdout)
    const lines = diagLines(watched.stderr)
    expect(only(lines, 'fetch-request').map((l) => l.method)).toEqual(['GET', 'POST'])
    expect(only(lines, 'fetch-headers').map((l) => l.status)).toEqual([200, 200])
  }, 30_000)

  it('records a reset on a GET (and the client’s one retry as a second request) and on a POST (no retry), and leaves the errors alone', async () => {
    const { server, seen, port } = await serve('reset')
    const plain = await run(CLIENT, [String(port), 'GET,POST', 'build'], {
      conditions: ['react-server'],
      withPreload: false,
    })
    const plainSeen = seen.length
    const watched = await run(CLIENT, [String(port), 'GET,POST', 'build'], {
      conditions: ['react-server'],
      env: watch(port),
    })
    server.close()
    // What the client throws is the same with the logger on: a failure for each, with the same cause.
    const outcome = JSON.parse(watched.stdout)
    expect(outcome[0]).toMatch(/^GET failed ECONNRESET/)
    expect(outcome[1]).toMatch(/^POST failed ECONNRESET/)
    expect(watched.stdout).toBe(plain.stdout)
    // The client retried the GET once (maxRetries 1) and did not retry the POST; the lake saw 2 + 1 requests per run.
    expect(plainSeen).toBe(3)
    expect(seen.length - plainSeen).toBe(3)

    const lines = diagLines(watched.stderr)
    const requests = only(lines, 'fetch-request')
    expect(requests.map((l) => l.method)).toEqual(['GET', 'GET', 'POST'])
    // The two GET attempts are the same URL: ordinals 1 and 2, a count of fetches in this process, not get-it's
    // `attemptNumber`, which this logger does not see and does not reinterpret.
    expect(requests.slice(0, 2).map((l) => l.sameUrlOrdinal)).toEqual([1, 2])
    expect(requests[0].urlKey).toBe(requests[1].urlKey)
    const errors = only(lines, 'fetch-error')
    expect(errors).toHaveLength(3)
    for (const error of errors) {
      expect(error.code).toBe('ECONNRESET')
      expect(error.msSinceStart).toBeTypeOf('number')
      // The request and the socket it was written to, where undici's channels give that relationship.
      expect(error.socketId).toBeTypeOf('number')
    }
    expect(only(lines, 'fetch-headers')).toEqual([])
  }, 30_000)
})

describe('the client logger leaves fetch alone', () => {
  const RAW = `
    const [port, mode] = process.argv.slice(1)
    const res = await fetch('http://127.0.0.1:' + port + '/slow')
    // Headers are here; the body has been neither read nor asked for.
    await new Promise((resolve) => setTimeout(resolve, 150))
    const before = { used: res.bodyUsed, locked: res.body.locked }
    const text = await res.text()
    console.log(JSON.stringify({ status: res.status, before, text }))
    process.exit(0)
  `
  it('does not read or lock a response body it was not asked to', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200)
      res.write('first')
      setTimeout(() => res.end('second'), 50)
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const plain = await run(RAW, [String(port)], { withPreload: false })
    const watched = await run(RAW, [String(port)], { env: watch(port) })
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual({
      status: 200,
      before: { used: false, locked: false },
      text: 'firstsecond',
    })
    expect(watched.stdout).toBe(plain.stdout)
    expect(only(diagLines(watched.stderr), 'fetch-headers')).toHaveLength(1)
  }, 20_000)

  const MANY = `
    const [other, watched, count] = process.argv.slice(1)
    for (let i = 0; i < Number(count); i++) await (await fetch('http://127.0.0.1:' + other + '/x')).text()
    await (await fetch('http://127.0.0.1:' + watched + '/x')).text()
    console.log('done')
    process.exit(0)
  `
  const ok = () =>
    new Promise((resolve) => {
      const server = http.createServer((req, res) => res.end('ok'))
      server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
    })

  it('records only the watched origin, and spends none of its line budget on any other', async () => {
    const other = await ok()
    const target = await ok()
    const result = await run(MANY, [String(other.port), String(target.port), '8'], {
      env: watch(target.port, { E2E_DIAGNOSTICS_MAX_LINES: '10' }),
    })
    other.server.close()
    target.server.close()
    expect(result.stdout.trim()).toBe('done')
    const lines = diagLines(result.stderr)
    expect(only(lines, 'limit-reached')).toEqual([])
    expect(only(lines, 'fetch-request')).toHaveLength(1)
    expect(only(lines, 'fetch-request')[0].origin).toBe(`http://127.0.0.1:${target.port}`)
    // Nothing at all names the unwatched port.
    const mentions = (value) =>
      Object.values(value).some(
        (field) =>
          field === other.port || (typeof field === 'string' && field.includes(`:${other.port}`)),
      )
    expect(lines.filter(mentions)).toEqual([])
  }, 20_000)

  it('keeps each socket’s own count of the requests written to it, in order, without claiming what undici did with its pool', async () => {
    const target = await ok()
    const result = await run(MANY, [String(target.port), String(target.port), '5'], {
      env: watch(target.port),
    })
    target.server.close()
    expect(result.stdout.trim()).toBe('done')
    const sockets = only(diagLines(result.stderr), 'fetch-socket')
    expect(sockets).toHaveLength(6)
    const perSocket = new Map()
    for (const line of sockets) {
      perSocket.set(line.socketId, [...(perSocket.get(line.socketId) ?? []), line.requestsOnSocket])
    }
    for (const counts of perSocket.values()) expect(counts).toEqual(counts.map((_, i) => i + 1))
    // Not pretending to know the pool: no Agent counts, no "reused" flag from node:http.
    for (const line of sockets) {
      expect(line).not.toHaveProperty('agent')
      expect(line).not.toHaveProperty('reusedSocket')
    }
  }, 20_000)
})
