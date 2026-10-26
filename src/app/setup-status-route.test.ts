/**
 * `GET /api/setup-status` as a stranger, a client and the agency meet it (README, "Features & setup"):
 * the real handler and `verifyStudioUser`, talking real HTTP to the stateful fake of Sanity's API
 * (publish-gate-fake-sanity.ts), where /users/me answers a token's id and roles. The setup details
 * name missing settings, so every refusal also checks that none of them, and no token, leaks.
 */
import { NextRequest } from 'next/server'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { startFakeSanity, type FakeSanity } from './publish-gate-fake-sanity'

vi.mock('server-only', () => ({}))

const fake = vi.hoisted(() => ({ host: '' }))
const connection = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('next/server', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  connection,
}))
vi.mock('@/lib/sanity/client', () => ({
  client: { getUrl: (path: string) => `${fake.host}/v2026-10-01${path}` },
}))

const CANARY = 'CANARY_c41b8e07a9d35f62'
const AGENCY_TOKEN = 'agency-token-secret-1'
const EDITOR_TOKEN = 'editor-token-secret-2'

let sanity: FakeSanity
let GET: (request: NextRequest) => Promise<Response>
let ipCounter = 0

beforeAll(async () => {
  sanity = await startFakeSanity()
  fake.host = sanity.url
  ;({ GET } = await import('./api/setup-status/route'))
})

afterAll(async () => {
  await sanity.close()
})

beforeEach(() => {
  sanity.faults.clear()
  sanity.users.splice(
    0,
    sanity.users.length,
    { token: AGENCY_TOKEN, id: 'u-admin', roles: ['administrator'] },
    { token: 'developer-token', id: 'u-dev', roles: ['developer'] },
    { token: EDITOR_TOKEN, id: 'u-editor', roles: ['editor'] },
    { token: 'contributor-token', id: 'u-contrib', roles: ['contributor'] },
    { token: 'viewer-token', id: 'u-viewer', roles: ['viewer'] },
    { token: 'no-roles-token', id: 'u-none', roles: [] },
  )
  vi.stubEnv('TURNSTILE_SECRET_KEY', CANARY)
  vi.stubEnv('SANITY_API_READ_TOKEN', CANARY)
  vi.stubEnv('SANITY_WRITE_TOKEN', CANARY)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/** Each call comes from its own address unless a test says otherwise, so the limiter stays out of the way. */
function call(authorization?: string, ip = `10.0.0.${++ipCounter}`) {
  return GET(
    new NextRequest('http://localhost/api/setup-status', {
      headers: {
        'x-forwarded-for': ip,
        ...(authorization === undefined ? {} : { authorization }),
      },
    }),
  )
}

async function expectPrivate(response: Response) {
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('vary')).toBe('Authorization')
  const text = await response.clone().text()
  expect(text).not.toContain(CANARY)
  expect(text).not.toContain(AGENCY_TOKEN)
  expect(text).not.toContain(EDITOR_TOKEN)
  return text
}

describe('GET /api/setup-status', () => {
  it('answers an Administrator with the setup status', async () => {
    const response = await call(`Bearer ${AGENCY_TOKEN}`)
    expect(response.status).toBe(200)
    const text = await expectPrivate(response)
    const body = JSON.parse(text) as Record<string, unknown>
    expect(body).toMatchObject({
      schema: 1,
      templateVersion: expect.any(String) as string,
      enabled: expect.any(Object) as object,
      features: expect.any(Array) as unknown[],
    })
    expect(body).toHaveProperty('commit')
    expect(body).toHaveProperty('builtAt')
    const forms = (body.features as { id: string }[]).find((feature) => feature.id === 'forms')
    expect(forms).toBeDefined()
  })

  it('answers a Developer too', async () => {
    expect((await call('Bearer developer-token')).status).toBe(200)
  })

  it.each([
    ['an Editor', EDITOR_TOKEN],
    ['a Contributor', 'contributor-token'],
    ['a Viewer', 'viewer-token'],
    ['a user with no role on the project', 'no-roles-token'],
  ])('refuses %s with 403', async (_who, token) => {
    const response = await call(`Bearer ${token}`)
    expect(response.status).toBe(403)
    const text = await expectPrivate(response)
    expect(JSON.parse(text)).toEqual({ status: 'forbidden' })
  })

  it('refuses a token Sanity does not know (invalid, expired or revoked) with 401', async () => {
    const response = await call('Bearer not-a-real-token')
    expect(response.status).toBe(401)
    expect(JSON.parse(await expectPrivate(response))).toEqual({ status: 'unauthenticated' })
  })

  it('refuses no token, an empty one and the wrong scheme with 401', async () => {
    for (const authorization of [undefined, '', 'Bearer ', 'Bearer    ', `Basic ${AGENCY_TOKEN}`]) {
      const response = await call(authorization)
      expect(response.status, String(authorization)).toBe(401)
      await expectPrivate(response)
    }
  })

  it('does not read identity from anything but the Authorization header', async () => {
    const request = new NextRequest(`http://localhost/api/setup-status?token=${AGENCY_TOKEN}`, {
      headers: {
        'x-forwarded-for': '10.1.1.1',
        cookie: `token=${AGENCY_TOKEN}`,
        'x-user-role': 'administrator',
        'x-sanity-token': AGENCY_TOKEN,
      },
    })
    expect((await GET(request)).status).toBe(401)
  })

  it('asks Sanity on every request, so a removed member is refused at once', async () => {
    expect((await call(`Bearer ${AGENCY_TOKEN}`)).status).toBe(200)
    sanity.users.splice(0, sanity.users.length)
    expect((await call(`Bearer ${AGENCY_TOKEN}`)).status).toBe(401)
    sanity.users.push({ token: AGENCY_TOKEN, id: 'u-admin', roles: ['editor'] })
    expect((await call(`Bearer ${AGENCY_TOKEN}`)).status).toBe(403)
  })

  it('fails closed when Sanity cannot be asked: 503, never the status', async () => {
    sanity.faults.add('users-me')
    const response = await call(`Bearer ${AGENCY_TOKEN}`)
    expect(response.status).toBe(503)
    expect(JSON.parse(await expectPrivate(response))).toEqual({ status: 'unavailable' })
  })

  it('fails closed when Sanity is unreachable', async () => {
    const real = fake.host
    fake.host = 'http://127.0.0.1:1'
    try {
      expect((await call(`Bearer ${AGENCY_TOKEN}`)).status).toBe(503)
    } finally {
      fake.host = real
    }
  })

  it('is dynamic: it waits for the request before answering', async () => {
    connection.mockClear()
    await call(`Bearer ${AGENCY_TOKEN}`)
    expect(connection).toHaveBeenCalled()
  })

  it('rate limits per address, before Sanity is asked', async () => {
    const ip = '10.9.9.9'
    const statuses: number[] = []
    for (let attempt = 0; attempt < 32; attempt += 1) {
      statuses.push((await call('Bearer nope', ip)).status)
    }
    expect(statuses.slice(0, 30).every((status) => status === 401)).toBe(true)
    expect(statuses.slice(30)).toEqual([429, 429])
    const limited = await call(`Bearer ${AGENCY_TOKEN}`, ip)
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
    await expectPrivate(limited)
  })

  it('never logs the token or the response', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    )
    await call(`Bearer ${AGENCY_TOKEN}`)
    await call(`Bearer ${EDITOR_TOKEN}`)
    await call('Bearer not-a-real-token')
    sanity.faults.add('users-me')
    await call(`Bearer ${AGENCY_TOKEN}`)
    expect(spies.flatMap((spy) => spy.mock.calls)).toEqual([])
  })
})
