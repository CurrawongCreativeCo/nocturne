import { spawn } from 'node:child_process'
import http from 'node:http'
import { createServer as createNetServer, connect } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

/**
 * The opt-in diagnostics for the CI investigation of the build's connection resets (tests/e2e/diagnostics). They
 * record what the fake lake and the site's HTTP client do, and must change nothing about it. This runs the real
 * lake and real client processes, with the diagnostics on and off, on free ports, and holds each to the same
 * answers, headers, errors and exit codes; it also holds the diagnostics to what they claim to record (the
 * server's real settings, the connection and request sequence, socket reuse) and to their bounds.
 *
 * Nothing here loads the site, a browser or a load loop: a handful of requests per case.
 */

const root = join(fileURLToPath(import.meta.url), '..', '..')
const lake = join(root, 'tests', 'e2e', 'fake-sanity.mjs')
const preload = join(root, 'tests', 'e2e', 'diagnostics', 'http-client-diagnostics.mjs')
const PREFIX = '[e2e-diag] '
const STARTUP_MS = 15_000
const QUERY = encodeURIComponent('*[_type == "post"][0]{_id}')
const auth = { authorization: 'Bearer test' }

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createNetServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

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

/** The diagnostic lines in some output, parsed. */
const diagLines = (text) =>
  text
    .split('\n')
    .filter((line) => line.startsWith(PREFIX))
    .map((line) => JSON.parse(line.slice(PREFIX.length)))

