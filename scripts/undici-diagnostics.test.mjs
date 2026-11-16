import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/**
 * The client diagnostics must see the requests the site really makes. They are made by next-sanity's `sanityFetch` (Next's
 * `next-js` export), whose nested @sanity/client 7.27 and get-it 8.8 resolve, under Next's `react-server` condition, to
 * builds that call the global `fetch`: Node's undici, not `node:http`. An earlier logger watched only `node:http`'s channels
 * and recorded none of them (a capture saw 2,142 requests at the lake and no client request).
 *
 * What these tests are, and are not. They run the INSTALLED next-sanity client in a plain Node child process, resolved as
 * Next resolves it (`--conditions=react-server`) or with the options that select fetch, against a local server. That is
 * coverage of the ADAPTER PATH (the SDK's react-server build calling `fetch`, observed through undici's channels). It is
 * NOT coverage of Next's own build: Next patches the global `fetch`, bundles the SDK, and makes the requests from its own
 * build workers, none of which is run here. Whether the logger sees those requests is shown only by a capture, which is
 * why the capture's validity check (scripts/e2e-capture-validity.mjs) compares what the client recorded with what the lake
 * served. The tests cover GET and POST, successes, controlled connection failures (a reset, a reset on a socket shown to be
 * reused, a refused connection), the app's real client options, and hold the logger to recording each request, its socket
 * where undici's channels expose one, its response headers, its completion and its error, while changing nothing the
 * client returns or throws.
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

describe('adapter-path coverage: the installed next-sanity client, in plain Node', () => {
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

describe('the client logger leaves fetch alone (raw fetch, plain Node)', () => {
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

  it('records only the watched port, and spends none of its line budget on any other', async () => {
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
    // Nothing at all names the unwatched port. (The filter is the port NUMBER alone: it does not look at the host.)
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

describe('what a socket record carries', () => {
  const ok = () =>
    new Promise((resolve) => {
      const server = http.createServer((req, res) => res.end('ok'))
      server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
    })
  const ONE = `
    const [port] = process.argv.slice(1)
    await (await fetch('http://127.0.0.1:' + port + '/x')).text()
    process.exit(0)
  `

  it('has no connection-time metric: `connectMs` was always null (its key was not the same object on both channels), so it is gone', async () => {
    const { server, port } = await ok()
    const result = await run(ONE, [String(port)], { env: watch(port) })
    server.close()
    const connected = only(diagLines(result.stderr), 'fetch-socket-connected')
    expect(connected).toHaveLength(1)
    expect(connected[0]).not.toHaveProperty('connectMs')
    expect(JSON.stringify(connected)).not.toMatch(/connectMs|connect_ms/)
  }, 20_000)

  it('names both endpoints by address and family as well as port', async () => {
    const { server, port } = await ok()
    const result = await run(ONE, [String(port)], { env: watch(port) })
    server.close()
    const lines = diagLines(result.stderr)
    for (const record of [
      only(lines, 'fetch-socket-connected')[0],
      only(lines, 'fetch-socket')[0],
    ]) {
      expect(record).toMatchObject({
        remotePort: port,
        remoteAddress: '127.0.0.1',
        remoteFamily: 'IPv4',
        localAddress: '127.0.0.1',
        localFamily: 'IPv4',
      })
      expect(record.localPort).toBeTypeOf('number')
    }
  }, 20_000)

  it('watches by port number alone, whatever host the request names', async () => {
    const { server, port } = await ok()
    const named = `
      const [port] = process.argv.slice(1)
      await (await fetch('http://localhost:' + port + '/x')).text()
      process.exit(0)
    `
    const result = await run(named, [String(port)], { env: watch(port) })
    server.close()
    const request = only(diagLines(result.stderr), 'fetch-request')[0]
    // Recorded although only the port was configured: the host in the origin is `localhost`, not 127.0.0.1.
    expect(request.origin).toBe(`http://localhost:${port}`)
  }, 20_000)
})

describe('failures the logger must describe without inventing', () => {
  /** Two sequential fetches, pausing between them so undici has the first connection back in its pool. */
  const TWICE = `
    const [port] = process.argv.slice(1)
    const out = []
    for (const path of ['/first', '/second']) {
      try {
        out.push(path + ' ' + (await (await fetch('http://127.0.0.1:' + port + path)).text()))
      } catch (error) {
        out.push(path + ' failed ' + (error.cause?.code ?? error.code))
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    console.log(JSON.stringify(out))
    process.exit(0)
  `

  it('records an error on a socket the records themselves show was used before', async () => {
    const seen = []
    const server = http.createServer((req, res) => {
      seen.push({ url: req.url, remotePort: req.socket.remotePort })
      // The first request is answered; the second resets whatever connection it arrives on.
      if (req.url === '/second') return req.socket.resetAndDestroy()
      res.end('ok')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const plain = await run(TWICE, [String(port)], { withPreload: false })
    const seenPlain = seen.length
    const watched = await run(TWICE, [String(port)], { env: watch(port) })
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual(['/first ok', '/second failed ECONNRESET'])
    expect(watched.stdout).toBe(plain.stdout)
    // Independent evidence of reuse, from the other end: both requests of the watched run arrived on one connection.
    const [first, second] = seen.slice(seenPlain)
    expect(second.remotePort).toBe(first.remotePort)

    const lines = diagLines(watched.stderr)
    const sockets = only(lines, 'fetch-socket')
    expect(sockets.map((l) => l.requestsOnSocket)).toEqual([1, 2])
    expect(sockets[1].socketId).toBe(sockets[0].socketId)
    expect(sockets[1].msSinceSocketLastResponseEnd).toBeTypeOf('number')
    const error = only(lines, 'fetch-error')[0]
    expect(error).toMatchObject({ code: 'ECONNRESET', socketId: sockets[0].socketId })
    // The record states the facts, and only them: a second request on a socket that had carried one before. It does not
    // say which end closed the connection.
    expect(error).not.toHaveProperty('closedBy')
    expect(error).not.toHaveProperty('reusedSocket')
  }, 30_000)

  it('records a refused connection as a connection error and a request error with no socket', async () => {
    // A port nothing is listening on.
    const probe = http.createServer()
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const { port } = probe.address()
    await new Promise((resolve) => probe.close(resolve))
    const REFUSED = `
      const [port] = process.argv.slice(1)
      try {
        await fetch('http://127.0.0.1:' + port + '/x')
        console.log('ok')
      } catch (error) {
        console.log('failed ' + (error.cause?.code ?? error.code))
      }
      process.exit(0)
    `
    const plain = await run(REFUSED, [String(port)], { withPreload: false })
    const watched = await run(REFUSED, [String(port)], { env: watch(port) })
    expect(watched.stdout.trim()).toBe('failed ECONNREFUSED')
    expect(watched.stdout).toBe(plain.stdout)
    const lines = diagLines(watched.stderr)
    expect(only(lines, 'fetch-connect-error')).toMatchObject([{ port, code: 'ECONNREFUSED' }])
    const error = only(lines, 'fetch-error')
    expect(error).toHaveLength(1)
    // It never reached a socket, and the record does not pretend otherwise.
    expect(error[0].socketId).toBeNull()
    expect(only(lines, 'fetch-socket')).toEqual([])
    expect(only(lines, 'fetch-headers')).toEqual([])
  }, 20_000)
})

