import { describe, expect, it, vi } from 'vitest'

import { checkDataset, evaluateDataset, parseEnv } from './check-dataset.mjs'

const base = { projectId: 'abc123', dataset: 'production', token: 'sk-test' }

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({ status, json: () => Promise.resolve(body) })
}

describe('evaluateDataset', () => {
  it('passes a private dataset', () => {
    const result = evaluateDataset({
      dataset: 'production',
      status: 200,
      body: [{ name: 'production', aclMode: 'private' }],
    })
    expect(result.ok).toBe(true)
  })

  it('fails a public dataset and says how to fix it', () => {
    const result = evaluateDataset({
      dataset: 'production',
      status: 200,
      body: [{ name: 'production', aclMode: 'public' }],
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('PUBLIC')
    expect(result.message).toContain('npx sanity dataset visibility set production private')
  })

  it('only checks the named dataset', () => {
    const body = [
      { name: 'staging', aclMode: 'public' },
      { name: 'production', aclMode: 'private' },
    ]
    expect(evaluateDataset({ dataset: 'production', status: 200, body }).ok).toBe(true)
    expect(evaluateDataset({ dataset: 'staging', status: 200, body }).ok).toBe(false)
  })

  it('fails when the dataset is missing, the token is refused or the response is odd', () => {
    expect(evaluateDataset({ dataset: 'x', status: 200, body: [{ name: 'y' }] }).message).toContain(
      'no dataset named "x"',
    )
    expect(evaluateDataset({ dataset: 'x', status: 401, body: null }).ok).toBe(false)
    expect(evaluateDataset({ dataset: 'x', status: 403, body: {} }).message).toContain('refused')
    expect(evaluateDataset({ dataset: 'x', status: 500, body: null }).ok).toBe(false)
    expect(
      evaluateDataset({ dataset: 'x', status: 200, body: [{ name: 'x', aclMode: 'custom' }] }).ok,
    ).toBe(false)
  })
})

describe('checkDataset', () => {
  it('sends the token to the project datasets endpoint', async () => {
    const fetchImpl = mockFetch(200, [{ name: 'production', aclMode: 'private' }])
    const result = await checkDataset({ ...base, fetchImpl })
    expect(result.ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://abc123.api.sanity.io/v2021-06-07/datasets')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
  })

  it('fails on a public dataset', async () => {
    const fetchImpl = mockFetch(200, [{ name: 'production', aclMode: 'public' }])
    expect((await checkDataset({ ...base, fetchImpl })).ok).toBe(false)
  })

  it('names missing variables without calling the API', async () => {
    const fetchImpl = vi.fn()
    const result = await checkDataset({ projectId: 'abc123', fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('NEXT_PUBLIC_SANITY_DATASET')
    expect(result.message).toContain('SANITY_API_READ_TOKEN')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails when the network fails or the body is not JSON', async () => {
    const offline = vi.fn().mockRejectedValue(new Error('offline'))
    expect((await checkDataset({ ...base, fetchImpl: offline })).message).toContain('offline')
    const html = vi
      .fn()
      .mockResolvedValue({ status: 200, json: () => Promise.reject(new Error('bad json')) })
    expect((await checkDataset({ ...base, fetchImpl: html })).ok).toBe(false)
  })
})

describe('parseEnv', () => {
  it('reads quoted and bare values and skips comments', () => {
    const env = parseEnv(
      '# note\nA="one"\nB=two # trailing\nexport C=\'three\'\n\nNEXT_PUBLIC_SANITY_DATASET=production\n',
    )
    expect(env).toEqual({
      A: 'one',
      B: 'two',
      C: 'three',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
    })
  })
})