/** Starts the real lake as its own process, ready when it says so. */
async function startLake(env = {}) {
  const port = await freePort()
  const child = spawn(process.execPath, [lake], {
    env: { ...process.env, FAKE_SANITY_PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.add(child)
  const out = { stdout: '', stderr: '' }
  child.stdout.on('data', (chunk) => (out.stdout += chunk))
  child.stderr.on('data', (chunk) => (out.stderr += chunk))
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No start: ${out.stderr}`)), STARTUP_MS)
    child.stdout.on('data', () => {
      if (out.stdout.includes('fake Content Lake on')) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`Exited ${code} before ready: ${out.stderr}`))
    })
  })
  return { child, port, out }
}

/** One request over a given agent, resolved with what a client sees, and the socket it used. */
const request = (port, path, { agent, method = 'GET', headers = auth, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers, agent }, (res) => {
      const localPort = res.socket?.localPort
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
          socket: res.socket,
          localPort,
          reused: req.reusedSocket,
        }),
      )
    })
    req.once('error', reject)
    req.end(body)
  })

const withoutDate = ({ date: _date, ...rest }) => rest
const valid = `/v2026-10-01/data/query/production?query=${QUERY}`
const malformed = `${valid}&$slug=notjson`

/** Waits for a line to appear in a growing string, bounded. */
async function appears(read, test, ms = 5000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (test(read())) return true
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return false
}

describe('the lake with diagnostics off and on', () => {
  it('answers the same requests with the same status, headers and bodies', async () => {
    const off = await startLake()
    const on = await startLake({ E2E_LAKE_DIAGNOSTICS: '1' })
    const results = {}
    for (const [name, { port }] of Object.entries({ off, on })) {
      const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
      results[name] = []
      for (const path of [valid, malformed, valid, '/v2026-10-01/users/me']) {
        const { status, headers, body } = await request(port, path, { agent })
        results[name].push({ path, status, headers: withoutDate(headers), body })
      }
      agent.destroy()
    }
    expect(results.on).toEqual(results.off)
    expect(results.off.map((r) => r.status)).toEqual([200, 400, 200, results.off[3].status])
    // Off prints nothing of its own.
    expect(diagLines(off.out.stderr + off.out.stdout)).toEqual([])
  })

  it('keeps Node’s own answer to a request that is not HTTP: 400, then the connection closes', async () => {
    const answers = {}
    for (const [name, env] of [
      ['off', {}],
      ['on', { E2E_LAKE_DIAGNOSTICS: '1' }],
    ]) {
      const { port, out } = await startLake(env)
      const reply = await new Promise((resolve, reject) => {
        const socket = connect(port, '127.0.0.1')
        let text = ''
        socket.on('data', (chunk) => (text += chunk))
        socket.once('close', () => resolve(text))
        socket.once('error', reject)
        socket.write('THIS IS NOT HTTP\r\n\r\n')
      })
      answers[name] = reply.split('\r\n')[0]
      const after = await request(port, valid)
      expect(after.status, name).toBe(200)
      if (name === 'on') {
        expect(
          await appears(
            () => out.stderr,
            (text) =>
              diagLines(text).some((l) => l.event === 'connection-close' && l.requests === 0),
          ),
          out.stderr,
        ).toBe(true)
      }
    }
    expect(answers.off).toBe('HTTP/1.1 400 Bad Request')
    expect(answers.on).toBe(answers.off)
  })

  it('survives the two requests that once killed it, with diagnostics on, and still logs its own diagnostics', async () => {
    const { child, port, out } = await startLake({ E2E_LAKE_DIAGNOSTICS: '1' })
    const bad = await request(port, malformed)
    expect(bad.status).toBe(400)
    expect(JSON.parse(bad.body)).toEqual({ error: 'Invalid request' })
    const mutation = await request(port, '/v2026-10-01/data/mutate/production', {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: 'not json',
    })
    expect(mutation.status).toBe(400)
    expect(
      await appears(
        () => out.stderr,
        (text) => (text.match(/fake-sanity request error:/g) ?? []).length >= 2,
      ),
    ).toBe(true)
    expect(child.exitCode).toBeNull()
    expect((await request(port, valid)).status).toBe(200)
  })
})

describe('the lake diagnostics observe before the application works', () => {
  /**
   * The lake installs its diagnostics after `createServer(handler)`, so a listener added with `on` runs after the
   * handler, and anything the handler does synchronously (the lake evaluates GROQ on its one thread) is over before
   * the request is recorded. The record would then start late, and the time since the last response would include
   * the handler's own work. A child process with a handler that blocks for 300 ms stands in for that.
   */
  const BLOCKING = `
    import http from 'node:http'
    const { installLakeDiagnostics } = await import(process.env.LAKE_DIAGNOSTICS_URL)
    const server = http.createServer((req, res) => {
      process.stderr.write('HANDLER-START ' + Date.now() + '\\n')
      const end = Date.now() + 300
      while (Date.now() < end) {
        // Synchronous work, as the lake's own GROQ evaluation is.
      }
      res.end('ok')
    })
    installLakeDiagnostics(server, { port: 0 })
    server.listen(0, '127.0.0.1', () => console.log('PORT ' + server.address().port))
  `

  it('records a request before the handler’s synchronous work, and leaves the handler to run', async () => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', BLOCKING], {
      env: {
        ...process.env,
        E2E_LAKE_DIAGNOSTICS: '1',
        LAKE_DIAGNOSTICS_URL: pathToFileURL(
          join(root, 'tests', 'e2e', 'diagnostics', 'lake-diagnostics.mjs'),
        ).href,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    children.add(child)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    expect(
      await appears(
        () => stdout,
        (text) => /PORT \d+/.test(text),
      ),
    ).toBe(true)
    const port = Number(/PORT (\d+)/.exec(stdout)[1])
    // Two requests on one connection: the second is where the idle time is read.
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    const first = await request(port, '/a', { agent })
    await new Promise((resolve) => setTimeout(resolve, 100))
    const second = await request(port, '/b', { agent })
    agent.destroy()
    expect([first.status, second.status, first.body, second.body]).toEqual([200, 200, 'ok', 'ok'])

    expect(
      await appears(
        () => stderr,
        (text) => diagLines(text).filter((l) => l.event === 'request').length >= 2,
      ),
    ).toBe(true)
    const lines = stderr.split('\n')
    const handlerAt = lines
      .filter((line) => line.startsWith('HANDLER-START '))
      .map((line) => Number(line.slice('HANDLER-START '.length)))
    expect(handlerAt).toHaveLength(2)
    const requests = diagLines(stderr).filter((l) => l.event === 'request')
    expect(requests).toHaveLength(2)
    for (const [i, record] of requests.entries()) {
      // Recorded before the handler began its 300 ms, not after it.
      expect(Date.parse(record.at) - handlerAt[i], `request ${i + 1}`).toBeLessThan(100)
    }
    // The idle time before the second request is the 100 ms the client waited, not the 300 ms the handler took.
    expect(requests[1].idleMsBeforeRequest).toBeGreaterThanOrEqual(90)
    expect(requests[1].idleMsBeforeRequest).toBeLessThan(250)
  }, 20_000)
})

describe('what the lake diagnostics record', () => {
  it('logs the server’s real settings, including keepAliveTimeoutBuffer where Node has one', async () => {
    const { out } = await startLake({ E2E_LAKE_DIAGNOSTICS: '1' })
    expect(
      await appears(
        () => out.stderr,
        (text) => diagLines(text).some((l) => l.event === 'settings'),
      ),
    ).toBe(true)
    const settings = diagLines(out.stderr).find((l) => l.event === 'settings')
    const reference = http.createServer()
    const expected = {
      keepAliveTimeout: reference.keepAliveTimeout ?? null,
      keepAliveTimeoutBuffer: reference.keepAliveTimeoutBuffer ?? null,
      headersTimeout: reference.headersTimeout ?? null,
      requestTimeout: reference.requestTimeout ?? null,
      timeout: reference.timeout ?? null,
      maxRequestsPerSocket: reference.maxRequestsPerSocket ?? null,
    }
    reference.close()
    expect(settings).toMatchObject(expected)
    expect(Object.keys(settings)).toEqual(expect.arrayContaining(Object.keys(expected)))
    expect(settings.node).toBe(process.version)
    expect(typeof settings.pid).toBe('number')
    expect(settings.port).toBeTypeOf('number')
  })

  it('follows keep-alive GETs: one connection, a sequence 1 to 3, the idle time between them, then the close', async () => {
    const { port, out } = await startLake({ E2E_LAKE_DIAGNOSTICS: '1' })
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    const seen = []
    for (let i = 0; i < 3; i++) {
      const r = await request(port, valid, { agent })
      expect(r.status).toBe(200)
      expect(r.headers.connection).toBe('keep-alive')
      seen.push({ reused: r.reused, socket: r.socket, localPort: r.localPort })
    }
    expect(seen.map((s) => s.reused)).toEqual([false, true, true])
    expect(new Set(seen.map((s) => s.socket)).size).toBe(1)
    const local = seen[0].localPort
    agent.destroy()
    expect(
      await appears(
        () => out.stderr,
        (text) => diagLines(text).some((l) => l.event === 'connection-close' && l.requests === 3),
      ),
    ).toBe(true)
    const lines = diagLines(out.stderr)
    const opened = lines.filter((l) => l.event === 'connection-open')
    expect(opened).toHaveLength(1)
    expect(opened[0].remotePort).toBe(local)
    expect(opened[0].localPort).toBe(port)
    const requests = lines.filter((l) => l.event === 'request')
    expect(requests.map((l) => [l.connId, l.seq])).toEqual([
      [opened[0].connId, 1],
      [opened[0].connId, 2],
      [opened[0].connId, 3],
    ])
    expect(requests[0].idleMsBeforeRequest).toBeNull()
    expect(requests[1].idleMsBeforeRequest).toBeTypeOf('number')
    expect(lines.filter((l) => l.event === 'response-finish').map((l) => l.status)).toEqual([
      200, 200, 200,
    ])
    const closed = lines.find((l) => l.event === 'connection-close')
    expect(closed).toMatchObject({ connId: opened[0].connId, requests: 3, hadError: false })
    for (const line of lines) expect(line.pid).toBeTypeOf('number')
  })

  it('samples load and processes at low frequency, bounded', async () => {
    const { out } = await startLake({
      E2E_LAKE_DIAGNOSTICS: '1',
      E2E_DIAGNOSTICS_SAMPLE_MS: '1000',
      E2E_DIAGNOSTICS_MAX_SAMPLES: '2',
    })
    expect(
      await appears(
        () => out.stderr,
        (text) => diagLines(text).filter((l) => l.event === 'sample').length >= 2,
        8000,
      ),
    ).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const samples = diagLines(out.stderr).filter((l) => l.event === 'sample')
    expect(samples).toHaveLength(2)
    expect(samples[0].loadavg).toHaveLength(3)
    expect(samples[0].processes).toBeTypeOf('object')
  }, 20_000)

  it('stops writing at its line budget, says so once, and keeps answering', async () => {
    const { port, out } = await startLake({
      E2E_LAKE_DIAGNOSTICS: '1',
      E2E_DIAGNOSTICS_MAX_LINES: '6',
    })
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    for (let i = 0; i < 5; i++) expect((await request(port, valid, { agent })).status).toBe(200)
    agent.destroy()
    expect(
      await appears(
        () => out.stderr,
        (text) => diagLines(text).some((l) => l.event === 'limit-reached'),
      ),
    ).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 200))
    const lines = diagLines(out.stderr)
    expect(lines.filter((l) => l.event === 'limit-reached')).toHaveLength(1)
    expect(lines.length).toBeLessThanOrEqual(7)
    expect((await request(port, valid)).status).toBe(200)
  })
})

describe('the client preload', () => {
  /** A child that makes `count` sequential GETs and prints what it saw, with or without the preload. */
  const CLIENT = `
    const http = require('node:http')
    const [port, mode, count] = process.argv.slice(1)
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    const once = () => new Promise((resolve) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/x', agent }, (res) => {
        res.resume()
        res.on('end', () => resolve('status ' + res.statusCode))
      })
      if (mode === 'handled') req.on('error', (error) => resolve('error ' + error.code))
    })
    ;(async () => {
      const seen = []
      for (let i = 0; i < Number(count); i++) seen.push(await once())
      console.log(JSON.stringify(seen))
      agent.destroy()
    })()
  `
  const run = (args, env = {}, withPreload = true) =>
    new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [...(withPreload ? ['--import', pathToFileURL(preload).href] : []), '-e', CLIENT, ...args],
        { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
      )
      children.add(child)
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.stderr.on('data', (chunk) => (stderr += chunk))
      child.once('exit', (code) => resolve({ code, stdout, stderr }))
    })

  /** A server in this process: answers, or resets the connection the way a dying peer does. */
  const serve = async (behaviour) => {
    const server = http.createServer((req, res) => {
      if (behaviour === 'reset') return req.socket.resetAndDestroy()
      res.end('ok')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    return { server, port: server.address().port }
  }
  const on = (port) => ({ E2E_HTTP_DIAGNOSTICS: '1', E2E_DIAGNOSTICS_PORTS: String(port) })

  it('does nothing without its gate: no lines, and the same output as no preload at all', async () => {
    const { server, port } = await serve('ok')
    const plain = await run([String(port), 'handled', '2'], {}, false)
    const gated = await run([String(port), 'handled', '2'], {})
    server.close()
    expect(gated.code).toBe(0)
    expect(gated.stdout).toBe(plain.stdout)
    expect(diagLines(gated.stderr)).toEqual([])
  })

  it('records keep-alive GETs on one socket, marking reuse, and changes nothing a request returns', async () => {
    const { server, port } = await serve('ok')
    const plain = await run([String(port), 'handled', '3'], {}, false)
    const watched = await run([String(port), 'handled', '3'], on(port))
    server.close()
    expect(watched.code).toBe(0)
    expect(watched.stdout).toBe(plain.stdout)
    expect(JSON.parse(watched.stdout)).toEqual(['status 200', 'status 200', 'status 200'])
    const lines = diagLines(watched.stderr)
    const starts = lines.filter((l) => l.event === 'request-created')
    expect(starts.map((l) => l.reqSeq)).toEqual([1, 2, 3])
    expect(starts.map((l) => l.sameUrlOrdinal)).toEqual([1, 2, 3])
    expect(lines.filter((l) => l.event === 'request-start').map((l) => l.reqSeq)).toEqual([1, 2, 3])
    const bound = lines.filter((l) => l.event === 'request-socket')
    expect(bound.map((l) => l.reusedSocket)).toEqual([false, true, true])
    expect(new Set(bound.map((l) => l.socketId)).size).toBe(1)
    const connected = lines.find((l) => l.event === 'socket-connected')
    expect(connected).toMatchObject({ socketId: bound[0].socketId, remotePort: port })
    expect(connected.localPort).toBeTypeOf('number')
    expect(bound[1].remotePort).toBe(port)
    expect(bound[1].idleMsSinceLastResponse).toBeTypeOf('number')
    expect(lines.filter((l) => l.event === 'response').map((l) => l.status)).toEqual([
      200, 200, 200,
    ])
    expect(starts[0].agent).toMatchObject({ free: expect.any(Number), busy: expect.any(Number) })
    // Taken after the Agent has chosen a socket for the request, so the reused one counts as in use.
    expect(starts[1].agent).toMatchObject({ free: 0, busy: 1 })
    expect(lines.some((l) => l.event === 'socket-close')).toBe(true)
  })

  it('does not look at requests to other ports', async () => {
    const { server, port } = await serve('ok')
    const watched = await run([String(port), 'handled', '1'], {
      E2E_HTTP_DIAGNOSTICS: '1',
      E2E_DIAGNOSTICS_PORTS: String(port + 1),
    })
    server.close()
    expect(watched.code).toBe(0)
    expect(diagLines(watched.stderr).filter((l) => l.event.startsWith('request'))).toEqual([])
  })

  it('leaves a reset where it is: the request’s own error reaches the caller, and the error is recorded', async () => {
    const { server, port } = await serve('reset')
    const plain = await run([String(port), 'handled', '1'], {}, false)
    const watched = await run([String(port), 'handled', '1'], on(port))
    server.close()
    expect(JSON.parse(plain.stdout)).toEqual(['error ECONNRESET'])
    expect(watched.stdout).toBe(plain.stdout)
    const error = diagLines(watched.stderr).find((l) => l.event === 'request-error')
    expect(error).toMatchObject({ code: 'ECONNRESET', reusedSocket: false })
    expect(error.msSinceStart).toBeTypeOf('number')
  })

  it('does not take over an unhandled request error: the process still ends the same way', async () => {
    const { server, port } = await serve('reset')
    const plain = await run([String(port), 'unhandled', '1'], {}, false)
    const watched = await run([String(port), 'unhandled', '1'], on(port))
    server.close()
    expect(plain.code).not.toBe(0)
    expect(watched.code).toBe(plain.code)
    expect(plain.stderr).toContain('ECONNRESET')
    expect(watched.stderr).toContain('ECONNRESET')
  })
})

describe('the client preload, response completion and watched traffic only', () => {
  const CLIENT_ANY = `
    const http = require('node:http')
    const [mode, ...ports] = process.argv.slice(1)
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    const get = (port) => new Promise((resolve) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/x', agent }, (res) => {
        if (mode === 'no-read') {
          // Leave the body alone and report what the diagnostics did to the stream.
          return setTimeout(() => {
            resolve(JSON.stringify({ flowing: res.readableFlowing, data: res.listenerCount('data'), readable: res.listenerCount('readable') }))
          }, 200)
        }
        res.resume()
        res.on('end', () => resolve('status ' + res.statusCode))
      })
      req.on('error', (error) => resolve('error ' + error.code))
    })
    ;(async () => {
      const seen = []
      for (const port of ports) seen.push(await get(port))
      console.log(JSON.stringify(seen))
      agent.destroy()
    })()
  `
  const runAny = (args, env = {}, withPreload = true) =>
    new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [
          ...(withPreload ? ['--import', pathToFileURL(preload).href] : []),
          '-e',
          CLIENT_ANY,
          ...args,
        ],
        { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
      )
      children.add(child)
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.stderr.on('data', (chunk) => (stderr += chunk))
      child.once('exit', (code) => resolve({ code, stdout, stderr }))
    })

  /** Sends the headers and a first chunk at once, and the rest of the body after `delay` ms. */
  const serveSlowBody = async (delay) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write('first')
      setTimeout(() => res.end('second'), delay)
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    return { server, port: server.address().port }
  }
  const serveOk = async () => {
    const server = http.createServer((req, res) => res.end('ok'))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    return { server, port: server.address().port }
  }
  const watch = (port, extra = {}) => ({
    E2E_HTTP_DIAGNOSTICS: '1',
    E2E_DIAGNOSTICS_PORTS: String(port),
    ...extra,
  })

  it('measures idle time from when a delayed body completes, so an immediate reuse is not "idle" for the body’s duration', async () => {
    const { server, port } = await serveSlowBody(300)
    const plain = await runAny(['handled', String(port), String(port)], {}, false)
    const watched = await runAny(['handled', String(port), String(port)], watch(port))
    server.close()
    expect(JSON.parse(watched.stdout)).toEqual(['status 200', 'status 200'])
    expect(watched.stdout).toBe(plain.stdout)
    const lines = diagLines(watched.stderr)
    const bound = lines.filter((l) => l.event === 'request-socket')
    expect(bound.map((l) => l.reusedSocket)).toEqual([false, true])
    // The client asked again as soon as the body ended: the socket had been idle for a moment, not for 300 ms.
    expect(bound[1].idleMsSinceLastResponse).toBeLessThan(150)
    // The body's own duration is recorded, from the headers to the end.
    const completes = lines.filter((l) => l.event === 'response-complete')
    expect(completes).toHaveLength(2)
    for (const complete of completes) expect(complete.ms).toBeGreaterThanOrEqual(280)
    // Headers arrive at once; that is a separate record from completion.
    const headers = lines.filter((l) => l.event === 'response')
    expect(headers).toHaveLength(2)
    expect(headers[0].ms).toBeLessThan(200)
  }, 20_000)

  it('does not read, resume or consume a body it was not asked to', async () => {
    const { server, port } = await serveSlowBody(50)
    const watched = await runAny(['no-read', String(port)], watch(port))
    server.close()
    expect(JSON.parse(JSON.parse(watched.stdout)[0])).toEqual({
      flowing: null,
      data: 0,
      readable: 0,
    })
    // It saw the headers, and, with the body never read, no completion.
    const lines = diagLines(watched.stderr)
    expect(lines.some((l) => l.event === 'response')).toBe(true)
    expect(lines.some((l) => l.event === 'response-complete')).toBe(false)
  })

  it('logs no socket events for traffic it is not watching', async () => {
    const watchedServer = await serveOk()
    const other = await serveOk()
    const result = await runAny(
      ['handled', String(other.port), String(other.port), String(other.port)],
      watch(watchedServer.port),
    )
    watchedServer.server.close()
    other.server.close()
    expect(JSON.parse(result.stdout)).toEqual(['status 200', 'status 200', 'status 200'])
    const lines = diagLines(result.stderr)
    expect(
      lines.filter((l) => l.event.startsWith('socket') || l.event.startsWith('request')),
    ).toEqual([])
    // Only the one line a process writes to say it is watching.
    expect(lines.map((l) => l.event)).toEqual(['preload'])
  })

  it('does not spend its line budget on unwatched sockets, and keeps what a watched socket was created with', async () => {
    const watchedServer = await serveOk()
    const other = await serveOk()
    const result = await runAny(
      [
        'handled',
        ...Array.from({ length: 6 }, () => String(other.port)),
        String(watchedServer.port),
      ],
      watch(watchedServer.port, { E2E_DIAGNOSTICS_MAX_LINES: '10' }),
    )
    watchedServer.server.close()
    other.server.close()
    const lines = diagLines(result.stderr)
    expect(lines.some((l) => l.event === 'limit-reached')).toBe(false)
    expect(lines.filter((l) => l.event === 'request-created')).toHaveLength(1)
    const bound = lines.find((l) => l.event === 'request-socket')
    expect(bound).toMatchObject({ reusedSocket: false })
    // The watched socket's creation is still reported, with how long ago it was made when it was first seen.
    const created = lines.find((l) => l.event === 'socket-created' && l.socketId === bound.socketId)
    expect(created).toBeDefined()
    expect(created.createdAgoMs).toBeTypeOf('number')
    expect(
      lines.find((l) => l.event === 'socket-connected' && l.socketId === bound.socketId),
    ).toMatchObject({
      remotePort: watchedServer.port,
    })
  })
})
