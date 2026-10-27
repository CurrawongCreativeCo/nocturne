import { describe, expect, it, vi } from 'vitest'

import { isEmbedded, requestSetupStatus } from './request-setup-status'

const body = {
  schema: 1,
  environment: 'production',
  features: [{ id: 'forms', status: 'ready', missing: [], invalid: [] }],
  pending: [],
  templateVersion: '1.8.0',
  tier: 'standard',
  enabled: {},
  commit: null,
  builtAt: null,
}

const answer = (status: number, payload: unknown = body) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status })))

describe('requestSetupStatus', () => {
  it('sends the signed-in token to the Studio’s own origin and returns the status', async () => {
    const fetch = answer(200)
    const result = await requestSetupStatus({ token: 'tok', fetch })
    expect(result).toMatchObject({ kind: 'status', status: { templateVersion: '1.8.0' } })
    expect(fetch).toHaveBeenCalledWith(
      '/api/setup-status',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
        cache: 'no-store',
      }),
    )
  })

  it('makes no request without a token (cookie sign-in): explanations only', async () => {
    const fetch = answer(200)
    expect(await requestSetupStatus({ token: undefined, fetch })).toEqual({
      kind: 'explanations',
      reason: 'no-token',
    })
    expect(await requestSetupStatus({ token: '', fetch })).toMatchObject({ kind: 'explanations' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([401, 403])('shows explanations only when the route answers %i', async (status) => {
    expect(await requestSetupStatus({ token: 't', fetch: answer(status, {}) })).toEqual({
      kind: 'explanations',
      reason: 'refused',
    })
  })

  it('shows explanations only when the route is missing', async () => {
    expect(await requestSetupStatus({ token: 't', fetch: answer(404, {}) })).toEqual({
      kind: 'explanations',
      reason: 'missing',
    })
  })

  it.each([429, 500, 503])('is an error to retry when the route answers %i', async (status) => {
    expect(await requestSetupStatus({ token: 't', fetch: answer(status, {}) })).toEqual({
      kind: 'error',
    })
  })

  it('is an error to retry for a network failure or a malformed answer', async () => {
    const down = vi.fn(() => Promise.reject(new TypeError('network')))
    expect(await requestSetupStatus({ token: 't', fetch: down })).toEqual({ kind: 'error' })
    expect(await requestSetupStatus({ token: 't', fetch: answer(200, { nope: true }) })).toEqual({
      kind: 'error',
    })
    expect(
      await requestSetupStatus({
        token: 't',
        fetch: answer(200, { ...body, features: [{ id: 1 }] }),
      }),
    ).toEqual({ kind: 'error' })
    const notJson = vi.fn(() => Promise.resolve(new Response('<html>', { status: 200 })))
    expect(await requestSetupStatus({ token: 't', fetch: notJson })).toEqual({ kind: 'error' })
  })

  it('lets an abort through', async () => {
    const controller = new AbortController()
    const fetch = vi.fn(() => {
      controller.abort()
      return Promise.reject(new DOMException('aborted', 'AbortError'))
    })
    await expect(
      requestSetupStatus({ token: 't', fetch, signal: controller.signal }),
    ).rejects.toThrow()
  })

  it('sends nothing when Studio is not served by the site (separate host)', async () => {
    const fetch = answer(200)
    expect(await requestSetupStatus({ token: 'tok', fetch, embedded: false })).toEqual({
      kind: 'explanations',
      reason: 'separate-host',
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('isEmbedded', () => {
  it('is true only under the site’s own Studio path', () => {
    expect(isEmbedded('/studio', '/studio')).toBe(true)
    expect(isEmbedded('/studio/structure/websiteSettings;setup', '/studio')).toBe(true)
    expect(isEmbedded('/', '/studio')).toBe(false)
    expect(isEmbedded('/structure', '/studio')).toBe(false)
    expect(isEmbedded('/studios', '/studio')).toBe(false)
  })
})