describe('the app’s real client options, and the export conditions that decide the transport', () => {
  /** The app's own client (src/lib/sanity/client.ts), built with the env the e2e site is given, and its resolved config. */
  async function productionConfig() {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'e2etest1')
    vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production')
    vi.stubEnv('SANITY_API_READ_TOKEN', 'e2e-token')
    vi.stubEnv('SANITY_API_HOST', 'http://127.0.0.1:1')
    const { client } = await import('@/lib/sanity/client')
    const config = client.config()
    vi.unstubAllEnvs()
    return config
  }

  /** The options the installed `next-js` export of next-sanity/live passes to `client.fetch`: read from the file. */
  const exportCall = () => {
    const source = readFileSync(
      join(
        root,
        'node_modules',
        'next-sanity',
        'dist',
        'live',
        'conditions',
        'next-js',
        'index.js',
      ),
      'utf8',
    )
    const at = source.indexOf('await client.fetch(query, await params, {')
    return source.slice(at, source.indexOf('});', at))
  }

  const PRODUCTION = `
    const { createClient } = await import('next-sanity')
    const config = JSON.parse(process.argv[1])
    const client = createClient({ ...config, apiHost: 'http://127.0.0.1:' + process.argv[2], maxRetries: 0 })
    // What next-sanity's next-js sanityFetch passes (see the test that reads it from the installed export).
    const options = { filterResponse: false, perspective: 'published', stega: false, useCdn: true, cacheMode: 'noStale', tag: 'next-loader.fetch.cache-components', token: config.token }
    const long = '*[_type == "page" && title match "' + 'a'.repeat(12000) + '"]{_id}'
    const out = []
    for (const [name, query] of [['GET', '*[_type == "page"][0]{_id}'], ['POST', long]]) {
      try { out.push(name + ' ' + JSON.stringify((await client.fetch(query, {}, options)).result)) } catch (error) { out.push(name + ' failed ' + (error.cause?.code ?? error.code ?? error.name)) }
    }
    console.log(JSON.stringify(out))
    process.exit(0)
  `

  it('reads the options from the installed export, so the test cannot drift from what Next calls', () => {
    const call = exportCall()
    for (const option of [
      'filterResponse: false',
      'perspective',
      'useCdn',
      'cacheMode',
      'tag: requestTag',
      'token',
    ]) {
      expect(call, option).toContain(option)
    }
    // No `next` or `cache` option: under this export the SDK build, not an option, decides that fetch is used.
    expect(call).not.toMatch(/\bnext:|\bcache:/)
  })

  it('builds the app’s real client as the production site configures it', async () => {
    const config = await productionConfig()
    expect(config).toMatchObject({
      projectId: 'e2etest1',
      dataset: 'production',
      useCdn: true,
      perspective: 'published',
      token: 'e2e-token',
      apiHost: 'http://127.0.0.1:1',
      useProjectHostname: false,
    })
    expect(config.stega).toBeTruthy()
  })

  it('records a long POST and a GET made with the app’s client and the export’s options, under the react-server condition', async () => {
    const config = await productionConfig()
    const { server, seen, port } = await serve('ok')
    const plain = await run(PRODUCTION, [JSON.stringify(config), String(port)], {
      conditions: ['react-server'],
      withPreload: false,
    })
    const watched = await run(PRODUCTION, [JSON.stringify(config), String(port)], {
      conditions: ['react-server'],
      env: watch(port),
    })
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual(['GET "ok"', 'POST "ok"'])
    expect(watched.stdout).toBe(plain.stdout)
    // The lake's side: a GET, then a POST with a body, carrying the tag and the perspective the export sets.
    expect(seen.slice(2).map((s) => s.method)).toEqual(['GET', 'POST'])
    expect(seen[3].bytes).toBeGreaterThan(12000)
    expect(seen[3].url).toContain('tag=next-loader.fetch.cache-components')
    expect(seen[3].url).toContain('perspective=published')

    const lines = diagLines(watched.stderr)
    expect(only(lines, 'request-created')).toEqual([])
    expect(only(lines, 'fetch-request').map((l) => l.method)).toEqual(['GET', 'POST'])
    expect(only(lines, 'fetch-socket')).toHaveLength(2)
    expect(only(lines, 'fetch-headers').map((l) => l.status)).toEqual([200, 200])
    expect(only(lines, 'fetch-complete')).toHaveLength(2)
  }, 30_000)

  it('is a different transport under the default conditions: the same client and options reach the lake over node:http, which the fetch logger does not see', async () => {
    const config = await productionConfig()
    const { server, seen, port } = await serve('ok')
    const watched = await run(PRODUCTION, [JSON.stringify(config), String(port)], {
      env: watch(port),
    })
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual(['GET "ok"', 'POST "ok"'])
    expect(seen.map((s) => s.method)).toEqual(['GET', 'POST'])
    const lines = diagLines(watched.stderr)
    // The node:http logger sees them; the fetch logger does not. Which one matters depends on how Next resolves the SDK,
    // which only a capture of the real build can show.
    expect(only(lines, 'fetch-request')).toEqual([])
    expect(only(lines, 'request-created').map((l) => l.method)).toEqual(['GET', 'POST'])
  }, 30_000)
})
