import { describe, expect, it, vi } from 'vitest'

import {
  checkCorsOrigin,
  checkDatasetPrivate,
  checkRevalidateWebhook,
  evaluateCors,
} from './sanity.mjs'

const origin = 'https://example.com'
const env = {
  NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123',
  NEXT_PUBLIC_SANITY_DATASET: 'production',
  SANITY_API_READ_TOKEN: 'sk-test',
}
const respond = (status, body) =>
  vi.fn().mockResolvedValue({ status, json: () => Promise.resolve(body) })

describe('checkDatasetPrivate', () => {
  it('reuses check:dataset: passes private, fails public', async () => {
    const privateResult = await checkDatasetPrivate({
      env,
      fetchImpl: respond(200, [{ name: 'production', aclMode: 'private' }]),
    })
    expect(privateResult[0].status).toBe('pass')
    const publicResult = await checkDatasetPrivate({
      env,
      fetchImpl: respond(200, [{ name: 'production', aclMode: 'public' }]),
    })
    expect(publicResult[0].status).toBe('fail')
    expect(publicResult[0].detail).toContain('PUBLIC')
  })
  it('turns an accepted public dataset into a warning, and fails it once something is readable', async () => {
    const answer = (counts) => {
      let call = 0
      return vi
        .fn()
        .mockImplementation(async (url) =>
          String(url).endsWith('/datasets')
            ? { status: 200, json: async () => [{ name: 'production', aclMode: 'public' }] }
            : { status: 200, json: async () => ({ result: counts[call++] }) },
        )
    }
    const accepting = { ...env, ACCEPT_PUBLIC_DATASET: 'Free plan' }
    const [accepted] = await checkDatasetPrivate({ env: accepting, fetchImpl: answer([0, 0, 0]) })
    expect(accepted.status).toBe('warn')
    const [exposed] = await checkDatasetPrivate({ env: accepting, fetchImpl: answer([0, 1, 0]) })
    expect(exposed.status).toBe('fail')
  })
  it('reminds instead of failing when the values are not available', async () => {
    const fetchImpl = vi.fn()
    const [result] = await checkDatasetPrivate({ env: {}, fetchImpl })
    expect(result.status).toBe('warn')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('evaluateCors', () => {
  it('passes a listed origin with credentials, ignoring a trailing slash and case', () => {
    const body = [{ origin: 'https://Example.com/', allowCredentials: true }]
    expect(evaluateCors({ origin, status: 200, body })[0].status).toBe('pass')
  })
  it('fails a missing origin and one without credentials', () => {
    const missing = evaluateCors({
      origin,
      status: 200,
      body: [{ origin: 'https://other.com', allowCredentials: true }],
    })
    expect(missing[0].status).toBe('fail')
    expect(missing[0].fix).toContain(`npx sanity cors add ${origin} --credentials`)
    expect(
      evaluateCors({ origin, status: 200, body: [{ origin, allowCredentials: false }] })[0].status,
    ).toBe('fail')
  })
  it('gives a manual reminder when the token cannot read the list', () => {
    for (const status of [401, 403, 404, 0]) {
      const [result] = evaluateCors({ origin, status, body: null })
      expect(result.status).toBe('warn')
      expect(result.fix).toContain('sanity.io/manage')
    }
  })
})

describe('checkCorsOrigin', () => {
  it('asks the project CORS endpoint with the token', async () => {
    const fetchImpl = respond(200, [{ origin, allowCredentials: true }])
    const [result] = await checkCorsOrigin({ origin, env, fetchImpl })
    expect(result.status).toBe('pass')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.sanity.io/v2021-06-07/projects/abc123/cors')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
  })
  it('falls back to the reminder on a refusal, a network error or no token', async () => {
    expect(
      (await checkCorsOrigin({ origin, env, fetchImpl: respond(403, { message: 'no' }) }))[0]
        .status,
    ).toBe('warn')
    expect(
      (
        await checkCorsOrigin({
          origin,
          env,
          fetchImpl: vi.fn().mockRejectedValue(new Error('down')),
        })
      )[0].status,
    ).toBe('warn')
    const fetchImpl = vi.fn()
    expect((await checkCorsOrigin({ origin, env: {}, fetchImpl }))[0].status).toBe('warn')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('checkRevalidateWebhook', () => {
  it('passes 401 (webhook mode) and 404 (live mode)', () => {
    expect(checkRevalidateWebhook({ response: { status: 401 } })[0].status).toBe('pass')
    const [off] = checkRevalidateWebhook({ response: { status: 404 } })
    expect(off.status).toBe('pass')
    expect(off.detail).toContain('live mode')
  })
  it('fails when an unsigned POST is accepted', () => {
    expect(checkRevalidateWebhook({ response: { status: 200 } })[0].status).toBe('fail')
  })
  it('warns on anything else', () => {
    expect(checkRevalidateWebhook({ response: { status: 500 } })[0].status).toBe('warn')
    expect(checkRevalidateWebhook({ response: { status: 0, error: 'timeout' } })[0].status).toBe(
      'warn',
    )
  })
})
