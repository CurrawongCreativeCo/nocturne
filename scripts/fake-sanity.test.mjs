import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The fake Content Lake (tests/e2e/fake-sanity.mjs) must survive a request that throws. It used to reject outside
 * every try, which ends a Node process: every in-flight connection was reset (ECONNRESET) and every later one
 * refused, for the rest of an e2e run. This starts the real server as a separate process on a free port, sends
 * the two requests that killed it (a non-JSON `$param`, a non-JSON mutation body), and holds it to a 400, a
 * diagnostic line and a lake that still answers a valid query afterwards.
 */

const lake = join(fileURLToPath(import.meta.url), '..', '..', 'tests', 'e2e', 'fake-sanity.mjs')
const STARTUP_MS = 15_000
const QUERY = encodeURIComponent('*[_type == "post"][0]{_id}')
const headers = { authorization: 'Bearer test' }

/** A port nothing is listening on right now. */
const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

let child
let port
let stderr = ''
let exited = false

beforeAll(async () => {
  port = await freePort()
  child = spawn(process.execPath, [lake], {
    env: { ...process.env, FAKE_SANITY_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  child.once('exit', () => {
    exited = true
  })
  // Ready when it says so; failing fast if it exits first, and bounded either way.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`The fake lake did not start in ${STARTUP_MS}ms. stderr: ${stderr}`)),
      STARTUP_MS,
    )
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('fake Content Lake on')) {
        clearTimeout(timer)
        resolve(undefined)
      }
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`The fake lake exited with ${code} before it was ready. stderr: ${stderr}`))
    })
  })
}, STARTUP_MS + 2000)

afterAll(async () => {
  if (!child || exited) return
  const gone = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGKILL')
  await gone
})

const get = (path) => fetch(`http://127.0.0.1:${port}${path}`, { headers })
const validQuery = async () => {
  const response = await get(`/v2026-10-01/data/query/production?query=${QUERY}`)
  expect(response.status).toBe(200)
  expect(await response.json()).toHaveProperty('result')
}

describe('the fake Content Lake', () => {
  it('answers a valid query', async () => {
    await validQuery()
  })

  it('answers a malformed JSON parameter with a 400, logs it, and stays up', async () => {
    const before = stderr.length
    const response = await get(`/v2026-10-01/data/query/production?query=${QUERY}&$slug=notjson`)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
    expect(stderr.slice(before)).toContain('fake-sanity request error:')
    expect(exited).toBe(false)
    expect(child.exitCode).toBeNull()
    await validQuery()
  })

  it('answers a malformed mutation body with a 400, logs it, and stays up', async () => {
    const before = stderr.length
    const response = await fetch(`http://127.0.0.1:${port}/v2026-10-01/data/mutate/production`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: 'not json',
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
    expect(stderr.slice(before)).toContain('fake-sanity request error:')
    expect(exited).toBe(false)
    await validQuery()
  })

  it('still reports a query that does not parse as a failure, not as data', async () => {
    const response = await get(
      `/v2026-10-01/data/query/production?query=${encodeURIComponent('*[')}`,
    )
    expect(response.status).toBe(400)
    await validQuery()
  })
})
