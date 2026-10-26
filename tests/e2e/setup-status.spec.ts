import { expect, type APIRequestContext } from '@playwright/test'

import { APP_ENV, FAKE_SANITY_PORT, STUDIO_TOKENS } from './constants'
import { test } from './fixtures/test'

const LAKE = `http://localhost:${FAKE_SANITY_PORT}`

test.skip(({ isMobile }) => isMobile, 'Desktop only')

/**
 * `GET /api/setup-status` in the production build, asking the fake Content Lake's /users/me who a
 * token belongs to (fake-sanity.mjs). Studio itself can't sign in against the fake lake, so the
 * pane's states are covered in a DOM (setup-pane.test.tsx) and on /studio-brand-preview.
 */
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

interface Status {
  schema: number
  features: { id: string; status: string }[]
  templateVersion: string
}

const secrets = Object.entries(APP_ENV).filter(
  ([name, value]) => value.length >= 8 && !name.startsWith('NEXT_PUBLIC_'),
)

async function usersMeCalls(request: APIRequestContext) {
  return (await (await request.get(`${LAKE}/__fixture/users-me-calls`)).json()) as number
}

test.describe('/api/setup-status', () => {
  test('answers agency staff with the setup status, privately', async ({ request }) => {
    for (const token of [STUDIO_TOKENS.administrator, STUDIO_TOKENS.developer]) {
      const response = await request.get('/api/setup-status', { headers: bearer(token) })
      expect(response.status(), token).toBe(200)
      expect(response.headers()['cache-control']).toBe('private, no-store')
      expect(response.headers().vary).toContain('Authorization')
      const body = (await response.json()) as Status
      expect(body.schema).toBe(1)
      expect(body.features.map((feature) => feature.id)).toEqual(
        expect.arrayContaining(['sanity-core', 'forms', 'health-monitoring']),
      )
      // Health monitoring lives in GitHub: never Ready from here.
      expect(body.features.find((feature) => feature.id === 'health-monitoring')?.status).toBe(
        'cant-check',
      )
      const text = JSON.stringify(body)
      for (const [name, value] of secrets) {
        expect(text, `${name} must not appear`).not.toContain(value)
      }
      expect(text).not.toContain(token)
    }
  })

  test('refuses clients, and shows them nothing', async ({ request }) => {
    for (const role of ['editor', 'contributor', 'viewer'] as const) {
      const response = await request.get('/api/setup-status', {
        headers: bearer(STUDIO_TOKENS[role]),
      })
      expect(response.status(), role).toBe(403)
      expect(response.headers()['cache-control']).toBe('private, no-store')
      expect(await response.json()).toEqual({ status: 'forbidden' })
    }
  })

  test('refuses no token, an unknown token and a cookie or query string with 401', async ({
    request,
  }) => {
    const attempts = [
      request.get('/api/setup-status'),
      request.get('/api/setup-status', { headers: bearer('not-a-real-token') }),
      request.get('/api/setup-status', {
        headers: { Cookie: `token=${STUDIO_TOKENS.administrator}` },
      }),
      request.get(`/api/setup-status?token=${STUDIO_TOKENS.administrator}`),
    ]
    for (const response of await Promise.all(attempts)) {
      expect(response.status()).toBe(401)
      expect(response.headers()['cache-control']).toBe('private, no-store')
      expect(await response.json()).toEqual({ status: 'unauthenticated' })
    }
  })

  test('asks Sanity on every request and notices a revoked session at once', async ({
    request,
  }) => {
    const token = STUDIO_TOKENS.revocable
    const before = await usersMeCalls(request)
    for (let count = 0; count < 3; count += 1) {
      expect((await request.get('/api/setup-status', { headers: bearer(token) })).status()).toBe(
        200,
      )
    }
    // Three requests, three checks with Sanity: nothing about the caller is remembered.
    expect((await usersMeCalls(request)) - before).toBeGreaterThanOrEqual(3)

    await request.post(`${LAKE}/__fixture/studio-token/${token}/revoke`)
    try {
      const revoked = await request.get('/api/setup-status', { headers: bearer(token) })
      expect(revoked.status()).toBe(401)
      expect(await revoked.json()).toEqual({ status: 'unauthenticated' })
    } finally {
      await request.post(`${LAKE}/__fixture/studio-token/${token}/restore`)
    }
    expect((await request.get('/api/setup-status', { headers: bearer(token) })).status()).toBe(200)
  })

  test('is not a visitor route: the public site-info still says nothing about setup', async ({
    request,
  }) => {
    const text = await (await request.get('/api/site-info')).text()
    expect(text).not.toContain('forms')
    expect(text).not.toContain('features')
  })
})
